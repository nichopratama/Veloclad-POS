'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

/**
 * Header atas: identitas user + logout. Logout = signOut() Better Auth
 * (session ter-revoke di server, bukan sekadar hapus localStorage).
 */
export function Header({ userName, role }: { userName: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header
      style={{
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 'var(--space-4)',
        padding: '0 var(--space-6)',
        background: 'var(--color-surface)',
        borderBlockEnd: '1px solid var(--color-border)',
      }}
    >
      <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
        <div style={{ fontWeight: 600 }}>{userName}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{role}</div>
      </div>
      <button type="button" className="btn btn--ghost" onClick={handleLogout} disabled={busy}>
        {busy ? 'Keluar…' : 'Logout'}
      </button>
    </header>
  );
}

