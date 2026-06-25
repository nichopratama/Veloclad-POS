// Seed migrasi auth (M1): tautkan setiap staff `users` lama → Better Auth user + account.
// Idempoten: aman dijalankan ulang (skip jika email sudah ada di tabel `user`).
// Jalankan: node scripts/seed-auth.mjs   (dari folder web/, .env memuat DATABASE_URL)
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.users.findMany();
  console.log(`Ditemukan ${staffList.length} staff di tabel 'users' lama.`);

  let created = 0;
  let skipped = 0;

  for (const staff of staffList) {
    const existing = await prisma.user.findFirst({ where: { email: staff.email } });
    if (existing) {
      skipped++;
      continue;
    }

    const userId = randomUUID();
    const now = new Date();

    await prisma.user.create({
      data: {
        id: userId,
        name: staff.name,
        email: staff.email,
        emailVerified: true,
        role: staff.role ?? 'kasir',
        staffId: staff.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Account credential — password = hash bcrypt lama (verify-shim di lib/auth.ts).
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: staff.password_hash,
        createdAt: now,
        updatedAt: now,
      },
    });

    created++;
    console.log(`  + ${staff.email} (role=${staff.role ?? 'kasir'}, staffId=${staff.id})`);
  }

  console.log(`Selesai. Dibuat: ${created}, dilewati: ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('Seed gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

