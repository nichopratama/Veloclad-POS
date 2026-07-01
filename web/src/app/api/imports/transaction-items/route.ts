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
  eventType: 23,
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

    // Baris Refund (mis. "Full Refund for: ...") bukan baris penjualan: nama tak
    // ada di katalog dan qty negatif. Refund ditangani sebagai transaksi void
    // terpisah oleh importer header, jadi di sini dilewati agar tidak membuat
    // seluruh receipt penjualannya ikut di-skip (grouping all-or-nothing).
    if ((cols[COL.eventType] ?? '') === 'Refund') continue;

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

// Normalize a lookup key: trim, collapse inner whitespace, lower-case.
const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

// Resolve a detail row to a single catalog item id, or null if not found / ambiguous.
// The catalog stores variant products with the variant folded into `name`
// (e.g. name "Takis Es Poeter Mandja", variant_name "Mandja"), while the export
// splits them into separate Items + Variant columns. So try the combined
// "name variant" key first, then fall back to name only.
function matchItem(index: Map<string, CatalogItem[]>, rawName: string, variant: string): CatalogItem | null {
  // The export tags consignment items with a leading "[CON]" marker that the
  // catalog name does not carry (consignment is tracked via stock_lots, not the
  // name), so strip it before matching.
  const name = rawName.replace(/^\s*\[con\]\s*/i, '');
  const keys = variant.trim() ? [norm(`${name} ${variant}`), norm(name)] : [norm(name)];
  for (const key of keys) {
    const candidates = index.get(key);
    if (!candidates || candidates.length === 0) continue;
    if (candidates.length === 1) return candidates[0];
    // Multiple items share the key → disambiguate by variant.
    const v = norm(variant);
    if (!v) continue;
    const byVariant = candidates.filter((c) => c.variant === v);
    if (byVariant.length === 1) return byVariant[0];
  }
  return null;
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
    const addKey = (key: string, entry: CatalogItem) => {
      const bucket = catalogIndex.get(key);
      if (bucket) bucket.push(entry);
      else catalogIndex.set(key, [entry]);
    };
    for (const it of items) {
      const variant = norm(it.variant_name ?? '');
      const entry: CatalogItem = { id: it.id, variant, hpp: it.hpp };
      // Index under name alone and under "name variant" so the export's split
      // Items/Variant columns resolve back to the folded catalog name.
      addKey(norm(it.name), entry);
      if (it.variant_name) addKey(norm(`${it.name} ${it.variant_name}`), entry);
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
