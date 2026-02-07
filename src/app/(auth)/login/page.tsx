"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Client Archive" className="mx-auto mb-4 h-12 w-12 rounded-xl" />
        <h1 className="text-2xl font-bold text-slate-900">Client Archive</h1>
        <p className="mt-1 text-sm text-slate-500">
          クライアント対応管理プラットフォーム
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            id="email"
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tanaka.y@mutb.demo"
            required
          />
          <Input
            id="password"
            label="パスワード"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">デモアカウント</p>
          <div className="mt-1 space-y-1 text-xs text-slate-600">
            <p><span className="font-medium">管理者:</span> tanaka.y@mutb.demo</p>
            <p><span className="font-medium">マネージャー:</span> suzuki.a@mutb.demo</p>
            <p><span className="font-medium">スタッフ:</span> yamamoto.k@mutb.demo</p>
            <p><span className="font-medium">パスワード:</span> password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
