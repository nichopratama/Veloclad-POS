import { describe, it, expect } from 'vitest';
import { ROLE_VALUES, ROLE_LABELS, isAdmin, roleLabel, wouldRemoveLastAdmin } from './roles';

describe('roles — konstanta', () => {
  it('hanya 2 role: admin & kasir', () => {
    expect([...ROLE_VALUES]).toEqual(['admin', 'kasir']);
  });

  it('label UI: admin=Admin, kasir=Cashier', () => {
    expect(ROLE_LABELS.admin).toBe('Admin');
    expect(ROLE_LABELS.kasir).toBe('Cashier');
  });
});

describe('isAdmin', () => {
  it('true untuk admin dan legacy owner', () => {
    expect(isAdmin('admin')).toBe(true);
    expect(isAdmin('owner')).toBe(true);
  });

  it('false untuk kasir / kosong / null / undefined', () => {
    expect(isAdmin('kasir')).toBe(false);
    expect(isAdmin('')).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('roleLabel', () => {
  it('memetakan nilai ke label, fallback ke nilai mentah', () => {
    expect(roleLabel('admin')).toBe('Admin');
    expect(roleLabel('kasir')).toBe('Cashier');
    expect(roleLabel('owner')).toBe('owner'); // tak dipetakan → fallback
    expect(roleLabel(null)).toBe('-');
  });
});

describe('wouldRemoveLastAdmin (anti-lockout)', () => {
  it('hapus admin terakhir → true', () => {
    expect(wouldRemoveLastAdmin(1, 'admin')).toBe(true);
  });

  it('hapus admin saat masih ada admin lain → false', () => {
    expect(wouldRemoveLastAdmin(2, 'admin')).toBe(false);
  });

  it('hapus kasir → selalu false', () => {
    expect(wouldRemoveLastAdmin(1, 'kasir')).toBe(false);
  });

  it('turunkan admin terakhir → kasir → true', () => {
    expect(wouldRemoveLastAdmin(1, 'admin', 'kasir')).toBe(true);
  });

  it('turunkan admin → kasir saat ada admin lain → false', () => {
    expect(wouldRemoveLastAdmin(2, 'admin', 'kasir')).toBe(false);
  });

  it('admin tetap admin (bukan penurunan) → false', () => {
    expect(wouldRemoveLastAdmin(1, 'admin', 'admin')).toBe(false);
  });

  it('promosi kasir → admin → false', () => {
    expect(wouldRemoveLastAdmin(1, 'kasir', 'admin')).toBe(false);
  });
});
