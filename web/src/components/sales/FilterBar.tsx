import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { useDebounce } from '@/components/pos/useDebounce';
import { PaymentTypesResponse } from './types';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { DateRangePicker } from '@/components/ui/DateRangePicker';

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
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      {/* Group 1: DatePicker & Search (Row 1 on mobile) */}
      <div className="flex flex-row gap-2 sm:gap-4 flex-1">
        <div style={{ flex: '0 0 auto' }}>
          <DateRangePicker
            value={{ start: filters.startDate, end: filters.endDate }}
            onChange={(range) => {
              onChange('startDate', range.start);
              onChange('endDate', range.end);
            }}
            className="w-full"
          />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <input
            type="text"
            className="input w-full"
            placeholder={`${t.sales.searchId} / Name / Method`}
            aria-label={t.sales.searchIdLabel}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Group 2: Status & Method (Row 2 on mobile) */}
      <div className="flex flex-row gap-2 sm:gap-4 md:flex-none">
        <div style={{ flex: '1 1 140px' }}>
          <select
            className="input w-full"
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
        <div style={{ flex: '1 1 140px' }}>
          <select
            className="input w-full"
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
    </div>
  );
}
