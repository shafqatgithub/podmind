import { apiRequest } from "./client";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number | null;
  yearly_price: number | null;
  currency: string | null;
  ai_credits: number | null;
  max_projects: number | null;
  max_team_members: number | null;
  max_storage_gb: number | null;
  features: string[] | Record<string, unknown> | null;
  paddle_price_id_monthly: string | null;
  paddle_price_id_yearly: string | null;
}

export interface Subscription {
  id: string;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  plan_id: string;
  plan_name: string;
  plan_slug: string;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  invoice_url: string | null;
  pdf_url: string | null;
  issued_at: string | null;
  paid_at: string | null;
}

export interface CreditTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface BillingOverview {
  plans: Plan[];
  subscription: Subscription | null;
  is_free_tier: boolean;
  invoices: Invoice[];
  credits: { available_credits: number; used_credits: number; purchased_credits: number };
  transactions: CreditTransaction[];
  payments_enabled: boolean;
  /** Needed so checkout can attribute the purchase to this organization. */
  organization_id: string | null;
}

export const billingApi = {
  overview: (signal?: AbortSignal) => apiRequest<BillingOverview>("/billing", { signal }),
  plans: (signal?: AbortSignal) => apiRequest<Plan[]>("/billing/plans", { signal }),
};
