import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useDebounce } from '@/components/pos/useDebounce';
import { PaymentTypesResponse } from './types';

interface FilterBarProps {
  filters: {
    startDate: string;
    endDate: string;
    search: string;
    status: string;
    paymentMethod: string;
  };
  onChange: (key: string, value: string) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 300);

  const { data: payData } = useSWR<PaymentTypesResponse>('/api/library/payment-types', fetcher);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onChange('search', debouncedSearch);
    }
  }, [debouncedSearch, filters.search, onChange]);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
      <div style={{ flex: '1 1 200px' }}>
        <input
          type="text"
          className="input"
          placeholder="Cari ID Transaksi..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <input
          type="date"
          className="input"
          value={filters.startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <input
          type="date"
          className="input"
          value={filters.endDate}
          onChange={(e) => onChange('endDate', e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <select
          className="input"
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="success">Selesai</option>
          <option value="void">Void</option>
          <option value="cancelled">Batal</option>
        </select>
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <select
          className="input"
          value={filters.paymentMethod}
          onChange={(e) => onChange('paymentMethod', e.target.value)}
        >
          <option value="">Semua Metode</option>
          {payData?.data.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
