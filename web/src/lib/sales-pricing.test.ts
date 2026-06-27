import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  computeSale,
  computeChange,
  computeRefund,
  type DbItemRow,
} from './sales-pricing';
import { ApiError } from './errors';

const D = Prisma.Decimal;

/** Bangun Map harga otoritatif (meniru hasil lookup DB). */
function itemMap(rows: DbItemRow[]): Map<number, DbItemRow> {
  return new Map(rows.map((r) => [r.id, r]));
}

/** Tangkap ApiError + verifikasi status & potongan pesan. */
function expectApiError(fn: () => unknown, status: number, msgPart: string): void {
  try {
    fn();
    expect.unreachable('seharusnya melempar ApiError');
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(status);
    expect((err as ApiError).message).toContain(msgPart);
  }
}

describe('computeSale — pajak EKSKLUSIF', () => {
  it('menghitung subtotal, pajak, dan total dari harga DB', () => {
    // Arrange
    const items = [{ id: 1, qty: 2, discount: 0 }];
    const itemById = itemMap([{ id: 1, price: 100, is_active: true }]);

    // Act
    const r = computeSale({ items, itemById, taxRate: new D('0.11'), isInclusive: false });

    // Assert
    expect(r.subtotal.toString()).toBe('200');
    expect(r.discountTotal.toString()).toBe('0');
    expect(r.taxAmount.toString()).toBe('22');
    expect(r.total.toString()).toBe('222');
  });

  it('diskon per-baris mengurangi basis kena pajak', () => {
    const items = [{ id: 1, qty: 2, discount: 50 }];
    const itemById = itemMap([{ id: 1, price: 100, is_active: true }]);

    const r = computeSale({ items, itemById, taxRate: new D('0.11'), isInclusive: false });

    expect(r.subtotal.toString()).toBe('200');
    expect(r.discountTotal.toString()).toBe('50');
    // taxable 150 → pajak 16.5 → total 166.5
    expect(r.taxAmount.toString()).toBe('16.5');
    expect(r.total.toString()).toBe('166.5');
  });

  it('menjumlahkan banyak baris item', () => {
    const items = [
      { id: 1, qty: 1, discount: 0 },
      { id: 2, qty: 3, discount: 0 },
    ];
    const itemById = itemMap([
      { id: 1, price: 100, is_active: true },
      { id: 2, price: 50, is_active: true },
    ]);

    const r = computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false });

    expect(r.subtotal.toString()).toBe('250'); // 100 + 150
    expect(r.total.toString()).toBe('250');
    expect(r.lines).toHaveLength(2);
  });

  it('tarif pajak nol → total = subtotal − diskon', () => {
    const items = [{ id: 1, qty: 1, discount: 25 }];
    const itemById = itemMap([{ id: 1, price: 100, is_active: true }]);

    const r = computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false });

    expect(r.taxAmount.toString()).toBe('0');
    expect(r.total.toString()).toBe('75');
  });
});

describe('computeSale — pajak INKLUSIF', () => {
  it('memisahkan komponen pajak tanpa menambah total', () => {
    // 111 sudah termasuk pajak 11% → harga dasar 100, pajak 11.
    const items = [{ id: 1, qty: 1, discount: 0 }];
    const itemById = itemMap([{ id: 1, price: 111, is_active: true }]);

    const r = computeSale({ items, itemById, taxRate: new D('0.11'), isInclusive: true });

    expect(r.total.toString()).toBe('111'); // total = taxable, tak ditambah
    expect(r.taxAmount.toString()).toBe('11');
  });
});

describe('computeSale — presisi Decimal (anti galat float)', () => {
  it('0.10 × 3 = 0.30 persis (bukan 0.30000000000000004)', () => {
    const items = [{ id: 1, qty: 3, discount: 0 }];
    const itemById = itemMap([{ id: 1, price: '0.10', is_active: true }]);

    const r = computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false });

    expect(r.subtotal.toString()).toBe('0.3');
    expect(r.total.toFixed(2)).toBe('0.30');
  });
});

describe('computeSale — penolakan input invalid (ApiError 400)', () => {
  it('menolak item yang tidak ada di DB', () => {
    const items = [{ id: 99, qty: 1, discount: 0 }];
    const itemById = itemMap([{ id: 1, price: 100, is_active: true }]);

    expectApiError(
      () => computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false }),
      400,
      'tidak ditemukan',
    );
  });

  it('menolak item nonaktif', () => {
    const items = [{ id: 1, qty: 1, discount: 0 }];
    const itemById = itemMap([{ id: 1, price: 100, is_active: false }]);

    expectApiError(
      () => computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false }),
      400,
      'tidak aktif',
    );
  });

  it('menolak diskon baris yang melebihi subtotal baris (cegah total negatif)', () => {
    const items = [{ id: 1, qty: 1, discount: 150 }]; // diskon 150 > gross 100
    const itemById = itemMap([{ id: 1, price: 100, is_active: true }]);

    expectApiError(
      () => computeSale({ items, itemById, taxRate: new D('0'), isInclusive: false }),
      400,
      'melebihi subtotal baris',
    );
  });
});

describe('computeChange', () => {
  it('mengembalikan kembalian saat pembayaran melebihi total', () => {
    expect(computeChange(new D('222'), new D('250')).toString()).toBe('28');
  });

  it('pembayaran pas → kembalian 0', () => {
    expect(computeChange(new D('222'), new D('222')).toString()).toBe('0');
  });

  it('menolak kurang bayar (ApiError 400)', () => {
    expectApiError(() => computeChange(new D('222'), new D('200')), 400, 'kurang dari total');
  });
});

describe('computeRefund', () => {
  it('refund sebagian: net_sales turun, belum void', () => {
    const r = computeRefund({
      currentRefunds: new D('0'),
      netSales: new D('222'),
      total: new D('222'),
      totalRefund: new D('100'),
    });
    expect(r.newRefunds.toString()).toBe('100');
    expect(r.newNetSales.toString()).toBe('122');
    expect(r.fullyRefunded).toBe(false);
  });

  it('refund penuh: fullyRefunded true, net_sales 0', () => {
    const r = computeRefund({
      currentRefunds: new D('0'),
      netSales: new D('222'),
      total: new D('222'),
      totalRefund: new D('222'),
    });
    expect(r.newRefunds.toString()).toBe('222');
    expect(r.newNetSales.toString()).toBe('0');
    expect(r.fullyRefunded).toBe(true);
  });

  it('akumulasi refund melewati ambang total → fullyRefunded true', () => {
    const r = computeRefund({
      currentRefunds: new D('150'), // sudah ada refund sebelumnya
      netSales: new D('72'),
      total: new D('222'),
      totalRefund: new D('72'), // 150 + 72 = 222
    });
    expect(r.newRefunds.toString()).toBe('222');
    expect(r.fullyRefunded).toBe(true);
  });
});
