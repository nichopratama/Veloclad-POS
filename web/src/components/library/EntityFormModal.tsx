import { useState, useEffect } from 'react';
import { EntityConfig, FormValue, EntityRow } from './types';
import { FieldInput } from './FieldInput';
import { apiMutate, FetchError } from '@/lib/fetcher';
import { useLocale } from '@/lib/i18n/LocaleContext';

interface EntityFormModalProps {
  config: EntityConfig;
  initialData: EntityRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EntityFormModal({ config, initialData, onClose, onSuccess }: EntityFormModalProps) {
  const { t } = useLocale();
  const [formData, setFormData] = useState<Record<string, FormValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEdit = !!initialData;

  useEffect(() => {
    const init: Record<string, FormValue> = {};
    if (initialData) {
      config.fields.forEach(f => {
        init[f.key] = (initialData[f.key] ?? null) as FormValue;
      });
    } else {
      config.fields.forEach(f => {
        init[f.key] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'checkbox' ? false : (f.nullable ? null : ''));
      });
    }
    setFormData(init);
  }, [config, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const payload: Record<string, FormValue | undefined> = {};

    config.fields.forEach(f => {
      const val = formData[f.key];

      if (f.type === 'number' || f.type === 'money') {
        if (val === '' || val === null || val === undefined) {
          payload[f.key] = f.nullable ? null : 0;
        } else {
          payload[f.key] = Number(val);
        }
      } else if (f.type === 'select') {
        if (val === '' || val === null || val === undefined) {
          payload[f.key] = f.nullable ? null : undefined;
        } else {
          payload[f.key] = Number(val);
        }
      } else if (f.type === 'email' || f.type === 'text' || f.type === 'textarea') {
        if (val === '') {
          payload[f.key] = f.nullable ? null : '';
        } else {
          payload[f.key] = val;
        }
      } else {
        payload[f.key] = val;
      }
    });

    try {
      if (isEdit) {
        await apiMutate(`${config.endpoint}/${initialData.id}`, 'PUT', payload);
      } else {
        await apiMutate(config.endpoint, 'POST', payload);
      }
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof FetchError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMsg(t.common.sessionInvalid);
        } else {
          setErrorMsg(err.message);
        }
      } else {
        setErrorMsg(t.common.unknownError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(20% 0.02 262 / 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-4)',
        zIndex: 50,
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(100%, 500px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>
            {isEdit ? t.library.edit(config.label) : t.library.addLabel(config.label)}
          </h2>
          <button type="button" className="btn btn--ghost" onClick={onClose} style={{ minHeight: '32px', padding: '0 var(--space-2)' }}>{t.common.close}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorMsg && (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger)', color: 'white', borderRadius: 'var(--radius-sm)' }}>
                {errorMsg}
              </div>
            )}

            {config.fields.map(f => (
              <FieldInput
                key={f.key}
                field={f}
                value={formData[f.key]}
                onChange={(val) => setFormData(prev => ({ ...prev, [f.key]: val }))}
              />
            ))}
          </div>

          <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={onClose}>{t.common.cancel}</button>
            <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? t.common.saving : t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
