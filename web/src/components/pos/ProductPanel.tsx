'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useDebounce } from './useDebounce';
import { formatIDR } from './format';
import type { ListResponse, PosItem } from './types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useLocale } from '@/lib/i18n/LocaleContext';

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  onPick: (item: PosItem) => void;
};

export function ProductPanel({ onPick }: Props) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { t } = useLocale();
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const [dynamicLimit, setDynamicLimit] = useState(15);
  const gridContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const calculateCapacity = () => {
      if (!gridContainerRef.current) return;
      const availableWidth = gridContainerRef.current.clientWidth - 48;
      let cols = Math.floor((availableWidth + 12) / 162);
      if (cols < 1) cols = 1;
      setDynamicLimit(Math.max(9, cols * 3));
    };

    calculateCapacity();
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateCapacity, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const query = debouncedSearch.trim()
    ? `?search=${encodeURIComponent(debouncedSearch.trim())}&limit=${dynamicLimit}`
    : `?limit=${dynamicLimit}`;
  const { data, error, isLoading } = useSWR<ListResponse<PosItem>>(
    `/api/sales/pos-items${query}`,
  );

  const items = data?.data ?? [];

  return (
    <section
      ref={gridContainerRef}
      className="card"
      style={{
        flex: '999 1 380px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
      aria-label={t.pos.selectProduct}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
            {t.pos.products}
          </h2>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface-2)', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '4px 8px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: viewMode === 'grid' ? 'white' : 'transparent',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'grid' ? 600 : 400,
                color: viewMode === 'grid' ? 'var(--color-text)' : 'var(--color-text-muted)'
              }}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '4px 8px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: viewMode === 'list' ? 'white' : 'transparent',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: viewMode === 'list' ? 600 : 400,
                color: viewMode === 'list' ? 'var(--color-text)' : 'var(--color-text-muted)'
              }}
            >
              List
            </button>
          </div>
        </div>
        <input
          className="input"
          type="search"
          placeholder={t.pos.searchProduct}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t.pos.searchProductLabel}
        />
      </div>

      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(160px, 1fr))' : '1fr',
            gap: 'var(--space-3)',
          }}
          aria-hidden="true"
        >
          {Array.from({ length: 8 }, (_, i) => `sk${i}`).map((k) => (
            <div
              key={k}
              style={{
                display: 'flex',
                flexDirection: viewMode === 'grid' ? 'column' : 'row',
                alignItems: viewMode === 'grid' ? 'flex-start' : 'center',
                gap: viewMode === 'grid' ? 'var(--space-2)' : 'var(--space-4)',
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
              }}
            >
              {viewMode === 'grid' ? (
                <>
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="50%" height={12} />
                  <Skeleton width="60%" height={16} />
                </>
              ) : (
                <>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="30%" height={12} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <Skeleton width="60px" height={16} />
                    <Skeleton width="40px" height={12} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          {t.common.loadError}
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          {t.common.notFound}
        </p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(150px, 1fr))' : '1fr',
            gap: 'var(--space-3)',
          }}
        >
          {items.map((item) => {
            const isOut = item.stock <= 0;
            const price = typeof item.price === 'number' ? item.price : Number(item.price);
            return (
              <li key={item.id} style={{ minWidth: 0 }}>
                <button
                  type="button"
                  disabled={isOut}
                  onClick={() => onPick(item)}
                  style={{
                    width: '100%',
                    minHeight: viewMode === 'grid' ? '100px' : 'auto',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    alignItems: viewMode === 'grid' ? 'flex-start' : 'center',
                    gap: viewMode === 'grid' ? 'var(--space-1)' : 'var(--space-4)',
                    padding: 'var(--space-3)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: isOut ? 'var(--color-surface-2)' : 'var(--color-surface)',
                    color: isOut ? 'var(--color-text-muted)' : 'var(--color-text)',
                    cursor: isOut ? 'not-allowed' : 'pointer',
                    opacity: isOut ? 0.65 : 1,
                    font: 'inherit',
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isOut) e.currentTarget.style.borderColor = 'var(--color-accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <span title={item.name} style={{ fontWeight: 600, fontSize: 'var(--text-sm)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {item.code}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: viewMode === 'grid' ? 'flex-start' : 'flex-end', gap: '2px', flexShrink: 0, marginTop: viewMode === 'grid' ? 'var(--space-1)' : 0 }}>
                    <span className="money" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                      {formatIDR(price)}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: isOut ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {isOut ? t.pos.outOfStock : t.pos.stock(item.stock)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
