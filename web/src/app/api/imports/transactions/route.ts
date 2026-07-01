import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';

// Financial import is admin-only; cap upload size to avoid loading huge files into memory.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

// ---------- CSV Parser ----------

interface CsvRow {
  outlet: string;
  date: string;
  time: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  gratuity: number;
  tax: number;
  totalCollected: number;
  totalAmount: number;
  otherNote: string;
  receiptNumber: string;
  collectedBy: string;
  servedBy: string;
  customer: string;
  customerPhone: string;
  items: string;
  paymentMethod: string;
  eventType: string;
  reasonOfRefund: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

// Parse "30-06-2026" + "20:58:21" → Date (Asia/Jakarta)
function parseDateTime(date: string, time: string): Date | null {
  const dateParts = date.split('-');
  if (dateParts.length !== 3) return null;
  const [day, month, year] = dateParts;
  const isoString = `${year}-${month}-${day}T${time}+07:00`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseCsv(text: string): { rows: CsvRow[]; parseErrors: string[] } {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  const parseErrors: string[] = [];

  if (lines.length < 2) return { rows: [], parseErrors: ['File CSV kosong atau tidak valid'] };

  const rows: CsvRow[] = [];
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    if (cols.length < 20) {
      parseErrors.push(`Baris ${i + 1}: kolom tidak lengkap (${cols.length}/20)`);
      continue;
    }

    rows.push({
      outlet: cols[0],
      date: cols[1],
      time: cols[2],
      grossSales: parseNumber(cols[3]),
      discounts: parseNumber(cols[4]),
      refunds: parseNumber(cols[5]),
      netSales: parseNumber(cols[6]),
      gratuity: parseNumber(cols[7]),
      tax: parseNumber(cols[8]),
      totalCollected: parseNumber(cols[9]),
      totalAmount: parseNumber(cols[10]),
      otherNote: cols[11],
      receiptNumber: cols[12],
      collectedBy: cols[13],
      servedBy: cols[14],
      customer: cols[15],
      customerPhone: cols[16],
      items: cols[17],
      paymentMethod: cols[18],
      eventType: cols[19],
      reasonOfRefund: cols[20] ?? '',
    });
  }

  return { rows, parseErrors };
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
    const { rows, parseErrors } = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada baris valid di CSV', parseErrors },
        { status: 400 },
      );
    }

    // Load all payment types once for mapping
    const paymentTypes = await prisma.payment_types.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
    });
    const paymentTypeMap = new Map(paymentTypes.map((pt) => [pt.name.toLowerCase(), pt.id]));

    const stats = { imported: 0, skipped_duplicate: 0, skipped_error: 0 };
    const errorDetails: string[] = [...parseErrors];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowLabel = `Baris ${i + 2} (${row.receiptNumber})`;

      // Validate receipt number
      if (!row.receiptNumber) {
        errorDetails.push(`${rowLabel}: Receipt Number kosong`);
        stats.skipped_error++;
        continue;
      }

      // Idempotency: skip if external_ref already exists
      const existing = await prisma.transactions.findFirst({
        where: { external_ref: row.receiptNumber },
        select: { id: true },
      });
      if (existing) {
        stats.skipped_duplicate++;
        continue;
      }

      // Parse timestamp
      const createdAt = parseDateTime(row.date, row.time);
      if (!createdAt) {
        errorDetails.push(`${rowLabel}: Format tanggal/waktu tidak valid (${row.date} ${row.time})`);
        stats.skipped_error++;
        continue;
      }

      // Map payment method — normalize bank names (e.g. BCA) to "card"
      const PAYMENT_ALIASES: Record<string, string> = { bca: 'card', bri: 'card', bni: 'card', mandiri: 'card', debit: 'card' };
      const rawKey = row.paymentMethod.toLowerCase();
      const paymentMethodKey = PAYMENT_ALIASES[rawKey] ?? rawKey;
      const paymentTypeId = paymentTypeMap.get(paymentMethodKey) ?? null;
      const resolvedPaymentName = paymentTypes.find((pt) => pt.id === paymentTypeId)?.name ?? row.paymentMethod;

      // Generate internal ID for imported transaction
      const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      const transactionId = `IMP-${dateStr}-${suffix}`;

      // Determine status
      const isRefund = row.eventType === 'Refund';
      const status = isRefund ? 'void' : 'completed';

      // Notes: store original items string as reference
      const notes = row.items ? `[IMPORT] ${row.items}${row.otherNote ? ` | ${row.otherNote}` : ''}` : (row.otherNote || null);

      try {
        await prisma.transactions.create({
          data: {
            id: transactionId,
            external_ref: row.receiptNumber,
            outlet: row.outlet || null,
            subtotal: row.grossSales,
            discount_amount: row.discounts,
            refunds: row.refunds,
            net_sales: row.netSales,
            gratuity: row.gratuity,
            tax_amount: row.tax,
            total: row.totalCollected,
            payment_amount: row.totalCollected,
            change_amount: 0,
            status,
            cashier_name: row.collectedBy || null,
            customer_name: row.customer || null,
            customer_phone: row.customerPhone || null,
            payment_type_id: paymentTypeId,
            payment_method_name: resolvedPaymentName || null,
            event_type: row.eventType || 'Payment',
            reason_of_refund: row.reasonOfRefund || null,
            notes,
            created_at: createdAt,
            updated_at: createdAt,
          },
        });
        stats.imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errorDetails.push(`${rowLabel}: Gagal disimpan — ${msg}`);
        stats.skipped_error++;
      }
    }

    return NextResponse.json({
      message: `Import selesai: ${stats.imported} berhasil, ${stats.skipped_duplicate} duplikat dilewati, ${stats.skipped_error} error`,
      stats,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    });
  } catch (error) {
    return handleApiError(error, 'POST /api/imports/transactions');
  }
}
