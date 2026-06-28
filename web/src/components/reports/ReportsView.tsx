'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { DateRangePicker, DateRange } from '@/components/ui/DateRangePicker';
import { Activity, TrendingUp, CreditCard, ShoppingBag, Grid, Users, Printer, Banknote, QrCode, ArrowRightLeft, X } from 'lucide-react';

type ReportTab = 'summary' | 'gross-profit' | 'payment-methods' | 'items-sales' | 'category-sales' | 'staff-sales';

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: 'summary', label: 'Summary', icon: Activity },
  { id: 'gross-profit', label: 'Gross Profit', icon: TrendingUp },
  { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { id: 'items-sales', label: 'Items Sales', icon: ShoppingBag },
  { id: 'category-sales', label: 'Category Sales', icon: Grid },
  { id: 'staff-sales', label: 'Staff Sales', icon: Users },
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTabRaw = searchParams.get('tab') as ReportTab | null;
  const activeTab = currentTabRaw && TABS.some((t) => t.id === currentTabRaw) ? currentTabRaw : 'summary';

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getTodayISO());

  const { data: apiResponse, error, isLoading } = useSWR(
    `/api/reports/dynamic?tab=${activeTab}&start=${startDate}&end=${endDate}`,
    fetcher
  );

  const reportData = apiResponse?.data || [];

  const handleTabChange = (tabId: ReportTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <h1 className="text-xl font-extrabold text-[var(--color-text)]">
          Sales Dynamic Data
        </h1>

        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => {
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
                  {tab.label}
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
          <div className="flex-1" />
        </div>
      </div>

      <div className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg overflow-hidden flex flex-col">
        {isLoading && <div className="p-8 text-center text-[var(--color-text-muted)]">Memuat data laporan...</div>}
        {error && <div className="p-8 text-center text-red-500">Gagal memuat data</div>}

        {!isLoading && !error && (
          (Array.isArray(reportData) ? reportData.length === 0 : !reportData)
        ) && (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Tidak ada data untuk filter ini.</div>
        )}

        {!isLoading && !error && (
          (Array.isArray(reportData) ? reportData.length > 0 : !!reportData)
        ) && (
          <>
            {activeTab === 'summary' && <SummaryReport data={reportData} />}
            {activeTab === 'gross-profit' && <GrossProfitTable data={reportData as any[]} />}
            {activeTab === 'payment-methods' && <PaymentMethodsGrid data={reportData as any[]} startDate={startDate} endDate={endDate} />}
            {activeTab === 'items-sales' && <ItemsSalesTable data={reportData as any[]} />}
            {activeTab === 'category-sales' && <CategorySalesTable data={reportData as any[]} />}
            {activeTab === 'staff-sales' && <StaffSalesTable data={reportData as any[]} />}
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
  if (!data) return null;

  const grossSales = data.gross_sales_categories?.reduce((acc: number, c: any) => acc + c.amount, 0) || 0;
  const grossProfit = data.net_sales - (data.cogs || 0);
  const margin = data.net_sales > 0 ? (grossProfit / data.net_sales) * 100 : 0;

  const exportToExcel = () => {
    // Generate CSV string
    const csvRows = [];
    csvRows.push(['LAPORAN LABA RUGI (INCOME STATEMENT)']);
    csvRows.push(['Periode:', data.date]);
    csvRows.push([]);
    csvRows.push(['PENDAPATAN (REVENUE)']);
    csvRows.push(['Penjualan Kotor (Gross Sales)', grossSales]);
    csvRows.push(['Diskon Penjualan', -data.discounts]);
    csvRows.push(['Retur / Refund', -data.refunds]);
    csvRows.push(['Penjualan Bersih (Net Sales)', data.net_sales]);
    csvRows.push([]);
    csvRows.push(['BEBAN POKOK PENJUALAN (COGS)']);
    csvRows.push(['Harga Pokok Penjualan (HPP)', -(data.cogs || 0)]);
    csvRows.push([]);
    csvRows.push(['LABA KOTOR (GROSS PROFIT)', grossProfit]);
    csvRows.push(['Margin Laba Kotor', `${margin.toFixed(2)}%`]);
    csvRows.push([]);
    csvRows.push(['ARUS KAS & PAJAK']);
    csvRows.push(['Pajak Dipungut (Tax)', data.tax]);
    csvRows.push(['Total Kas Diterima', data.total_collected]);

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Keuangan_${data.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full flex flex-col gap-6 p-2">
      <div className="flex justify-between items-center bg-[var(--color-surface)] p-4 rounded-lg shadow-sm border border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold">Laporan Keuangan</h2>
          <div className="text-sm text-[var(--color-text-muted)]">Periode: {data.date}</div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button 
            onClick={exportToExcel}
            className="btn btn--ghost text-sm"
          >
            Export Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="btn text-sm"
          >
            <Printer size={16} className="mr-1" /> Cetak PDF
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-lg shadow-sm border border-[var(--color-border)] w-full overflow-x-auto print:shadow-none print:border-none print:p-0">
        <table className="w-full text-left border-collapse text-sm">
          <tbody>
            <tr>
              <td colSpan={2} className="font-bold pb-2 pt-2 text-[var(--color-text-muted)] border-b border-[var(--color-border)]">PENDAPATAN (REVENUE)</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors">
              <td className="py-2 pl-4 flex items-center gap-2">↳ Penjualan Kotor <em className="text-xs text-[var(--color-text-muted)]">(Gross Sales)</em></td>
              <td className="py-2 pr-4 text-right money">{formatCurrency(grossSales)}</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors">
              <td className="py-2 pl-4 flex items-center gap-2 text-red-600">↳ Diskon Penjualan</td>
              <td className="py-2 pr-4 text-right money text-red-600">({formatCurrency(data.discounts)})</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors">
              <td className="py-2 pl-4 flex items-center gap-2 text-red-600">↳ Retur / Refund</td>
              <td className="py-2 pr-4 text-right money text-red-600">({formatCurrency(data.refunds)})</td>
            </tr>
            <tr className="font-semibold bg-[var(--color-accent-soft)]">
              <td className="py-3 pl-2 border-t border-[var(--color-border)]">Penjualan Bersih <em className="font-normal text-xs text-[var(--color-text-muted)]">(Net Sales)</em></td>
              <td className="py-3 pr-4 text-right border-t border-[var(--color-border)] money">{formatCurrency(data.net_sales)}</td>
            </tr>

            <tr><td colSpan={2} className="py-4"></td></tr>

            <tr>
              <td colSpan={2} className="font-bold pb-2 pt-2 text-[var(--color-text-muted)] border-b border-[var(--color-border)]">BEBAN POKOK PENJUALAN (COGS)</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors text-red-600">
              <td className="py-2 pl-4 flex items-center gap-2">↳ Harga Pokok Penjualan <em className="text-xs opacity-70">(Total HPP)</em></td>
              <td className="py-2 pr-4 text-right money">({formatCurrency(data.cogs || 0)})</td>
            </tr>

            <tr><td colSpan={2} className="py-2"></td></tr>

            <tr className="font-bold text-base bg-[var(--color-surface-2)] shadow-sm">
              <td className="py-3 pl-2 border-y border-[var(--color-border)]">LABA KOTOR <em className="font-normal text-xs text-[var(--color-text-muted)]">(GROSS PROFIT)</em></td>
              <td className="py-3 pr-4 text-right border-y border-[var(--color-border)] money">{formatCurrency(grossProfit)}</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors">
              <td className="py-2 pl-2 text-[var(--color-text-muted)]">Margin Laba Kotor <em className="text-xs text-[var(--color-text-muted)]">(Gross Margin)</em></td>
              <td className="py-2 pr-4 text-right money">{margin.toFixed(2)}%</td>
            </tr>

            <tr><td colSpan={2} className="py-4"></td></tr>

            <tr>
              <td colSpan={2} className="font-bold pb-2 pt-2 text-[var(--color-text-muted)] border-b border-[var(--color-border)]">ARUS KAS & PAJAK</td>
            </tr>
            <tr className="hover:bg-[var(--color-accent-soft)] transition-colors">
              <td className="py-2 pl-4 flex items-center gap-2">↳ Pajak Dipungut <em className="text-xs text-[var(--color-text-muted)]">(Tax)</em></td>
              <td className="py-2 pr-4 text-right money">{formatCurrency(data.tax)}</td>
            </tr>
            <tr className="font-bold text-base bg-[var(--color-surface-2)] shadow-sm">
              <td className="py-3 pl-2 border-y border-[var(--color-border)] text-[var(--color-success)]">Total Kas Diterima <em className="font-normal text-xs opacity-80">(Total Collected)</em></td>
              <td className="py-3 pr-4 text-right border-y border-[var(--color-border)] money text-[var(--color-success)]">{formatCurrency(data.total_collected)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-[var(--color-border)] print:hidden">
          <h3 className="font-bold mb-3 text-[var(--color-text-muted)] text-xs uppercase tracking-wider">Rincian Metode Pembayaran</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.payment_methods?.map((p: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 border border-[var(--color-border)] rounded-md bg-[var(--color-accent-soft)]">
                <span className="font-medium text-[var(--color-text)]">{p.method}</span>
                <span className="money font-semibold text-[var(--color-text)]">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GrossProfitTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Tanggal</th>
            <th className={thClass}>Penjualan Bersih</th>
            <th className={thClass}>Total HPP (COGS)</th>
            <th className={thClass}>Laba Kotor (Gross Profit)</th>
            <th className={thClass}>Margin (%)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.date}</td>
              <td className={tdClass}>{formatCurrency(row.net_sales)}</td>
              <td className={tdClass}>{formatCurrency(row.cogs)}</td>
              <td className={`${tdClass} text-[var(--color-success)] font-semibold`}>{formatCurrency(row.gross_profit)}</td>
              <td className={tdClass}>{row.margin.toFixed(2)}%</td>
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
  const { data: apiResponse, error, isLoading } = useSWR(
    isOpen ? `/api/reports/dynamic?tab=payment-methods-detail&methodName=${encodeURIComponent(methodName)}&start=${startDate}&end=${endDate}` : null,
    fetcher
  );

  if (!isOpen) return null;

  const txData = apiResponse?.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--color-bg)] w-full max-w-3xl rounded-xl shadow-2xl border border-[var(--color-border)] flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Rincian Transaksi: {methodName}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Periode: {startDate} hingga {endDate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-accent-soft)] rounded-full transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && <div className="text-center py-8 text-[var(--color-text-muted)]">Memuat rincian transaksi...</div>}
          {error && <div className="text-center py-8 text-red-500">Gagal memuat rincian.</div>}
          
          {!isLoading && !error && txData.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)]">Tidak ada transaksi ditemukan.</div>
          )}
          
          {!isLoading && !error && txData.length > 0 && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">Waktu</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">ID Transaksi</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase">Kasir</th>
                  <th className="pb-3 border-b border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-muted)] uppercase text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {txData.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-[var(--color-surface)]/50 transition-colors border-b border-[var(--color-border)]">
                    <td className="py-3 text-sm text-[var(--color-text)] whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 text-sm text-[var(--color-text)] font-mono">{tx.id}</td>
                    <td className="py-3 text-sm text-[var(--color-text)]">{tx.cashier_name}</td>
                    <td className="py-3 text-sm font-semibold text-[var(--color-text)] text-right money whitespace-nowrap">{formatCurrency(tx.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsGrid({ data, startDate, endDate }: { data: any[]; startDate: string; endDate: string }) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const getIconAndColor = (method: string) => {
    const lower = method.toLowerCase();
    if (lower.includes('card')) return { icon: CreditCard, bgColor: 'bg-indigo-500', color: 'text-indigo-500', bgSoft: 'bg-indigo-500/10' };
    if (lower.includes('qris')) return { icon: QrCode, bgColor: 'bg-blue-500', color: 'text-blue-500', bgSoft: 'bg-blue-500/10' };
    if (lower.includes('transfer')) return { icon: ArrowRightLeft, bgColor: 'bg-purple-500', color: 'text-purple-500', bgSoft: 'bg-purple-500/10' };
    return { icon: Banknote, bgColor: 'bg-emerald-500', color: 'text-emerald-500', bgSoft: 'bg-emerald-500/10' }; // Default / Cash
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
                    <div className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--color-text)] money">
                      {formatCurrency(row.total)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="text-sm font-medium text-[var(--color-text-muted)]">
                    {row.count} trx
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
                View all
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

function ItemsSalesTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Nama Barang</th>
            <th className={thClass}>Kategori</th>
            <th className={thClass}>Qty Terjual</th>
            <th className={thClass}>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.item_name}</td>
              <td className={tdClass}>{row.category_name}</td>
              <td className={tdClass}>{row.total_qty}</td>
              <td className={tdClass}>{formatCurrency(row.total_sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function CategorySalesTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Nama Kategori</th>
            <th className={thClass}>Qty Barang Terjual</th>
            <th className={thClass}>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.category_name}</td>
              <td className={tdClass}>{row.total_qty}</td>
              <td className={tdClass}>{formatCurrency(row.total_sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}

function StaffSalesTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Nama Staf (Kasir)</th>
            <th className={thClass}>Jumlah Transaksi</th>
            <th className={thClass}>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.staff_name}</td>
              <td className={tdClass}>{row.count}</td>
              <td className={tdClass}>{formatCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
  );
}
