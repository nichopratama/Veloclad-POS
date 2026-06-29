'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './ToastContainer.module.css';

export interface ToastEvent {
  message: string;
  type: 'success' | 'error';
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleToast = (e: CustomEvent<ToastEvent>) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 5000);
    };
    window.addEventListener('show-toast', handleToast as EventListener);
    return () => window.removeEventListener('show-toast', handleToast as EventListener);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('appToast');
    if (stored) {
      try {
        setToast(JSON.parse(stored));
      } catch {
        setToast({ message: stored, type: 'success' });
      }
      setTimeout(() => setToast(null), 5000);
      sessionStorage.removeItem('appToast');
    }
  }, [pathname]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className={styles.toastContainer}>
      <div className={`${styles.toast} ${isSuccess ? styles.success : styles.error}`}>
        <span className={styles.message}>{toast.message}</span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setToast(null)}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
