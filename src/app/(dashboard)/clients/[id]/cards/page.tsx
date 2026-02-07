"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CreditCard, Plus, Search, Loader2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useClient } from "../layout";
import { API_ROUTES, ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { BusinessCard } from "@/lib/types";

export default function ClientCardsPage() {
  const { clientId } = useClient();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (search) params.set("search", search);
      const res = await fetch(`${API_ROUTES.CLIENT_BUSINESS_CARDS(clientId)}?${params}`);
      if (res.ok) {
        const json = await res.json();
        setCards(json.data || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clientId, search]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="名刺を検索..."
            className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link href={`${ROUTES.BUSINESS_CARD_NEW}?client_id=${clientId}`}>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />名刺追加
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : cards.length === 0 ? (
        <EmptyState icon={CreditCard} title="名刺がありません" description="この企業の名刺を追加してください。" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <div key={card.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md">
              <div className="border-b border-slate-200 bg-slate-50 p-4">
                <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                  {card.image_path ? (
                    <img src={card.image_path} alt="名刺" className="w-full" />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center bg-slate-100">
                      <CreditCard className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-blue-600">{card.company_name || "-"}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{card.person_name || "-"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{[card.department, card.title].filter(Boolean).join(" ") || "-"}</p>
                  </div>
                  <div className="flex-shrink-0 text-right text-xs text-slate-500">
                    <p>{card.owner_name || "-"}</p>
                    <p>{card.exchange_date ? formatDate(card.exchange_date) : "-"}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {card.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{card.phone}</div>}
                  {card.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{card.email}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
