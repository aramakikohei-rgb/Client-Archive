"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, UserCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { useClient } from "../layout";
import { API_ROUTES } from "@/lib/constants";
import type { ClientContact } from "@/lib/types";

export default function ClientContactsPage() {
  const { clientId } = useClient();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", first_name_kana: "", last_name_kana: "",
    title: "", department: "", email: "", phone: "", mobile: "",
    is_primary_contact: "0", is_decision_maker: "0",
    preferred_language: "ja", preferred_contact_method: "email", notes: "",
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.CLIENT_CONTACTS(clientId));
      if (res.ok) {
        const json = await res.json();
        setContacts(json.data || json || []);
      }
    } catch {} finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form, is_primary_contact: Number(form.is_primary_contact), is_decision_maker: Number(form.is_decision_maker) };
      const res = await fetch(API_ROUTES.CLIENT_CONTACTS(clientId), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "追加に失敗しました"); }
      setModalOpen(false);
      setForm({ first_name: "", last_name: "", first_name_kana: "", last_name_kana: "", title: "", department: "", email: "", phone: "", mobile: "", is_primary_contact: "0", is_decision_maker: "0", preferred_language: "ja", preferred_contact_method: "email", notes: "" });
      fetchContacts();
    } catch (err) { alert(err instanceof Error ? err.message : "エラー"); } finally { setSubmitting(false); }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />連絡先を追加
        </Button>
      </div>

      {contacts.length === 0 ? (
        <EmptyState icon={UserCircle} title="連絡先がありません" description="この企業の連絡先を追加してください。" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">氏名</th>
                  <th className="px-6 py-3 font-medium text-slate-500">役職</th>
                  <th className="px-6 py-3 font-medium text-slate-500">部署</th>
                  <th className="px-6 py-3 font-medium text-slate-500">メール</th>
                  <th className="px-6 py-3 font-medium text-slate-500">電話</th>
                  <th className="px-6 py-3 font-medium text-slate-500">役割</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{c.last_name} {c.first_name}</td>
                    <td className="px-6 py-4 text-slate-600">{c.title || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{c.department || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{c.email ? <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">{c.email}</a> : "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{c.phone || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {c.is_primary_contact === 1 && <Badge variant="info">主担当</Badge>}
                        {c.is_decision_maker === 1 && <Badge variant="warning">意思決定者</Badge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="連絡先を追加" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="姓" id="last_name" name="last_name" value={form.last_name} onChange={handleChange} required />
            <Input label="名" id="first_name" name="first_name" value={form.first_name} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="姓（カナ）" id="last_name_kana" name="last_name_kana" value={form.last_name_kana} onChange={handleChange} />
            <Input label="名（カナ）" id="first_name_kana" name="first_name_kana" value={form.first_name_kana} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="役職" id="c_title" name="title" value={form.title} onChange={handleChange} />
            <Input label="部署" id="department" name="department" value={form.department} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="メール" id="c_email" name="email" type="email" value={form.email} onChange={handleChange} />
            <Input label="電話" id="c_phone" name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <Input label="携帯" id="c_mobile" name="mobile" value={form.mobile} onChange={handleChange} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="主担当" id="is_primary_contact" name="is_primary_contact" options={[{ value: "0", label: "いいえ" }, { value: "1", label: "はい" }]} value={form.is_primary_contact} onChange={handleChange} />
            <Select label="意思決定者" id="is_decision_maker" name="is_decision_maker" options={[{ value: "0", label: "いいえ" }, { value: "1", label: "はい" }]} value={form.is_decision_maker} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="希望言語" id="preferred_language" name="preferred_language" options={[{ value: "ja", label: "日本語" }, { value: "en", label: "English" }]} value={form.preferred_language} onChange={handleChange} />
            <Select label="希望連絡方法" id="preferred_contact_method" name="preferred_contact_method" options={[{ value: "email", label: "メール" }, { value: "phone", label: "電話" }, { value: "in_person", label: "対面" }]} value={form.preferred_contact_method} onChange={handleChange} />
          </div>
          <Textarea label="メモ" id="c_notes" name="notes" value={form.notes} onChange={handleChange} />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>キャンセル</Button>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}追加</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
