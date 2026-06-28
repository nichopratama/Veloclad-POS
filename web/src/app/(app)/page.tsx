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
} from "recharts";
import { useLocale } from "@/lib/i18n/LocaleContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type SummaryResponse = {
  totalSales: number;
  transactionCount: number;
  totalItems: number;
};

type SalesChartResponse = {
  data: { date: string; sales: number }[];
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

type Period = "today" | "month";

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

// ── Summary Cards ──────────────────────────────────────────────────────────────

function SummaryCards() {
  const { data, error, isLoading } = useSWR<SummaryResponse>("/api/dashboard/summary");
  const { t } = useLocale();

  const cards: {
    label: string;
    value: React.ReactNode;
    accent?: boolean;
  }[] = [
    {
      label: t.dashboard.todaySales,
      value: isLoading ? (
        <Skeleton width="140px" height="2.5rem" />
      ) : error ? (
        <span style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {t.common.loadError}
        </span>
      ) : (
        <span className="money">{formatIDR(data?.totalSales ?? 0)}</span>
      ),
      accent: true,
    },
    {
      label: t.dashboard.todayTransactions,
      value: isLoading ? (
        <Skeleton width="60px" height="2.5rem" />
      ) : error ? (
        <span style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {t.common.loadError}
        </span>
      ) : (
        <span className="money">{data?.transactionCount ?? 0}</span>
      ),
    },
    {
      label: t.dashboard.activeProducts,
      value: isLoading ? (
        <Skeleton width="60px" height="2.5rem" />
      ) : error ? (
        <span style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {t.common.loadError}
        </span>
      ) : (
        <span className="money">{data?.totalItems ?? 0}</span>
      ),
    },
  ];

  return (
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
                background: "var(--color-accent)",
                borderRadius: "var(--radius) 0 0 var(--radius)",
              }}
            />
          )}
          <p
            style={{
              margin: "0 0 var(--space-2)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            {card.label}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: card.accent ? "var(--color-accent)" : "var(--color-text)",
            }}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Sales Chart ────────────────────────────────────────────────────────────────

type TooltipPayloadEntry = {
  name?: string;
  value?: number;
  color?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
};

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
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
      <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--text-sm)" }}>
        <span className="money">{formatIDR(value)}</span>
      </p>
    </div>
  );
}

function SalesChartCard() {
  const { data, error, isLoading } = useSWR<SalesChartResponse>("/api/dashboard/sales-chart");
  const { t } = useLocale();

  return (
    <div className="card" style={{ flex: "1 1 0", minWidth: 0 }}>
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "var(--color-text)",
          marginBottom: "var(--space-4)",
        }}
      >
        {t.dashboard.salesLast7Days}
      </h2>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Skeleton width="100%" height="180px" />
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>
            {t.dashboard.loading}
          </p>
        </div>
      )}

      {error && !isLoading && (
        <p style={{ margin: 0, color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {t.common.loadError}
        </p>
      )}

      {!isLoading && !error && (
        <>
          {(!data?.data || data.data.length === 0) ? (
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              {t.dashboard.noSalesData}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.data}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(91% 0.005 255)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)", fontFamily: "var(--font-sans)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(52% 0.02 262)", fontFamily: "var(--font-sans)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
                    return String(v);
                  }}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(95% 0.03 264)" }} />
                <Bar
                  dataKey="sales"
                  fill="oklch(56% 0.17 264)"
                  radius={[4, 4, 0, 0]}
                  name={t.dashboard.todaySales}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </div>
  );
}

// ── Top Items ──────────────────────────────────────────────────────────────────

function TopItemsCard() {
  const [period, setPeriod] = useState<Period>("today");
  const { t } = useLocale();

  const { data, error, isLoading } = useSWR<TopItemsResponse>(
    `/api/dashboard/top-items?period=${period}`
  );

  return (
    <div className="card" style={{ flex: "0 0 320px", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
          flexWrap: "wrap",
          gap: "var(--space-2)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color: "var(--color-text)",
            margin: 0,
          }}
        >
          {t.dashboard.topProducts}
        </h2>

        <div
          role="group"
          aria-label={t.dashboard.selectPeriod}
          style={{
            display: "inline-flex",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          {(["today", "month"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              style={{
                minHeight: "44px",
                minWidth: "72px",
                padding: "0 var(--space-3)",
                border: "none",
                borderRight: p === "today" ? "1px solid var(--color-border)" : "none",
                background: period === p ? "var(--color-accent)" : "var(--color-surface)",
                color: period === p ? "white" : "var(--color-text-muted)",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {p === "today" ? t.dashboard.today : t.dashboard.thisMonth}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Skeleton width="24px" height="24px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <Skeleton width="60%" height="0.9em" />
                <Skeleton width="40%" height="0.8em" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isLoading && (
        <p style={{ margin: 0, color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>
          {t.common.loadError}
        </p>
      )}

      {!isLoading && !error && (
        <>
          {(!data?.data || data.data.length === 0) ? (
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              {t.dashboard.noProductsSold}
            </p>
          ) : (
            <ol
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              {data.data.map((item, index) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-3) 0",
                    borderBottom:
                      index < data.data.length - 1
                        ? "1px solid var(--color-border)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: index === 0 ? "var(--color-accent)" : "var(--color-surface-2)",
                      color: index === 0 ? "white" : "var(--color-text-muted)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                    aria-label={t.dashboard.rank(index + 1)}
                  >
                    {index + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name ?? item.code ?? `#${item.id}`}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {t.dashboard.sold(item.qty)}
                    </p>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "var(--text-sm)",
                      fontWeight: 700,
                      color: "var(--color-success)",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <span className="money">{formatIDR(item.revenue)}</span>
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useLocale();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 800,
            color: "var(--color-text)",
            marginBottom: "var(--space-1)",
          }}
        >
          {t.dashboard.title}
        </h1>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
          {t.dashboard.subtitle}
        </p>
      </div>

      <SummaryCards />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          alignItems: "flex-start",
        }}
      >
        <SalesChartCard />
        <TopItemsCard />
      </div>
    </div>
  );
}
