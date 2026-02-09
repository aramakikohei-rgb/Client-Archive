"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  API_ROUTES,
  ROUTES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_COLORS,
  SENTIMENT_LABELS,
  PRIORITY_LABELS,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Interaction, PaginatedResponse, User } from "@/lib/types";

export default function InteractionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Filter states
  const [interactionType, setInteractionType] = useState(searchParams.get("interaction_type") || "");
  const [clientSearch, setClientSearch] = useState(searchParams.get("client_search") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [createdBy, setCreatedBy] = useState(searchParams.get("created_by") || "");
  const [sentiment, setSentiment] = useState(searchParams.get("sentiment") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(DEFAULT_PAGE_SIZE));
      if (interactionType) params.set("interaction_type", interactionType);
      if (clientSearch) params.set("search", clientSearch);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (createdBy) params.set("created_by", createdBy);
      if (sentiment) params.set("sentiment", sentiment);

      const res = await fetch(`${API_ROUTES.INTERACTIONS}?${params.toString()}`);
      if (!res.ok) throw new Error("対応履歴の取得に失敗しました");
      const json: PaginatedResponse<Interaction> = await res.json();
      setInteractions(json.data);
      setTotal(json.total);
      setTotalPages(json.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [page, interactionType, clientSearch, dateFrom, dateTo, createdBy, sentiment]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

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
    fetchInteractions();
  }

  function handleClearFilters() {
    setInteractionType("");
    setClientSearch("");
    setDateFrom("");
    setDateTo("");
    setCreatedBy("");
    setSentiment("");
    setPage(1);
  }

  const typeOptions = Object.entries(INTERACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const sentimentOptions = Object.entries(SENTIMENT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const userOptions = users.map((u) => ({ value: String(u.id), label: u.full_name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">対応履歴</h1>
          <p className="mt-1 text-sm text-slate-500">{total}件の対応</p>
        </div>
        <Link href={ROUTES.INTERACTION_NEW}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規対応
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-48">
                <Select
                  label="種別"
                  options={typeOptions}
                  placeholder="すべて"
                  value={interactionType}
                  onChange={(e) => {
                    setInteractionType(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-48">
                <Input
                  label="企業"
                  placeholder="企業名で検索..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="開始日"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-40">
                <Input
                  label="終了日"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-40">
                <Select
                  label="担当者"
                  options={userOptions}
                  placeholder="すべて"
                  value={createdBy}
                  onChange={(e) => {
                    setCreatedBy(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-36">
                <Select
                  label="感触"
                  options={sentimentOptions}
                  placeholder="すべて"
                  value={sentiment}
                  onChange={(e) => {
                    setSentiment(e.target.value);
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
      ) : interactions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="対応履歴が見つかりません"
          description="フィルターを変更するか、新しい対応を記録してください。"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">日付</th>
                  <th className="px-6 py-3 font-medium text-slate-500">企業</th>
                  <th className="px-6 py-3 font-medium text-slate-500">種別</th>
                  <th className="px-6 py-3 font-medium text-slate-500">件名</th>
                  <th className="px-6 py-3 font-medium text-slate-500">担当者</th>
                  <th className="px-6 py-3 font-medium text-slate-500">感触</th>
                  <th className="px-6 py-3 font-medium text-slate-500">優先度</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {interactions.map((interaction) => (
                  <tr
                    key={interaction.id}
                    onClick={() => router.push(ROUTES.INTERACTION(interaction.id))}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                      {formatDate(interaction.interaction_date)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {interaction.company_name || `企業 #${interaction.client_id}`}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          INTERACTION_TYPE_COLORS[interaction.interaction_type] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {INTERACTION_TYPE_LABELS[interaction.interaction_type] ||
                          interaction.interaction_type}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 text-slate-600">
                      {interaction.subject}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {interaction.created_by_name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {interaction.sentiment ? (
                        <Badge
                          variant={
                            interaction.sentiment === "positive"
                              ? "success"
                              : interaction.sentiment === "negative"
                              ? "danger"
                              : "default"
                          }
                        >
                          {SENTIMENT_LABELS[interaction.sentiment]}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge
                        variant={
                          interaction.priority === "urgent"
                            ? "danger"
                            : interaction.priority === "high"
                            ? "warning"
                            : "default"
                        }
                      >
                        {PRIORITY_LABELS[interaction.priority] || interaction.priority}
                      </Badge>
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
