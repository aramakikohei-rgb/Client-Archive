"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useClient } from "../layout";
import { formatCurrency, formatAUM } from "@/lib/utils";
import { API_ROUTES, COMPANY_TYPE_LABELS } from "@/lib/constants";
import type { ClientFinancial, ClientSegment } from "@/lib/types";

// Format amount in 億 (hundred millions)
function formatOku(millionJpy: number): string {
  const oku = millionJpy / 100;
  if (oku >= 100) return `${oku.toFixed(0)}億`;
  if (oku >= 10) return `${oku.toFixed(1)}億`;
  return `${oku.toFixed(1)}億`;
}

// Calculate YoY change percentage
function yoyPct(current: number | null, prev: number | null): number | null {
  if (current == null || prev == null || prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

// Color for change: positive = blue, negative = red
function changeColor(pct: number | null): string {
  if (pct == null) return "text-slate-500";
  if (pct > 0) return "text-blue-600";
  if (pct < 0) return "text-red-600";
  return "text-slate-500";
}

// Format percentage with sign
function fmtPct(pct: number | null): string {
  if (pct == null) return "-";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// Segment pie chart colors
const SEGMENT_COLORS = [
  "#1e40af", // dark blue
  "#3b82f6", // blue
  "#60a5fa", // light blue
  "#93c5fd", // lighter blue
  "#c7d2fe", // very light blue
];

// Simple SVG donut segment
function DonutChart({ segments }: { segments: { name: string; share: number; color: string }[] }) {
  let cumulative = 0;
  const total = segments.reduce((sum, s) => sum + s.share, 0);
  const radius = 60;
  const cx = 80;
  const cy = 80;

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number) {
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`;
  }

  return (
    <svg viewBox="0 0 160 160" className="h-44 w-44">
      {segments.map((seg, i) => {
        const startAngle = (cumulative / total) * 360;
        cumulative += seg.share;
        const endAngle = (cumulative / total) * 360;
        // Handle full circle
        if (Math.abs(endAngle - startAngle) >= 359.99) {
          return <circle key={i} cx={cx} cy={cy} r={radius} fill={seg.color} />;
        }
        return <path key={i} d={describeArc(startAngle, endAngle)} fill={seg.color} />;
      })}
      <circle cx={cx} cy={cy} r={35} fill="white" />
    </svg>
  );
}

// Comparison bar chart (like the reference)
function ComparisonBar({
  label,
  current,
  prev,
  currentLabel,
  prevLabel,
}: {
  label: string;
  current: number;
  prev: number;
  currentLabel: string;
  prevLabel: string;
}) {
  const pct = yoyPct(current, prev);
  const max = Math.max(current, prev);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`text-xs font-semibold ${changeColor(pct)}`}>
          {fmtPct(pct)}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="mb-1 text-right text-[10px] text-slate-400">{prevLabel}</div>
          <div className="flex items-center gap-2">
            <div
              className="h-6 rounded-sm bg-slate-300"
              style={{ width: `${(prev / max) * 100}%`, minWidth: 4 }}
            />
            <span className="whitespace-nowrap text-xs font-medium text-slate-600">
              {formatOku(prev)}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-1 text-right text-[10px] text-slate-400">{currentLabel}</div>
          <div className="flex items-center gap-2">
            <div
              className="h-6 rounded-sm bg-blue-600"
              style={{ width: `${(current / max) * 100}%`, minWidth: 4 }}
            />
            <span className="whitespace-nowrap text-xs font-semibold text-slate-900">
              {formatOku(current)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientFinancePage() {
  const { client, clientId } = useClient();
  const [productStats, setProductStats] = useState({ count: 0, totalFacility: 0 });
  const [interactionCount, setInteractionCount] = useState(0);
  const [financials, setFinancials] = useState<ClientFinancial[]>([]);
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ROUTES.CLIENT_PRODUCTS(clientId))
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((json) => {
        const products = json.data || json || [];
        const active = products.filter((p: { status: string }) => p.status === "active");
        setProductStats({
          count: active.length,
          totalFacility: active.reduce((sum: number, p: { facility_amount_jpy: number | null }) => sum + (p.facility_amount_jpy || 0), 0),
        });
      })
      .catch(() => {});

    fetch(API_ROUTES.CLIENT_INTERACTIONS(clientId))
      .then((r) => r.ok ? r.json() : { total: 0 })
      .then((json) => setInteractionCount(json.total || 0))
      .catch(() => {});

    fetch(API_ROUTES.CLIENT_FINANCIALS(clientId))
      .then((r) => r.ok ? r.json() : { financials: [], segments: [] })
      .then((json) => {
        setFinancials(json.financials || []);
        setSegments(json.segments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const latestFinancial = financials[0] || null;
  const latestSegments = latestFinancial
    ? segments.filter((s) => s.fiscal_period === latestFinancial.fiscal_period)
    : [];

  const basicInfo = [
    { label: "会社名", value: client.company_name },
    { label: "フリガナ", value: client.company_name_kana || "-" },
    { label: "英文社名", value: client.company_name_en || "-" },
    { label: "住所", value: client.address || "-" },
    { label: "設立年月", value: client.founding_date || "-" },
    { label: "業種名", value: client.industry || "-" },
    { label: "企業区分", value: client.company_type ? (COMPANY_TYPE_LABELS[client.company_type] || client.company_type) : "-" },
    { label: "資本金(百万円)", value: client.capital_amount_jpy ? formatCurrency(client.capital_amount_jpy) : "-" },
    { label: "売上高(百万円)", value: client.revenue_jpy ? formatCurrency(client.revenue_jpy) : "-" },
    { label: "電話番号", value: client.phone || "-" },
    { label: "従業員数(名)", value: client.employee_count ? client.employee_count.toLocaleString() : "-" },
    { label: "代表者", value: client.representative_name ? `${client.representative_title || ""} ${client.representative_name}`.trim() : "-" },
    { label: "証券コード", value: client.stock_code || "-" },
    { label: "AUM", value: client.aum_jpy ? formatAUM(client.aum_jpy) : "-" },
  ];

  const periodTypeLabel: Record<string, string> = {
    annual: "通期", q1: "第1四半期", q2: "第2四半期", q3: "第3四半期", q4: "第4四半期", h1: "上半期", h2: "下半期",
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-700 text-xs text-white">-</div>
            <h2 className="font-semibold text-slate-900">基礎情報</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {basicInfo.map((item, i) => (
                <tr key={i}>
                  <td className="w-40 bg-slate-50 px-6 py-3 font-medium text-slate-500">
                    {item.label}
                  </td>
                  <td className="px-6 py-3 text-slate-900">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Financial Analysis - only show if data exists */}
      {latestFinancial && (
        <>
          {/* Period Header */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {latestFinancial.fiscal_period}期 {periodTypeLabel[latestFinancial.period_type] || latestFinancial.period_type}
                </h3>
                <p className="text-xs text-slate-500">
                  [{latestFinancial.accounting_standard}]({latestFinancial.report_date_range})
                </p>
              </div>
              {latestFinancial.announcement_date && (
                <div className="text-right text-xs text-slate-400">
                  <div>決算発表時刻 {latestFinancial.announcement_date}</div>
                </div>
              )}
            </div>
          </div>

          {/* Two-column: Forecast Analysis + P/L Analysis */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Forecast Analysis */}
            <Card>
              <CardHeader className="bg-slate-700 text-white">
                <h3 className="text-sm font-semibold">予想値分析</h3>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                {/* Progress Rate */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">進捗率</span>
                    <span className="text-sm font-semibold text-blue-700">
                      {periodTypeLabel[latestFinancial.period_type]}進捗率
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    連結営業利益<br />計画比
                    {latestFinancial.announcement_date && (
                      <span className="ml-1 text-[10px]">({latestFinancial.announcement_date.split(" ")[0]}発表 修正値比較)</span>
                    )}
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-4xl font-bold text-slate-900">
                      {latestFinancial.progress_rate?.toFixed(1)}
                    </span>
                    <span className="text-lg text-slate-500">%</span>
                  </div>
                </div>

                {/* Forecast Revision */}
                {latestFinancial.forecast_revision_label && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">営業益予想</span>
                      <span className={`text-sm font-semibold ${
                        latestFinancial.forecast_revision === "up" ? "text-blue-700" :
                        latestFinancial.forecast_revision === "down" ? "text-red-600" : "text-slate-700"
                      }`}>
                        {latestFinancial.forecast_revision_label}
                      </span>
                    </div>
                    {latestFinancial.forecast_operating_profit_jpy && (
                      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                        <span className="text-slate-600">{formatOku(latestFinancial.forecast_operating_profit_jpy * 0.95)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          latestFinancial.forecast_revision === "up" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                        }`}>
                          {latestFinancial.forecast_revision === "up" ? "上方" : latestFinancial.forecast_revision === "down" ? "下方" : "据置"}
                        </span>
                        <span className="font-semibold text-slate-900">{formatOku(latestFinancial.forecast_operating_profit_jpy)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dividend */}
                {latestFinancial.dividend_per_share != null && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">配当予想</span>
                      <span className="text-sm font-semibold text-blue-700">
                        年間配当金 {latestFinancial.dividend_per_share !== latestFinancial.dividend_prev_per_share ? "増配" : "計画修正なし"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-600">
                          {latestFinancial.dividend_prev_per_share?.toLocaleString()}円
                        </div>
                        <div className="text-[10px] text-slate-400">前期</div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                        +{((latestFinancial.dividend_per_share || 0) - (latestFinancial.dividend_prev_per_share || 0)).toLocaleString()}円
                      </span>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">
                          {latestFinancial.dividend_per_share?.toLocaleString()}円
                        </div>
                        <div className="text-[10px] text-slate-400">当期</div>
                      </div>
                    </div>
                    {latestFinancial.dividend_note && (
                      <p className="mt-2 text-[10px] text-slate-400">{latestFinancial.dividend_note}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* P/L Analysis */}
            <Card>
              <CardHeader className="bg-slate-700 text-white">
                <h3 className="text-sm font-semibold">P/L分析</h3>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                {/* Revenue */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">売上高</span>
                    <span className={`text-sm font-semibold ${changeColor(yoyPct(latestFinancial.revenue_jpy, latestFinancial.revenue_prev_jpy))}`}>
                      {(yoyPct(latestFinancial.revenue_jpy, latestFinancial.revenue_prev_jpy) ?? 0) >= 0 ? "増収" : "減収"}{" "}
                      {Math.abs(yoyPct(latestFinancial.revenue_jpy, latestFinancial.revenue_prev_jpy) ?? 0).toFixed(1)}%
                      {(yoyPct(latestFinancial.revenue_jpy, latestFinancial.revenue_prev_jpy) ?? 0) >= 0 ? "増" : "減"}
                    </span>
                  </div>
                  {latestFinancial.revenue_jpy && latestFinancial.revenue_prev_jpy && (
                    <ComparisonBar
                      label=""
                      current={latestFinancial.revenue_jpy}
                      prev={latestFinancial.revenue_prev_jpy}
                      currentLabel={latestFinancial.period_label || "当期"}
                      prevLabel="前期"
                    />
                  )}
                </div>

                {/* Operating Profit */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">営業利益</span>
                    <span className={`text-sm font-semibold ${changeColor(yoyPct(latestFinancial.operating_profit_jpy, latestFinancial.operating_profit_prev_jpy))}`}>
                      {(yoyPct(latestFinancial.operating_profit_jpy, latestFinancial.operating_profit_prev_jpy) ?? 0) >= 0 ? "増益" : "減益"}{" "}
                      {Math.abs(yoyPct(latestFinancial.operating_profit_jpy, latestFinancial.operating_profit_prev_jpy) ?? 0).toFixed(1)}%
                      {(yoyPct(latestFinancial.operating_profit_jpy, latestFinancial.operating_profit_prev_jpy) ?? 0) >= 0 ? "増" : "減"}
                    </span>
                  </div>
                  {latestFinancial.operating_profit_jpy && latestFinancial.operating_profit_prev_jpy && (
                    <ComparisonBar
                      label=""
                      current={latestFinancial.operating_profit_jpy}
                      prev={latestFinancial.operating_profit_prev_jpy}
                      currentLabel={latestFinancial.period_label || "当期"}
                      prevLabel="前期"
                    />
                  )}
                  {latestFinancial.notes && (
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{latestFinancial.notes}</p>
                  )}
                </div>

                {/* Net Income */}
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">最終利益</span>
                    <span className={`text-sm font-semibold ${changeColor(yoyPct(latestFinancial.net_income_jpy, latestFinancial.net_income_prev_jpy))}`}>
                      {(yoyPct(latestFinancial.net_income_jpy, latestFinancial.net_income_prev_jpy) ?? 0) >= 0 ? "増益" : "減益"}{" "}
                      {Math.abs(yoyPct(latestFinancial.net_income_jpy, latestFinancial.net_income_prev_jpy) ?? 0).toFixed(1)}%
                      {(yoyPct(latestFinancial.net_income_jpy, latestFinancial.net_income_prev_jpy) ?? 0) >= 0 ? "増" : "減"}
                    </span>
                  </div>
                  {latestFinancial.net_income_jpy && latestFinancial.net_income_prev_jpy && (
                    <ComparisonBar
                      label=""
                      current={latestFinancial.net_income_jpy}
                      prev={latestFinancial.net_income_prev_jpy}
                      currentLabel={latestFinancial.period_label || "当期"}
                      prevLabel="前期"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segment Analysis */}
          {latestSegments.length > 0 && (
            <Card>
              <CardHeader className="bg-cyan-600 text-white">
                <h3 className="text-sm font-semibold">事業別分析</h3>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Segment details */}
                  <div className="space-y-4 lg:col-span-2">
                    {latestSegments.map((seg, i) => {
                      const profitPct = yoyPct(seg.operating_profit_jpy, seg.operating_profit_prev_jpy);
                      const highlightColor = seg.highlight?.includes("減") ? "text-red-600" :
                        seg.highlight?.includes("大幅") ? "text-blue-600" : "text-blue-700";
                      return (
                        <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">事業別利益</span>
                            <span className={`text-sm font-semibold ${highlightColor}`}>
                              {seg.segment_name} {seg.highlight || ""}
                            </span>
                          </div>
                          {seg.operating_profit_jpy != null && seg.operating_profit_prev_jpy != null && (
                            <div className="mt-3">
                              <div className="flex items-end gap-6">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="h-8 rounded-sm bg-slate-300"
                                        style={{
                                          width: Math.max(40, (seg.operating_profit_prev_jpy / Math.max(seg.operating_profit_jpy!, seg.operating_profit_prev_jpy)) * 120),
                                        }}
                                      />
                                      <span className="text-xs text-slate-500">{formatOku(seg.operating_profit_prev_jpy)}</span>
                                    </div>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      (profitPct ?? 0) >= 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                                    }`}>
                                      {fmtPct(profitPct)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`h-8 rounded-sm ${(profitPct ?? 0) >= 0 ? "bg-cyan-500" : "bg-red-400"}`}
                                        style={{
                                          width: Math.max(40, (seg.operating_profit_jpy! / Math.max(seg.operating_profit_jpy!, seg.operating_profit_prev_jpy)) * 120),
                                        }}
                                      />
                                      <span className="text-xs font-semibold text-slate-900">{formatOku(seg.operating_profit_jpy!)}</span>
                                    </div>
                                  </div>
                                  <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                                    <span>前期</span>
                                    <span className="flex-1" />
                                    <span>当期</span>
                                  </div>
                                </div>
                              </div>
                              {seg.notes && (
                                <p className="mt-2 text-[10px] text-slate-500">{seg.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Revenue Composition Pie */}
                  <div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                      <h4 className="text-sm font-semibold text-slate-700">事業別売上高構成比</h4>
                      {latestFinancial.revenue_jpy && (
                        <p className="mt-1 text-xs text-slate-500">
                          売上高合計 {formatOku(latestFinancial.revenue_jpy)}
                        </p>
                      )}
                      <div className="mt-4 flex justify-center">
                        <DonutChart
                          segments={latestSegments.map((s, i) => ({
                            name: s.segment_name,
                            share: s.revenue_share_pct || 0,
                            color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                          }))}
                        />
                      </div>
                      <div className="mt-4 space-y-2">
                        {latestSegments.map((seg, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div
                              className="h-3 w-3 rounded-sm"
                              style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                            />
                            <span className="flex-1 text-slate-600">{seg.segment_name}</span>
                            <span className="font-medium text-slate-900">{seg.revenue_share_pct?.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* No financial data message */}
      {!loading && financials.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-400">財務データはまだ登録されていません</p>
          </CardContent>
        </Card>
      )}

      {/* Accordion Sections */}
      <div className="space-y-3">
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>組織</span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            {client.representative_name && (
              <div className="mb-2">
                <span className="font-medium text-slate-500">代表者：</span>
                {client.representative_title} {client.representative_name}
              </div>
            )}
            {client.employee_count && (
              <div>
                <span className="font-medium text-slate-500">従業員数：</span>
                {client.employee_count.toLocaleString()}名
              </div>
            )}
            {!client.representative_name && !client.employee_count && (
              <span className="text-slate-400">組織情報はまだ登録されていません</span>
            )}
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>財務関連</span>
            </div>
            {(client.capital_amount_jpy || client.revenue_jpy) && (
              <span className="text-xs font-normal text-slate-400">単位：百万円</span>
            )}
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="w-32 py-2 font-medium text-slate-500">資本金</td>
                  <td className="py-2">{client.capital_amount_jpy ? formatCurrency(client.capital_amount_jpy) : "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-500">売上高</td>
                  <td className="py-2">{client.revenue_jpy ? formatCurrency(client.revenue_jpy) : "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-500">AUM</td>
                  <td className="py-2">{client.aum_jpy ? formatAUM(client.aum_jpy) : "-"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-500">決算期</td>
                  <td className="py-2">{client.fiscal_year_end || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>取引関連</span>
            </div>
            <span className="text-xs font-normal text-slate-400">
              アクティブ商品: {productStats.count}件 / 総ファシリティ: {productStats.totalFacility ? formatCurrency(productStats.totalFacility) : "¥0"}
            </span>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="w-32 py-2 font-medium text-slate-500">アクティブ商品数</td>
                  <td className="py-2">{productStats.count}件</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-500">総ファシリティ額</td>
                  <td className="py-2">{productStats.totalFacility ? formatCurrency(productStats.totalFacility) : "¥0"}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-500">リレーション開始</td>
                  <td className="py-2">{client.relationship_start_date || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        {client.stock_code && (
          <details className="group rounded-lg border border-slate-200 bg-white">
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
                <span>株関連</span>
              </div>
            </summary>
            <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="w-32 py-2 font-medium text-slate-500">証券コード</td>
                    <td className="py-2">{client.stock_code}</td>
                  </tr>
                  {latestFinancial?.dividend_per_share != null && (
                    <tr>
                      <td className="py-2 font-medium text-slate-500">配当金(当期予想)</td>
                      <td className="py-2">{latestFinancial.dividend_per_share.toLocaleString()}円</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>監査関連</span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-400">
            監査関連情報はまだ登録されていません
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>対応履歴</span>
            </div>
            <span className="text-xs font-normal text-slate-400">{interactionCount}件</span>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            対応記録: {interactionCount}件
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] text-white group-open:bg-slate-600">+</div>
              <span>決算説明会資料</span>
            </div>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-400">
            決算説明会資料はまだ登録されていません
          </div>
        </details>
      </div>
    </div>
  );
}
