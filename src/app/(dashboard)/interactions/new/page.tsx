"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  API_ROUTES,
  ROUTES,
  INTERACTION_TYPE_LABELS,
  SENTIMENT_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import type { ClientSummary } from "@/lib/types";

export default function NewInteractionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client_id") || "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client search
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);

  const [form, setForm] = useState({
    client_id: preselectedClientId,
    interaction_type: "meeting",
    subject: "",
    interaction_date: new Date().toISOString().split("T")[0],
    duration_minutes: "",
    location: "",
    meeting_objective: "",
    meeting_outcome: "",
    next_steps: "",
    follow_up_date: "",
    description: "",
    proposal_amount_jpy: "",
    proposal_status: "draft",
    sentiment: "neutral",
    priority: "medium",
  });

  // Fetch clients for search
  useEffect(() => {
    async function fetchClients() {
      try {
        const params = new URLSearchParams();
        if (clientSearch) params.set("search", clientSearch);
        params.set("limit", "50");
        const res = await fetch(`${API_ROUTES.CLIENTS}?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setClients(json.data || json);
        }
      } catch {
        // ignore
      }
    }
    fetchClients();
  }, [clientSearch]);

  // If preselected client, load it
  useEffect(() => {
    if (preselectedClientId) {
      async function fetchClient() {
        try {
          const res = await fetch(API_ROUTES.CLIENT(Number(preselectedClientId)));
          if (res.ok) {
            const json = await res.json();
            setSelectedClient({
              id: json.id,
              company_name: json.company_name,
              company_name_en: json.company_name_en,
              industry: json.industry,
              company_type: json.company_type,
              relationship_status: json.relationship_status,
              risk_rating: json.risk_rating,
              assigned_rm_id: json.assigned_rm_id,
              assigned_rm_name: null,
              interaction_count: 0,
              last_interaction_date: null,
              active_product_count: 0,
              total_active_facility_jpy: null,
              created_at: json.created_at,
            });
          }
        } catch {
          // ignore
        }
      }
      fetchClient();
    }
  }, [preselectedClientId]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function selectClient(client: ClientSummary) {
    setSelectedClient(client);
    setForm((prev) => ({ ...prev, client_id: String(client.id) }));
    setClientDropdownOpen(false);
    setClientSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) {
      setError("企業を選択してください");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        client_id: Number(form.client_id),
        interaction_type: form.interaction_type,
        subject: form.subject,
        interaction_date: form.interaction_date,
        sentiment: form.sentiment || null,
        priority: form.priority,
        description: form.description || null,
      };

      if (form.duration_minutes) body.duration_minutes = Number(form.duration_minutes);
      if (form.location) body.location = form.location;
      if (form.meeting_objective) body.meeting_objective = form.meeting_objective;
      if (form.meeting_outcome) body.meeting_outcome = form.meeting_outcome;
      if (form.next_steps) body.next_steps = form.next_steps;
      if (form.follow_up_date) body.follow_up_date = form.follow_up_date;
      if (form.proposal_amount_jpy) body.proposal_amount_jpy = Number(form.proposal_amount_jpy);
      if (form.proposal_status && form.interaction_type === "proposal") {
        body.proposal_status = form.proposal_status;
      }

      const res = await fetch(API_ROUTES.INTERACTIONS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "対応の作成に失敗しました");
      }

      const data = await res.json();
      router.push(ROUTES.INTERACTION(data.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const typeOptions = Object.entries(INTERACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const sentimentOptions = Object.entries(SENTIMENT_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const proposalStatusOptions = [
    { value: "draft", label: "下書き" },
    { value: "submitted", label: "提出済み" },
    { value: "under_review", label: "審査中" },
    { value: "accepted", label: "承認" },
    { value: "rejected", label: "却下" },
    { value: "withdrawn", label: "取り下げ" },
  ];

  const interactionType = form.interaction_type;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.INTERACTIONS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">新規対応記録</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">対応詳細</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            {/* Client Selector */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">企業 *</label>
              {selectedClient ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                  <span className="flex-1 text-sm text-slate-900">
                    {selectedClient.company_name}
                    {selectedClient.company_name_en && (
                      <span className="ml-2 text-slate-500">({selectedClient.company_name_en})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setForm((prev) => ({ ...prev, client_id: "" }));
                    }}
                    className="text-sm text-slate-400 hover:text-slate-600"
                  >
                    変更
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="企業を検索..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    className="block w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                  {clientDropdownOpen && clients.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                      {clients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectClient(c)}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            {c.company_name}
                          </span>
                          {c.company_name_en && (
                            <span className="ml-2 text-slate-500">({c.company_name_en})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Type Selector */}
            <Select
              label="対応種別 *"
              id="interaction_type"
              name="interaction_type"
              options={typeOptions}
              value={form.interaction_type}
              onChange={handleChange}
            />

            {/* Common fields */}
            <Input
              label="件名 *"
              id="subject"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="日付 *"
                id="interaction_date"
                name="interaction_date"
                type="date"
                value={form.interaction_date}
                onChange={handleChange}
                required
              />
              {(interactionType === "meeting" || interactionType === "call") && (
                <Input
                  label="所要時間（分）"
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  value={form.duration_minutes}
                  onChange={handleChange}
                />
              )}
            </div>

            {/* Meeting-specific fields */}
            {interactionType === "meeting" && (
              <>
                <Input
                  label="場所"
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                />
                <Textarea
                  label="面会目的"
                  id="meeting_objective"
                  name="meeting_objective"
                  value={form.meeting_objective}
                  onChange={handleChange}
                />
                <Textarea
                  label="面会結果"
                  id="meeting_outcome"
                  name="meeting_outcome"
                  value={form.meeting_outcome}
                  onChange={handleChange}
                />
              </>
            )}

            {/* Proposal-specific fields */}
            {interactionType === "proposal" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="提案金額（円）"
                  id="proposal_amount_jpy"
                  name="proposal_amount_jpy"
                  type="number"
                  value={form.proposal_amount_jpy}
                  onChange={handleChange}
                />
                <Select
                  label="提案ステータス"
                  id="proposal_status"
                  name="proposal_status"
                  options={proposalStatusOptions}
                  value={form.proposal_status}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Description */}
            <Textarea
              label="内容"
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
            />

            {/* Next steps / follow-up */}
            {(interactionType === "meeting" || interactionType === "call") && (
              <>
                <Textarea
                  label="次のアクション"
                  id="next_steps"
                  name="next_steps"
                  value={form.next_steps}
                  onChange={handleChange}
                />
                <Input
                  label="フォローアップ日"
                  id="follow_up_date"
                  name="follow_up_date"
                  type="date"
                  value={form.follow_up_date}
                  onChange={handleChange}
                />
              </>
            )}

            {/* Sentiment and Priority */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="感触"
                id="sentiment"
                name="sentiment"
                options={sentimentOptions}
                placeholder="選択..."
                value={form.sentiment}
                onChange={handleChange}
              />
              <Select
                label="優先度"
                id="priority"
                name="priority"
                options={priorityOptions}
                value={form.priority}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex items-center justify-end gap-3">
              <Link href={ROUTES.INTERACTIONS}>
                <Button variant="secondary" type="button">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                登録する
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
