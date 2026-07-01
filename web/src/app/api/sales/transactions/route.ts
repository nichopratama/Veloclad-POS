import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/rbac';
import { handleApiError } from '@/lib/api';
import { computeSale, computeChange } from '@/lib/sales-pricing';
import { persistSale } from '@/lib/sales-persist';
import { broadcastNotification } from '@/lib/notifications';

const D = Prisma.Decimal;

// ---------- GET: daftar transaksi + filter + ringkasan + paginasi ----------
const listQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['success', 'cancelled', 'void']).optional(),
  cashier: z.coerce.number().int().optional(),        // user_id (staff) — filter kasir (Pass#2)
  paymentMethod: z.coerce.number().int().optional(),  // payment_type_id — filter metode bayar (Pass#2)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const rawParams = Object.fromEntries(req.nextUrl.searchParams);
    for (const key in rawParams) {
      if (rawParams[key] === '') delete rawParams[key];
    }
    const q = listQuerySchema.parse(rawParams);

    const where: Prisma.transactionsWhereInput = {};
    if (q.status) where.status = q.status === 'success' ? 'completed' : q.status;
    if (q.cashier !== undefined) where.user_id = q.cashier;
    if (q.paymentMethod !== undefined) where.payment_type_id = q.paymentMethod;
    
    if (q.search) {
      where.OR = [
        { id: { contains: q.search, mode: 'insensitive' } },
        { payment_method_name: { contains: q.search, mode: 'insensitive' } },
        { transaction_items: { some: { items: { name: { contains: q.search, mode: 'insensitive' } } } } },
      ];
    }

    if (q.startDate || q.endDate) {
      where.created_at = {};
      if (q.startDate) where.created_at.gte = new Date(q.startDate);
      if (q.endDate) where.created_at.lte = new Date(`${q.endDate}T23:59:59.999`);
    }

    const skip = (q.page - 1) * q.limit;

    const [total, rows, agg, statusGroups, paymentGroups, paymentTypes] = await Promise.all([
      prisma.transactions.count({ where }),
      prisma.transactions.findMany({
        where,
        include: {
          users: { select: { name: true } },
          payment_types: { select: { name: true } },
          transaction_items: { include: { items: { select: { name: true } } } },
          void_items: { include: { items: { select: { name: true } }, users: { select: { name: true } } } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: q.limit,
      }),
      prisma.transactions.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { total: true, net_sales: true },
      }),
      prisma.transactions.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
      prisma.transactions.groupBy({
        by: ['payment_type_id'],
        _sum: { total: true },
        where: { ...where, status: 'completed' },
      }),
      prisma.payment_types.findMany({ select: { id: true, name: true } })
    ]);

    const data = rows.map((t) => ({
      ...t,
      cashier_name: t.users?.name ?? t.cashier_name ?? 'System',
      payment_method: t.payment_types?.name ?? null,
      items_summary: t.transaction_items.map((ti) => ti.items?.name ?? 'Unknown Item').join(', '),
      items_detail: t.transaction_items,
      voided_items: t.void_items,
    }));

    const status_breakdown = statusGroups.reduce((acc, g) => {
      const statusKey = g.status ?? 'unknown';
      acc[statusKey] = g._count.id;
      return acc;
    }, {} as Record<string, number>);

    const payment_breakdown = paymentTypes.map(pt => {
      const group = paymentGroups.find(g => g.payment_type_id === pt.id);
      return {
        method: pt.name,
        amount: group ? Number(group._sum.total ?? 0) : 0
      };
    });

    return NextResponse.json({
      summary: {
        total_transactions: total,
        total_collected: Number(agg._sum.total ?? 0),
        net_sales: Number(agg._sum.net_sales ?? 0),
        status_breakdown,
        payment_breakdown,
      },
      data,
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/sales/transactions');
  }
}

// ---------- POST: buat transaksi (uang + stok, KRITIKAL) ----------
const createSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int(),
        // CATATAN: `price` TIDAK diterima dari klien (anti price-tampering) —
        // harga selalu di-lookup otoritatif dari DB by id di server.
        qty: z.number().int().positive(),
        discount: z.number().nonnegative().default(0),
      }),
    )
    .min(1),
  payment_type_id: z.number().int(),
  payment_amount: z.number().nonnegative(),
  customer_id: z.number().int().nullish(),
  idempotencyKey: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const input = createSchema.parse(await req.json());
    const idemKey = input.idempotencyKey ?? req.headers.get('idempotency-key') ?? null;

    // Idempotency: replay aman bila key sudah pernah dipakai (D18).
    if (idemKey) {
      const existing = await prisma.transactions.findUnique({ where: { idempotency_key: idemKey } });
      if (existing) {
        return NextResponse.json({ message: 'Transaction already processed', transaction_id: existing.id, idempotent: true });
      }
    }

    // Pajak (hormati is_inclusive — FR-SET-03).
    const tax = await prisma.tax_settings.findFirst();
    const taxRate = tax?.is_active ? new D(tax.rate).div(100) : new D(0);
    const isInclusive = tax?.is_inclusive ?? false;

    // Harga OTORITATIF dari DB — JANGAN percaya harga klien (anti price-tampering).
    const itemIds = [...new Set(input.items.map((it) => it.id))];
    const dbItems = await prisma.items.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, price: true, hpp: true, is_active: true },
    });
    const itemById = new Map(dbItems.map((r) => [r.id, r]));

    // Hitung uang (Decimal) dari harga OTORITATIF DB — logika murni terkunci
    // unit-test di lib/sales-pricing.ts. `lines` membawa harga+diskon untuk
    // dipakai ulang saat menulis transaction_items.
    const { lines, subtotal, discountTotal, taxAmount, total } = computeSale({
      items: input.items,
      itemById,
      taxRate,
      isInclusive,
    });

    const paymentAmount = new D(input.payment_amount);
    const change = computeChange(total, paymentAmount);

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transactionId = `INV-${dateStr}-${randomBytes(2).toString('hex').toUpperCase()}`;

    // Tulis transaksi (uang + stok atomik) — inti DB terkunci tes integrasi di
    // lib/sales-persist.ts (anti-oversell rollback + idempotency unique).
    const created = await persistSale(prisma, {
      transactionId,
      idemKey,
      userId: session.user.staffId ?? null,
      customerId: input.customer_id ?? null,
      paymentTypeId: input.payment_type_id,
      subtotal,
      taxAmount,
      discountTotal,
      total,
      paymentAmount,
      change,
      lines,
    });

    // Cek apakah ada item yang stoknya menjadi 0 setelah transaksi ini
    const soldItemIds = [...new Set(input.items.map(i => i.id))];
    const itemsAfterSale = await prisma.items.findMany({
      where: { id: { in: soldItemIds } },
      select: { id: true, name: true, stock: true }
    });

    const outOfStockItems = itemsAfterSale.filter(i => i.stock !== null && i.stock <= 0);
    for (const item of outOfStockItems) {
      await broadcastNotification(null, {
        title: 'Stok Habis (Kosong)',
        message: `Stok produk '${item.name}' telah habis setelah transaksi ${created}.`,
        category: 'INVENTORY',
        type: 'ALERT'
      });
    }

    // Notifikasi untuk setiap transaksi yang berhasil (dikirim ke Admin)
    await broadcastNotification(['admin'], {
      title: 'Transaksi Berhasil',
      message: `Transaksi ${created} berhasil senilai Rp ${total.toNumber().toLocaleString('id-ID')}.`,
      category: 'SALES',
      type: 'INFO'
    });

    return NextResponse.json(
      {
        message: 'Transaction successful',
        transaction_id: created,
        receipt: {
          subtotal: subtotal.toFixed(2),
          discount_amount: discountTotal.toFixed(2),
          tax_amount: taxAmount.toFixed(2),
          total: total.toFixed(2),
          payment_amount: paymentAmount.toFixed(2),
          change_amount: change.toFixed(2),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/sales/transactions');
  }
}

