"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ActivityChart } from "@/components/client/ActivityChart";
import { useClient } from "./layout";
import { formatAUM, formatCurrency, formatDate } from "@/lib/utils";
import {
  COMPANY_TYPE_LABELS,
  RISK_RATING_LABELS,
} from "@/lib/constants";

export default function ClientOverviewPage() {
  const { client, clientId } = useClient();

  const infoItems = [
    { label: "企業概要", value: client.industry || "-" },
    { label: "企業区分", value: client.company_type ? (COMPANY_TYPE_LABELS[client.company_type] || client.company_type) : "-" },
    { label: "住所", value: client.address || "-" },
    { label: "電話番号", value: client.phone || "-" },
    {
      label: "URL",
      value: client.website ? (
        <a
          href={client.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {client.website}
        </a>
      ) : (
        "-"
      ),
    },
    { label: "資本金", value: client.capital_amount_jpy ? formatCurrency(client.capital_amount_jpy) : "-" },
    { label: "売上高", value: client.revenue_jpy ? formatCurrency(client.revenue_jpy) : "-" },
    { label: "従業員数", value: client.employee_count ? `${client.employee_count.toLocaleString()}名` : "-" },
    { label: "AUM", value: client.aum_jpy ? formatAUM(client.aum_jpy) : "-" },
    { label: "代表者", value: client.representative_name ? `${client.representative_title || ""} ${client.representative_name}`.trim() : "-" },
    { label: "証券コード", value: client.stock_code || "-" },
    { label: "設立年月", value: client.founding_date || "-" },
    { label: "決算期", value: client.fiscal_year_end || "-" },
    { label: "リスク格付", value: client.risk_rating ? (RISK_RATING_LABELS[client.risk_rating] || client.risk_rating) : "-" },
    { label: "取引開始日", value: client.relationship_start_date ? formatDate(client.relationship_start_date) : "-" },
  ];

  return (
    <div className="space-y-6">
      {/* Activity Chart */}
      <ActivityChart clientId={clientId} />

      {/* Company Information */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">企業情報</h2>
        </CardHeader>
        <CardContent className="p-0">
          <dl className="divide-y divide-slate-200">
            {infoItems.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 px-6 py-3">
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="col-span-2 text-sm text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">メモ</h2>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{client.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
