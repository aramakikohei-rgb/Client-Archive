"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield, UserPlus } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { API_ROUTES, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add user modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    full_name: "",
    full_name_kana: "",
    password: "",
    role: "staff",
    department: "",
    title: "",
    phone: "",
  });

  // Role edit state
  const [editingRoleUserId, setEditingRoleUserId] = useState<number | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");
  const [roleUpdating, setRoleUpdating] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.USERS);
      if (!res.ok) throw new Error("ユーザー一覧の取得に失敗しました");
      const json = await res.json();
      setUsers(json.data || json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleAddChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    try {
      const res = await fetch(API_ROUTES.USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ユーザーの作成に失敗しました");
      }
      setAddModalOpen(false);
      setAddForm({
        email: "",
        full_name: "",
        full_name_kana: "",
        password: "",
        role: "staff",
        department: "",
        title: "",
        phone: "",
      });
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleRoleUpdate(userId: number) {
    if (!editingRoleValue) return;
    setRoleUpdating(true);
    try {
      const res = await fetch(API_ROUTES.USER(userId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editingRoleValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "権限の更新に失敗しました");
      }
      setEditingRoleUserId(null);
      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setRoleUpdating(false);
    }
  }

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  if (!isAdmin && user?.role !== "manager") {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900">アクセス制限</h2>
          <p className="mt-1 text-sm text-slate-500">
            設定は管理者およびマネージャーのみ閲覧できます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">設定</h1>
          <p className="mt-1 text-sm text-slate-500">ユーザーとシステム設定の管理</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            ユーザー追加
          </Button>
        )}
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">ユーザー一覧</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-medium text-slate-500">氏名</th>
                  <th className="px-6 py-3 font-medium text-slate-500">メール</th>
                  <th className="px-6 py-3 font-medium text-slate-500">権限</th>
                  <th className="px-6 py-3 font-medium text-slate-500">部署</th>
                  <th className="px-6 py-3 font-medium text-slate-500">ステータス</th>
                  <th className="px-6 py-3 font-medium text-slate-500">最終ログイン</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4">
                      {isAdmin && editingRoleUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingRoleValue}
                            onChange={(e) => setEditingRoleValue(e.target.value)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          >
                            {roleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            onClick={() => handleRoleUpdate(u.id)}
                            disabled={roleUpdating}
                          >
                            {roleUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "保存"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingRoleUserId(null)}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              u.role === "admin"
                                ? "danger"
                                : u.role === "manager"
                                ? "warning"
                                : "default"
                            }
                          >
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                          {isAdmin && u.id !== user?.id && (
                            <button
                              onClick={() => {
                                setEditingRoleUserId(u.id);
                                setEditingRoleValue(u.role);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              編集
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.department || "-"}</td>
                    <td className="px-6 py-4">
                      <Badge variant={u.is_active === 1 ? "success" : "default"}>
                        {u.is_active === 1 ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.last_login_at ? formatDateTime(u.last_login_at) : "未ログイン"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add User Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="ユーザー追加"
        className="max-w-lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="氏名 *"
            id="full_name"
            name="full_name"
            value={addForm.full_name}
            onChange={handleAddChange}
            required
          />
          <Input
            label="氏名（カナ）"
            id="full_name_kana"
            name="full_name_kana"
            value={addForm.full_name_kana}
            onChange={handleAddChange}
          />
          <Input
            label="メールアドレス *"
            id="add_email"
            name="email"
            type="email"
            value={addForm.email}
            onChange={handleAddChange}
            required
          />
          <Input
            label="パスワード *"
            id="password"
            name="password"
            type="password"
            value={addForm.password}
            onChange={handleAddChange}
            required
          />
          <Select
            label="権限"
            id="role"
            name="role"
            options={roleOptions}
            value={addForm.role}
            onChange={handleAddChange}
          />
          <Input
            label="部署"
            id="department"
            name="department"
            value={addForm.department}
            onChange={handleAddChange}
          />
          <Input
            label="役職"
            id="add_title"
            name="title"
            value={addForm.title}
            onChange={handleAddChange}
          />
          <Input
            label="電話番号"
            id="add_phone"
            name="phone"
            value={addForm.phone}
            onChange={handleAddChange}
          />
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setAddModalOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={addSubmitting}>
              {addSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              追加する
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
