// ============================================================
// User & Auth Types
// ============================================================

export type UserRole = "admin" | "manager" | "staff";

export interface User {
  id: number;
  email: string;
  full_name: string;
  full_name_kana: string | null;
  role: UserRole;
  department: string | null;
  title: string | null;
  phone: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

// ============================================================
// Client Types
// ============================================================

export type RelationshipStatus = "prospect" | "active" | "dormant" | "former";
export type RiskRating = "low" | "medium" | "high";
export type CompanyType =
  | "Corporation"
  | "Fund"
  | "SPC"
  | "Trust"
  | "Partnership"
  | "Other";

export interface Client {
  id: number;
  company_name: string;
  company_name_kana: string | null;
  company_name_en: string | null;
  industry: string | null;
  sub_industry: string | null;
  company_type: CompanyType | null;
  registration_number: string | null;
  address: string | null;
  address_en: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  fiscal_year_end: string | null;
  aum_jpy: number | null;
  employee_count: number | null;
  relationship_start_date: string | null;
  relationship_status: RelationshipStatus;
  risk_rating: RiskRating | null;
  assigned_rm_id: number | null;
  capital_amount_jpy: number | null;
  revenue_jpy: number | null;
  stock_code: string | null;
  founding_date: string | null;
  representative_name: string | null;
  representative_title: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClientSummary {
  id: number;
  company_name: string;
  company_name_en: string | null;
  industry: string | null;
  company_type: string | null;
  relationship_status: RelationshipStatus;
  risk_rating: RiskRating | null;
  assigned_rm_id: number | null;
  assigned_rm_name: string | null;
  interaction_count: number;
  last_interaction_date: string | null;
  active_product_count: number;
  total_active_facility_jpy: number | null;
  created_at: string;
}

// ============================================================
// Contact Types
// ============================================================

export type ContactMethod = "email" | "phone" | "in_person";

export interface ClientContact {
  id: number;
  client_id: number;
  first_name: string;
  last_name: string;
  first_name_kana: string | null;
  last_name_kana: string | null;
  title: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary_contact: number;
  is_decision_maker: number;
  preferred_language: "ja" | "en";
  preferred_contact_method: ContactMethod;
  notes: string | null;
  is_active: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Fund Product Types
// ============================================================

export type ProductType =
  | "capital_call_facility"
  | "nav_facility"
  | "hybrid_facility"
  | "management_company_facility"
  | "bridge_loan"
  | "warehouse_facility"
  | "other";

export type ProductStatus =
  | "prospecting"
  | "negotiating"
  | "documentation"
  | "active"
  | "expired"
  | "terminated";

export interface FundProduct {
  id: number;
  product_name: string;
  product_name_en: string | null;
  product_type: ProductType;
  description: string | null;
  typical_tenor_months: number | null;
  min_amount_jpy: number | null;
  max_amount_jpy: number | null;
  base_rate: string | null;
  spread_bps_min: number | null;
  spread_bps_max: number | null;
  is_active: number;
  created_at: string;
}

export interface ClientProduct {
  id: number;
  client_id: number;
  product_id: number;
  product_name?: string;
  product_type?: ProductType;
  facility_amount_jpy: number | null;
  spread_bps: number | null;
  start_date: string | null;
  maturity_date: string | null;
  status: ProductStatus;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Interaction Types
// ============================================================

export type InteractionType =
  | "meeting"
  | "call"
  | "email"
  | "proposal"
  | "site_visit"
  | "conference"
  | "other";

export type Sentiment = "positive" | "neutral" | "negative";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface Interaction {
  id: number;
  client_id: number;
  company_name?: string;
  interaction_type: InteractionType;
  subject: string;
  description: string | null;
  interaction_date: string;
  duration_minutes: number | null;
  location: string | null;
  meeting_objective: string | null;
  meeting_outcome: string | null;
  next_steps: string | null;
  follow_up_date: string | null;
  internal_participants: string | null;
  external_participants: string | null;
  proposal_amount_jpy: number | null;
  proposal_status: ProposalStatus | null;
  sentiment: Sentiment | null;
  priority: Priority;
  is_locked: number;
  locked_at: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  attachment_count?: number;
}

// ============================================================
// Handover Types
// ============================================================

export type HandoverStatus = "draft" | "finalized" | "acknowledged";

export interface HandoverPackage {
  id: number;
  title: string;
  description: string | null;
  from_user_id: number;
  from_user_name?: string;
  to_user_id: number;
  to_user_name?: string;
  client_ids: string;
  content: string;
  status: HandoverStatus;
  finalized_at: string | null;
  acknowledged_at: string | null;
  acknowledged_by: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface HandoverContent {
  generated_at: string;
  clients: HandoverClientSection[];
}

export interface HandoverClientSection {
  client_id: number;
  company_name: string;
  relationship_summary: string;
  recent_interactions: {
    date: string;
    type: InteractionType;
    subject: string;
    summary: string;
  }[];
  open_items: string[];
  key_contacts: {
    name: string;
    title: string | null;
    is_primary: boolean;
    preferred_contact: ContactMethod;
    notes: string | null;
  }[];
  active_products: {
    product_name: string;
    facility_amount_jpy: number | null;
    status: ProductStatus;
    maturity_date: string | null;
  }[];
  historical_context: string;
}

// ============================================================
// Audit Types
// ============================================================

export type AuditAction =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "HANDOVER_GENERATE"
  | "HANDOVER_FINALIZE"
  | "HANDOVER_ACKNOWLEDGE"
  | "LOCK_INTERACTION"
  | "ROLE_CHANGE";

export type AuditEntityType =
  | "client"
  | "client_contact"
  | "interaction"
  | "attachment"
  | "fund_product"
  | "client_product"
  | "handover_package"
  | "user"
  | "session"
  | "business_card";

export interface AuditEntry {
  id: number;
  timestamp: string;
  user_id: number | null;
  user_name: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: number | null;
  entity_name: string | null;
  details: string | null;
  ip_address: string | null;
  previous_hash: string | null;
  entry_hash: string;
}

// ============================================================
// Business Card Types
// ============================================================

export interface BusinessCard {
  id: number;
  contact_id: number | null;
  client_id: number | null;
  image_path: string;
  company_name: string | null;
  person_name: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  exchange_date: string | null;
  owner_user_id: number | null;
  owner_name?: string;
  notes: string | null;
  tags: string | null;
  is_digitized: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// API Types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  details?: string;
}
