'use client';

import { useState, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { DateRangePicker, DateRange } from '@/components/ui/DateRangePicker';
import { Activity, TrendingUp, CreditCard, ShoppingBag, Grid, Users, Printer, Banknote, QrCode, ArrowRightLeft, X, Utensils, Coffee, Pizza, Shirt, Wrench, Package, Scissors, Monitor, Box, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLocale } from '@/lib/i18n/LocaleContext';

type ReportTab = 'summary' | 'gross-profit' | 'payment-methods' | 'items-sales' | 'category-sales' | 'staff-sales';

const TAB_CONFIG: { id: ReportTab; icon: React.ElementType }[] = [
  { id: 'summary', icon: Activity },
  { id: 'gross-profit', icon: TrendingUp },
  { id: 'payment-methods', icon: CreditCard },
  { id: 'items-sales', icon: ShoppingBag },
  { id: 'category-sales', icon: Grid },
  { id: 'staff-sales', icon: Users },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

const getTodayISO = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export function ReportsView() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTabRaw = searchParams.get('tab') as ReportTab | null;
  const activeTab = currentTabRaw && TAB_CONFIG.some((tab) => tab.id === currentTabRaw) ? currentTabRaw : 'summary';

  const tabLabels: Record<ReportTab, string> = {
    'summary': t.reports.tabs.summary,
    'gross-profit': t.reports.tabs.grossProfit,
    'payment-methods': t.reports.tabs.paymentMethods,
    'items-sales': t.reports.tabs.itemsSales,
    'category-sales': t.reports.tabs.categorySales,
    'staff-sales': t.reports.tabs.staffSales,
  };

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayISO());
  const [page, setPage] = useState(1);

  const { data: apiResponse, error, isLoading } = useSWR(
    `/api/reports/dynamic?tab=${activeTab}&start=${startDate}&end=${endDate}&page=${page}&limit=10`,
    fetcher
  );

  const reportData = apiResponse?.data || [];
  const pagination = apiResponse?.pagination;

  const handleTabChange = (tabId: ReportTab) => {
    setPage(1); // Reset page on tab change
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/reports?${params.toString()}`);
  };

  const exportSummaryToExcel = () => {
    if (!reportData || Array.isArray(reportData)) return;
    
    const grossSales = reportData.gross_sales_categories?.reduce((acc: number, c: any) => acc + c.amount, 0) || 0;
    const grossProfit = reportData.net_sales - (reportData.cogs || 0);
    const margin = reportData.net_sales > 0 ? (grossProfit / reportData.net_sales) * 100 : 0;

    const wsData = [
      ['LAPORAN LABA RUGI (INCOME STATEMENT)'],
      ['Periode:', reportData.date],
      [],
      ['PENDAPATAN (REVENUE)'],
      ['Penjualan Kotor (Gross Sales)', grossSales],
      ['Diskon Penjualan', -reportData.discounts],
      ['Retur / Refund', -reportData.refunds],
      ['Penjualan Bersih (Net Sales)', reportData.net_sales],
      [],
      ['BEBAN POKOK PENJUALAN (COGS)'],
      ['Harga Pokok Penjualan (HPP)', -(reportData.cogs || 0)],
      [],
      ['LABA KOTOR (GROSS PROFIT)', grossProfit],
      ['Margin Laba Kotor', `${margin.toFixed(2)}%`],
      [],
      ['ARUS KAS & PAJAK'],
      ['Pajak Dipungut (Tax)', reportData.tax],
      ['Total Kas Diterima', reportData.total_collected]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `Laporan_Keuangan_${reportData.date}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--color-text)] mb-1">
            {t.reports.title}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm m-0">
            Analyze your business performance with detailed sales and item reports.
          </p>
        </div>

        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-2 min-w-max">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-all whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)]'
                        : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                    }`}
                >
                  <Icon size={16} />
                  {tabLabels[tab.id]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 items-center pb-4 border-b border-[var(--color-border)]">
          <DateRangePicker 
            value={{ start: startDate, end: endDate }}
            onChange={(range: DateRange) => {
              setStartDate(range.start);
              setEndDate(range.end);
            }}
          />
          {activeTab === 'summary' && !isLoading && !error && (
            <div className="flex gap-1.5 print:hidden items-center bg-[var(--color-surface)] border border-[var(--color-border)] p-1 shadow-sm">
              <button
                onClick={exportSummaryToExcel}
                className="hover:bg-[var(--color-accent-soft)] transition-colors flex items-center justify-center p-1.5"
                title={t.reports.exportExcel}
              >
                <img src="/icons/excel.svg" alt={t.reports.exportExcel} className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-5 bg-[var(--color-border)] opacity-50"></div>
              <button
                onClick={() => window.print()}
                className="hover:bg-[var(--color-accent-soft)] transition-colors flex items-center justify-center p-1.5"
                title={t.reports.printPdf}
              >
                <img src="/icons/pdf.svg" alt={t.reports.printPdf} className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg overflow-hidden flex flex-col">
        {isLoading && <div className="p-8 text-center text-[var(--color-text-muted)]">{t.reports.loading}</div>}
        {error && <div className="p-8 text-center text-red-500">{t.reports.loadError}</div>}

        {!isLoading && !error && (
          (Array.isArray(reportData) ? reportData.length === 0 : !reportData)
        ) && (
          <div className="p-8 text-center text-[var(--color-text-muted)]">{t.reports.noData}</div>
        )}

        {!isLoading && !error && (
          (Array.isArray(reportData) ? reportData.length > 0 : !!reportData)
        ) && (
          <>
            {activeTab === 'summary' && <SummaryReport data={reportData} />}
            {activeTab === 'gross-profit' && <GrossProfitTable data={reportData as any[]} />}
            {activeTab === 'payment-methods' && <PaymentMethodsGrid data={reportData as any[]} startDate={startDate} endDate={endDate} />}
            {activeTab === 'items-sales' && <ItemsSalesTable data={reportData as any[]} pagination={pagination} setPage={setPage} />}
            {activeTab === 'category-sales' && <CategorySalesGrid data={reportData as any[]} startDate={startDate} endDate={endDate} />}
            {activeTab === 'staff-sales' && <StaffSalesGrid data={reportData as any[]} />}
          </>
        )}
      </div>
    </div>
  );
}

// --- Dynamic Table Components ---

function TableWrapper({ children }: { children: React.ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}

const tableClass = "w-full border-collapse text-left";
const thClass = "px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider";
const tdClass = "px-4 py-3 border-b border-[var(--color-border)] text-sm text-[var(--color-text)]";

function SummaryReport({ data }: { data: any }) {
  const { t } = useLocale();
  if (!data) return null;

  const grossSales = data.gross_sales_categories?.reduce((acc: number, c: any) => acc + c.amount, 0) || 0;
  const grossProfit = data.net_sales - (data.cogs || 0);
  const margin = data.net_sales > 0 ? (grossProfit / data.net_sales) * 100 : 0;

  const formatAcc = (val: number, forceNegative = false) => {
    if (val < 0 || forceNegative) return `(${formatCurrency(Math.abs(val))})`;
    return formatCurrency(val);
  };

  return (
    <div className="w-full flex flex-col p-2">
      <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)] w-full overflow-x-auto print:shadow-none print:border-none print:p-0">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SALES SUMMARY</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>{t.reports.period} {data.date}</div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono), monospace', fontSize: '0.875rem' }}>
          <tbody>
            {/* REVENUE */}
            <tr>
              <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>{t.reports.revenue}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>{t.reports.grossSales} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(Gross Sales)</span></td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)' }}>{formatAcc(grossSales)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>{t.reports.salesDiscount}</td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)' }}>{formatAcc(data.discounts, true)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>{t.reports.returnsRefunds}</td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)', borderBottom: '1px solid var(--color-border)' }}>{formatAcc(data.refunds, true)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>{t.reports.netSales} <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 400 }}>(Net Sales)</span></td>
              <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>{formatAcc(data.net_sales)}</td>
            </tr>

            {/* COGS */}
            <tr>
              <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-2)' }}>{t.reports.cogs}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>{t.reports.costOfGoods} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(Total HPP)</span></td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)', borderBottom: '1px solid var(--color-border)' }}>{formatAcc(data.cogs || 0, true)}</td>
            </tr>

            {/* GROSS PROFIT */}
            <tr>
              <td style={{ fontWeight: 800, fontSize: '1rem', paddingTop: 'var(--space-4)' }}>{t.reports.grossProfit} <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 400 }}>(GROSS PROFIT)</span></td>
              <td style={{ 
                textAlign: 'right', 
                fontWeight: 800, 
                fontSize: '1rem', 
                paddingTop: 'var(--space-4)',
                borderBottom: '3px double var(--color-border)'
              }}>{formatAcc(grossProfit)}</td>
            </tr>
            <tr>
              <td style={{ paddingBottom: 'var(--space-4)', paddingTop: 'var(--space-1)', color: 'var(--color-text-muted)' }}>{t.reports.grossMargin} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(Gross Margin)</span></td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-4)', paddingTop: 'var(--space-1)' }}>{margin.toFixed(2)}%</td>
            </tr>

            {/* CASH AND TAX */}
            <tr>
              <td colSpan={2} style={{ fontWeight: 700, paddingTop: 'var(--space-4)' }}>{t.reports.cashAndTax}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', paddingBottom: 'var(--space-1)' }}>{t.reports.taxCollected} <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>(Tax)</span></td>
              <td style={{ textAlign: 'right', paddingBottom: 'var(--space-1)' }}>{formatAcc(data.tax)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: 'var(--space-4)', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>{t.reports.totalCashReceived} <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 400 }}>(Total Collected)</span></td>
              <td style={{ textAlign: 'right', fontWeight: 600, paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>{formatAcc(data.total_collected)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-[var(--color-border)] print:hidden">
          <h3 className="font-bold mb-3 text-[var(--color-text-muted)] text-xs uppercase tracking-wider">{t.reports.paymentBreakdown}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.payment_methods?.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-md bg-[var(--color-accent-soft)]" style={{ fontFamily: 'var(--font-mono), monospace' }}>
                <span className="font-medium text-[var(--color-text)]">{p.method}</span>
                <span className="font-semibold text-[var(--color-text)]">{formatAcc(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GrossProfitTable({ data }: { data: any[] }) {
  const { t, locale } = useLocale();
  const localeStr = locale === 'en' ? 'en-US' : 'id-ID';

  const formatDateString = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dayName = new Intl.DateTimeFormat(localeStr, { weekday: 'long' }).format(d);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>{t.reports.date}</th>
            <th className={`${thClass} text-right`}>{t.reports.netSalesCol}</th>
            <th className={`${thClass} text-right`}>{t.reports.totalCogsCol}</th>
            <th className={`${thClass} text-right`}>{t.reports.grossProfitCol}</th>
            <th className={`${thClass} text-right`}>{t.reports.margin}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{formatDateString(row.date)}</td>
              <td className={`${tdClass} text-right money`}>{formatCurrency(row.net_sales)}</td>
              <td className={`${tdClass} text-right money`}>{formatCurrency(row.cogs)}</td>
              <td className={`${tdClass} text-right money text-[var(--color-success)]`}>{formatCurrency(row.gross_profit)}</td>
              <td className={`${tdClass} text-right`}>{row.margin.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function PaymentMethodDetailModal({
  isOpen, onClose, methodName, startDate, endDate
}: {
  isOpen: boolean; onClose: () => void; methodName: string; startDate: string; endDate: string;
}) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const { data: apiResponse, error, isLoading } = useSWR(
    isOpen ? `/api/reports/dynamic?tab=payment-methods-detail&methodName=${encodeURIComponent(methodName)}&start=${startDate}&end=${endDate}&page=${page}&limit=10` : null,
    fetcher
  );

  if (!isOpen) return null;

  const txData = apiResponse?.data || [];
  const pagination = apiResponse?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--color-bg)] w-full max-w-4xl rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">{t.reports.txDetail(methodName)}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{t.reports.periodRange(startDate, endDate)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-accent-soft)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <div className="text-center py-8 text-[var(--color-text-muted)]">{t.reports.loadingTx}</div>}
          {error && <div className="text-center py-8 text-red-500">{t.reports.loadDetailError}</div>}

          {!isLoading && !error && txData.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)]">{t.reports.noTxFound}</div>
          )}

          {!isLoading && !error && txData.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">{t.reports.time}</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">{t.reports.transactionId}</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">{t.reports.cashier}</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase text-right">{t.common.total}</th>
                </tr>
              </thead>
              <tbody>
                {txData.map((tx: any) => (
                  <Fragment key={tx.id}>
                    <tr className="hover:bg-[var(--color-surface)]/50 transition-colors border-b border-[var(--color-border)]">
                      <td className="py-3 text-sm text-[var(--color-text)] whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 text-sm font-mono">
                        <button
                          onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                          className="text-blue-500 hover:text-blue-600 hover:underline text-left font-medium flex items-center gap-1"
                        >
                          {tx.id}
                        </button>
                      </td>
                      <td className="py-3 text-sm text-[var(--color-text)]">{tx.cashier_name}</td>
                      <td className="py-3 text-sm font-semibold text-[var(--color-text)] text-right money whitespace-nowrap">{formatCurrency(tx.total)}</td>
                    </tr>
                    
                    {expandedTxId === tx.id && tx.transaction_items && (
                      <tr className="bg-[var(--color-accent-soft)]">
                        <td colSpan={4} className="p-4 border-b border-[var(--color-border)]">
                          <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-[var(--color-bg)]">
                                <tr>
                                  <th className="px-4 py-2 font-medium text-[var(--color-text-muted)]">{t.reports.itemDetailHeader}</th>
                                  <th className="px-4 py-2 font-medium text-[var(--color-text-muted)] text-right">{t.reports.price}</th>
                                  <th className="px-4 py-2 font-medium text-[var(--color-text-muted)] text-right">{t.reports.qty}</th>
                                  <th className="px-4 py-2 font-medium text-[var(--color-text-muted)] text-right">{t.reports.discount}</th>
                                  <th className="px-4 py-2 font-medium text-[var(--color-text-muted)] text-right">{t.common.total}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tx.transaction_items.map((item: any, idx: number) => (
                                  <tr key={idx} className="border-t border-[var(--color-border)]">
                                    <td className="px-4 py-2 text-[var(--color-text)]">{item.items?.name || 'Unknown Item'}</td>
                                    <td className="px-4 py-2 text-right text-[var(--color-text-muted)] money">{formatCurrency(item.price)}</td>
                                    <td className="px-4 py-2 text-right font-medium">{item.qty}</td>
                                    <td className="px-4 py-2 text-right text-red-500 money">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-[var(--color-text)] money">{formatCurrency(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination UI */}
        {!isLoading && !error && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] gap-4">
            <div className="text-sm text-[var(--color-text-muted)]">
              {t.reports.showing((pagination.page - 1) * pagination.limit + 1, Math.min(pagination.page * pagination.limit, pagination.total), pagination.total)}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
              >
                &lt;
              </button>
              
              {/* Pagination Numbers (Simplified) */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: pagination.totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNum === 1 || 
                    pageNum === pagination.totalPages || 
                    (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                          pagination.page === pageNum 
                            ? 'bg-blue-500 text-white border-transparent' 
                            : 'border border-[var(--color-border)] hover:bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  
                  // Show ellipsis
                  if (
                    pageNum === pagination.page - 2 || 
                    pageNum === pagination.page + 2
                  ) {
                    return <span key={pageNum} className="px-1 text-[var(--color-text-muted)]">...</span>;
                  }
                  
                  return null;
                })}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryDetailModal({
  isOpen, onClose, categoryName, startDate, endDate
}: {
  isOpen: boolean; onClose: () => void; categoryName: string; startDate: string; endDate: string;
}) {
  const { t } = useLocale();
  const [page, setPage] = useState(1);

  const { data: apiResponse, error, isLoading } = useSWR(
    isOpen ? `/api/reports/dynamic?tab=category-items-detail&categoryName=${encodeURIComponent(categoryName)}&start=${startDate}&end=${endDate}&page=${page}&limit=10` : null,
    fetcher
  );

  if (!isOpen) return null;

  const itemData = apiResponse?.data || [];
  const pagination = apiResponse?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--color-bg)] w-full max-w-4xl rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">{t.reports.itemSalesDetail(categoryName)}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{t.reports.periodRange(startDate, endDate)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-accent-soft)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <div className="text-center py-8 text-[var(--color-text-muted)]">{t.reports.loadingItems}</div>}
          {error && <div className="text-center py-8 text-red-500">{t.reports.loadDetailError}</div>}

          {!isLoading && !error && itemData.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)]">{t.reports.noItemsSold}</div>
          )}
          
          {!isLoading && !error && itemData.length > 0 && (
            <ItemsSalesTable data={itemData} pagination={pagination} setPage={setPage} />
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsGrid({ data, startDate, endDate }: { data: any[]; startDate: string; endDate: string }) {
  const { t } = useLocale();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const getIconAndColor = (method: string) => {
    const lower = method.toLowerCase();
    let Icon = Banknote; // Default / Cash
    if (lower.includes('card')) Icon = CreditCard;
    else if (lower.includes('qris')) Icon = QrCode;
    else if (lower.includes('transfer')) Icon = ArrowRightLeft;
    
    return { icon: Icon, bgColor: 'bg-[var(--color-accent)]', color: 'text-[var(--color-accent)]', bgSoft: 'bg-[var(--color-accent)]/10' };
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
        {data.map((row, i) => {
          const { icon: Icon, bgColor, color, bgSoft } = getIconAndColor(row.method);
          const isUp = row.percentage > 0;
          
          return (
            <div key={i} className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} text-white shadow-sm`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text-muted)] truncate max-w-[120px]" title={row.method}>{row.method}</div>
                    <div className="text-lg lg:text-xl tracking-tight text-[var(--color-text)] money truncate">
                      {formatCurrency(row.total)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="text-sm font-medium text-[var(--color-text-muted)]">
                    {t.reports.trxCount(row.count)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>
                    {row.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedMethod(row.method)}
                className={`w-full py-3 px-5 text-left text-sm font-semibold border-t border-[var(--color-border)] bg-[var(--color-surface)] ${color} hover:${bgSoft} transition-colors group-hover:bg-[var(--color-accent-soft)]`}
              >
                {t.reports.viewAll}
              </button>
            </div>
          );
        })}
      </div>

      <PaymentMethodDetailModal 
        isOpen={selectedMethod !== null} 
        onClose={() => setSelectedMethod(null)} 
        methodName={selectedMethod || ''} 
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
}
function CategorySalesGrid({ data, startDate, endDate }: { data: any[]; startDate: string; endDate: string }) {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getCategoryTheme = (name: string, index: number) => {
    if (name === 'Tanpa Kategori' || !name) {
      return { bgColor: 'bg-slate-500', color: 'text-slate-500', bgSoft: 'bg-slate-500/10', icon: Box };
    }
    
    let Icon = Grid;
    const lower = name.toLowerCase();
    if (lower.includes('makan') || lower.includes('food')) Icon = Utensils;
    else if (lower.includes('minum') || lower.includes('drink') || lower.includes('beverage')) Icon = Coffee;
    else if (lower.includes('baju') || lower.includes('pakaian') || lower.includes('kaos') || lower.includes('shirt') || lower.includes('celana')) Icon = Shirt;
    else if (lower.includes('jasa') || lower.includes('service') || lower.includes('repair')) Icon = Wrench;
    else if (lower.includes('snack') || lower.includes('camilan') || lower.includes('kue')) Icon = Pizza;
    else if (lower.includes('paket') || lower.includes('bundle')) Icon = Package;
    else if (lower.includes('potong') || lower.includes('salon')) Icon = Scissors;
    else if (lower.includes('elektronik') || lower.includes('electronic') || lower.includes('hp') || lower.includes('komputer')) Icon = Monitor;
    
    return { bgColor: 'bg-[var(--color-accent)]', color: 'text-[var(--color-accent)]', bgSoft: 'bg-[var(--color-accent)]/10', icon: Icon };
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
        {data.map((row, i) => {
          const { bgColor, color, bgSoft, icon: Icon } = getCategoryTheme(row.category_name, i);
          const isBestSeller = i === 0 && row.total_sales > 0; // Data is already sorted by total_sales desc
          
          return (
            <div key={i} className={`flex flex-col bg-[var(--color-surface)] border ${isBestSeller ? 'border-amber-400/50 shadow-amber-400/10 shadow-lg relative' : 'border-[var(--color-border)] shadow-sm hover:shadow-md'} rounded-xl overflow-hidden transition-all duration-200 group`}>
              
              {isBestSeller && (
                <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm border-b border-l border-amber-200 flex items-center gap-1 z-10">
                  <span className="text-[10px]">👑</span> {t.reports.bestSeller}
                </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} text-white shadow-sm flex-shrink-0`}>
                    <Icon size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-muted)] truncate" title={row.category_name}>{row.category_name}</div>
                    <div className="text-lg lg:text-xl tracking-tight text-[var(--color-text)] money truncate">
                      {formatCurrency(row.total_sales)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="text-sm font-medium text-[var(--color-text-muted)] truncate">
                    {t.reports.soldCount(row.total_qty)}
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold text-[var(--color-text-muted)]`}>
                    {row.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedCategory(row.category_name)}
                className={`w-full py-3 px-5 text-left text-sm font-semibold border-t border-[var(--color-border)] bg-[var(--color-surface)] ${color} hover:${bgSoft} transition-colors group-hover:bg-[var(--color-accent-soft)]`}
              >
                {t.reports.viewAllItems}
              </button>
            </div>
          );
        })}
      </div>

      <CategoryDetailModal 
        isOpen={selectedCategory !== null} 
        onClose={() => setSelectedCategory(null)} 
        categoryName={selectedCategory || ''} 
        startDate={startDate}
        endDate={endDate}
      />
    </>
  );
}


function ItemsSalesTable({ data, pagination, setPage }: { data: any[]; pagination?: any; setPage?: (val: number | ((prev: number) => number)) => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col w-full">
      <TableWrapper>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>{t.reports.itemNameCol}</th>
              <th className={thClass}>{t.reports.categoryCol}</th>
              <th className={thClass}>{t.reports.qtySold}</th>
              <th className={`${thClass} text-right`}>{t.reports.totalSalesCol}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
                <td className={tdClass}>{row.item_name}</td>
                <td className={tdClass}>{row.category_name}</td>
                <td className={tdClass}>{row.total_qty}</td>
                <td className={`${tdClass} text-right money`}>{formatCurrency(row.total_sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrapper>

      {pagination && pagination.total > 0 && setPage && (
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] gap-4">
          <div className="text-sm text-[var(--color-text-muted)]">
            {t.reports.showing((pagination.page - 1) * pagination.limit + 1, Math.min(pagination.page * pagination.limit, pagination.total), pagination.total)}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
            >
              &lt;
            </button>
            
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: pagination.totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (
                  pageNum === 1 || 
                  pageNum === pagination.totalPages || 
                  (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                        pagination.page === pageNum 
                          ? 'bg-blue-500 text-white border-transparent' 
                          : 'border border-[var(--color-border)] hover:bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                
                if (
                  pageNum === pagination.page - 2 || 
                  pageNum === pagination.page + 2
                ) {
                  return <span key={pageNum} className="px-1 text-[var(--color-text-muted)]">...</span>;
                }
                
                return null;
              })}
            </div>

            <button 
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--color-text)]"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



function StaffSalesGrid({ data }: { data: any[] }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {data.map((row, i) => {
        const isTopKasir = i === 0 && row.total > 0;
        const aov = row.count > 0 ? row.total / row.count : 0;
        
        return (
          <div key={i} className={`flex flex-col bg-[var(--color-surface)] border ${isTopKasir ? 'border-amber-400/50 shadow-amber-400/10 shadow-lg relative' : 'border-[var(--color-border)] shadow-sm hover:shadow-md'} rounded-xl overflow-hidden transition-all duration-200`}>
            
            {isTopKasir && (
              <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm border-b border-l border-amber-200 flex items-center gap-1 z-10">
                <span className="text-[10px]">🏆</span> {t.reports.topCashier}
              </div>
            )}
            
            <div className="p-5 flex-1 flex flex-col pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-accent)] text-white shadow-sm flex-shrink-0`}>
                  <Users size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text-muted)] truncate" title={row.staff_name}>{row.staff_name}</div>
                  <div className="text-lg lg:text-xl tracking-tight text-[var(--color-text)] money truncate">
                    {formatCurrency(row.total)}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col mt-auto pt-4 border-t border-[var(--color-border)] gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t.reports.transactionsLabel}</div>
                  <div className="text-sm font-semibold text-[var(--color-text)]">{t.reports.trxCount(row.count)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider" title="Average Order Value">{t.reports.aov}</div>
                  <div className="text-sm font-semibold text-[var(--color-text)] money">{formatCurrency(aov)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
