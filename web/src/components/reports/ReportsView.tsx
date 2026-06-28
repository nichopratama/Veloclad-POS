'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { DateRangePicker, DateRange } from '@/components/ui/DateRangePicker';

type ReportTab = 'summary' | 'gross-profit' | 'payment-methods' | 'items-sales' | 'category-sales' | 'staff-sales';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'gross-profit', label: 'Gross Profit' },
  { id: 'payment-methods', label: 'Payment Methods' },
  { id: 'items-sales', label: 'Items Sales' },
  { id: 'category-sales', label: 'Category Sales' },
  { id: 'staff-sales', label: 'Staff Sales' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export function ReportsView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentTabRaw = searchParams.get('tab') as ReportTab | null;
  const activeTab = currentTabRaw && TABS.some((t) => t.id === currentTabRaw) ? currentTabRaw : 'summary';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-extrabold text-[var(--color-text)]">
          Sales Dynamic Data
        </h1>

        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-[var(--color-text)]'
                      : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
                  }`}
              >
                {tab.label}
              </button>
            ))}
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

        {!isLoading && !error && reportData.length === 0 && (
          <div className="p-8 text-center text-[var(--color-text-muted)]">Tidak ada data untuk filter ini.</div>
        )}

        {!isLoading && !error && reportData.length > 0 && (
          <>
            {activeTab === 'summary' && <SummaryTable data={reportData} />}
            {activeTab === 'gross-profit' && <GrossProfitTable data={reportData} />}
            {activeTab === 'payment-methods' && <PaymentMethodsTable data={reportData} />}
            {activeTab === 'items-sales' && <ItemsSalesTable data={reportData} />}
            {activeTab === 'category-sales' && <CategorySalesTable data={reportData} />}
            {activeTab === 'staff-sales' && <StaffSalesTable data={reportData} />}
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

function SummaryTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Tanggal</th>
            <th className={thClass}>Total Transaksi</th>
            <th className={thClass}>Pendapatan (Revenue)</th>
            <th className={thClass}>Rata-rata Transaksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.date}</td>
              <td className={tdClass}>{row.total_transactions}</td>
              <td className={tdClass}>{formatCurrency(row.revenue)}</td>
              <td className={tdClass}>{formatCurrency(row.avg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
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

function PaymentMethodsTable({ data }: { data: any[] }) {
  return (
    <TableWrapper>
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Metode Pembayaran</th>
            <th className={thClass}>Jumlah Transaksi</th>
            <th className={thClass}>Total Nominal</th>
            <th className={thClass}>Persentase</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--color-surface)]/50 transition-colors">
              <td className={tdClass}>{row.method}</td>
              <td className={tdClass}>{row.count}</td>
              <td className={tdClass}>{formatCurrency(row.total)}</td>
              <td className={tdClass}>{row.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrapper>
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
