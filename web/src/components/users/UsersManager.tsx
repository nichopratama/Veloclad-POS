'use client';

import { useId, useState } from 'react';
import useSWR from 'swr';
import { Pencil, Trash2, User } from 'lucide-react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { ROLE_VALUES, ROLE_LABELS, roleLabel, isAdmin, type Role } from '@/lib/roles';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { toast } from '@/lib/toast';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  staffId: number | null;
  image?: string | null;
  createdAt: string;
};
type UsersResponse = { data: UserRow[] };

type FormDataState = { name: string; email: string; password: string; role: Role; image: File | null };
type ModalState = { mode: 'create' } | { mode: 'edit'; id: string };

const EMPTY_FORM: FormDataState = { name: '', email: '', password: '', role: 'kasir', image: null };

const cellStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', textAlign: 'left' };

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse, FetchError>('/api/users', fetcher);
  const { t } = useLocale();

  const [modal, setModal] = useState<ModalState | null>(null);
  const [formData, setFormData] = useState<FormDataState>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const roleId = useId();

  const users = data?.data ?? [];

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setImagePreview(null);
    setModal({ mode: 'create' });
  };

  const openEdit = (u: UserRow) => {
    setFormData({ name: u.name, email: u.email, password: '', role: isAdmin(u.role) ? 'admin' : 'kasir', image: null });
    // If the user has an existing image in DB, we could fetch it, but our GET /api/users doesn't return `image` yet.
    // For now, setting to null means it won't overwrite unless they upload a new one.
    setImagePreview(null);
    setModal({ mode: 'edit', id: u.id });
  };

  const closeModal = () => {
    setModal(null);
    setImagePreview(null);
  };

  const setField = (field: 'name' | 'email' | 'password', value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran gambar maksimal 5MB');
        return;
      }
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      formPayload.append('role', formData.role);
      
      if (modal.mode === 'create') {
        formPayload.append('email', formData.email);
        formPayload.append('password', formData.password);
      } else if (formData.password) {
        formPayload.append('password', formData.password);
      }
      
      if (formData.image) {
        formPayload.append('image', formData.image);
      }

      if (modal.mode === 'create') {
        const res = await fetch('/api/users', { method: 'POST', body: formPayload });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Gagal menyimpan data');
        }
        toast.success(t.users.createSuccess(formData.email));
      } else {
        const res = await fetch(`/api/users/${modal.id}`, { method: 'PATCH', body: formPayload });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Gagal mengubah data');
        }
        toast.success(t.users.updateSuccess);
      }
      closeModal();
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : t.users.unknownError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(t.users.revokeConfirm(u.name, u.email))) return;
    try {
      await apiMutate(`/api/users/${u.id}`, 'DELETE');
      toast.success(t.users.revokeSuccess(u.email));
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : t.users.revokeFailed);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={openCreate} style={{ padding: 'var(--space-2) var(--space-4)' }}>
          {t.users.addUser}
        </button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={cellStyle}>{t.users.name}</th>
                <th style={cellStyle}>{t.users.email}</th>
                <th style={cellStyle}>{t.users.role}</th>
                <th style={{ ...cellStyle, textAlign: 'center' }}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'var(--color-danger)' }}>
                    {t.users.loadError(error.message)}
                  </td>
                </tr>
              )}

              {!error && users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.users.noUsers}
                  </td>
                </tr>
              )}

              {!error && users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {u.image ? (
                            <img src={u.image} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={14} color="var(--color-text-muted)" />
                          )}
                        </div>
                        <div>
                          {u.name}
                          {isSelf && <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.common.you}</span>}
                        </div>
                      </div>
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
                        <button type="button" className="hover:scale-110 transition-transform p-1 text-[var(--color-accent)]" onClick={() => openEdit(u)} title={t.common.edit}>
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className="hover:scale-110 transition-transform p-1 text-[var(--color-danger)]"
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? t.common.cannotDeleteSelf : t.common.delete}
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
          aria-label={modal.mode === 'create' ? t.users.addUserTitle : t.users.editUser}
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
              {modal.mode === 'create' ? t.users.addUserTitle : t.users.editUser}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={nameId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.users.name} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input id={nameId} type="text" className="input" value={formData.name} onChange={(e) => setField('name', e.target.value)} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={emailId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.users.email} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                id={emailId}
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                disabled={modal.mode === 'edit'}
                title={modal.mode === 'edit' ? t.users.emailCannotChange : undefined}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={passwordId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {t.users.password} {modal.mode === 'create'
                  ? <span style={{ color: 'var(--color-danger)' }}>*</span>
                  : <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t.users.passwordHint}</span>}
              </label>
              <input
                id={passwordId}
                type="password"
                className="input"
                value={formData.password}
                onChange={(e) => setField('password', e.target.value)}
                required={modal.mode === 'create'}
                minLength={8}
                placeholder={t.users.passwordPlaceholder}
                autoComplete="new-password"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor={roleId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{t.users.role} <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select id={roleId} className="input" value={formData.role} onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as Role }))} required>
                {ROLE_VALUES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {t.users.roleHint}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Foto Profil (Opsional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={24} color="var(--color-text-muted)" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  style={{ fontSize: 'var(--text-sm)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <button type="button" className="btn btn--ghost" onClick={closeModal} disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                {t.common.cancel}
              </button>
              <button type="submit" className="btn" disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
                {submitting ? t.common.saving : t.common.save}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
