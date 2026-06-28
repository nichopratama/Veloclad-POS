import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useDebounce } from '@/components/pos/useDebounce';
import { PaymentTypesResponse } from './types';
import { useLocale } from '@/lib/i18n/LocaleContext';

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
  const { t } = useLocale();
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
          placeholder={t.sales.searchId}
          aria-label={t.sales.searchIdLabel}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <input
          type="date"
          className="input"
          aria-label={t.sales.startDateLabel}
          value={filters.startDate}
          onChange={(e) => onChange('startDate', e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <input
          type="date"
          className="input"
          aria-label={t.sales.endDateLabel}
          value={filters.endDate}
          onChange={(e) => onChange('endDate', e.target.value)}
        />
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <select
          className="input"
          aria-label={t.sales.filterStatusLabel}
          value={filters.status}
          onChange={(e) => onChange('status', e.target.value)}
        >
          <option value="">{t.sales.allStatus}</option>
          <option value="success">{t.sales.completed}</option>
          <option value="void">Void</option>
          <option value="cancelled">{t.sales.cancelled}</option>
        </select>
      </div>
      <div style={{ flex: '0 1 150px' }}>
        <select
          className="input"
          aria-label={t.sales.filterMethodLabel}
          value={filters.paymentMethod}
          onChange={(e) => onChange('paymentMethod', e.target.value)}
        >
          <option value="">{t.sales.allMethods}</option>
          {payData?.data.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
