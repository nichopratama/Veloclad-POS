'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useDebounce } from './useDebounce';
import { formatIDR } from './format';
import type { ListResponse, PosItem } from './types';

const SEARCH_DEBOUNCE_MS = 300;
const ITEM_LIMIT = 30;

type Props = {
  onPick: (item: PosItem) => void;
};

export function ProductPanel({ onPick }: Props) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const query = debouncedSearch.trim()
    ? `?search=${encodeURIComponent(debouncedSearch.trim())}&limit=${ITEM_LIMIT}`
    : `?limit=${ITEM_LIMIT}`;
  const { data, error, isLoading } = useSWR<ListResponse<PosItem>>(
    `/api/sales/pos-items${query}`,
  );

  const items = data?.data ?? [];

  return (
    <section
      className="card"
      style={{
        flex: '1 1 380px',
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
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Memuat produk…
        </p>
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
