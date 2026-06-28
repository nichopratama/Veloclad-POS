"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { fetcher } from "@/lib/fetcher";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Activity, CreditCard, TrendingUp, AlertTriangle, X } from "lucide-react";

// ── Utils ──────────────────────────────────────────────────────────────────────

const getThisMonthISO = () => {
  const start = new Date();
  start.setDate(1);
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
};

// ── Types ──────────────────────────────────────────────────────────────────────

type SummaryResponse = {
  totalSales: number;
  transactionCount: number;
  netProfit: number;
  totalItems: number;
};

type LowStockResponse = {
  data: { id: number; name: string; code: string; stock: number; min_stock: number }[];
  total: number;
};

type SalesChartResponse = {
  data: { date: string; sales: number }[];
};

type HeatmapResponse = {
  data: { hour: string; count: number }[];
};

type TopItem = {
  id: number;
  name: string | null;
  code: string | null;
  qty: number;
  revenue: number;
};

type TopItemsResponse = {
  data: TopItem[];
};

// ── Formatters ─────────────────────────────────────────────────────────────────

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatIDR(value: number): string {
  return idrFormatter.format(value);
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ width = "100%", height = "1.2em" }: { width?: string; height?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width,
        height,
        background: "var(--color-surface-2)",
        borderRadius: "var(--radius-sm)",
        animation: "pulse 1.4s ease-in-out infinite",
        verticalAlign: "middle",
      }}
    />
  );
}

// ── Components ─────────────────────────────────────────────────────────────────

function SummaryCards({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { data, error, isLoading } = useSWR<SummaryResponse>(`/api/dashboard/summary?start=${startDate}&end=${endDate}`, fetcher, { refreshInterval: 60000 });
  const { data: lowStockData, isLoading: isLowStockLoading } = useSWR<LowStockResponse>('/api/dashboard/low-stock', fetcher, { refreshInterval: 60000 });
  const { t } = useLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const cards = [
    {
      label: t.dashboard.salesCard,
      value: isLoading ? <Skeleton width="140px" height="2.5rem" /> : <span className="money">{formatIDR(data?.totalSales ?? 0)}</span>,
      icon: <Activity size={24} color="#03396c" style={{ opacity: 0.6 }} />,
      accent: true,
      textColor: "#2d7cfa",
    },
    {
      label: t.dashboard.transactionsCard,
      value: isLoading ? <Skeleton width="60px" height="2.5rem" /> : <span className="money">{data?.transactionCount ?? 0}</span>,
      icon: <CreditCard size={24} color="#03396c" style={{ opacity: 0.6 }} />,
      textColor: "#2d7cfa",
    },
    {
      label: t.dashboard.grossProfitCard,
      value: isLoading ? <Skeleton width="140px" height="2.5rem" /> : (
        <span className="money">
          {formatIDR(data?.netProfit ?? 0)}
        </span>
      ),
      icon: <TrendingUp size={24} color="#03396c" style={{ opacity: 0.6 }} />,
      textColor: "#2d7cfa",
    },
    {
      label: t.dashboard.lowStockCard,
      value: isLowStockLoading ? <Skeleton width="60px" height="2.5rem" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="money">{lowStockData?.total ?? 0} Item</span>
          <button onClick={() => setIsModalOpen(true)} style={{ fontSize: "12px", textDecoration: "underline", color: "#03396c", cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}>{t.dashboard.viewAll}</button>
        </div>
      ),
      icon: <AlertTriangle size={24} color="#E00000" style={{ opacity: 0.8 }} />,
      textColor: "#2d7cfa",
    },
  ];

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            className="card"
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "var(--space-6)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {card.accent && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "4px",
                  height: "100%",
                  background: "#03396c",
                  borderRadius: "var(--radius) 0 0 var(--radius)",
                }}
              />
            )}
            <div>
              <p
                style={{
                  margin: "0 0 var(--space-2)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#03396c",
                }}
              >
                {card.label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: card.textColor,
                }}
              >
                {card.value}
              </p>
            </div>
            <div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div className="card" style={{ width: "90%", maxWidth: "500px", maxHeight: "80vh", overflowY: "auto", position: "relative", background: "white", padding: "24px", borderRadius: "12px" }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#666" }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "var(--color-danger)" }}>
              {t.dashboard.lowStockWarning}
            </h2>
            {lowStockData?.data.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>{t.dashboard.noLowStock}</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {lowStockData?.data.map((item) => (
                  <li key={item.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "8px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#03396c" }}>{item.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{item.code}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "bold", color: "var(--color-danger)", fontSize: "14px" }}>{t.dashboard.remaining} {item.stock}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{t.dashboard.minStock} {item.min_stock}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        padding: "var(--space-3) var(--space-4)",
        boxShadow: "var(--shadow)",
      }}
    >
      <p style={{ margin: "0 0 var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--text-sm)", color: "#03396c" }}>
        <span className="money">{payload[0]?.name === "Transaksi" ? value : formatIDR(value)}</span>
      </p>
    </div>
  );
}

function SalesChartCard({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { data, error, isLoading } = useSWR<SalesChartResponse>(`/api/dashboard/sales-chart?start=${startDate}&end=${endDate}`, fetcher, { refreshInterval: 60000 });
  const { t } = useLocale();

  return (
    <div className="card" style={{ flex: "1 1 0", minWidth: 0 }}>
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "#03396c",
          marginBottom: "var(--space-4)",
        }}
      >
        {t.dashboard.salesChart}
      </h2>
      {isLoading && <Skeleton width="100%" height="180px" />}
      {!isLoading && !error && (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data?.data || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(91% 0.005 255)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v?.length === 10 ? `${v.substring(8, 10)}-${v.substring(5, 7)}` : v} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : String(v)} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(95% 0.03 264)" }} />
            <Bar dataKey="sales" fill="#03396c" radius={[4, 4, 0, 0]} name={t.dashboard.chartSales} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function HourlyHeatmapCard({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { data, error, isLoading } = useSWR<HeatmapResponse>(`/api/dashboard/hourly-heatmap?start=${startDate}&end=${endDate}`, fetcher, { refreshInterval: 60000 });
  const { t } = useLocale();

  return (
    <div className="card" style={{ flex: "1 1 0", minWidth: 0 }}>
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "#03396c",
          marginBottom: "var(--space-4)",
        }}
      >
        {t.dashboard.hourlyHeatmap}
      </h2>
      {isLoading && <Skeleton width="100%" height="180px" />}
      {!isLoading && !error && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.data || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(91% 0.005 255)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" stroke="#F5A623" strokeWidth={3} dot={false} name={t.dashboard.chartTransactions} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TopItemsCard({ startDate, endDate }: { startDate: string, endDate: string }) {
  const { data, error, isLoading } = useSWR<TopItemsResponse>(`/api/dashboard/top-items?start=${startDate}&end=${endDate}`, fetcher, { refreshInterval: 60000 });
  const { t } = useLocale();

  return (
    <div className="card sidebar" style={{ minWidth: 0 }}>
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "#03396c",
          marginBottom: "var(--space-4)",
        }}
      >
        {t.dashboard.topProducts}
      </h2>

      {isLoading && <Skeleton width="100%" height="200px" />}
      {!isLoading && !error && (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {(data?.data || []).map((item, index) => (
            <li
              key={item.id}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) 0",
                borderBottom: index < (data?.data.length || 0) - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px",
                  borderRadius: "50%", background: index === 0 ? "#03396c" : "var(--color-surface-2)",
                  color: index === 0 ? "white" : "var(--color-text-muted)", fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#03396c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name ?? item.code ?? `#${item.id}`}
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  {t.dashboard.soldQty(item.qty)}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--color-success)", textAlign: "right", flexShrink: 0 }}>
                <span className="money">{formatIDR(item.revenue)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLocale();
  const [dateRange, setDateRange] = useState(getThisMonthISO());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", paddingBottom: "var(--space-8)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 800,
              color: "#03396c",
              marginBottom: "var(--space-1)",
            }}
          >
            {t.dashboard.title}
          </h1>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
            {t.dashboard.subtitle}
          </p>
        </div>
        <div style={{ alignSelf: "flex-start" }}>
          <DateRangePicker 
            value={dateRange} 
            onChange={(range) => {
              if (range.start && range.end) {
                setDateRange(range);
              }
            }} 
          />
        </div>
      </div>

      <SummaryCards startDate={dateRange.start} endDate={dateRange.end} />

      <div className="dashboard-grid">
        <div className="main" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <SalesChartCard startDate={dateRange.start} endDate={dateRange.end} />
          <HourlyHeatmapCard startDate={dateRange.start} endDate={dateRange.end} />
        </div>
        <TopItemsCard startDate={dateRange.start} endDate={dateRange.end} />
      </div>
    </div>
  );
}
