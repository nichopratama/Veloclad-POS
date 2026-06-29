'use client';

import { useSearchParams } from 'next/navigation';
import { ExpensesTab } from './ExpensesTab';
import { IncomeStatementTab } from './IncomeStatementTab';
import { CashFlowTab } from './CashFlowTab';
import { ExpenseCategoriesTab } from './ExpenseCategoriesTab';
import { PayablesManager } from '../inventory/PayablesManager';

interface FinanceViewProps {
  role: string;
}

export function FinanceView({ role }: FinanceViewProps) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  
  const validTabs = ['expenses', 'income', 'cashflow', 'categories', 'payables'];
  const activeTab = rawTab && validTabs.includes(rawTab) ? rawTab : 'income';

  const titles: Record<string, string> = {
    expenses: 'Expenses Manager',
    categories: 'Expense Categories',
    payables: 'Accounts Payable',
    income: 'Income Statement (Laba Rugi)',
    cashflow: 'Cash Flow (Arus Kas)',
  };

  const descriptions: Record<string, string> = {
    expenses: 'Record and track your operational expenses.',
    categories: 'Manage your operational expense categories.',
    payables: 'Manage supplier debt and consignment settlements.',
    income: 'View your net profit derived from sales, COGS, and expenses.',
    cashflow: 'Monitor your real cash in and out to maintain liquidity.',
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

      {activeTab === 'expenses' && <ExpensesTab />}
      {activeTab === 'categories' && <ExpenseCategoriesTab role={role} />}
      {activeTab === 'payables' && <PayablesManager role={role} />}
      {activeTab === 'income' && <IncomeStatementTab />}
      {activeTab === 'cashflow' && <CashFlowTab />}
    </div>
  );
}
