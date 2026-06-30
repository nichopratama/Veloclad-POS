'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { Mail, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

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
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
      background: 'radial-gradient(circle at 15% 50%, rgba(45, 124, 250, 0.08), transparent 25%), radial-gradient(circle at 85% 30%, rgba(3, 57, 108, 0.08), transparent 25%)',
      backgroundColor: 'var(--color-bg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background blur */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'linear-gradient(45deg, rgba(3,57,108,0.03), rgba(45,124,250,0.03))',
        borderRadius: '50%',
        filter: 'blur(80px)',
        zIndex: 0
      }} />

      <form onSubmit={onSubmit} className="card" style={{
        width: 'min(100%, 420px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        padding: '40px',
        zIndex: 1,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-success))',
            color: 'white',
            marginBottom: 'var(--space-4)',
            boxShadow: '0 8px 16px rgba(45, 124, 250, 0.2)'
          }}>
            <Sparkles size={24} />
          </div>
          <h1 style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(to right, var(--color-text), var(--color-accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 var(--space-2) 0'
          }}>
            VeloPOS
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
            Masuk untuk mengakses sistem
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>Email</span>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@velopos.com"
                style={{ paddingLeft: '40px', height: '44px' }}
              />
            </div>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>Password</span>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ paddingLeft: '40px', height: '44px' }}
              />
            </div>
          </label>
        </div>

        {error && (
          <div style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(224, 0, 0, 0.05)',
            border: '1px solid rgba(224, 0, 0, 0.1)',
            color: 'var(--color-danger)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn"
          disabled={loading}
          style={{
            height: '44px',
            fontSize: 'var(--text-base)',
            marginTop: 'var(--space-2)',
            background: 'linear-gradient(to right, var(--color-accent), var(--color-accent-hover))',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Masuk
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </main>
  );
}
