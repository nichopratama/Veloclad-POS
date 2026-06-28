'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Globe, Bell, User } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { useLocale } from '@/lib/i18n/LocaleContext';
import styles from './Header.module.css';

export function Header({
  userName,
  role,
  toggleSidebar,
}: {
  userName: string;
  role: string;
  toggleSidebar: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { locale, t, toggleLocale } = useLocale();

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

        <button className={styles.iconBtn}>
          <Bell size={20} />
          <span className={styles.badgeDot}></span>
        </button>

        <button
          type="button"
          className={styles.userBlock}
          onClick={handleLogout}
          disabled={busy}
          aria-label={`${t.header.logout} ${userName}`}
          title={busy ? t.header.loggingOut : t.header.clickToLogout}
        >
          <div className={styles.userAvatar}>
            <User size={20} />
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{role}</div>
          </div>
        </button>
      </div>
    </header>
  );
}
