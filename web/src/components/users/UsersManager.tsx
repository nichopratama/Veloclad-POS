'use client';

import { useId, useState } from 'react';
import useSWR from 'swr';
import { Pencil, Trash2 } from 'lucide-react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { ROLE_VALUES, ROLE_LABELS, roleLabel, isAdmin, type Role } from '@/lib/roles';
import { SkeletonTable } from '@/components/ui/Skeleton';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  staffId: number | null;
  createdAt: string;
};
type UsersResponse = { data: UserRow[] };

type FormData = { name: string; email: string; password: string; role: Role };
type ModalState = { mode: 'create' } | { mode: 'edit'; id: string };

const EMPTY_FORM: FormData = { name: '', email: '', password: '', role: 'kasir' };

const cellStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', textAlign: 'left' };

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse, FetchError>('/api/users', fetcher);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const roleId = useId();

  const users = data?.data ?? [];

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (u: UserRow) => {
    setFormData({ name: u.name, email: u.email, password: '', role: isAdmin(u.role) ? 'admin' : 'kasir' });
    setModal({ mode: 'edit', id: u.id });
  };

  const closeModal = () => setModal(null);

  const setField = (field: 'name' | 'email' | 'password', value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setBanner(null);
    setSubmitting(true);
    try {
      if (modal.mode === 'create') {
        await apiMutate('/api/users', 'POST', formData);
        setBanner({ type: 'success', text: `User ${formData.email} berhasil dibuat.` });
      } else {
        const payload: { name: string; role: Role; password?: string } = {
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) payload.password = formData.password;
        await apiMutate(`/api/users/${modal.id}`, 'PATCH', payload);
        setBanner({ type: 'success', text: 'User berhasil diperbarui.' });
      }
      closeModal();
      mutate();
    } catch (err: unknown) {
      setBanner({ type: 'error', text: err instanceof FetchError ? err.message : 'Terjadi kesalahan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Cabut akses login untuk ${u.name} (${u.email})? Riwayat transaksinya tetap tersimpan.`)) return;
    setBanner(null);
    try {
      await apiMutate(`/api/users/${u.id}`, 'DELETE');
      setBanner({ type: 'success', text: `Akses login ${u.email} dicabut.` });
      mutate();
    } catch (err: unknown) {
      setBanner({ type: 'error', text: err instanceof FetchError ? err.message : 'Gagal mencabut akses.' });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {banner && (
        <div
          style={{
            padding: 'var(--space-4)',
            background: banner.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            color: 'white',
            borderRadius: 'var(--radius)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Tutup notifikasi"
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 var(--space-2)', fontSize: 'var(--text-lg)' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={openCreate} style={{ padding: 'var(--space-2) var(--space-4)' }}>
          + Tambah User
        </button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={cellStyle}>Nama</th>
              <th style={cellStyle}>Email</th>
              <th style={cellStyle}>Role</th>
              <th style={{ ...cellStyle, textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'var(--color-danger)' }}>
                  Gagal memuat daftar pengguna: {error.message}
                </td>
              </tr>
            )}

            {!error && users.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Belum ada pengguna.
                </td>
              </tr>
            )}

            {!error && users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={cellStyle}>
                    {u.name}
                    {isSelf && <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>(Anda)</span>}
                  </td>
                  <td style={cellStyle}>{u.email}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: '999px',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 700,
                        background: isAdmin(u.role) ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                        color: isAdmin(u.role) ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      }}
                    >
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                      <button type="button" className="hover:scale-110 transition-transform p-1 text-[var(--color-accent)]" onClick={() => openEdit(u)} title="Edit">
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        className="hover:scale-110 transition-transform p-1 text-[var(--color-danger)]"
                        onClick={() => handleDelete(u)}
                        disabled={isSelf}
                        title={isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Hapus'}
                        style={{ opacity: isSelf ? 0.4 : 1 }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={modal.mode === 'create' ? 'Tambah User' : 'Edit User'}
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', zIndex: 50 }}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {modal.mode === 'create' ? 'Tambah User' : 'Edit User'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={nameId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Nama <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input id={nameId} type="text" className="input" value={formData.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={emailId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Email <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                id={emailId}
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                disabled={modal.mode === 'edit'}
                title={modal.mode === 'edit' ? 'Email tidak dapat diubah' : undefined}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={passwordId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Password {modal.mode === 'create' ? <span style={{ color: 'var(--color-danger)' }}>*</span> : <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(kosongkan jika tak diubah)</span>}
              </label>
              <input
                id={passwordId}
                type="password"
                className="input"
                value={formData.password}
                onChange={(e) => setField('password', e.target.value)}
                required={modal.mode === 'create'}
                minLength={8}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={roleId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Role <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select id={roleId} className="input" value={formData.role} onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as Role }))} required>
                {ROLE_VALUES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Admin: akses semua menu. Cashier: hanya Dashboard &amp; Penjualan.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <button type="button" className="btn btn--ghost" onClick={closeModal} disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                Batal
              </button>
              <button type="submit" className="btn" disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
