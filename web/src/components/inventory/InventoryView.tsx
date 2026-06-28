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

  const descriptions: Record<string, string> = {
    stock: 'Monitor and manage the real-time availability of your products.',
    po: 'Create and track purchase orders to restock your items.',
    adjustments: 'Adjust stock levels for missing, damaged, or returned items.',
    bundles: 'Combine multiple items into bundle packages for special deals.',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
          {titles[activeTab]}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          {descriptions[activeTab]}
        </p>
      </div>

      {activeTab === 'stock' && <StockSummaryTab />}
      {activeTab === 'po' && <PurchaseOrdersTab role={role} />}
      {activeTab === 'adjustments' && <AdjustmentsTab role={role} />}
      {activeTab === 'bundles' && <UnderConstruction />}
    </div>
  );
}
