'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Globe, Bell, User, LogOut, Settings, CreditCard } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { useLocale } from '@/lib/i18n/LocaleContext';
import useSWR from 'swr';
import { ProfileEditModal } from '@/components/users/ProfileEditModal';
import { type Role } from '@/lib/roles';
import styles from './Header.module.css';

type NotificationCategory = 'SALES' | 'INVENTORY' | 'FINANCE' | 'SYSTEM';
type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';

interface NotificationRow {
  id: number;
  auth_user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  category: NotificationCategory;
  type: NotificationType;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Header({
  userId,
  email,
  userName,
  role,
  image,
  toggleSidebar,
}: {
  userId: string;
  email: string;
  userName: string;
  role: string;
  image?: string | null;
  toggleSidebar: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const { locale, t, toggleLocale } = useLocale();

  const { data: notifRes, mutate: mutateNotif } = useSWR<{ success: boolean; data: NotificationRow[] }>('/api/notifications', fetcher, { refreshInterval: 30000 });
  const notifications = notifRes?.data || [];
  const unreadCount = notifications.filter((n: NotificationRow) => !n.is_read).length;

  async function handleRead(id: number) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    mutateNotif();
  }

  async function handleLogout() {
    if (busy) return;
    if (!window.confirm(t.header.logoutConfirm)) return;
    setBusy(true);
    await signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.hamburger}`}
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} onClick={toggleLocale} aria-label="Toggle language">
          <Globe size={20} />
          <span className={styles.langText}>{locale.toUpperCase()}</span>
        </button>

        <div className={styles.notifWrapper}>
          <button className={styles.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className={styles.badgeDot}></span>}
          </button>
          
          {notifOpen && (
            <div className={styles.notifDropdown}>
              <div className={styles.notifHeader}>
                <h4 className={styles.notifTitle}>{t.header.notifications}</h4>
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>{t.header.noNotifications}</div>
                ) : (
                  notifications.map((n: NotificationRow) => (
                    <button 
                      key={n.id} 
                      className={`${styles.notifItem} ${!n.is_read ? styles.unread : ''}`}
                      onClick={() => {
                        if (!n.is_read) handleRead(n.id);
                      }}
                    >
                      <div className={styles.notifItemHeader}>
                        <h5 className={styles.notifItemTitle}>{n.title}</h5>
                        <span className={styles.notifItemTime}>
                          {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className={styles.notifItemDesc}>{n.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.profileWrapper}>
          <button
            type="button"
            className={styles.userBlock}
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label={`${t.header.logout} ${userName}`}
            title="Profile"
          >
            <div className={styles.userAvatar}>
              {image ? (
                <img src={image} alt="User avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{userName}</div>
              <div className={styles.userRole}>{role}</div>
            </div>
          </button>
          
          {profileOpen && (
            <div className={styles.profileDropdown}>
              <div className={styles.profileHeader}>
                <div className={styles.profileHeaderAvatar}>
                  {image ? (
                    <img src={image} alt="User avatar" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className={styles.profileHeaderInfo}>
                  <h4 className={styles.profileHeaderName}>{userName}</h4>
                  <p className={styles.profileHeaderRole}>{role}</p>
                </div>
              </div>
              <div className={styles.profileMenuList}>
                <button className={styles.profileMenuItem} onClick={() => { setProfileOpen(false); setShowProfileEdit(true); }}>
                  <Settings size={16} />
                  <span>{t.header.profileSettings}</span>
                </button>
                <button className={styles.profileMenuItem} onClick={() => { setProfileOpen(false); alert(t.header.comingSoon(t.header.myActivity)); }}>
                  <CreditCard size={16} />
                  <span>{t.header.myActivity}</span>
                </button>
                <button 
                  className={`${styles.profileMenuItem} ${styles.danger}`} 
                  onClick={handleLogout}
                  disabled={busy}
                >
                  <LogOut size={16} />
                  <span>{busy ? t.header.loggingOut : t.header.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showProfileEdit && (
        <ProfileEditModal
          mode="edit"
          userId={userId}
          initialData={{
            name: userName,
            email: email,
            role: role as Role,
            image: image,
          }}
          isSelfEdit={true}
          onClose={() => setShowProfileEdit(false)}
          onSuccess={() => {
            // Kita bisa refresh router agar layout memuat session yang baru (termasuk foto/nama)
            router.refresh();
          }}
        />
      )}
    </header>
  );
}
