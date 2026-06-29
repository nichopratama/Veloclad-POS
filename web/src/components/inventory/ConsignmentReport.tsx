'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatIDR } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';

type ConsignmentItem = {
  code: string;
  name: string;
  unit_cost: number;
  received: number;
  sold: number;
  remaining: number;
};

type SupplierGroup = {
  supplier_id: number | null;
  supplier_name: string;
  running_debt: number;
  total_received: number;
  total_remaining: number;
  items: ConsignmentItem[];
};

export function ConsignmentReport() {
  const { t } = useLocale();
  const { data, error, isLoading } = useSWR<{ data: SupplierGroup[] }>('/api/inventory/consignment-stock', fetcher);
  const groups = data?.data ?? [];

  if (error) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-danger)' }}>
        {t.common.loadError}: {error instanceof Error ? error.message : t.common.unknownError}
      </div>
    );
  }

  if (isLoading) {
    return <SkeletonTable rows={6} cols={5} />;
  }

  if (groups.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        {t.consignmentReport.noData}
      </div>
    );
  }

  const cellNum: React.CSSProperties = { padding: 'var(--space-2) var(--space-4)', textAlign: 'right' };
  const headNum: React.CSSProperties = { ...cellNum, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {groups.map((g) => (
        <div key={g.supplier_id ?? 'none'} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0 }}>{g.supplier_name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.consignmentReport.runningDebt}</span>
              <span className="money" style={{ fontWeight: 800, color: g.running_debt > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                {formatIDR(g.running_debt)}
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{t.consignmentReport.item}</th>
                  <th style={headNum}>{t.consignmentReport.unitCost}</th>
                  <th style={headNum}>{t.consignmentReport.received}</th>
                  <th style={headNum}>{t.consignmentReport.sold}</th>
                  <th style={headNum}>{t.consignmentReport.remaining}</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((it) => (
                  <tr key={`${it.code}-${it.unit_cost}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginRight: 'var(--space-2)' }}>{it.code}</span>
                      {it.name}
                    </td>
                    <td className="money" style={cellNum}>{formatIDR(it.unit_cost)}</td>
                    <td style={cellNum}>{it.received}</td>
                    <td style={cellNum}>{it.sold}</td>
                    <td style={{ ...cellNum, fontWeight: 700, color: it.remaining > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{it.remaining}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                  <td style={{ padding: 'var(--space-2) var(--space-4)' }}>{t.common.total}</td>
                  <td style={cellNum}></td>
                  <td style={cellNum}>{g.total_received}</td>
                  <td style={cellNum}>{g.total_received - g.total_remaining}</td>
                  <td style={cellNum}>{g.total_remaining}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
