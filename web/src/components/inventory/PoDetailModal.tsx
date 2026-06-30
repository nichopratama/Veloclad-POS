import { PurchaseOrder } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { isAdmin } from '@/lib/roles';

interface PoDetailModalProps {
  role: string;
  po: PurchaseOrder;
  onClose: () => void;
}

export function PoDetailModal({ role, po, onClose }: PoDetailModalProps) {
  const { t } = useLocale();
  const canWrite = isAdmin(role);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-accent)', margin: 0 }}>Detail PO: {po.po_number}</h2>
          <button type="button" className="btn btn--outline" onClick={onClose}>{t.common.close}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', background: 'var(--color-bg-subtle)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.common.supplier}</div>
            <div style={{ fontWeight: 600 }}>{po.suppliers?.name || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.common.date}</div>
            <div style={{ fontWeight: 600 }}>{new Date(po.created_at).toLocaleDateString('id-ID')}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.inventory.payment}</div>
            <div style={{ fontWeight: 600 }}>{po.payment_method || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.common.status}</div>
            <div style={{ fontWeight: 600 }}>{po.status === 'pending' ? t.inventory.pending : t.inventory.received}</div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 'var(--text-md)', margin: '0 0 var(--space-2)' }}>{t.inventory.poItems || 'Item PO'}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
                <th style={{ padding: 'var(--space-2) var(--space-3)' }}>{t.stock.itemName}</th>
                <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'center' }}>{t.common.quantity}</th>
                {canWrite && <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>{t.inventory.unitPrice}</th>}
                {canWrite && <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Subtotal</th>}
              </tr>
            </thead>
            <tbody>
              {po.po_items && po.po_items.length > 0 ? (
                po.po_items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                      <div style={{ fontWeight: 600 }}>{item.items?.name || '-'}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{item.items?.code || '-'}</div>
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'center' }}>{item.qty}</td>
                    {canWrite && <td className="money" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>{formatIDRFromString(String(item.cost))}</td>}
                    {canWrite && <td className="money" style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 600 }}>{formatIDRFromString(String(item.subtotal))}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {t.inventory.noItemFound}
                  </td>
                </tr>
              )}
            </tbody>
            {canWrite && (
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 700 }}>{t.common.total}</td>
                  <td colSpan={2} className="money" style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 700, color: 'var(--color-accent)' }}>
                    {formatIDRFromString(po.total_amount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}