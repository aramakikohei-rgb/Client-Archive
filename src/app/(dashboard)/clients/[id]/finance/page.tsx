"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useClient } from "../layout";
import { formatCurrency, formatAUM } from "@/lib/utils";
import { API_ROUTES, COMPANY_TYPE_LABELS } from "@/lib/constants";

export default function ClientFinancePage() {
  const { client, clientId } = useClient();
  const [productStats, setProductStats] = useState({ count: 0, totalFacility: 0 });
  const [interactionCount, setInteractionCount] = useState(0);

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
  }, [clientId]);

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

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">基礎情報</h2>
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

      {/* Accordion Sections */}
      <div className="space-y-3">
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <span>商品関連</span>
            <span className="text-xs font-normal text-slate-400">
              アクティブ商品: {productStats.count}件 / 総ファシリティ: {productStats.totalFacility ? formatCurrency(productStats.totalFacility) : "¥0"}
            </span>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            アクティブ商品数: {productStats.count}件<br />
            総ファシリティ額: {productStats.totalFacility ? formatCurrency(productStats.totalFacility) : "¥0"}
          </div>
        </details>

        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-900">
            <span>対応履歴</span>
            <span className="text-xs font-normal text-slate-400">
              {interactionCount}件
            </span>
          </summary>
          <div className="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
            対応記録: {interactionCount}件
          </div>
        </details>
      </div>
    </div>
  );
}
