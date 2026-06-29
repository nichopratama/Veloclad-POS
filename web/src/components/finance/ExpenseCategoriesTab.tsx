'use client';

import { entityConfigs } from '@/components/library/entityConfigs';
import { EntityManager } from '@/components/library/EntityManager';

interface ExpenseCategoriesTabProps {
  role: string;
}

export function ExpenseCategoriesTab({ role }: ExpenseCategoriesTabProps) {
  const config = entityConfigs['expense-categories'];
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <EntityManager config={config} role={role} />
    </div>
  );
}
