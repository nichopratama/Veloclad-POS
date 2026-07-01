'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatIDR } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';

type ConsignmentItem = {
  date: string;
  code: string;
  name: string;
  unit_cost: number;
  received: number;
  sold: number;
  remaining: number;
};

type LotAging = {
  lot_id: number;
  code: string;
  name: string;
  unit_cost: number;
  remaining: number;
  received_at: string;
  expires_at: string | null;
  days_remaining: number | null;
  is_overdue: boolean;
};

type SupplierGroup = {
  supplier_id: number | null;
  supplier_name: string;
  running_debt: number;
  total_received: number;
  total_remaining: number;
  items: ConsignmentItem[];
  lots: LotAging[];
  overdue_count: number;
};

const DUE_SOON_DAYS = 7;

export function ConsignmentReport() {
  const { t } = useLocale();
  const { data, error, isLoading, mutate } = useSWR<{ data: SupplierGroup[] }>('/api/inventory/consignment-stock', fetcher);
  const groups = data?.data ?? [];

  const [toggledGroups, setToggledGroups] = useState<Record<number, boolean>>({});
  const toggleGroup = (g: SupplierGroup) => {
    const safeId = g.supplier_id ?? -1;
    setToggledGroups((prev) => {
      const current = prev[safeId] !== undefined ? prev[safeId] : g.overdue_count > 0;
      return { ...prev, [safeId]: !current };
    });
  };

  const [returningId, setReturningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const handleReturn = async (lotId: number) => {
    if (!confirm(t.consignmentReport.returnConfirm)) return;
    setReturningId(lotId);
    setActionError('');
    try {
      await apiMutate(`/api/inventory/stock-lots/${lotId}/return`, 'PATCH');
      await mutate();
    } catch (err: unknown) {
      setActionError(err instanceof FetchError ? err.message : t.common.unknownError);
    } finally {
      setReturningId(null);
    }
  };

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
  const headLeft: React.CSSProperties = { padding: 'var(--space-2) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  const renderDaysLeft = (lot: LotAging) => {
    if (lot.days_remaining == null) {
      return <span style={{ color: 'var(--color-text-muted)' }}>{t.consignmentReport.openEnded}</span>;
    }
    const isDueSoon = !lot.is_overdue && lot.days_remaining <= DUE_SOON_DAYS;
    const color = lot.is_overdue ? 'var(--color-danger)' : isDueSoon ? 'var(--color-warning, #b45309)' : 'var(--color-text)';
    const label = lot.is_overdue
      ? `${t.consignmentReport.overdue} (${Math.abs(lot.days_remaining)})`
      : `${lot.days_remaining}`;
    return <span style={{ fontWeight: lot.is_overdue || isDueSoon ? 700 : 400, color }}>{label}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {actionError && (
        <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
          {actionError}
        </div>
      )}
      {groups.map((g) => {
        const expanded = toggledGroups[g.supplier_id ?? -1] !== undefined ? toggledGroups[g.supplier_id ?? -1] : g.overdue_count > 0;
        return (
          <div key={g.supplier_id ?? 'none'} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => toggleGroup(g)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-4)',
                borderBottom: expanded ? '1px solid var(--color-border)' : 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>{g.supplier_name}</h3>
                  {g.overdue_count > 0 && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'white', background: 'var(--color-danger)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
                      {g.overdue_count} {t.consignmentReport.overdueCount}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t.consignmentReport.runningDebt}</span>
                <span className="money" style={{ fontWeight: 800, color: g.running_debt > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                  {formatIDR(g.running_debt)}
                </span>
              </div>
            </button>

            <div style={{ display: expanded ? 'block' : 'none' }}>
              {/* Overview: received / sold / remaining per item */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={headLeft}>{t.common.date}</th>
                  <th style={headLeft}>{t.consignmentReport.item}</th>
                  <th style={headNum}>{t.consignmentReport.unitCost}</th>
                  <th style={headNum}>{t.consignmentReport.received}</th>
                  <th style={headNum}>{t.consignmentReport.sold}</th>
                  <th style={headNum}>{t.consignmentReport.remaining}</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((it) => (
                  <tr key={`${it.code}-${it.unit_cost}-${it.date}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-2) var(--space-4)', whiteSpace: 'nowrap' }}>
                      {formatDate(it.date)}
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginRight: 'var(--space-2)' }}>{it.code}</span>
                      <span style={{ fontWeight: 600 }}>{it.name}</span>
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
                  <td colSpan={2} style={{ padding: 'var(--space-2) var(--space-4)' }}>{t.common.total}</td>
                  <td style={cellNum}></td>
                  <td style={cellNum}>{g.total_received}</td>
                  <td style={cellNum}>{g.total_received - g.total_remaining}</td>
                  <td style={cellNum}>{g.total_remaining}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Aging + pull-back: active lots with their consignment period */}
          {g.lots.length > 0 && (
            <div style={{ overflowX: 'auto', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', background: 'var(--color-surface-2, transparent)' }}>
                {t.consignmentReport.activeLots}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <th style={headLeft}>{t.common.date}</th>
                    <th style={headLeft}>{t.consignmentReport.item}</th>
                    <th style={headNum}>{t.consignmentReport.remaining}</th>
                    <th style={headNum}>{t.consignmentReport.expiry}</th>
                    <th style={headNum}>{t.consignmentReport.daysLeft}</th>
                    <th style={{ ...headNum, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {g.lots.map((lot) => (
                    <tr key={lot.lot_id} style={{ borderBottom: '1px solid var(--color-border)', background: lot.is_overdue ? 'var(--color-danger-soft, rgba(220,38,38,0.06))' : undefined }}>
                      <td style={{ padding: 'var(--space-2) var(--space-4)', whiteSpace: 'nowrap' }}>
                        {formatDate(lot.received_at)}
                      </td>
                      <td style={{ padding: 'var(--space-2) var(--space-4)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginRight: 'var(--space-2)' }}>{lot.code}</span>
                        <span style={{ fontWeight: 600 }}>{lot.name}</span>
                      </td>
                      <td style={{ ...cellNum, fontWeight: 700 }}>{lot.remaining}</td>
                      <td style={cellNum}>{lot.expires_at ? formatDate(lot.expires_at) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td style={cellNum}>{renderDaysLeft(lot)}</td>
                      <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => handleReturn(lot.lot_id)}
                          disabled={returningId === lot.lot_id}
                          style={{ minHeight: '30px', padding: '0 var(--space-3)', color: 'var(--color-danger)' }}
                        >
                          {returningId === lot.lot_id ? t.common.saving : t.consignmentReport.returnAction}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
