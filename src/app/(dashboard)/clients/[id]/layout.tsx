"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  CreditCard,
  Users,
  MessageSquare,
  Package,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  API_ROUTES,
  ROUTES,
  RELATIONSHIP_STATUS_LABELS,
  RELATIONSHIP_STATUS_COLORS,
  RISK_RATING_COLORS,
  RISK_RATING_LABELS,
} from "@/lib/constants";
import type { Client } from "@/lib/types";

interface ClientContextType {
  client: Client;
  clientId: number;
  refreshClient: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within client layout");
  return ctx;
}

interface Counts {
  contacts: number;
  interactions: number;
  products: number;
  cards: number;
}

export default function ClientDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const clientId = Number(params.id);

  const [client, setClient] = useState<Client | null>(null);
  const [counts, setCounts] = useState<Counts>({ contacts: 0, interactions: 0, products: 0, cards: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(API_ROUTES.CLIENT(clientId));
      if (!res.ok) throw new Error("企業情報の取得に失敗しました");
      const json = await res.json();
      setClient(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();

    // Fetch counts in parallel
    Promise.all([
      fetch(API_ROUTES.CLIENT_CONTACTS(clientId)).then((r) => r.ok ? r.json() : { data: [] }),
      fetch(API_ROUTES.CLIENT_INTERACTIONS(clientId)).then((r) => r.ok ? r.json() : { total: 0 }),
      fetch(API_ROUTES.CLIENT_PRODUCTS(clientId)).then((r) => r.ok ? r.json() : { data: [] }),
      fetch(API_ROUTES.CLIENT_BUSINESS_CARDS(clientId)).then((r) => r.ok ? r.json() : { total: 0 }),
    ]).then(([contactsRes, interactionsRes, productsRes, cardsRes]) => {
      setCounts({
        contacts: Array.isArray(contactsRes) ? contactsRes.length : (contactsRes.data?.length || contactsRes.total || 0),
        interactions: interactionsRes.total || (Array.isArray(interactionsRes) ? interactionsRes.length : 0),
        products: Array.isArray(productsRes) ? productsRes.length : (productsRes.data?.length || 0),
        cards: cardsRes.total || 0,
      });
    }).catch(() => {});
  }, [clientId, fetchClient]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-red-600">{error || "企業が見つかりません"}</p>
      </div>
    );
  }

  const basePath = `/clients/${clientId}`;
  const navItems = [
    { name: "概要", href: basePath, icon: Building2, exact: true },
    { name: "財務・業績", href: `${basePath}/finance`, icon: TrendingUp },
    { name: "名刺", href: `${basePath}/cards`, icon: CreditCard, count: counts.cards },
    { name: "連絡先", href: `${basePath}/contacts`, icon: Users, count: counts.contacts },
    { name: "対応履歴", href: `${basePath}/interactions`, icon: MessageSquare, count: counts.interactions },
    { name: "商品", href: `${basePath}/products`, icon: Package, count: counts.products },
  ];

  return (
    <ClientContext.Provider value={{ client, clientId, refreshClient: fetchClient }}>
      {/* Company Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xl font-bold text-slate-600">
            {client.company_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {client.company_name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  RELATIONSHIP_STATUS_COLORS[client.relationship_status] || "bg-gray-100 text-gray-800"
                }`}
              >
                {RELATIONSHIP_STATUS_LABELS[client.relationship_status] || client.relationship_status}
              </span>
              {client.risk_rating && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    RISK_RATING_COLORS[client.risk_rating] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  リスク: {RISK_RATING_LABELS[client.risk_rating] || client.risk_rating}
                </span>
              )}
            </div>
            {client.company_name_en && (
              <p className="mt-1 text-sm text-slate-500">{client.company_name_en}</p>
            )}
          </div>
        </div>
        <Link href={ROUTES.CLIENT_EDIT(clientId)}>
          <Button variant="secondary">
            <Pencil className="mr-2 h-4 w-4" />
            編集
          </Button>
        </Link>
      </div>

      {/* Two-column layout: Entity sidebar + Content */}
      <div className="flex gap-6">
        {/* Entity Sidebar */}
        <aside className="w-56 flex-shrink-0">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {client.company_name}
              </p>
              {client.industry && (
                <p className="mt-0.5 truncate text-xs text-slate-500">{client.industry}</p>
              )}
            </div>
            <nav className="p-2">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-l-2 border-blue-600 bg-blue-50 font-medium text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {item.name}
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-xs text-slate-400">({item.count})</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ClientContext.Provider>
  );
}
