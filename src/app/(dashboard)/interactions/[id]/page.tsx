"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Calendar,
  Clock,
  MapPin,
  User,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  API_ROUTES,
  ROUTES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_COLORS,
  SENTIMENT_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { AttachmentSection } from "@/components/interaction/AttachmentSection";
import type { Interaction } from "@/lib/types";

export default function InteractionDetailPage() {
  const params = useParams();
  const interactionId = Number(params.id);

  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    async function fetchInteraction() {
      try {
        const res = await fetch(API_ROUTES.INTERACTION(interactionId));
        if (!res.ok) throw new Error("対応履歴の取得に失敗しました");
        const json = await res.json();
        setInteraction(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchInteraction();
  }, [interactionId]);

  async function handleLock() {
    setLocking(true);
    try {
      const res = await fetch(API_ROUTES.INTERACTION_LOCK(interactionId), {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ロックに失敗しました");
      }
      const data = await res.json();
      setInteraction((prev) =>
        prev ? { ...prev, is_locked: 1, locked_at: data.locked_at || new Date().toISOString() } : prev
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLocking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !interaction) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-red-600">{error || "対応履歴が見つかりません"}</p>
      </div>
    );
  }

  const isLocked = interaction.is_locked === 1;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.INTERACTIONS}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{interaction.subject}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  INTERACTION_TYPE_COLORS[interaction.interaction_type] ||
                  "bg-gray-100 text-gray-800"
                }`}
              >
                {INTERACTION_TYPE_LABELS[interaction.interaction_type] ||
                  interaction.interaction_type}
              </span>
              {isLocked && (
                <Badge variant="default">
                  <Lock className="mr-1 h-3 w-3" />
                  ロック済み
                </Badge>
              )}
            </div>
          </div>
        </div>
        {!isLocked && (
          <Button variant="secondary" onClick={handleLock} disabled={locking}>
            {locking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            ロックする
          </Button>
        )}
      </div>

      {/* Locked notice */}
      {isLocked && interaction.locked_at && (
        <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Lock className="mr-2 inline h-4 w-4" />
          この対応履歴は {formatDateTime(interaction.locked_at)} にロックされました。以降の編集はできません。
        </div>
      )}

      {/* Details Card */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-900">詳細</h2>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-sm font-medium text-slate-500">日付</dt>
                <dd className="text-sm text-slate-900">
                  {formatDate(interaction.interaction_date)}
                </dd>
              </div>
            </div>
            {interaction.duration_minutes && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-sm font-medium text-slate-500">所要時間</dt>
                  <dd className="text-sm text-slate-900">
                    {interaction.duration_minutes}分
                  </dd>
                </div>
              </div>
            )}
            {interaction.location && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-sm font-medium text-slate-500">場所</dt>
                  <dd className="text-sm text-slate-900">{interaction.location}</dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-sm font-medium text-slate-500">企業</dt>
                <dd className="text-sm">
                  <Link
                    href={ROUTES.CLIENT(interaction.client_id)}
                    className="text-blue-600 hover:underline"
                  >
                    {interaction.company_name || `企業 #${interaction.client_id}`}
                  </Link>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-4 w-4 text-slate-400" />
              <div>
                <dt className="text-sm font-medium text-slate-500">担当者</dt>
                <dd className="text-sm text-slate-900">
                  {interaction.created_by_name || `ユーザー #${interaction.created_by}`}
                </dd>
              </div>
            </div>
            {interaction.sentiment && (
              <div>
                <dt className="text-sm font-medium text-slate-500">感触</dt>
                <dd className="mt-1">
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
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-slate-500">優先度</dt>
              <dd className="mt-1">
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
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Meeting-specific content */}
      {interaction.interaction_type === "meeting" && (
        <>
          {interaction.meeting_objective && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">面会目的</h2>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {interaction.meeting_objective}
                </p>
              </CardContent>
            </Card>
          )}
          {interaction.meeting_outcome && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-slate-900">面会結果</h2>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {interaction.meeting_outcome}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Proposal-specific content */}
      {interaction.interaction_type === "proposal" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">提案詳細</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {interaction.proposal_amount_jpy && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">提案金額</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {formatCurrency(interaction.proposal_amount_jpy)}
                  </dd>
                </div>
              )}
              {interaction.proposal_status && (
                <div>
                  <dt className="text-sm font-medium text-slate-500">提案ステータス</dt>
                  <dd className="mt-1 text-sm capitalize text-slate-900">
                    {interaction.proposal_status.replace(/_/g, " ")}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {interaction.description && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">内容</h2>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {interaction.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps / Follow-up */}
      {(interaction.next_steps || interaction.follow_up_date) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">次のアクション・フォローアップ</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {interaction.next_steps && (
              <div>
                <dt className="text-sm font-medium text-slate-500">次のアクション</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {interaction.next_steps}
                </dd>
              </div>
            )}
            {interaction.follow_up_date && (
              <div>
                <dt className="text-sm font-medium text-slate-500">フォローアップ日</dt>
                <dd className="mt-1 text-sm font-medium text-amber-600">
                  {formatDate(interaction.follow_up_date)}
                </dd>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <AttachmentSection interactionId={interactionId} isLocked={isLocked} />
    </div>
  );
}
