"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight, Loader2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import {
  API_ROUTES,
  ROUTES,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_STATUS_COLORS,
  RISK_RATING_LABELS,
  RISK_RATING_COLORS,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ClientSummary, PaginatedResponse, User } from "@/lib/types";

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Filter states
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [relationshipStatus, setRelationshipStatus] = useState(searchParams.get("relationship_status") || "");
  const [riskRating, setRiskRating] = useState(searchParams.get("risk_rating") || "");
  const [assignedRm, setAssignedRm] = useState(searchParams.get("assigned_rm_id") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(DEFAULT_PAGE_SIZE));
      if (search) params.set("search", search);
      if (relationshipStatus) params.set("relationship_status", relationshipStatus);
      if (riskRating) params.set("risk_rating", riskRating);
      if (assignedRm) params.set("assigned_rm_id", assignedRm);

      const res = await fetch(`${API_ROUTES.CLIENTS}?${params.toString()}`);
      if (!res.ok) throw new Error("企業一覧の取得に失敗しました");
      const json: PaginatedResponse<ClientSummary> = await res.json();
      setClients(json.data);
      setTotal(json.total);
      setTotalPages(json.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, search, relationshipStatus, riskRating, assignedRm]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(API_ROUTES.USERS);
        if (res.ok) {
          const json = await res.json();
          setUsers(json.data || json);
        }
      } catch {
        // ignore
      }
    }
    fetchUsers();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchClients();
  }

  function handleClearFilters() {
    setSearch("");
    setRelationshipStatus("");
    setRiskRating("");
    setAssignedRm("");
    setPage(1);
  }

  const statusOptions = Object.entries(RELATIONSHIP_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const riskOptions = Object.entries(RISK_RATING_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const rmOptions = users.map((u) => ({ value: String(u.id), label: u.full_name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">企業一覧</h1>
          <p className="mt-1 text-sm text-slate-500">{total}件の企業</p>
        </div>
        {isAdminOrManager && (
          <Link href={ROUTES.CLIENT_NEW}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規企業
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="企業名で検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <Select
                  label="ステータス"
                  options={statusOptions}
                  placeholder="すべて"
                  value={relationshipStatus}
                  onChange={(e) => {
                    setRelationshipStatus(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-48">
                <Select
                  label="リスク評価"
                  options={riskOptions}
                  placeholder="すべて"
                  value={riskRating}
                  onChange={(e) => {
                    setRiskRating(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-48">
                <Select
                  label="担当RM"
                  options={rmOptions}
                  placeholder="すべて"
                  value={assignedRm}
                  onChange={(e) => {
                    setAssignedRm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Button type="submit" size="sm">
                検索
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
                クリア
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="企業が見つかりません"
          description="検索条件を変更してください。"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">企業名</th>
                  <th className="px-6 py-3 font-medium text-slate-500">業種</th>
                  <th className="px-6 py-3 font-medium text-slate-500">ステータス</th>
                  <th className="px-6 py-3 font-medium text-slate-500">リスク</th>
                  <th className="px-6 py-3 font-medium text-slate-500">担当RM</th>
                  <th className="px-6 py-3 font-medium text-slate-500">対応件数</th>
                  <th className="px-6 py-3 font-medium text-slate-500">最終対応日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(ROUTES.CLIENT(client.id))}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {client.company_name}
                        </p>
                        {client.company_name_en && (
                          <p className="text-xs text-slate-500">{client.company_name_en}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{client.industry || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          RELATIONSHIP_STATUS_COLORS[client.relationship_status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {RELATIONSHIP_STATUS_LABELS[client.relationship_status] || client.relationship_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.risk_rating ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            RISK_RATING_COLORS[client.risk_rating] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {RISK_RATING_LABELS[client.risk_rating] || client.risk_rating}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{client.assigned_rm_name || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{client.interaction_count}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {client.last_interaction_date
                        ? formatDate(client.last_interaction_date)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
              <p className="text-sm text-slate-500">
                {page} / {totalPages} ページ ({total}件)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
