'use client';

import { useId, useState } from 'react';
import useSWR from 'swr';
import { Pencil, Trash2, User } from 'lucide-react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { ROLE_VALUES, ROLE_LABELS, roleLabel, isAdmin, type Role } from '@/lib/roles';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { toast } from '@/lib/toast';
import { ProfileEditModal } from './ProfileEditModal';

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

type InitialDataState = { name: string; email: string; role: Role; image?: string | null };
type ModalState = { mode: 'create' } | { mode: 'edit'; id: string };

const EMPTY_FORM: InitialDataState = { name: '', email: '', role: 'kasir', image: null };

const cellStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', textAlign: 'left' };

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse, FetchError>('/api/users', fetcher);
  const { t } = useLocale();

  const [modal, setModal] = useState<ModalState | null>(null);
  const [initialData, setInitialData] = useState<InitialDataState>(EMPTY_FORM);

  const users = data?.data ?? [];

  const openCreate = () => {
    setInitialData(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (u: UserRow) => {
    setInitialData({ name: u.name, email: u.email, role: isAdmin(u.role) ? 'admin' : 'kasir', image: u.image });
    setModal({ mode: 'edit', id: u.id });
  };

  const closeModal = () => {
    setModal(null);
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
        <ProfileEditModal
          mode={modal.mode}
          userId={modal.mode === 'edit' ? modal.id : undefined}
          initialData={initialData}
          isSelfEdit={false}
          onClose={closeModal}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
