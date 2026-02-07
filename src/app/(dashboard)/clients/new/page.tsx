"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  API_ROUTES,
  ROUTES,
  RELATIONSHIP_STATUS_LABELS,
  RISK_RATING_LABELS,
  COMPANY_TYPE_LABELS,
} from "@/lib/constants";
import type { User } from "@/lib/types";

export default function NewClientPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    company_name: "",
    company_name_en: "",
    company_name_kana: "",
    industry: "",
    company_type: "",
    city: "",
    phone: "",
    website: "",
    fiscal_year_end: "",
    aum_jpy: "",
    capital_amount_jpy: "",
    revenue_jpy: "",
    stock_code: "",
    founding_date: "",
    representative_name: "",
    representative_title: "",
    relationship_status: "prospect",
    risk_rating: "",
    assigned_rm_id: "",
    notes: "",
  });

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body = {
        ...form,
        aum_jpy: form.aum_jpy ? Number(form.aum_jpy) : null,
        capital_amount_jpy: form.capital_amount_jpy ? Number(form.capital_amount_jpy) : null,
        revenue_jpy: form.revenue_jpy ? Number(form.revenue_jpy) : null,
        assigned_rm_id: form.assigned_rm_id ? Number(form.assigned_rm_id) : null,
        company_type: form.company_type || null,
        risk_rating: form.risk_rating || null,
        stock_code: form.stock_code || null,
        founding_date: form.founding_date || null,
        representative_name: form.representative_name || null,
        representative_title: form.representative_title || null,
      };

      const res = await fetch(API_ROUTES.CLIENTS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "企業の作成に失敗しました");
      }

      const data = await res.json();
      router.push(ROUTES.CLIENT(data.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  const statusOptions = Object.entries(RELATIONSHIP_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const companyTypeOptions = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const riskOptions = Object.entries(RISK_RATING_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const rmOptions = users.map((u) => ({ value: String(u.id), label: u.full_name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.CLIENTS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">新規企業登録</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">企業情報</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="企業名（日本語）*"
                  id="company_name"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="企業名（英語）"
                  id="company_name_en"
                  name="company_name_en"
                  value={form.company_name_en}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="企業名（カナ）"
                id="company_name_kana"
                name="company_name_kana"
                value={form.company_name_kana}
                onChange={handleChange}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="業種"
                  id="industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                />
                <Select
                  label="企業種別"
                  id="company_type"
                  name="company_type"
                  options={companyTypeOptions}
                  placeholder="種別を選択..."
                  value={form.company_type}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="所在地"
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                />
                <Input
                  label="電話番号"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Webサイト"
                  id="website"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="https://"
                />
                <Input
                  label="決算月"
                  id="fiscal_year_end"
                  name="fiscal_year_end"
                  value={form.fiscal_year_end}
                  onChange={handleChange}
                  placeholder="MM-DD"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="AUM（億円）"
                  id="aum_jpy"
                  name="aum_jpy"
                  type="number"
                  value={form.aum_jpy}
                  onChange={handleChange}
                />
                <Select
                  label="担当RM"
                  id="assigned_rm_id"
                  name="assigned_rm_id"
                  options={rmOptions}
                  placeholder="RMを選択..."
                  value={form.assigned_rm_id}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="関係ステータス"
                  id="relationship_status"
                  name="relationship_status"
                  options={statusOptions}
                  value={form.relationship_status}
                  onChange={handleChange}
                />
                <Select
                  label="リスク評価"
                  id="risk_rating"
                  name="risk_rating"
                  options={riskOptions}
                  placeholder="評価を選択..."
                  value={form.risk_rating}
                  onChange={handleChange}
                />
              </div>

              <Textarea
                label="メモ"
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="企業に関する追加メモ..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">財務情報</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="資本金（百万円）"
                  id="capital_amount_jpy"
                  name="capital_amount_jpy"
                  type="number"
                  value={form.capital_amount_jpy}
                  onChange={handleChange}
                />
                <Input
                  label="売上高（百万円）"
                  id="revenue_jpy"
                  name="revenue_jpy"
                  type="number"
                  value={form.revenue_jpy}
                  onChange={handleChange}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="証券コード"
                  id="stock_code"
                  name="stock_code"
                  value={form.stock_code}
                  onChange={handleChange}
                  placeholder="例: 8306"
                />
                <Input
                  label="設立年月"
                  id="founding_date"
                  name="founding_date"
                  value={form.founding_date}
                  onChange={handleChange}
                  placeholder="例: 1927-03"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="代表者氏名"
                  id="representative_name"
                  name="representative_name"
                  value={form.representative_name}
                  onChange={handleChange}
                />
                <Input
                  label="代表者役職"
                  id="representative_title"
                  name="representative_title"
                  value={form.representative_title}
                  onChange={handleChange}
                  placeholder="例: 代表取締役社長"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Link href={ROUTES.CLIENTS}>
              <Button variant="secondary" type="button">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録する
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
