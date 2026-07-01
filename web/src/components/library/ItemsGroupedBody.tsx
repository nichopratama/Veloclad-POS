'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { EntityRow } from './types';
import { formatIDRFromString } from '@/components/pos/format';
import { useLocale } from '@/lib/i18n/LocaleContext';

export type ItemsGroupedBodyHandlers = {
  onEdit: (row: EntityRow) => void;
  onDelete: (id: number | string) => void;
  canMutate: boolean;
  canDelete: boolean;
  colCount: number;
};

type DisplayItem =
  | { type: 'flat'; item: EntityRow }
  | { type: 'group'; name: string; variants: EntityRow[] };

function buildDisplayRows(items: EntityRow[]): DisplayItem[] {
  const groups = new Map<string, EntityRow[]>();
  const order: DisplayItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const catName = (item.categories as { name: string } | null)?.name;
    const variant = item.variant_name as string | null;

    if (catName === 'ACCESSORIES' && variant) {
      const name = item.name as string;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(item);
      if (!seen.has(name)) {
        seen.add(name);
        order.push({ type: 'group', name, variants: [] });
      }
    } else {
      order.push({ type: 'flat', item });
    }
  }

  return order.map((entry) =>
    entry.type === 'group'
      ? { ...entry, variants: groups.get(entry.name) ?? [] }
      : entry,
  );
}

const VARIANT_BADGE: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 'var(--text-xs)',
  fontWeight: 500,
  color: 'var(--color-accent)',
  background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
  borderRadius: '4px',
  padding: '1px 5px',
};

function ActionButtons({
  row,
  onEdit,
  onDelete,
  canMutate,
  canDelete,
}: {
  row: EntityRow;
  onEdit: (r: EntityRow) => void;
  onDelete: (id: number | string) => void;
  canMutate: boolean;
  canDelete: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
      {canMutate && (
        <button
          className="hover:scale-110 transition-transform p-1 text-[var(--color-accent)]"
          onClick={(e) => { e.stopPropagation(); onEdit(row); }}
          title="Edit"
        >
          <Pencil size={18} />
        </button>
      )}
      {canDelete && (
        <button
          className="hover:scale-110 transition-transform p-1 text-[var(--color-danger)]"
          onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}

function ActiveBadge({ value, activeLabel, inactiveLabel }: { value: boolean; activeLabel: string; inactiveLabel: string }) {
  return value
    ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{activeLabel}</span>
    : <span style={{ color: 'var(--color-text-muted)' }}>{inactiveLabel}</span>;
}

export function ItemsGroupedBody({
  items,
  onEdit,
  onDelete,
  canMutate,
  canDelete,
  colCount,
}: { items: EntityRow[] } & ItemsGroupedBodyHandlers): ReactNode {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { t } = useLocale();

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const rows = buildDisplayRows(items);

  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={colCount} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {t.common.noData}
        </td>
      </tr>
    );
  }

  return (
    <>
      {rows.map((entry) => {
        if (entry.type === 'flat') {
          const { item } = entry;
          return (
            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{item.code as string}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{item.name as string}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                {(item.categories as { name: string } | null)?.name ?? '-'}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                <span className="money">{formatIDRFromString(String(item.price ?? 0))}</span>
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>{item.stock as number}</td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <ActiveBadge value={item.is_active as boolean} activeLabel={t.common.active} inactiveLabel={t.common.inactive} />
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                <ActionButtons row={item} onEdit={onEdit} onDelete={onDelete} canMutate={canMutate} canDelete={canDelete} />
              </td>
            </tr>
          );
        }

        const { name, variants } = entry;
        const isOpen = expanded.has(name);
        const totalStock = variants.reduce((s, v) => s + (v.stock as number), 0);
        const prices = variants.map((v) => Number(v.price ?? 0));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceDisplay =
          minPrice === maxPrice
            ? formatIDRFromString(String(minPrice))
            : `${formatIDRFromString(String(minPrice))} – ${formatIDRFromString(String(maxPrice))}`;

        return (
          <Fragment key={`group-${name}`}>
            {/* Group header */}
            <tr
              style={{
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                cursor: 'pointer',
              }}
              onClick={() => toggle(name)}
            >
              <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 700 }}>{name}</span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-border)',
                    borderRadius: '999px',
                    padding: '0 6px',
                    lineHeight: 1.6,
                  }}>
                    {variants.length}
                  </span>
                </div>
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                ACCESSORIES
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {priceDisplay}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 700 }}>
                {totalStock}
              </td>
              <td style={{ padding: 'var(--space-3) var(--space-4)' }} />
              <td style={{ padding: 'var(--space-3) var(--space-4)' }} />
            </tr>

            {/* Variant sub-rows */}
            {isOpen && variants.map((variant) => (
              <tr
                key={variant.id}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  background: 'color-mix(in srgb, var(--color-surface-2) 45%, transparent)',
                }}
              >
                <td style={{ padding: 'var(--space-2) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', paddingLeft: 'var(--space-8)' }}>
                  {variant.code as string}
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', paddingLeft: 'calc(var(--space-4) + 20px)' }}>
                  <span style={VARIANT_BADGE}>{variant.variant_name as string}</span>
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)' }} />
                <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right' }}>
                  <span className="money" style={{ fontSize: 'var(--text-sm)' }}>
                    {formatIDRFromString(String(variant.price ?? 0))}
                  </span>
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right', fontSize: 'var(--text-sm)' }}>
                  {variant.stock as number}
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                  <ActiveBadge value={variant.is_active as boolean} activeLabel={t.common.active} inactiveLabel={t.common.inactive} />
                </td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'center' }}>
                  <ActionButtons row={variant} onEdit={onEdit} onDelete={onDelete} canMutate={canMutate} canDelete={canDelete} />
                </td>
              </tr>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}
