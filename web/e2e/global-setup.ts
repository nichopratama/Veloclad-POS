/**
 * Playwright global setup — M4 visual baseline.
 *
 * 1. Reads DATABASE_URL from web/.env (dotenv) for Prisma.
 * 2. Creates a temporary Better Auth user+account with a known bcrypt password.
 * 3. Signs in via the running dev server (port 3100) to obtain a session cookie.
 * 4. Saves Playwright storageState to e2e/.auth/state.json.
 * 5. Saves temp IDs to e2e/.auth/temp-ids.json for teardown.
 */

import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Load .env from the web directory so Prisma gets DATABASE_URL.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AUTH_FILE = path.resolve(__dirname, '.auth/state.json');
const IDS_FILE = path.resolve(__dirname, '.auth/temp-ids.json');
const BASE_URL = 'http://localhost:3100';

setup('create temp user and save auth state', async ({ request }) => {
  const prisma = new PrismaClient();

  try {
    const rand = randomUUID().replace(/-/g, '').slice(0, 8);
    const email = `__visual_${rand}@test.local`;
    const password = 'Test1234!';
    const userId = randomUUID();
    const accountId = randomUUID();
    const now = new Date();

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Better Auth user.
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Visual Test',
        email,
        emailVerified: true,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      },
    });

    // Create Better Auth credential account.
    await prisma.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: 'credential',
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    // Save IDs for teardown.
    fs.mkdirSync(path.dirname(IDS_FILE), { recursive: true });
    fs.writeFileSync(IDS_FILE, JSON.stringify({ userId, accountId, email }));

    // Sign in via Better Auth API — Origin header must match BETTER_AUTH_URL.
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: { email, password },
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE_URL,
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Sign-in failed: ${response.status()} — ${body}`);
    }

    // Save storage state (cookies) for authenticated tests.
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    await request.storageState({ path: AUTH_FILE });

    console.log(`[setup] Temp user created: ${email}`);
    console.log(`[setup] Auth state saved → ${AUTH_FILE}`);
  } finally {
    await prisma.$disconnect();
  }
});
