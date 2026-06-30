'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { isAdmin } from '@/lib/roles';
import { EntityConfig, EntityRow, LibraryListResponse } from './types';
import { useDebounce } from '@/components/pos/useDebounce';
import { formatIDRFromString } from '@/components/pos/format';
import { EntityFormModal } from './EntityFormModal';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface EntityManagerProps {
  config: EntityConfig;
  role: string;
}

export function EntityManager({ config, role }: EntityManagerProps) {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const { t, locale } = useLocale();
  const entityLabel = locale === 'en' ? config.labelEn : config.label;
  const fieldLabel = (f: { label: string; labelEn?: string }) =>
    locale === 'en' ? (f.labelEn ?? f.label) : f.label;
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
    if (sortBy) {
      qs.set('sortBy', sortBy);
      qs.set('sortDir', sortDir);
    }
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
    if (!confirm(t.common.deleteConfirm)) return;
    setDeleteError('');
    try {
      await apiMutate(`${config.endpoint}/${id}`, 'DELETE');
      mutate();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 400 && err.message.toLowerCase().includes('referenced')) {
          setDeleteError(t.library.cannotDelete);
        } else {
          setDeleteError(err.message);
        }
      } else {
        setDeleteError(t.common.unknownError);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
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
              placeholder={t.library.search(entityLabel)}
              aria-label={t.library.searchLabel(entityLabel)}
              value={localSearch}
              onChange={handleSearchChange}
            />
          )}
        </div>
        <div>
          {canMutate && (
            <button className="btn" onClick={() => setFormState({ isOpen: true, initialData: null })}>
              {t.library.add(entityLabel)}
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            {t.common.loadError}: {error.message}
          </div>
        ) : isLoading ? (
          <SkeletonRows rows={8} cols={5} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {config.fields.filter(f => f.showInTable).map(f => (
                  <th
                    key={f.key}
                    className={config.key === 'customers' && f.key === 'email' ? 'hidden sm:table-cell' : ''}
                    style={{ padding: 'var(--space-3) var(--space-4)', cursor: f.sortable ? 'pointer' : 'default' }}
                    onClick={f.sortable ? () => handleSort(f.key) : undefined}
                  >
                    {fieldLabel(f)}
                    {f.sortable && (
                      <span style={{ marginLeft: 'var(--space-1)', color: sortBy === f.key ? 'var(--color-accent)' : 'var(--color-border)' }}>
                        {sortBy === f.key ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                      </span>
                    )}
                  </th>
                ))}
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.common.actions}</th>
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
                      display = val
                        ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{t.common.active}</span>
                        : <span style={{ color: 'var(--color-text-muted)' }}>{t.common.inactive}</span>;
                    } else if (f.type === 'select') {
                      const nestedObjKey = f.optionsEndpoint?.split('/').pop();
                      const nested = nestedObjKey ? (row[nestedObjKey] as Record<string, unknown> | null | undefined) : undefined;
                      display = nested && f.optionLabelKey ? String(nested[f.optionLabelKey] ?? '-') : '-';
                    } else {
                      display = val === null || val === undefined ? '-' : String(val);
                    }

                    return (
                      <td key={f.key} className={config.key === 'customers' && f.key === 'email' ? 'hidden sm:table-cell' : ''} style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        {display}
                      </td>
                    );
                  })}
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                      {canMutate && (
                        <button className="hover:scale-110 transition-transform p-1 text-[var(--color-accent)]" onClick={() => setFormState({ isOpen: true, initialData: row })} title={t.common.edit}>
                          <Pencil size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="hover:scale-110 transition-transform p-1 text-[var(--color-danger)]" onClick={() => handleDelete(row.id)} title={t.common.delete}>
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={config.fields.filter(f => f.showInTable).length + 1} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.common.noData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {config.paginated && pagination && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              {t.common.totalRows(pagination.total)}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                {t.common.prev}
              </button>
              <span style={{ margin: '0 var(--space-2)' }}>{page} / {pagination.totalPages || 1}</span>
              <button className="btn btn--ghost" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                {t.common.next}
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
