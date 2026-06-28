import { Transaction } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { isAdmin } from '@/lib/roles';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface TransactionTableProps {
  transactions: Transaction[];
  role: string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onDetailClick: (t: Transaction) => void;
  onVoidClick: (t: Transaction) => void;
}

export function TransactionTable({
  transactions,
  role,
  page,
  totalPages,
  total,
  onPageChange,
  onDetailClick,
  onVoidClick,
}: TransactionTableProps) {
  const { t } = useLocale();

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{t.sales.completed}</span>;
      case 'void':
        return <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Void</span>;
      case 'cancelled':
        return <span style={{ color: 'var(--color-text-muted)' }}>{t.sales.cancelled}</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.sales.id}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.sales.date}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.sales.cashier}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.sales.method}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{t.sales.total}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.sales.status}</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>{t.sales.actions}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{tx.id}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(tx.created_at).toLocaleString('id-ID')}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{tx.cashier_name}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{tx.payment_method || '-'}</td>
              <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                {formatIDRFromString(tx.total)}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{renderStatusBadge(tx.status)}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                  <button className="btn btn--ghost" onClick={() => onDetailClick(tx)} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>{t.sales.detail}</button>
                  {isAdmin(role) && tx.status === 'completed' && (
                    <button className="btn btn--ghost" onClick={() => onVoidClick(tx)} style={{ minHeight: '32px', padding: '0 var(--space-2)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>{t.sales.void}</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t.sales.noTransactions}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          {t.common.totalTransactions(total)}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button className="btn btn--ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            {t.common.prev}
          </button>
          <span style={{ margin: '0 var(--space-2)' }}>{page} / {totalPages || 1}</span>
          <button className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            {t.common.next}
          </button>
        </div>
      </div>
    </div>
  );
}
