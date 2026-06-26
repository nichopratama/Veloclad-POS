'use client';

import { useSearchParams } from 'next/navigation';
import { StockSummaryTab } from './StockSummaryTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { AdjustmentsTab } from './AdjustmentsTab';

interface InventoryViewProps {
  role: string;
}

export function InventoryView({ role }: InventoryViewProps) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  
  const validTabs = ['stock', 'po', 'adjustments'];
  const activeTab = rawTab && validTabs.includes(rawTab) ? rawTab : 'stock';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
        <a
          href="/inventory?tab=stock"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            fontWeight: activeTab === 'stock' ? 700 : 500,
            color: activeTab === 'stock' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'stock' ? '2px solid var(--color-accent)' : '2px solid transparent',
            whiteSpace: 'nowrap'
          }}
        >
          Stock Summary
        </a>
        <a
          href="/inventory?tab=po"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            fontWeight: activeTab === 'po' ? 700 : 500,
            color: activeTab === 'po' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'po' ? '2px solid var(--color-accent)' : '2px solid transparent',
            whiteSpace: 'nowrap'
          }}
        >
          Purchase Orders
        </a>
        <a
          href="/inventory?tab=adjustments"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            fontWeight: activeTab === 'adjustments' ? 700 : 500,
            color: activeTab === 'adjustments' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'adjustments' ? '2px solid var(--color-accent)' : '2px solid transparent',
            whiteSpace: 'nowrap'
          }}
        >
          Adjustments
        </a>
      </div>

      {activeTab === 'stock' && <StockSummaryTab />}
      {activeTab === 'po' && <PurchaseOrdersTab role={role} />}
      {activeTab === 'adjustments' && <AdjustmentsTab role={role} />}
    </div>
  );
}
