'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';

/**
 * Login — Better Auth (cookie httpOnly, BUKAN localStorage/JWT).
 * Fondasi fungsional; polesan visual = Deputi Sonet (M3 §C.1).
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError('Email atau password salah');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--space-4)' }}>
      <form onSubmit={onSubmit} className="card" style={{ width: 'min(100%, 380px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>AntiGravity POS</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Masuk untuk melanjutkan</p>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)' }}>Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)' }}>Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>

        {error && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>{error}</p>
        )}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}

