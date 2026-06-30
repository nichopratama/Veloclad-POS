import { prisma } from './prisma';

export type NotificationCategory = 'SALES' | 'INVENTORY' | 'FINANCE' | 'SYSTEM';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';

export interface BroadcastPayload {
  title: string;
  message: string;
  category: NotificationCategory;
  type: NotificationType;
}

/**
 * Mem-broadcast notifikasi ke semua user yang memiliki salah satu role yang diminta.
 * Fungsi ini menggunakan pendekatan Fan-Out (satu baris per user di tabel notifications).
 * Secara internal dibungkus dengan try/catch agar tidak menggagalkan (crash) alur pemanggilnya.
 * 
 * @param targetRoles Array role yang dituju (misal: ['admin']). Jika null/empty, kirim ke semua user.
 * @param payload Data notifikasi
 */
export async function broadcastNotification(
  targetRoles: string[] | null,
  payload: BroadcastPayload
) {
  try {
    const whereClause = (targetRoles && targetRoles.length > 0) 
      ? { role: { in: targetRoles } } 
      : {};
      
    // Ambil ID semua user dari tabel User (Better Auth)
    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true },
    });

    if (users.length === 0) return;

    const notifData = users.map((u) => ({
      auth_user_id: u.id,
      title: payload.title,
      message: payload.message,
      category: payload.category,
      type: payload.type,
      is_read: false,
    }));

    await prisma.notifications.createMany({
      data: notifData,
    });
  } catch (error) {
    // Tangkap error secara diam-diam agar transaksi bisnis tidak ikut gagal
    console.error('Failed to broadcast notification:', error);
  }
}
