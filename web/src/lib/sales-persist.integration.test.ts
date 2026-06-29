import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { Prisma, PrismaClient } from '@prisma/client';
import { persistSale, type PersistSaleParams } from './sales-persist';
import type { SaleLine } from './sales-pricing';
import { ApiError } from './errors';

/**
 * Tes INTEGRASI (Tier 2) — invarian yang bergantung DB nyata:
 *   1. anti-oversell ATOMIK + rollback lintas-baris
 *   2. idempotency uniqueness (unique index)
 *
 * Berjalan HANYA bila `DATABASE_URL_TEST` diset (mis. Postgres lokal). Tanpa env
 * ini, seluruh blok di-SKIP → `npm run test` di CI tetap murni-unit & DB-free.
 *
 * Strategi isolasi: skema throwaway `test_sales` dgn tabel `CREATE TABLE (LIKE
 * <source> INCLUDING ALL)` — meniru struktur asli (kolom, default, unique index)
 * tanpa drift & tanpa FK lintas-skema. Dibuang saat selesai.
 *
 * Set lokal (PowerShell):
 *   $env:DATABASE_URL_TEST="postgresql://pos_user:PWD@127.0.0.1:3022/antigravity_pos?schema=test_sales"
 *   npm run test
 */
const D = Prisma.Decimal;
const TEST_SCHEMA = 'test_sales';
const SOURCE_SCHEMA = process.env.TEST_SOURCE_SCHEMA ?? 'tenant_vapescrew';
const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)('persistSale (integrasi DB)', () => {
  let db: PrismaClient;
  let itemA = 0;
  let itemB = 0;
  let seq = 0;

  const newTxId = (): string => `TEST-${Date.now()}-${seq++}`;

  /** Bangun params persistSale dgn total konsisten (nilai uang tak diuji di sini). */
  function params(lines: SaleLine[], idemKey: string | null = null): PersistSaleParams {
    const subtotal = lines.reduce((s, l) => s.plus(l.lineGross), new D(0));
    return {
      transactionId: newTxId(),
      idemKey,
      userId: null,
      customerId: null,
      paymentTypeId: null,
      subtotal,
      taxAmount: new D(0),
      discountTotal: new D(0),
      total: subtotal,
      paymentAmount: subtotal,
      change: new D(0),
      lines,
    };
  }

  const line = (id: number, qty: number, price = 100): SaleLine => ({
    id,
    qty,
    price: new D(price),
    discount: new D(0),
    costPrice: new D(0),
    lineGross: new D(price).times(qty),
  });

  const stockOf = async (id: number): Promise<number> =>
    (await db.items.findUniqueOrThrow({ where: { id } })).stock ?? 0;

  const setStock = (id: number, stock: number): Promise<unknown> =>
    db.items.update({ where: { id }, data: { stock } });

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_TEST } } });

    // Skema throwaway + tabel meniru struktur asli (anti-drift, tanpa FK).
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await db.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);
    for (const t of ['items', 'transactions', 'transaction_items']) {
      await db.$executeRawUnsafe(
        `CREATE TABLE "${TEST_SCHEMA}"."${t}" (LIKE "${SOURCE_SCHEMA}"."${t}" INCLUDING ALL)`,
      );
    }

    const a = await db.items.create({ data: { code: 'TEST-A', name: 'Test Item A', price: new D(100) } });
    const b = await db.items.create({ data: { code: 'TEST-B', name: 'Test Item B', price: new D(100) } });
    itemA = a.id;
    itemB = b.id;
  });

  beforeEach(async () => {
    await db.transaction_items.deleteMany({});
    await db.transactions.deleteMany({});
    await setStock(itemA, 10);
    await setStock(itemB, 10);
  });

  afterAll(async () => {
    if (!db) return;
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
    await db.$disconnect();
  });

  it('mengurangi stok & menulis baris saat stok cukup', async () => {
    const p = params([line(itemA, 3)]);

    const id = await persistSale(db, p);

    expect(id).toBe(p.transactionId);
    expect(await stockOf(itemA)).toBe(7);
    expect(await db.transactions.count({ where: { id: p.transactionId } })).toBe(1);
    expect(await db.transaction_items.count({ where: { transaction_id: p.transactionId } })).toBe(1);
  });

  it('rollback penuh saat oversell (stok < qty): stok utuh, tak ada transaksi', async () => {
    await setStock(itemA, 5);
    const p = params([line(itemA, 8)]); // minta 8 dari stok 5

    let caught: unknown;
    try {
      await persistSale(db, p);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(400);
    // Atomik: stok TIDAK berubah, baris transaksi TIDAK tertulis.
    expect(await stockOf(itemA)).toBe(5);
    expect(await db.transactions.count({ where: { id: p.transactionId } })).toBe(0);
    expect(await db.transaction_items.count({ where: { transaction_id: p.transactionId } })).toBe(0);
  });

  it('rollback lintas-baris: baris ke-2 oversell membatalkan decrement baris ke-1', async () => {
    await setStock(itemA, 10);
    await setStock(itemB, 1);
    // baris 1 (itemA qty 2) valid; baris 2 (itemB qty 5) oversell → seluruhnya batal.
    const p = params([line(itemA, 2), line(itemB, 5)]);

    let caught: unknown;
    try {
      await persistSale(db, p);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(await stockOf(itemA)).toBe(10); // baris pertama TER-rollback, bukan 8
    expect(await stockOf(itemB)).toBe(1);
    expect(await db.transactions.count({ where: { id: p.transactionId } })).toBe(0);
  });

  it('idempotency: unique index menolak key duplikat (backstop race)', async () => {
    const key = `IDEM-${Date.now()}`;
    await persistSale(db, params([line(itemA, 1)], key));

    // Insert kedua dgn transactionId berbeda tapi idemKey sama → P2002.
    let caught: unknown;
    try {
      await persistSale(db, params([line(itemA, 1)], key));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((caught as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    expect(await db.transactions.count({ where: { idempotency_key: key } })).toBe(1);
  });
});
