'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { ReactNode } from 'react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { isAdmin } from '@/lib/roles';
import { EntityConfig, EntityRow, LibraryListResponse } from './types';
import { useDebounce } from '@/components/pos/useDebounce';
import { formatIDRFromString } from '@/components/pos/format';
import { EntityFormModal } from './EntityFormModal';
import { SkeletonRows } from '@/components/ui/Skeleton';

interface EntityManagerProps {
  config: EntityConfig;
  role: string;
}

export function EntityManager({ config, role }: EntityManagerProps) {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const search = useDebounce(localSearch, 300);

  const [formState, setFormState] = useState<{ isOpen: boolean; initialData: EntityRow | null }>({ isOpen: false, initialData: null });
  const [deleteError, setDeleteError] = useState('');

  const limit = 20;

  let cacheKey = '';
  if (config.paginated) {
    const qs = new URLSearchParams();
    qs.set('page', page.toString());
    qs.set('limit', limit.toString());
    if (config.searchable && search) qs.set('search', search);
    cacheKey = `${config.endpoint}?${qs.toString()}`;
  } else {
    cacheKey = config.endpoint;
    if (config.searchable && search) {
      cacheKey += `?search=${encodeURIComponent(search)}`;
    }
  }

  const { data, error, isLoading, mutate } = useSWR<LibraryListResponse, FetchError>(cacheKey, fetcher);

  const items: EntityRow[] = data?.data ?? [];
  const pagination = config.paginated ? data?.pagination : null;

  const canMutate = config.mutateRoles === 'all' || isAdmin(role);
  const canDelete = isAdmin(role);

  const handleDelete = async (id: number | string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    setDeleteError('');
    try {
      await apiMutate(`${config.endpoint}/${id}`, 'DELETE');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 400 && err.message.toLowerCase().includes('referenced')) {
          setDeleteError('Data tidak dapat dihapus karena masih digunakan di transaksi atau tabel lain.');
        } else {
          setDeleteError(err.message);
        }
      } else {
        setDeleteError('Terjadi kesalahan yang tidak diketahui');
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      {deleteError && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>{deleteError}</span>
             <button onClick={() => setDeleteError('')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0 var(--space-2)' }}>✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          {config.searchable && (
            <input
              type="text"
              className="input"
              placeholder={`Cari ${config.label}...`}
              aria-label={`Cari ${config.label}`}
              value={localSearch}
              onChange={handleSearchChange}
            />
          )}
        </div>
        <div>
          {canMutate && (
            <button className="btn" onClick={() => setFormState({ isOpen: true, initialData: null })}>
              + Tambah {config.label}
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            Gagal memuat data: {error.message}
          </div>
        ) : isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {config.fields.filter(f => f.showInTable).map(f => (
                  <th key={f.key} style={{ padding: 'var(--space-3) var(--space-4)' }}>{f.label}</th>
                ))}
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row: EntityRow) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {config.fields.filter(f => f.showInTable).map(f => {
                    const val = row[f.key];
                    let display: ReactNode;

                    if (f.type === 'money') {
                      display = <span className="money">{formatIDRFromString(String(val ?? 0))}</span>;
                    } else if (f.type === 'checkbox') {
                      display = val ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Aktif</span> : <span style={{ color: 'var(--color-text-muted)' }}>Nonaktif</span>;
                    } else if (f.type === 'select') {
                      const nestedObjKey = f.optionsEndpoint?.split('/').pop();
                      const nested = nestedObjKey ? (row[nestedObjKey] as Record<string, unknown> | null | undefined) : undefined;
                      display = nested && f.optionLabelKey ? String(nested[f.optionLabelKey] ?? '-') : '-';
                    } else {
                      display = val === null || val === undefined ? '-' : String(val);
                    }

                    return (
                      <td key={f.key} style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {display}
                      </td>
                    );
                  })}
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                      {canMutate && (
                        <button className="btn btn--ghost" onClick={() => setFormState({ isOpen: true, initialData: row })} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>Edit</button>
                      )}
                      {canDelete && (
                        <button className="btn btn--ghost" onClick={() => handleDelete(row.id)} style={{ minHeight: '32px', padding: '0 var(--space-2)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Hapus</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={config.fields.filter(f => f.showInTable).length + 1} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        {config.paginated && pagination && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Total {pagination.total} baris
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button 
                className="btn btn--ghost" 
                disabled={page <= 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span style={{ margin: '0 var(--space-2)' }}>{page} / {pagination.totalPages || 1}</span>
              <button 
                className="btn btn--ghost" 
                disabled={page >= pagination.totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {formState.isOpen && (
        <EntityFormModal
          config={config}
          initialData={formState.initialData}
          onClose={() => setFormState({ isOpen: false, initialData: null })}
          onSuccess={() => {
            setFormState({ isOpen: false, initialData: null });
            mutate();
          }}
        />
      )}
    </div>
  );
}
