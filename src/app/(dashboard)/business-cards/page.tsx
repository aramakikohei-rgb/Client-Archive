"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { API_ROUTES, ROUTES, BUSINESS_CARD_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { BusinessCard } from "@/lib/types";

export default function BusinessCardsPage() {
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "not_digitized">("all");
  const [page, setPage] = useState(1);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(BUSINESS_CARD_PAGE_SIZE));
      if (search) params.set("search", search);
      if (activeTab === "not_digitized") params.set("is_digitized", "0");

      const res = await fetch(`${API_ROUTES.BUSINESS_CARDS}?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCards(json.data || []);
        setTotal(json.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const totalPages = Math.ceil(total / BUSINESS_CARD_PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">名刺</h1>
          <p className="mt-1 text-sm text-slate-500">{total}件</p>
        </div>
        <Link href={ROUTES.BUSINESS_CARD_NEW}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            名刺作成
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="会社名・氏名・Email・電話番号を入力"
                className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              クリア
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("all"); setPage(1); }}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          すべて({total})
        </button>
        <button
          onClick={() => { setActiveTab("not_digitized"); setPage(1); }}
          className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
            activeTab === "not_digitized"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          データ化未完了
        </button>
      </div>

      {/* Table Header */}
      <div className="hidden border-b border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 lg:flex">
        <div className="w-32 flex-shrink-0" />
        <div className="flex-1 min-w-[180px]">会社名・氏名</div>
        <div className="w-48 flex-shrink-0">部署・役職</div>
        <div className="w-48 flex-shrink-0">連絡先</div>
        <div className="w-48 flex-shrink-0">住所</div>
        <div className="w-40 flex-shrink-0 text-right">所有者・名刺交換日</div>
      </div>

      {/* Card List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="名刺がありません"
          description="名刺を追加してください。"
        />
      ) : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50 lg:flex-row lg:items-center lg:gap-0"
            >
              {/* Thumbnail */}
              <div className="w-32 flex-shrink-0">
                {card.image_path ? (
                  <img
                    src={card.image_path}
                    alt="名刺"
                    className="h-[72px] w-[120px] rounded border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[120px] items-center justify-center rounded border border-slate-200 bg-slate-100">
                    <CreditCard className="h-6 w-6 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Company & Name */}
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs text-blue-600">{card.company_name || "-"}</p>
                <p className="text-sm font-bold text-slate-900">{card.person_name || "-"}</p>
              </div>

              {/* Department & Title */}
              <div className="w-48 flex-shrink-0 text-xs text-slate-600">
                {[card.department, card.title].filter(Boolean).join(" ") || "-"}
              </div>

              {/* Contact */}
              <div className="w-48 flex-shrink-0 space-y-0.5 text-xs text-slate-600">
                {card.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {card.phone}
                  </div>
                )}
                {card.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {card.email}
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="w-48 flex-shrink-0 text-xs text-slate-600">
                {card.address ? (
                  <div className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-400" />
                    <span>{card.address}</span>
                  </div>
                ) : (
                  "-"
                )}
              </div>

              {/* Owner & Date */}
              <div className="w-40 flex-shrink-0 text-right text-xs text-slate-500">
                <p>{card.owner_name || "-"}</p>
                <p>{card.exchange_date ? formatDate(card.exchange_date) : "-"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {total}件中 {(page - 1) * BUSINESS_CARD_PAGE_SIZE + 1}〜
            {Math.min(page * BUSINESS_CARD_PAGE_SIZE, total)}件目
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              前へ
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
