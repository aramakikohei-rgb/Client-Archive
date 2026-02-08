"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Calendar,
  AlertCircle,
  Paperclip,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  API_ROUTES,
  ROUTES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_COLORS,
  SENTIMENT_LABELS,
} from "@/lib/constants";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { ClientInteractionSummary } from "@/lib/types";

interface InteractionSummaryPanelProps {
  clientId: number;
}

export function InteractionSummaryPanel({ clientId }: InteractionSummaryPanelProps) {
  const [summary, setSummary] = useState<ClientInteractionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch(API_ROUTES.CLIENT_INTERACTION_SUMMARY(clientId))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!summary || summary.total_count === 0) return null;

  const topType = summary.type_breakdown[0];

  return (
    <Card>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">対応サマリー</h3>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {!collapsed && (
        <CardContent className="space-y-5 pt-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">対応件数</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {summary.total_count}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">最終対応日</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {summary.last_interaction_date
                  ? formatDate(summary.last_interaction_date)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">主な対応種別</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {topType ? `${topType.label} (${topType.count})` : "—"}
              </p>
            </div>
          </div>

          {/* Type Breakdown */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">種別内訳</p>
            <div className="flex flex-wrap gap-2">
              {summary.type_breakdown.map((t) => (
                <span
                  key={t.type}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    INTERACTION_TYPE_COLORS[t.type] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {t.label}: {t.count}
                </span>
              ))}
            </div>
          </div>

          {/* Sentiment */}
          {summary.sentiment_breakdown.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">感触</p>
              <div className="flex gap-3">
                {summary.sentiment_breakdown.map((s) => (
                  <Badge
                    key={s.sentiment}
                    variant={
                      s.sentiment === "positive"
                        ? "success"
                        : s.sentiment === "negative"
                        ? "danger"
                        : "default"
                    }
                  >
                    {SENTIMENT_LABELS[s.sentiment] || s.sentiment}: {s.count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Pending Follow-ups */}
          {summary.pending_follow_ups.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-medium text-amber-600">
                  フォローアップ予定 ({summary.pending_follow_ups.length}件)
                </p>
              </div>
              <div className="space-y-2">
                {summary.pending_follow_ups.map((f) => (
                  <Link
                    key={f.id}
                    href={ROUTES.INTERACTION(f.id)}
                    className="block rounded-md border border-amber-100 bg-amber-50 px-3 py-2 transition-colors hover:bg-amber-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">
                        {f.subject}
                      </span>
                      <span className="text-xs text-amber-600">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {formatDate(f.follow_up_date)}
                      </span>
                    </div>
                    {f.next_steps && (
                      <p className="mt-1 text-xs text-slate-600">{f.next_steps}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Interactions */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">最近の対応</p>
            <div className="space-y-1">
              {summary.recent_interactions.map((ix) => (
                <Link
                  key={ix.id}
                  href={ROUTES.INTERACTION(ix.id)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDate(ix.interaction_date)}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        INTERACTION_TYPE_COLORS[ix.interaction_type] ||
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {INTERACTION_TYPE_LABELS[ix.interaction_type]}
                    </span>
                    <span className="truncate text-slate-900">{ix.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {ix.sentiment && (
                      <Badge
                        variant={
                          ix.sentiment === "positive"
                            ? "success"
                            : ix.sentiment === "negative"
                            ? "danger"
                            : "default"
                        }
                      >
                        {SENTIMENT_LABELS[ix.sentiment]}
                      </Badge>
                    )}
                    {ix.attachment_count > 0 && (
                      <span className="flex items-center text-xs text-slate-400">
                        <Paperclip className="mr-0.5 h-3 w-3" />
                        {ix.attachment_count}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Attachments */}
          {summary.recent_attachments.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">最新添付ファイル</p>
              <div className="space-y-1">
                {summary.recent_attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-slate-900">{a.file_name}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        ({formatFileSize(a.file_size)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs text-slate-400">
                        {a.interaction_subject}
                      </span>
                      <a
                        href={API_ROUTES.INTERACTION_ATTACHMENT_DOWNLOAD(
                          a.interaction_id,
                          a.id
                        )}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="ダウンロード"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
