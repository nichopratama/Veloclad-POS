import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';
import { splitCsvLines, detectDelimiter, parseDelimitedLine, parseNumber } from '@/lib/csv';

// Admin-only; cap upload size to avoid loading huge files into memory.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

// transaction_detail.csv column indices (0-based). SKU is always empty in the
// export, so matching is by item name (+ variant), never SKU.
const COL = {
  receiptNumber: 1,
  itemName: 6,
  variant: 7,
  quantity: 9,
  grossSales: 12,
  discounts: 13,
} as const;

const MIN_COLS = 14; // must reach at least the discounts column

interface DetailRow {
  receiptNumber: string;
  itemName: string;
  variant: string;
  qty: number;
  grossSales: number;
  discounts: number;
}

function parseDetailCsv(text: string): { rows: DetailRow[]; parseErrors: string[] } {
  const lines = splitCsvLines(text);
  const parseErrors: string[] = [];
  if (lines.length < 2) return { rows: [], parseErrors: ['File CSV kosong atau tidak valid'] };

  const delimiter = detectDelimiter(lines[0]);
  const rows: DetailRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseDelimitedLine(line, delimiter);
    if (cols.length < MIN_COLS) {
      parseErrors.push(`Baris ${i + 1}: kolom tidak lengkap (${cols.length}/${MIN_COLS})`);
      continue;
    }

    const qty = Math.max(1, Math.round(parseNumber(cols[COL.quantity])));
    rows.push({
      receiptNumber: cols[COL.receiptNumber],
      itemName: cols[COL.itemName],
      variant: cols[COL.variant] ?? '',
      qty,
      grossSales: parseNumber(cols[COL.grossSales]),
      discounts: parseNumber(cols[COL.discounts]),
    });
  }
  return { rows, parseErrors };
}

// ---------- Catalog matching ----------

interface CatalogItem {
  id: number;
  variant: string; // lower-cased variant_name, '' if none
  hpp: Prisma.Decimal | null;
}

// Resolve a detail row to a single catalog item id, or null if not found / ambiguous.
function matchItem(index: Map<string, CatalogItem[]>, name: string, variant: string): CatalogItem | null {
  const candidates = index.get(name.trim().toLowerCase());
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple items share the name → disambiguate by variant.
  const v = variant.trim().toLowerCase();
  if (!v) return null; // ambiguous, no variant given
  const byVariant = candidates.filter((c) => c.variant === v);
  return byVariant.length === 1 ? byVariant[0] : null;
}

// ---------- POST ----------

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File CSV diperlukan' }, { status: 400 });
    }
    if ((file as File).size > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { error: `File terlalu besar (maks ${MAX_IMPORT_BYTES / (1024 * 1024)} MB)` },
        { status: 413 },
      );
    }

    const text = await (file as File).text();
    const { rows, parseErrors } = parseDetailCsv(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris valid di CSV', parseErrors }, { status: 400 });
    }

    // Resolve parent transactions by receipt number (external_ref).
    const receiptNumbers = [...new Set(rows.map((r) => r.receiptNumber).filter(Boolean))];
    const parents = await prisma.transactions.findMany({
      where: { external_ref: { in: receiptNumbers } },
      select: { id: true, external_ref: true },
    });
    const parentByReceipt = new Map(parents.map((p) => [p.external_ref as string, p.id]));

    // Parents that already have line items → skip (idempotent re-run).
    const alreadyPopulated = new Set(
      (
        await prisma.transaction_items.findMany({
          where: { transaction_id: { in: parents.map((p) => p.id) } },
          select: { transaction_id: true },
          distinct: ['transaction_id'],
        })
      ).map((ti) => ti.transaction_id as string),
    );

    // Build catalog match index: nameLower → items[].
    const items = await prisma.items.findMany({
      select: { id: true, name: true, variant_name: true, hpp: true },
    });
    const catalogIndex = new Map<string, CatalogItem[]>();
    for (const it of items) {
      const key = it.name.trim().toLowerCase();
      const entry: CatalogItem = { id: it.id, variant: (it.variant_name ?? '').trim().toLowerCase(), hpp: it.hpp };
      const bucket = catalogIndex.get(key);
      if (bucket) bucket.push(entry);
      else catalogIndex.set(key, [entry]);
    }

    // Group rows by receipt so each transaction is all-or-nothing: a receipt with
    // any unmatched line is skipped entirely so a re-run (after fixing the catalog)
    // can complete it.
    const rowsByReceipt = new Map<string, DetailRow[]>();
    for (const r of rows) {
      const bucket = rowsByReceipt.get(r.receiptNumber);
      if (bucket) bucket.push(r);
      else rowsByReceipt.set(r.receiptNumber, [r]);
    }

    const stats = {
      items_imported: 0,
      receipts_imported: 0,
      skipped_existing: 0,
      skipped_no_parent: 0,
      skipped_unmatched: 0,
    };
    const errorDetails: string[] = [...parseErrors];
    const unmatched = new Set<string>();
    const createData: Prisma.transaction_itemsCreateManyInput[] = [];

    for (const [receipt, group] of rowsByReceipt) {
      const transactionId = parentByReceipt.get(receipt);
      if (!transactionId) {
        stats.skipped_no_parent++;
        errorDetails.push(`Receipt ${receipt}: transaksi induk belum diimpor (jalankan import transaksi dulu)`);
        continue;
      }
      if (alreadyPopulated.has(transactionId)) {
        stats.skipped_existing++;
        continue;
      }

      const resolved: Array<{ row: DetailRow; item: CatalogItem }> = [];
      let hasUnmatched = false;
      for (const row of group) {
        const item = matchItem(catalogIndex, row.itemName, row.variant);
        if (!item) {
          hasUnmatched = true;
          unmatched.add(row.variant ? `${row.itemName} (${row.variant})` : row.itemName);
          continue;
        }
        resolved.push({ row, item });
      }

      if (hasUnmatched) {
        stats.skipped_unmatched++;
        errorDetails.push(`Receipt ${receipt}: dilewati — ada item yang tak cocok katalog`);
        continue;
      }

      for (const { row, item } of resolved) {
        createData.push({
          transaction_id: transactionId,
          item_id: item.id,
          qty: row.qty,
          price: row.grossSales / row.qty,
          subtotal: row.grossSales,
          discount: row.discounts,
          cost_price: item.hpp ?? 0, // snapshot HPP saat ini (cost historis tak tersedia di ekspor)
        });
      }
      stats.items_imported += resolved.length;
      stats.receipts_imported++;
    }

    if (createData.length > 0) {
      await prisma.transaction_items.createMany({ data: createData });
    }

    return NextResponse.json({
      message:
        `Import item selesai: ${stats.items_imported} item dari ${stats.receipts_imported} transaksi. ` +
        `${stats.skipped_existing} sudah ada, ${stats.skipped_no_parent} tanpa induk, ${stats.skipped_unmatched} tak cocok.`,
      stats,
      unmatched: unmatched.size > 0 ? [...unmatched] : undefined,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/imports/transaction-items');
  }
}
