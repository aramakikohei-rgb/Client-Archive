"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useClient } from "../layout";
import { API_ROUTES, PRODUCT_TYPE_LABELS, PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { ClientProduct } from "@/lib/types";

export default function ClientProductsPage() {
  const { clientId } = useClient();
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ROUTES.CLIENT_PRODUCTS(clientId))
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setProducts(json.data || json || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="商品がありません"
        description="この企業に関連する商品はありません。"
      />
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 font-medium text-slate-500">商品名</th>
              <th className="px-6 py-3 font-medium text-slate-500">タイプ</th>
              <th className="px-6 py-3 font-medium text-slate-500">ファシリティ額</th>
              <th className="px-6 py-3 font-medium text-slate-500">スプレッド(bps)</th>
              <th className="px-6 py-3 font-medium text-slate-500">開始日</th>
              <th className="px-6 py-3 font-medium text-slate-500">満期日</th>
              <th className="px-6 py-3 font-medium text-slate-500">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{p.product_name || "-"}</td>
                <td className="px-6 py-4 text-slate-600">
                  {p.product_type ? (PRODUCT_TYPE_LABELS[p.product_type] || p.product_type) : "-"}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {p.facility_amount_jpy ? formatCurrency(p.facility_amount_jpy) : "-"}
                </td>
                <td className="px-6 py-4 text-slate-600">{p.spread_bps ?? "-"}</td>
                <td className="px-6 py-4 text-slate-600">{p.start_date ? formatDate(p.start_date) : "-"}</td>
                <td className="px-6 py-4 text-slate-600">{p.maturity_date ? formatDate(p.maturity_date) : "-"}</td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      p.status === "active" ? "success" : p.status === "expired" || p.status === "terminated" ? "danger" : "default"
                    }
                  >
                    {PRODUCT_STATUS_LABELS[p.status] || p.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
