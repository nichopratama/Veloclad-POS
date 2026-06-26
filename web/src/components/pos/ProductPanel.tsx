'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useDebounce } from './useDebounce';
import { formatIDR } from './format';
import type { ListResponse, PosItem } from './types';
import { Skeleton } from '@/components/ui/Skeleton';

const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  onPick: (item: PosItem) => void;
};

export function ProductPanel({ onPick }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const [dynamicLimit, setDynamicLimit] = useState(15);
  const gridContainerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const calculateCapacity = () => {
      if (!gridContainerRef.current) return;
      // padding is 24px each side (48px total)
      const availableWidth = gridContainerRef.current.clientWidth - 48;
      // css grid: minmax(150px, 1fr) with 12px gap
      let cols = Math.floor((availableWidth + 12) / 162);
      if (cols < 1) cols = 1;
      
      // Target 3 rows. Minimum 9 items so it doesn't look empty on mobile.
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
      aria-label="Pilih produk"
    >
      <div>
        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Produk
        </h2>
        <input
          className="input"
          type="search"
          placeholder="Cari nama atau kode produk…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari produk"
        />
      </div>

      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 'var(--space-3)',
          }}
          aria-hidden="true"
        >
          {Array.from({ length: 8 }, (_, i) => `sk${i}`).map((k) => (
            <div
              key={k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <Skeleton width="80%" height={14} />
              <Skeleton width="50%" height={12} />
              <Skeleton width="60%" height={16} />
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
          Gagal memuat data produk
        </p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Produk tidak ditemukan.
        </p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
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
                    minHeight: '88px',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
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
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--text-sm)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {item.code}
                  </span>
                  <span className="money" style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                    {formatIDR(price)}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: isOut ? 'var(--color-danger)' : 'var(--color-text-muted)',
                    }}
                  >
                    {isOut ? 'Stok habis' : `Stok: ${item.stock}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
