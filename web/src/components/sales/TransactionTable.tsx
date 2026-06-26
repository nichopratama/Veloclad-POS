import { Transaction } from './types';
import { formatIDRFromString } from '@/components/pos/format';

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
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>Selesai</span>;
      case 'void':
        return <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>Void</span>;
      case 'cancelled':
        return <span style={{ color: 'var(--color-text-muted)' }}>Batal</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>ID</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Tanggal</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Kasir</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Metode</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Total</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Status</th>
            <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)' }}>{t.id}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(t.created_at).toLocaleString('id-ID')}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.cashier_name}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{t.payment_method || '-'}</td>
              <td className="money" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                {formatIDRFromString(t.total)}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{renderStatusBadge(t.status)}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                  <button className="btn btn--ghost" onClick={() => onDetailClick(t)} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>Detail</button>
                  {(role === 'owner' || role === 'admin') && t.status === 'completed' && (
                    <button className="btn btn--ghost" onClick={() => onVoidClick(t)} style={{ minHeight: '32px', padding: '0 var(--space-2)', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Void</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Belum ada transaksi</td>
            </tr>
          )}
        </tbody>
      </table>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          Total {total} transaksi
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button 
            className="btn btn--ghost" 
            disabled={page <= 1} 
            onClick={() => onPageChange(page - 1)}
          >
            Prev
          </button>
          <span style={{ margin: '0 var(--space-2)' }}>{page} / {totalPages || 1}</span>
          <button 
            className="btn btn--ghost" 
            disabled={page >= totalPages} 
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
