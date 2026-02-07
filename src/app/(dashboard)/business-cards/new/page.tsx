"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { API_ROUTES, ROUTES } from "@/lib/constants";

export default function NewBusinessCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client_id");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clients, setClients] = useState<{ id: number; company_name: string }[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    person_name: "",
    department: "",
    title: "",
    phone: "",
    mobile: "",
    email: "",
    address: "",
    website: "",
    exchange_date: new Date().toISOString().split("T")[0],
    client_id: preselectedClientId || "",
    notes: "",
  });

  useEffect(() => {
    fetch(API_ROUTES.CLIENTS + "?limit=100")
      .then((res) => res.json())
      .then((json) => setClients(json.data || []))
      .catch(() => {});
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      alert("名刺画像を選択してください。");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, String(value));
      });

      const res = await fetch(API_ROUTES.BUSINESS_CARDS, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "名刺の登録に失敗しました");
      }

      router.push(ROUTES.BUSINESS_CARDS);
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={ROUTES.BUSINESS_CARDS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">名刺作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">名刺画像</h2>
          </CardHeader>
          <CardContent>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="名刺プレビュー"
                  className="max-h-48 rounded-md object-contain"
                />
              ) : (
                <>
                  <Upload className="mb-2 h-10 w-10 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    クリックまたはドラッグ＆ドロップで画像をアップロード
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG, HEIC (最大10MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">名刺情報</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="会社名"
                id="company_name"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
              />
              <Input
                label="氏名"
                id="person_name"
                name="person_name"
                value={form.person_name}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="部署"
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
              />
              <Input
                label="役職"
                id="bc_title"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="電話番号"
                id="bc_phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
              <Input
                label="携帯番号"
                id="mobile"
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="メールアドレス"
                id="bc_email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
              <Input
                label="Webサイト"
                id="website"
                name="website"
                value={form.website}
                onChange={handleChange}
              />
            </div>
            <Input
              label="住所"
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="名刺交換日"
                id="exchange_date"
                name="exchange_date"
                type="date"
                value={form.exchange_date}
                onChange={handleChange}
              />
              <Select
                label="関連企業"
                id="client_id"
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                options={clients.map((c) => ({
                  value: String(c.id),
                  label: c.company_name,
                }))}
                placeholder="企業を選択（任意）"
              />
            </div>
            <Textarea
              label="メモ"
              id="bc_notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href={ROUTES.BUSINESS_CARDS}>
            <Button type="button" variant="secondary">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登録する
          </Button>
        </div>
      </form>
    </div>
  );
}
