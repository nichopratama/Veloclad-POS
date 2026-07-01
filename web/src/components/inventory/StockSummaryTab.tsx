'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { StockItem, PaginatedResponse } from './types';
import { useDebounce } from '@/components/pos/useDebounce';
import { formatIDRFromString } from '@/components/pos/format';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

type CategoryOption = { id: number; name: string };

type StockDisplayItem =
  | { type: 'flat'; item: StockItem }
  | { type: 'group'; name: string; variants: StockItem[]; totalStock: number; totalConsignStock: number };

function buildDisplayRows(items: StockItem[]): StockDisplayItem[] {
  const groups = new Map<string, StockItem[]>();
  const order: StockDisplayItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.categories?.name === 'ACCESSORIES' && item.variant_name) {
      if (!groups.has(item.name)) groups.set(item.name, []);
      groups.get(item.name)!.push(item);
      if (!seen.has(item.name)) {
        seen.add(item.name);
        order.push({ type: 'group', name: item.name, variants: [], totalStock: 0, totalConsignStock: 0 });
      }
    } else {
      order.push({ type: 'flat', item });
    }
  }

  return order.map((entry) => {
    if (entry.type !== 'group') return entry;
    const variants = groups.get(entry.name) ?? [];
    const totalStock = variants.reduce((s, v) => s + v.stock, 0);
    const totalConsignStock = variants.reduce((s, v) => s + (v.consignment_stock ?? 0), 0);
    return { ...entry, variants, totalStock, totalConsignStock };
  });
}

const BADGE_OUTLINE: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 'var(--text-xs)',
  fontWeight: 500,
  color: 'var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
  borderRadius: '4px',
  padding: '1px 5px',
};

export function StockSummaryTab() {
  const [page, setPage] = useState(1);
  const [localSearch, setLocalSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'stock'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [consignmentOnly, setConsignmentOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const handleSort = (field: 'name' | 'category' | 'stock') => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleGroup = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const displayRows = buildDisplayRows(items);

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
                <th className={consignmentOnly ? 'hidden sm:table-cell' : ''} style={{ padding: 'var(--space-3) var(--space-4)', cursor: 'pointer' }} onClick={() => handleSort('category')}>
                  {t.stock.category} <span style={{ marginLeft: 'var(--space-1)', color: sortBy === 'category' ? 'var(--color-accent)' : 'var(--color-border)' }}>{sortBy === 'category' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                  {t.stock.stock} <span style={{ marginLeft: 'var(--space-1)', color: sortBy === 'stock' ? 'var(--color-accent)' : 'var(--color-border)' }}>{sortBy === 'stock' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                </th>
                <th className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.stock.minStock}</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.stock.price}</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.inventory.noStockData}
                  </td>
                </tr>
              )}

              {displayRows.map((entry) => {
                if (entry.type === 'flat') {
                  const { item } = entry;
                  const isLowStock = item.stock <= item.min_stock;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)', background: isLowStock ? '#f3f4f6' : 'inherit' }}>
                      <td className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{item.code}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontWeight: 600, color: isLowStock ? 'var(--color-danger)' : 'inherit' }}>{item.name}</span>
                          {(item.consignment_stock ?? 0) > 0 && (
                            <span style={BADGE_OUTLINE}>
                              {t.inventory.typeConsignment}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={consignmentOnly ? 'hidden sm:table-cell' : ''} style={{ padding: 'var(--space-3) var(--space-4)' }}>{item.categories?.name || '-'}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <div style={{ fontWeight: isLowStock ? 700 : 400, color: isLowStock ? 'var(--color-danger)' : 'inherit' }}>
                          {item.stock} {item.unit}
                        </div>
                        {(item.consignment_stock ?? 0) > 0 && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {item.stock - (item.consignment_stock ?? 0)} {t.inventory.owned} · {item.consignment_stock} {t.inventory.typeConsignment}
                          </div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{item.min_stock} {item.unit}</td>
                      <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{formatIDRFromString(item.price)}</td>
                    </tr>
                  );
                }

                // Group row (ACCESSORIES with variants)
                const { name, variants, totalStock, totalConsignStock } = entry;
                const isOpen = expanded.has(name);
                const isGroupLowStock = variants.some((v) => v.stock <= v.min_stock);
                const prices = variants.map((v) => Number(v.price));
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceDisplay =
                  minPrice === maxPrice
                    ? formatIDRFromString(String(minPrice))
                    : `${formatIDRFromString(String(minPrice))} – ${formatIDRFromString(String(maxPrice))}`;

                return (
                  <Fragment key={`group-${name}`}>
                    {/* Group header */}
                    <tr
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isGroupLowStock ? '#f3f4f6' : 'var(--color-surface-2)',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleGroup(name)}
                    >
                      <td className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span className="sm:hidden" style={{ color: 'var(--color-text-muted)' }}>
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </span>
                          <span style={{ fontWeight: 700, color: isGroupLowStock ? 'var(--color-danger)' : 'inherit' }}>{name}</span>
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-border)',
                            borderRadius: '999px',
                            padding: '0 6px',
                            lineHeight: 1.6,
                          }}>
                            {variants.length}
                          </span>
                          {totalConsignStock > 0 && (
                            <span style={BADGE_OUTLINE}>
                              {t.inventory.typeConsignment}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={consignmentOnly ? 'hidden sm:table-cell' : ''} style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        ACCESSORIES
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: isGroupLowStock ? 'var(--color-danger)' : 'inherit' }}>
                          {totalStock}
                        </div>
                        {totalConsignStock > 0 && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {totalStock - totalConsignStock} {t.inventory.owned} · {totalConsignStock} {t.inventory.typeConsignment}
                          </div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell" style={{ padding: 'var(--space-3) var(--space-4)' }} />
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        {priceDisplay}
                      </td>
                    </tr>

                    {/* Variant sub-rows */}
                    {isOpen && variants.map((variant) => {
                      const isLowStock = variant.stock <= variant.min_stock;
                      return (
                        <tr
                          key={variant.id}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: isLowStock ? '#f3f4f6' : 'color-mix(in srgb, var(--color-surface-2) 45%, transparent)',
                          }}
                        >
                          <td className="hidden sm:table-cell" style={{ padding: 'var(--space-2) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', paddingLeft: 'var(--space-8)' }}>
                            {variant.code}
                          </td>
                          <td style={{ padding: 'var(--space-2) var(--space-4)', paddingLeft: 'calc(var(--space-4) + 20px)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={BADGE_OUTLINE}>{variant.variant_name}</span>
                              {(variant.consignment_stock ?? 0) > 0 && (
                                <span style={BADGE_OUTLINE}>
                                  {t.inventory.typeConsignment}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={consignmentOnly ? 'hidden sm:table-cell' : ''} style={{ padding: 'var(--space-2) var(--space-4)' }} />
                          <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--text-sm)', fontWeight: isLowStock ? 700 : 400, color: isLowStock ? 'var(--color-danger)' : 'inherit' }}>
                              {variant.stock} {variant.unit}
                            </div>
                            {(variant.consignment_stock ?? 0) > 0 && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                {variant.stock - (variant.consignment_stock ?? 0)} {t.inventory.owned} · {variant.consignment_stock} {t.inventory.typeConsignment}
                              </div>
                            )}
                          </td>
                          <td className="hidden sm:table-cell" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                            {variant.min_stock} {variant.unit}
                          </td>
                          <td className="money" style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                            {formatIDRFromString(variant.price)}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
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
