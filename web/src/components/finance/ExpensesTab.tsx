'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher, apiMutate, FetchError } from '@/lib/fetcher';
import { formatIDR } from '@/components/pos/format';
import { toast } from '@/lib/toast';

export function ExpensesTab() {
  const { data: catData } = useSWR('/api/finance/expense-categories', fetcher);
  const categories = (catData as any)?.data ?? [];

  // Default to this month
  const [start, setStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const { data: expData, mutate } = useSWR(`/api/finance/expenses?start=${start}&end=${end}`, fetcher);
  const expenses = (expData as any)?.data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiMutate('/api/finance/expenses', 'POST', {
        category_id: Number(catId),
        amount: Number(amount),
        expense_date: expenseDate,
        notes: notes || undefined,
      });
      toast.success('Pengeluaran berhasil dicatat');
      setModalOpen(false);
      setAmount('');
      setNotes('');
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof FetchError ? err.message : 'Gagal mencatat pengeluaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input type="date" className="input" value={start} onChange={e => setStart(e.target.value)} />
          <input type="date" className="input" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
        <button type="button" className="btn" onClick={() => setModalOpen(true)}>
          Catat Pengeluaran
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-alt)' }}>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Tanggal</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Kategori</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Kode Akun</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>Nominal (Rp)</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Catatan</th>
              <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left' }}>Dicatat Oleh</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Tidak ada pengeluaran pada periode ini.
                </td>
              </tr>
            ) : (
              expenses.map((ex: any) => (
                <tr key={ex.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{new Date(ex.expense_date).toLocaleDateString()}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{ex.expense_categories.name}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{ex.expense_categories.account_code || '-'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 600 }}>{formatIDR(Number(ex.amount))}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{ex.notes || '-'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>{ex.users?.name || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div role="dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
          <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Catat Pengeluaran Baru</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Kategori</label>
                <select className="input" value={catId} onChange={e => setCatId(e.target.value)} required>
                  <option value="">- Pilih Kategori -</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>Belum ada master kategori pengeluaran. Buat di menu General Settings &gt; Library terlebih dahulu.</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Tanggal Pengeluaran</label>
                <input type="date" className="input" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Nominal (Rp)</label>
                <input type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} required min={1} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Catatan</label>
                <input type="text" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Mis: Beli token PLN 100k" />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={isSubmitting || categories.length === 0}>Simpan</button>
                <button type="button" className="btn btn--outline" onClick={() => setModalOpen(false)}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
