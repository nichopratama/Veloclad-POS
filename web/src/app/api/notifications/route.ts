import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await requireAuth();
    const limit = 20;
    const notifs = await prisma.notifications.findMany({
      where: {
        auth_user_id: session.user.id,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, data: notifs });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
