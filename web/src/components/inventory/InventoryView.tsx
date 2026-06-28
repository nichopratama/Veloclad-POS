'use client';

import { useSearchParams } from 'next/navigation';
import { StockSummaryTab } from './StockSummaryTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { AdjustmentsTab } from './AdjustmentsTab';
import { UnderConstruction } from '../ui/UnderConstruction';

interface InventoryViewProps {
  role: string;
}

export function InventoryView({ role }: InventoryViewProps) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  
  const validTabs = ['stock', 'po', 'adjustments', 'bundles'];
  const activeTab = rawTab && validTabs.includes(rawTab) ? rawTab : 'stock';

  // Judul selaras label submenu sidebar.
  const titles: Record<string, string> = {
    stock: 'Stock Summary',
    po: 'Purchase Order',
    adjustments: 'Stock Adjustment',
    bundles: 'Bundle Packages',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
        {titles[activeTab]}
      </h1>

      {activeTab === 'stock' && <StockSummaryTab />}
      {activeTab === 'po' && <PurchaseOrdersTab role={role} />}
      {activeTab === 'adjustments' && <AdjustmentsTab role={role} />}
      {activeTab === 'bundles' && <UnderConstruction />}
    </div>
  );
}
