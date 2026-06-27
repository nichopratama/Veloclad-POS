import { z } from 'zod';
// Relative import (bukan alias `@/`) agar modul ini bisa di-unit-test Vitest
// tanpa konfigurasi alias — selaras pola lib/sales-pricing & lib/errors.
import { ROLE_VALUES } from './roles';

/**
 * Skema validasi Users Management — DIPISAH dari route handler agar bebas Next
 * (`next/server`, `@/lib/env` fail-fast) sehingga bisa di-unit-test dengan Vitest.
 */
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(255),
  role: z.enum(ROLE_VALUES),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    password: z.string().min(8).max(255).optional(),
  })
  .refine((d) => d.name !== undefined || d.role !== undefined || d.password !== undefined, {
    message: 'Tidak ada perubahan yang dikirim',
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
