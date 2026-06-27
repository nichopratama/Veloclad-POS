// Migrasi role: lebur `owner` → `admin` (sistem 2-role: admin / kasir).
// Idempoten: aman dijalankan ulang (kalau tak ada owner, 0 baris diubah).
// Jalankan dari folder web/:  node scripts/merge-owner-to-admin.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Better Auth (identitas login) + staf `users` (target FK transaksi) — keduanya punya kolom role.
  const authUpdated = await prisma.user.updateMany({ where: { role: 'owner' }, data: { role: 'admin' } });
  const staffUpdated = await prisma.users.updateMany({ where: { role: 'owner' }, data: { role: 'admin' } });

  console.log(`Better Auth 'user': ${authUpdated.count} owner→admin`);
  console.log(`Staf 'users':       ${staffUpdated.count} owner→admin`);

  const admins = await prisma.user.count({ where: { role: 'admin' } });
  console.log(`Total admin sekarang: ${admins}`);
  if (admins === 0) {
    console.warn('PERINGATAN: tidak ada admin tersisa — periksa data sebelum lanjut.');
  }
}

main()
  .catch((e) => {
    console.error('Migrasi gagal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
