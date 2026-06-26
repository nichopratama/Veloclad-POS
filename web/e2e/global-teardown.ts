/**
 * Playwright global teardown — M4 visual baseline.
 *
 * Deletes the temporary Better Auth account + user created during setup,
 * then removes the .auth/ directory.
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const IDS_FILE = path.resolve(__dirname, '.auth/temp-ids.json');
const AUTH_DIR = path.resolve(__dirname, '.auth');

async function globalTeardown() {
  const prisma = new PrismaClient();

  try {
    if (!fs.existsSync(IDS_FILE)) {
      console.log('[teardown] No temp-ids.json found — nothing to clean.');
      return;
    }

    const { userId, accountId, email } = JSON.parse(
      fs.readFileSync(IDS_FILE, 'utf-8')
    ) as { userId: string; accountId: string; email: string };

    // Delete account first (FK → user).
    await prisma.account.deleteMany({ where: { id: accountId } });

    // Delete all sessions for this user.
    await prisma.session.deleteMany({ where: { userId } });

    // Delete the user.
    await prisma.user.deleteMany({ where: { id: userId } });

    // Verify cleanup.
    const residue = await prisma.user.count({
      where: { email: { startsWith: '__visual_' } },
    });

    console.log(`[teardown] Deleted temp user: ${email}`);
    console.log(`[teardown] Residual __visual_ users remaining: ${residue}`);

    if (residue > 0) {
      console.warn('[teardown] WARNING: residual test users still exist in DB!');
    }
  } finally {
    await prisma.$disconnect();
  }

  // Remove .auth/ directory.
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    console.log('[teardown] .auth/ directory removed.');
  }
}

export default globalTeardown;
