import { z } from "zod/v4";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createClientSchema = z.object({
  company_name: z.string().min(1),
  company_name_kana: z.string().optional(),
  company_name_en: z.string().optional(),
  industry: z.string().optional(),
  sub_industry: z.string().optional(),
  company_type: z.enum(["Corporation", "Fund", "SPC", "Trust", "Partnership", "Other"]).optional(),
  registration_number: z.string().optional(),
  address: z.string().optional(),
  address_en: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  fiscal_year_end: z.string().optional(),
  aum_jpy: z.number().optional(),
  employee_count: z.number().optional(),
  relationship_start_date: z.string().optional(),
  relationship_status: z.enum(["prospect", "active", "dormant", "former"]).optional(),
  risk_rating: z.enum(["low", "medium", "high"]).optional(),
  assigned_rm_id: z.number().optional(),
  capital_amount_jpy: z.number().optional(),
  revenue_jpy: z.number().optional(),
  stock_code: z.string().optional(),
  founding_date: z.string().optional(),
  representative_name: z.string().optional(),
  representative_title: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const createContactSchema = z.object({
  client_id: z.number(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  first_name_kana: z.string().optional(),
  last_name_kana: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  is_primary_contact: z.number().optional(),
  is_decision_maker: z.number().optional(),
  preferred_language: z.enum(["ja", "en"]).optional(),
  preferred_contact_method: z.enum(["email", "phone", "in_person"]).optional(),
  notes: z.string().optional(),
});

export const createInteractionSchema = z.object({
  client_id: z.number(),
  interaction_type: z.enum(["meeting", "call", "email", "proposal", "site_visit", "conference", "other"]),
  subject: z.string().min(1),
  description: z.string().optional(),
  interaction_date: z.string(),
  duration_minutes: z.number().optional(),
  location: z.string().optional(),
  meeting_objective: z.string().optional(),
  meeting_outcome: z.string().optional(),
  next_steps: z.string().optional(),
  follow_up_date: z.string().optional(),
  internal_participants: z.string().optional(),
  external_participants: z.string().optional(),
  proposal_amount_jpy: z.number().optional(),
  proposal_status: z.enum(["draft", "submitted", "under_review", "accepted", "rejected", "withdrawn"]).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const createHandoverSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  from_user_id: z.number(),
  to_user_id: z.number(),
  client_ids: z.array(z.number()).min(1),
});

export const createBusinessCardSchema = z.object({
  client_id: z.number().optional(),
  contact_id: z.number().optional(),
  company_name: z.string().optional(),
  person_name: z.string().optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  exchange_date: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
  is_digitized: z.number().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  full_name_kana: z.string().optional(),
  role: z.enum(["admin", "manager", "staff"]),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
});
