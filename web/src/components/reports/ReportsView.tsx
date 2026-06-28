'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import styles from './ReportsView.module.css';

type ReportTab = 'summary' | 'gross-profit' | 'payment-methods' | 'items-sales' | 'category-sales' | 'staff-sales';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'gross-profit', label: 'Gross Profit' },
  { id: 'payment-methods', label: 'Payment Methods' },
  { id: 'items-sales', label: 'Items Sales' },
  { id: 'category-sales', label: 'Category Sales' },
  { id: 'staff-sales', label: 'Staff Sales' },
];

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Helper for formatting currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

export function ReportsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentTabRaw = searchParams.get('tab') as ReportTab | null;
  const activeTab = currentTabRaw && TABS.some(t => t.id === currentTabRaw) ? currentTabRaw : 'summary';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch data from our new API
  const { data: apiResponse, error, isLoading } = useSWR(`/api/reports/dynamic?tab=${activeTab}&start=${startDate}&end=${endDate}`, fetcher);
  
  const reportData = apiResponse?.data || [];

  const handleTabChange = (tabId: ReportTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)' }}>
          Sales Dynamic Data
        </h1>
        
        <div className={styles.pillsScrollContainer}>
          <div className={styles.pillsList}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`${styles.pill} ${activeTab === tab.id ? styles.pillActive : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filters}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Dari:</span>
            <input 
              type="date" 
              className={styles.dateSelect}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Sampai:</span>
            <input 
              type="date" 
              className={styles.dateSelect}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        {isLoading && <div className={styles.emptyState}>Memuat data laporan...</div>}
        {error && <div className={styles.emptyState} style={{ color: 'red' }}>Gagal memuat data</div>}
        
        {!isLoading && !error && reportData.length === 0 && (
          <div className={styles.emptyState}>Tidak ada data untuk filter ini.</div>
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

function SummaryTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Total Transaksi</th>
            <th>Pendapatan (Revenue)</th>
            <th>Rata-rata Transaksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.date}</td>
              <td>{row.total_transactions}</td>
              <td>{formatCurrency(row.revenue)}</td>
              <td>{formatCurrency(row.avg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrossProfitTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Penjualan Bersih</th>
            <th>Total HPP (COGS)</th>
            <th>Laba Kotor (Gross Profit)</th>
            <th>Margin (%)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.date}</td>
              <td>{formatCurrency(row.net_sales)}</td>
              <td>{formatCurrency(row.cogs)}</td>
              <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(row.gross_profit)}</td>
              <td>{row.margin.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentMethodsTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Metode Pembayaran</th>
            <th>Jumlah Transaksi</th>
            <th>Total Nominal</th>
            <th>Persentase</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.method}</td>
              <td>{row.count}</td>
              <td>{formatCurrency(row.total)}</td>
              <td>{row.percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemsSalesTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nama Barang</th>
            <th>Kategori</th>
            <th>Qty Terjual</th>
            <th>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.item_name}</td>
              <td>{row.category_name}</td>
              <td>{row.total_qty}</td>
              <td>{formatCurrency(row.total_sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategorySalesTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nama Kategori</th>
            <th>Qty Barang Terjual</th>
            <th>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.category_name}</td>
              <td>{row.total_qty}</td>
              <td>{formatCurrency(row.total_sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffSalesTable({ data }: { data: any[] }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nama Staf (Kasir)</th>
            <th>Jumlah Transaksi</th>
            <th>Total Penjualan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.staff_name}</td>
              <td>{row.count}</td>
              <td>{formatCurrency(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
