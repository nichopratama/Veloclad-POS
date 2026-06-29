'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatIDR } from '@/components/pos/format';
import * as XLSX from 'xlsx';

export function CashFlowTab() {
  const [filterType, setFilterType] = useState<'month' | 'year'>('month');
  const [monthVal, setMonthVal] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [yearVal, setYearVal] = useState(() => new Date().getFullYear().toString());

  const getDates = () => {
    if (filterType === 'month') {
      const d = new Date(`${monthVal}-01`);
      const start = `${monthVal}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const end = `${monthVal}-${String(lastDay).padStart(2, '0')}`;
      return { start, end };
    } else {
      return { start: `${yearVal}-01-01`, end: `${yearVal}-12-31` };
    }
  };

  const { start, end } = getDates();

  const { data, error, isLoading } = useSWR(`/api/finance/cash-flow?start=${start}&end=${end}`, fetcher);
  const report = (data as any)?.data;

  const formatAcc = (val: number, forceNegative = false) => {
    if (val < 0 || forceNegative) return `(${formatIDR(Math.abs(val))})`;
    return formatIDR(val);
  };

  const exportToExcel = () => {
    if (!report) return;
    const wsData = [
      ['CASH FLOW STATEMENT (Laporan Arus Kas)'],
      ['Periode:', `${start} s/d ${end}`],
      [],
      ['KAS MASUK (CASH IN)'],
      ['Penerimaan dari Penjualan', report.cash_in.sales],
      ['Total Kas Masuk', report.cash_in.total],
      [],
      ['KAS KELUAR (CASH OUT)'],
      ['Pembayaran Utang (Accounts Payable)', -report.cash_out.payables],
      ['Biaya Operasional (Expenses)', -report.cash_out.expenses],
      ['Total Kas Keluar', -report.cash_out.total],
      [],
      ['ARUS KAS BERSIH (NET CASH FLOW)', report.net_cash_flow]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 45 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, `Cash_Flow_${start}_${end}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <select className="input" style={{ width: '150px' }} value={filterType} onChange={e => setFilterType(e.target.value as any)}>
          <option value="month">Bulanan</option>
          <option value="year">Tahunan</option>
        </select>
        {filterType === 'month' ? (
          <input type="month" className="input" style={{ width: '200px' }} value={monthVal} onChange={e => setMonthVal(e.target.value)} />
        ) : (
          <input type="number" className="input" style={{ width: '120px' }} min="2000" max="2100" value={yearVal} onChange={e => setYearVal(e.target.value)} />
        )}
        {report && (
          <div className="flex gap-1.5 print:hidden items-center bg-[var(--color-surface)] border border-[var(--color-border)] p-1 shadow-sm">
            <button
              onClick={exportToExcel}
              className="hover:bg-[var(--color-accent-soft)] transition-colors flex items-center justify-center p-1.5"
              title="Export to Excel"
            >
              <img src="/icons/excel.svg" alt="Excel" className="w-5 h-5" />
            </button>
            <div className="w-[1px] h-5 bg-[var(--color-border)] opacity-50"></div>
            <button
              onClick={() => window.print()}
              className="hover:bg-[var(--color-accent-soft)] transition-colors flex items-center justify-center p-1.5"
              title="Print PDF"
            >
              <img src="/icons/pdf.svg" alt="PDF" className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Memuat laporan arus kas...</div>
      ) : error ? (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white' }}>Gagal memuat laporan.</div>
      ) : report ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Cash Flow Statement</h2>
            <div style={{ color: 'var(--color-text-muted)' }}>Periode: {start} s/d {end}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono), monospace' }}>
            <tbody>
              {/* CASH IN */}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>Kas Masuk (Cash In)</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>Penerimaan dari Penjualan</td>
                <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {formatAcc(report.cash_in.sales)}
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>Total Kas Masuk</td>
                <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>
                  {formatAcc(report.cash_in.total)}
                </td>
              </tr>

              {/* CASH OUT */}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>Kas Keluar (Cash Out)</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>Pembayaran Utang (Accounts Payable)</td>
                <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)' }}>
                  {formatAcc(report.cash_out.payables, true)}
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>Biaya Operasional (Expenses)</td>
                <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)', borderBottom: '1px solid var(--color-border)' }}>
                  {formatAcc(report.cash_out.expenses, true)}
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>Total Kas Keluar</td>
                <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>
                  {formatAcc(report.cash_out.total, true)}
                </td>
              </tr>

              {/* NET CASH FLOW */}
              <tr>
                <td style={{ fontWeight: 800, fontSize: 'var(--text-lg)', paddingTop: 'var(--space-4)' }}>Arus Kas Bersih (Net Cash Flow)</td>
                <td style={{ 
                  textAlign: 'right', 
                  fontWeight: 800, 
                  fontSize: 'var(--text-lg)', 
                  paddingTop: 'var(--space-4)',
                  borderBottom: '3px double var(--color-border)',
                  color: report.net_cash_flow >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {formatAcc(report.net_cash_flow)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
