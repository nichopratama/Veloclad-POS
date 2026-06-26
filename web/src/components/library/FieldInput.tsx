import { useId } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { FieldDef, FormValue, EntityRow } from './types';

interface FieldInputProps {
  field: FieldDef;
  value: FormValue;
  onChange: (val: FormValue) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const fieldId = useId();
  const { data: optionsData } = useSWR<{ data: EntityRow[] }>(
    field.type === 'select' && field.optionsEndpoint ? field.optionsEndpoint : null,
    fetcher
  );

  const options: EntityRow[] = optionsData?.data ?? [];
  const textValue = value == null ? '' : String(value);

  switch (field.type) {
    case 'text':
    case 'email':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={fieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <input
            id={fieldId}
            type={field.type}
            className="input"
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </div>
      );
    case 'textarea':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={fieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <textarea
            id={fieldId}
            className="input"
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            style={{ minHeight: '80px', paddingTop: 'var(--space-2)' }}
          />
        </div>
      );
    case 'number':
    case 'money':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={fieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <input
            id={fieldId}
            type="number"
            className="input"
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </div>
      );
    case 'checkbox':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.label}
        </label>
      );
    case 'select':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <label htmlFor={fieldId} style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {field.label} {field.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <select
            id={fieldId}
            className="input"
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            {field.nullable && <option value="">- Pilih -</option>}
            {!field.nullable && !value && <option value="" disabled>- Pilih -</option>}
            {options.map((opt) => (
              <option key={String(opt[field.optionValueKey!])} value={String(opt[field.optionValueKey!])}>
                {String(opt[field.optionLabelKey!] ?? '')}
              </option>
            ))}
          </select>
        </div>
      );
    default:
      return null;
  }
}
