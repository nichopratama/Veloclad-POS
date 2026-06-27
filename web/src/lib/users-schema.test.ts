import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema } from './users-schema';

describe('createUserSchema', () => {
  const valid = { name: 'Budi', email: 'budi@toko.local', password: 'rahasia123', role: 'kasir' as const };

  it('menerima input valid', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('menolak email tidak valid', () => {
    expect(createUserSchema.safeParse({ ...valid, email: 'bukan-email' }).success).toBe(false);
  });

  it('menolak password < 8 karakter', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'pendek' }).success).toBe(false);
  });

  it('menolak role di luar admin/kasir', () => {
    expect(createUserSchema.safeParse({ ...valid, role: 'owner' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, role: 'superadmin' }).success).toBe(false);
  });

  it('menolak nama kosong', () => {
    expect(createUserSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('menolak body kosong (tak ada perubahan)', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it('menerima perubahan nama saja', () => {
    expect(updateUserSchema.safeParse({ name: 'Budi Baru' }).success).toBe(true);
  });

  it('menerima perubahan role saja', () => {
    expect(updateUserSchema.safeParse({ role: 'admin' }).success).toBe(true);
  });

  it('menerima reset password saja', () => {
    expect(updateUserSchema.safeParse({ password: 'passwordbaru1' }).success).toBe(true);
  });

  it('menolak password baru < 8 karakter', () => {
    expect(updateUserSchema.safeParse({ password: 'x' }).success).toBe(false);
  });
});
