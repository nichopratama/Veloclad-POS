'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { StockItem, PaginatedResponse } from './types';
import { useDebounce } from '@/components/pos/useDebounce';
import { formatIDRFromString } from '@/components/pos/format';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

type CategoryOption = { id: number; name: string };

export function StockSummaryTab() {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<'name'|'category'|'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [consignmentOnly, setConsignmentOnly] = useState(false);
  const { t } = useLocale();
  const search = useDebounce(localSearch, 300);
  const limit = 30;

  const qs = new URLSearchParams();
  qs.set('page', page.toString());
  qs.set('limit', limit.toString());
  if (search) qs.set('search', search);
  if (categoryId) qs.set('categoryId', categoryId);
  if (consignmentOnly) qs.set('consignmentOnly', 'true');
  qs.set('sortBy', sortBy);
  qs.set('sortDir', sortDir);

  const { data, error, isLoading } = useSWR<PaginatedResponse<StockItem>>(`/api/inventory/stock-summary?${qs.toString()}`, fetcher);
  const { data: catRes } = useSWR<{ data: CategoryOption[] }>('/api/library/categories', fetcher);
  const categories = catRes?.data || [];

  const items = data?.data || [];
  const pagination = data?.pagination;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    setPage(1);
  };

  const handleSort = (field: 'name'|'category'|'stock') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <input
            type="text"
            className="input"
            placeholder={t.inventory.searchStockItem}
            aria-label={t.inventory.searchStockItemLabel}
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <select className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">{t.common.allCategories || 'Semua Kategori'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={consignmentOnly}
            onChange={(e) => { setConsignmentOnly(e.target.checked); setPage(1); }}
          />
          {t.inventory.consignmentOnly}
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {error ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
            {t.common.loadError}: {error instanceof Error ? error.message : t.common.unknownError}
          </div>
        ) : isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', userSelect: 'none' }}>
                <th className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.stock.code}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                  {t.stock.itemName} <span style={{ marginLeft: 'var(--space-1)', color: sortBy === 'name' ? 'var(--color-accent)' : 'var(--color-border)' }}>{sortBy === 'name' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  {t.stock.category} <span style={{ marginLeft: 'var(--space-1)', color: sortBy === 'category' ? 'var(--color-accent)' : 'var(--color-border)' }}>{sortBy === 'category' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                  {t.stock.stock} <span style={{ marginLeft: 'var(--space-1)', color: sortBy === 'stock' ? 'var(--color-accent)' : 'var(--color-border)' }}>{sortBy === 'stock' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.stock.minStock}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.stock.price}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const isLowStock = row.stock <= row.min_stock;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)', background: isLowStock ? '#f3f4f6' : 'inherit' }}>
                    <td className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{row.code}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontWeight: 600 }}>{row.name}</span>
                        {isLowStock && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', fontWeight: 700 }}>{t.inventory.lowStock}</span>}
                        {(row.consignment_stock ?? 0) > 0 && (
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'white', background: 'var(--color-accent)', borderRadius: 'var(--radius-sm)', padding: '1px var(--space-2)' }}>
                            {t.inventory.typeConsignment}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{row.categories?.name || '-'}</td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                      <div style={{ fontWeight: isLowStock ? 700 : 400, color: isLowStock ? 'var(--color-danger)' : 'inherit' }}>
                        {row.stock} {row.unit}
                      </div>
                      {(row.consignment_stock ?? 0) > 0 && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {row.stock - (row.consignment_stock ?? 0)} {t.inventory.owned} · {row.consignment_stock} {t.inventory.typeConsignment}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{row.min_stock} {row.unit}</td>
                    <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{formatIDRFromString(row.price)}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.inventory.noStockData}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {pagination && (
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
    </div>
  );
}
