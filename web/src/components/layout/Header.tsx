'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Globe, Bell, User } from 'lucide-react';
import { signOut } from '@/lib/auth-client';
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
  const [lang, setLang] = useState('ID');

  const handleToggleLang = () => {
    setLang(lang === 'ID' ? 'EN' : 'ID');
  };

  async function handleLogout() {
    if (busy) return;
    if (!window.confirm('Keluar dari akun?')) return;
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
        <button className={styles.iconBtn} onClick={handleToggleLang}>
          <Globe size={20} />
          <span className={styles.langText}>{lang}</span>
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
          aria-label={`Keluar dari akun ${userName}`}
          title={busy ? 'Keluar…' : 'Klik untuk keluar'}
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
