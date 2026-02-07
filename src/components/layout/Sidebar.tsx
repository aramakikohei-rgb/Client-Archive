"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES, ROLE_LABELS } from "@/lib/constants";
import {
  Building2,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  User,
} from "lucide-react";

const navigation = [
  { name: "企業", href: ROUTES.CLIENTS, icon: Building2 },
  { name: "名刺", href: ROUTES.BUSINESS_CARDS, icon: CreditCard },
  { name: "対応履歴", href: ROUTES.INTERACTIONS, icon: MessageSquare },
  { name: "設定", href: ROUTES.SETTINGS, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4">
      {/* Logo */}
      <Link href={ROUTES.CLIENTS} className="mr-6 flex items-center gap-2">
        <img src="/logo.png" alt="Client Archive" className="h-7 w-7 rounded-md" />
        <span className="text-base font-bold text-slate-900">Client Archive</span>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info (right) */}
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200">
              <User className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-slate-900">{user.full_name}</p>
              <p className="text-[10px] leading-tight text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="ログアウト"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
