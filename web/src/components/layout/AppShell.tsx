'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import styles from './AppShell.module.css';

export function AppShell({
  userName,
  role,
  tenantName,
  children,
}: {
  userName: string;
  role: string;
  tenantName: string;
  children: ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // matchMedia hanya memicu saat melewati breakpoint (bukan tiap piksel resize
    // seperti event 'resize') — jauh lebih hemat. Buka di desktop, tutup di mobile.
    const mql = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsSidebarOpen(!mql.matches);

    apply(); // set state awal sesuai lebar saat mount
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar
        role={role}
        tenantName={tenantName}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className={`${styles.mainContent} ${!isSidebarOpen ? styles.mainContentCollapsed : ''}`}>
        <Header 
          userName={userName} 
          role={role} 
          toggleSidebar={toggleSidebar} 
        />
        <main style={{ flex: 1, padding: 'var(--space-6)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
