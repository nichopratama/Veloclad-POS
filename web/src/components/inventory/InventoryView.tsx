'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/LocaleContext';
import { StockSummaryTab } from './StockSummaryTab';
import { PurchaseOrdersTab } from './PurchaseOrdersTab';
import { AdjustmentsTab } from './AdjustmentsTab';
import { PayablesManager } from './PayablesManager';
import { ConsignmentReport } from './ConsignmentReport';
import { UnderConstruction } from '../ui/UnderConstruction';

interface InventoryViewProps {
  role: string;
}

export function InventoryView({ role }: InventoryViewProps) {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const rawTab = searchParams.get('tab');

  const validTabs = ['stock', 'po', 'adjustments', 'bundles', 'payables', 'consignment'];
  const activeTab = rawTab && validTabs.includes(rawTab) ? rawTab : 'stock';

  // Judul selaras label submenu sidebar.
  const titles: Record<string, string> = {
    stock: t.inventoryMenu.stockTitle,
    po: t.inventoryMenu.poTitle,
    payables: t.inventoryMenu.payablesTitle,
    adjustments: t.inventoryMenu.adjustmentsTitle,
    bundles: t.inventoryMenu.bundlesTitle,
    consignment: t.inventoryMenu.consignmentTitle,
  };

  const descriptions: Record<string, string> = {
    stock: t.inventoryMenu.stockDesc,
    po: t.inventoryMenu.poDesc,
    payables: t.inventoryMenu.payablesDesc,
    adjustments: t.inventoryMenu.adjustmentsDesc,
    bundles: t.inventoryMenu.bundlesDesc,
    consignment: t.inventoryMenu.consignmentDesc,
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
      {activeTab === 'payables' && <PayablesManager role={role} />}
      {activeTab === 'adjustments' && <AdjustmentsTab role={role} />}
      {activeTab === 'consignment' && <ConsignmentReport />}
      {activeTab === 'bundles' && <UnderConstruction />}
    </div>
  );
}
