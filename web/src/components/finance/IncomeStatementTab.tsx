'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { formatIDR } from '@/components/pos/format';
import * as XLSX from 'xlsx';

export function IncomeStatementTab() {
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

  const { data, error, isLoading } = useSWR(`/api/finance/income-statement?start=${start}&end=${end}`, fetcher);
  const report = (data as any)?.data;

  const formatAcc = (val: number, forceNegative = false) => {
    if (val < 0 || forceNegative) return `(${formatIDR(Math.abs(val))})`;
    return formatIDR(val);
  };

  const exportToExcel = () => {
    if (!report) return;
    const grossSales = report.gross_sales || 0;
    const discount = report.discounts || 0;
    const returns = report.refunds || 0;
    const netSales = report.net_sales || 0;
    const cogs = report.cogs || 0;
    const grossProfit = report.gross_profit || 0;
    const opExpense = report.total_operating_expense || 0;
    const opProfit = report.operating_profit || 0;
    const netProfit = report.net_profit || 0;
    const tax = report.tax_expense || 0;
    const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    const wsData = [
      ['INCOME STATEMENT (Laba Rugi)'],
      ['Periode:', `${start} s/d ${end}`],
      [],
      ['PENDAPATAN'],
      ['Penjualan Kotor (Gross Sales)', grossSales],
      ['Diskon Penjualan', -discount],
      ['Retur / Refund', -returns],
      ['Penjualan Bersih (Net Sales)', netSales],
      [],
      ['BEBAN POKOK PENJUALAN (COGS)', -cogs],
      [],
      ['LABA KOTOR (GROSS PROFIT)', grossProfit],
      [],
      ['BEBAN OPERASIONAL'],
      ...(report.expense_by_category || []).map((e: any) => [`  ${e.category_name}`, -e.total_amount]),
      ['Total Beban Operasional', -opExpense],
      [],
      ['LABA OPERASI (OPERATING PROFIT)', opProfit],
      [],
      ['PENDAPATAN & BEBAN LAIN'],
      ['Pajak (Tax Expense)', -tax],
      [],
      ['LABA BERSIH (NET PROFIT)', netProfit],
      ['Net Profit Margin', `${margin.toFixed(2)}%`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');
    XLSX.writeFile(wb, `Income_Statement_${start}_${end}.xlsx`);
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
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Memuat laporan laba rugi...</div>
      ) : error ? (
        <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger)', color: 'white' }}>Gagal memuat laporan.</div>
      ) : report ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '800px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Income Statement</h2>
            <div style={{ color: 'var(--color-text-muted)' }}>Periode: {start} s/d {end}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono), monospace' }}>
            <tbody>
              {/* REVENUE */}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>Pendapatan (Revenue)</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-2)' }}>Penjualan Bersih (Net Sales)</td>
                <td style={{ textAlign: 'right', paddingBottom: 'var(--space-2)' }}>{formatAcc(report.revenue.net_sales)}</td>
              </tr>

              {/* COGS */}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>Harga Pokok Penjualan (COGS)</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-2)' }}>Total COGS</td>
                <td style={{ textAlign: 'right', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                  {formatAcc(report.cogs.total, true)}
                </td>
              </tr>

              {/* GROSS PROFIT */}
              <tr>
                <td style={{ fontWeight: 800, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>Laba Kotor (Gross Profit)</td>
                <td style={{ textAlign: 'right', fontWeight: 800, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>
                  {formatAcc(report.gross_profit)}
                </td>
              </tr>

              {/* EXPENSES */}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>Biaya Operasional (Expenses)</td>
              </tr>
              {report.expenses.list.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ paddingLeft: 'var(--space-4)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Tidak ada catatan pengeluaran</td>
                </tr>
              ) : (
                report.expenses.list.map((ex: any, idx: number) => {
                  const isLast = idx === report.expenses.list.length - 1;
                  return (
                    <tr key={ex.category_id}>
                      <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>
                        {ex.category_name} {ex.account_code ? `[${ex.account_code}]` : ''}
                      </td>
                      <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)', ...(isLast ? { borderBottom: '1px solid var(--color-border)' } : {}) }}>
                        {formatAcc(ex.total, true)}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr>
                <td style={{ paddingLeft: 'var(--space-4)', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' }}>Total Biaya Operasional</td>
                <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
                  {formatAcc(report.expenses.total, true)}
                </td>
              </tr>

              {/* NET PROFIT */}
              <tr>
                <td style={{ fontWeight: 800, fontSize: 'var(--text-lg)', paddingTop: 'var(--space-4)' }}>Laba Bersih (Net Profit)</td>
                <td style={{ 
                  textAlign: 'right', 
                  fontWeight: 800, 
                  fontSize: 'var(--text-lg)', 
                  paddingTop: 'var(--space-4)',
                  borderBottom: '3px double var(--color-border)',
                  color: report.net_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                }}>
                  {formatAcc(report.net_profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
