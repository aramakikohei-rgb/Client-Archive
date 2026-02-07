export const APP_NAME = "Client Archive";
export const APP_DESCRIPTION =
  "クライアント対応管理プラットフォーム — ファンドファイナンス部門";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CLIENTS: "/clients",
  CLIENT: (id: number) => `/clients/${id}`,
  CLIENT_EDIT: (id: number) => `/clients/${id}/edit`,
  CLIENT_FINANCE: (id: number) => `/clients/${id}/finance`,
  CLIENT_CARDS: (id: number) => `/clients/${id}/cards`,
  CLIENT_CONTACTS_PAGE: (id: number) => `/clients/${id}/contacts`,
  CLIENT_INTERACTIONS_PAGE: (id: number) => `/clients/${id}/interactions`,
  CLIENT_PRODUCTS_PAGE: (id: number) => `/clients/${id}/products`,
  CLIENT_NEW: "/clients/new",
  INTERACTIONS: "/interactions",
  INTERACTION: (id: number) => `/interactions/${id}`,
  INTERACTION_NEW: "/interactions/new",
  BUSINESS_CARDS: "/business-cards",
  BUSINESS_CARD_NEW: "/business-cards/new",
  HANDOVERS: "/handovers",
  HANDOVER: (id: number) => `/handovers/${id}`,
  HANDOVER_NEW: "/handovers/new",
  AUDIT: "/audit",
  SETTINGS: "/settings",
} as const;

export const API_ROUTES = {
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_ME: "/api/auth/me",
  CLIENTS: "/api/clients",
  CLIENT: (id: number) => `/api/clients/${id}`,
  CLIENT_CONTACTS: (id: number) => `/api/clients/${id}/contacts`,
  CLIENT_CONTACT: (clientId: number, contactId: number) =>
    `/api/clients/${clientId}/contacts/${contactId}`,
  CLIENT_INTERACTIONS: (id: number) => `/api/clients/${id}/interactions`,
  CLIENT_PRODUCTS: (id: number) => `/api/clients/${id}/products`,
  CLIENT_PRODUCT: (clientId: number, productId: number) =>
    `/api/clients/${clientId}/products/${productId}`,
  CLIENT_BUSINESS_CARDS: (id: number) => `/api/clients/${id}/business-cards`,
  INTERACTIONS: "/api/interactions",
  INTERACTION: (id: number) => `/api/interactions/${id}`,
  INTERACTION_LOCK: (id: number) => `/api/interactions/${id}/lock`,
  BUSINESS_CARDS: "/api/business-cards",
  BUSINESS_CARD: (id: number) => `/api/business-cards/${id}`,
  HANDOVERS: "/api/handovers",
  HANDOVER: (id: number) => `/api/handovers/${id}`,
  HANDOVER_FINALIZE: (id: number) => `/api/handovers/${id}/finalize`,
  HANDOVER_ACKNOWLEDGE: (id: number) => `/api/handovers/${id}/acknowledge`,
  HANDOVER_EXPORT: (id: number) => `/api/handovers/${id}/export`,
  AUDIT: "/api/audit",
  AUDIT_EXPORT: "/api/audit/export",
  USERS: "/api/users",
  USER: (id: number) => `/api/users/${id}`,
  FUND_PRODUCTS: "/api/fund-products",
} as const;

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  meeting: "面会",
  call: "電話",
  email: "メール",
  proposal: "提案",
  site_visit: "訪問",
  conference: "カンファレンス",
  other: "その他",
};

export const INTERACTION_TYPE_COLORS: Record<string, string> = {
  meeting: "bg-blue-100 text-blue-800",
  call: "bg-green-100 text-green-800",
  email: "bg-purple-100 text-purple-800",
  proposal: "bg-amber-100 text-amber-800",
  site_visit: "bg-cyan-100 text-cyan-800",
  conference: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

export const RELATIONSHIP_STATUS_LABELS: Record<string, string> = {
  prospect: "見込み",
  active: "アクティブ",
  dormant: "休止中",
  former: "終了",
};

export const RELATIONSHIP_STATUS_COLORS: Record<string, string> = {
  prospect: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  dormant: "bg-gray-100 text-gray-800",
  former: "bg-red-100 text-red-800",
};

export const RISK_RATING_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const RISK_RATING_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  capital_call_facility: "キャピタルコール・ファシリティ",
  nav_facility: "NAVファシリティ",
  hybrid_facility: "ハイブリッド・ファシリティ",
  management_company_facility: "運用会社ファシリティ",
  bridge_loan: "ブリッジローン",
  warehouse_facility: "ウェアハウス・ファシリティ",
  other: "その他",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  prospecting: "見込み",
  negotiating: "交渉中",
  documentation: "書類作成中",
  active: "アクティブ",
  expired: "期限切れ",
  terminated: "終了",
};

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: "ポジティブ",
  neutral: "ニュートラル",
  negative: "ネガティブ",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "緊急",
};

export const HANDOVER_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  finalized: "確定済み",
  acknowledged: "確認済み",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  staff: "スタッフ",
};

export const COMPANY_TYPE_LABELS: Record<string, string> = {
  Corporation: "株式会社",
  Fund: "ファンド",
  SPC: "SPC",
  Trust: "信託",
  Partnership: "パートナーシップ",
  Other: "その他",
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const BUSINESS_CARD_PAGE_SIZE = 30;
export const JWT_SECRET = "cimp-prototype-secret-key-change-in-production";
export const JWT_EXPIRY = "24h";
export const COOKIE_NAME = "cimp-auth-token";
