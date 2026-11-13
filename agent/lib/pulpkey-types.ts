export type EmployeeRole =
  | "owner_admin"
  | "coo_admin"
  | "hr_admin"
  | "sourcing_manager"
  | "team_member"
  | "auditor";

export interface Employee {
  id: string;
  fullName: string;
  whatsappJid: string | null;
  phoneE164: string | null;
  email: string | null;
  role: EmployeeRole;
  team: string | null;
  birthday: string | null;
  status: "active" | "inactive" | "leave";
}

export interface CreatorSearchInput {
  query?: string;
  city?: string;
  category?: string;
  language?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minAverageViews?: number;
  minEngagementRate?: number;
  maxCommercial?: number;
  brandExperience?: string;
  limit?: number;
}

export interface CreatorSearchResult {
  id: string;
  name: string;
  platform: string;
  handle: string;
  profileUrl: string | null;
  city: string | null;
  category: string | null;
  niche: string | null;
  language: string | null;
  followers: number | null;
  averageViews: number | null;
  engagementRate: number | null;
  latestCommercial: number | null;
  latestBrand: string | null;
  source: string | null;
  sourceUpdatedAt: string | null;
}

export type AutomationType =
  | "scheduled_message"
  | "birthday"
  | "holiday"
  | "work_log_request"
  | "reminder";

export type Recurrence = "once" | "daily" | "weekdays" | "weekly" | "yearly";

export interface AutomationRule {
  id: string;
  name: string;
  automationType: AutomationType;
  groupJid: string;
  messageTemplate: string;
  nextRunAt: string;
  recurrence: Recurrence;
  timezone: string;
  enabled: boolean;
  leaseToken: string | null;
}

export interface ClaimedAutomation extends AutomationRule {
  leaseToken: string;
  dueAt: string;
}

export interface WorkLogStatus {
  requestId: string;
  groupJid: string;
  requestedAt: string;
  dueAt: string;
  responded: { id: string; fullName: string }[];
  missing: { id: string; fullName: string; whatsappJid: string | null }[];
}
