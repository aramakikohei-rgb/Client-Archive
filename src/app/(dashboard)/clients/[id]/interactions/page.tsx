"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useClient } from "../layout";
import {
  API_ROUTES,
  ROUTES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_COLORS,
  SENTIMENT_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Interaction } from "@/lib/types";

export default function ClientInteractionsPage() {
  const { clientId } = useClient();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ROUTES.CLIENT_INTERACTIONS(clientId))
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setInteractions(json.data || json || []))
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`${ROUTES.INTERACTION_NEW}?client_id=${clientId}`}>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新規対応
          </Button>
        </Link>
      </div>

      {interactions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="対応履歴がありません"
          description="この企業との最初の対応を記録してください。"
        />
      ) : (
        <div className="space-y-3">
          {interactions.map((ix) => (
            <Link key={ix.id} href={ROUTES.INTERACTION(ix.id)}>
              <Card className="transition-colors hover:bg-slate-50">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-slate-900">
                          {ix.subject}
                        </h4>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            INTERACTION_TYPE_COLORS[ix.interaction_type] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {INTERACTION_TYPE_LABELS[ix.interaction_type] || ix.interaction_type}
                        </span>
                        {ix.sentiment && (
                          <Badge
                            variant={
                              ix.sentiment === "positive" ? "success" : ix.sentiment === "negative" ? "danger" : "default"
                            }
                          >
                            {SENTIMENT_LABELS[ix.sentiment]}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(ix.interaction_date)}
                        {ix.created_by_name && ` — ${ix.created_by_name}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
