'use client';

import { useId, useState } from 'react';
import { User } from 'lucide-react';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { toast } from '@/lib/toast';
import { ROLE_VALUES, ROLE_LABELS, type Role } from '@/lib/roles';

export interface ProfileEditModalProps {
  mode: 'create' | 'edit';
  userId?: string;
  initialData: {
    name: string;
    email: string;
    role: Role;
    image?: string | null;
  };
  isSelfEdit?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProfileEditModal({
  mode,
  userId,
  initialData,
  isSelfEdit = false,
  onClose,
  onSuccess,
}: ProfileEditModalProps) {
  const { t } = useLocale();
  const [formData, setFormData] = useState({
    name: initialData.name,
    email: initialData.email,
    password: '',
    role: initialData.role,
    image: null as File | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.image || null);
  const [submitting, setSubmitting] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const roleId = useId();

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
    setSubmitting(true);
    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      
      if (!isSelfEdit) {
        formPayload.append('role', formData.role);
      }
      
      if (mode === 'create') {
        formPayload.append('email', formData.email);
        formPayload.append('password', formData.password);
      } else if (formData.password) {
        formPayload.append('password', formData.password);
      }
      
      if (formData.image) {
        formPayload.append('image', formData.image);
      }

      if (mode === 'create') {
        const res = await fetch('/api/users', { method: 'POST', body: formPayload });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Gagal menyimpan data');
        }
        toast.success(t.users.createSuccess(formData.email));
      } else {
        const res = await fetch(`/api/users/${userId}`, { method: 'PATCH', body: formPayload });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || err.message || 'Gagal mengubah data');
        }
        toast.success(t.users.updateSuccess);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.users.unknownError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? t.users.addUserTitle : t.users.editUser}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', zIndex: 100 }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
          {isSelfEdit ? 'Profile Settings' : (mode === 'create' ? t.users.addUserTitle : t.users.editUser)}
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
            disabled={mode === 'edit'}
            title={mode === 'edit' ? t.users.emailCannotChange : undefined}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={passwordId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {t.users.password} {mode === 'create'
              ? <span style={{ color: 'var(--color-danger)' }}>*</span>
              : <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>{t.users.passwordHint}</span>}
          </label>
          <input
            id={passwordId}
            type="password"
            className="input"
            value={formData.password}
            onChange={(e) => setField('password', e.target.value)}
            required={mode === 'create'}
            minLength={8}
            placeholder={t.users.passwordPlaceholder}
            autoComplete="new-password"
          />
        </div>

        {!isSelfEdit && (
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
        )}

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
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
            {t.common.cancel}
          </button>
          <button type="submit" className="btn" disabled={submitting} style={{ padding: 'var(--space-2) var(--space-4)' }}>
            {submitting ? t.common.saving : t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}
