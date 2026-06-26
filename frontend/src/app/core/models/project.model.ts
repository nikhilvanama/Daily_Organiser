// Freelance project tracker. Status now ONLY describes the work itself; payment is tracked
// in a separate paymentStatus field so "delivered but not paid" is a valid state.

export type ProjectStatus = 'LEAD' | 'QUOTED' | 'IN_PROGRESS' | 'DELIVERED' | 'LOST' | 'ON_HOLD';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'LEAD',        label: 'Lead',        color: '#94a3b8' }, // slate — initial inquiry
  { value: 'QUOTED',      label: 'Quoted',      color: '#eab308' }, // yellow — waiting on client
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' }, // blue — actively working
  { value: 'DELIVERED',   label: 'Delivered',   color: '#10b981' }, // green — work done
  { value: 'ON_HOLD',     label: 'On Hold',     color: '#f97316' }, // orange — paused
  { value: 'LOST',        label: 'Lost',        color: '#ef4444' }, // red — didn't convert
];

export type PaymentStatus = 'NOT_INVOICED' | 'PENDING' | 'PARTIAL' | 'PAID' | 'NOT_APPLICABLE';

export const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: 'WEBSITE',          label: 'Website' },
  { value: 'WEB_APP',          label: 'Web application' },
  { value: 'WEB_DESIGN',       label: 'Web design (mockups only)' },
  { value: 'LANDING_PAGE',     label: 'Landing page' },
  { value: 'ECOMMERCE',        label: 'E-commerce' },
  { value: 'BUSINESS_PROFILE', label: 'Business profile' },
  { value: 'MOBILE_APP',       label: 'Mobile app' },
  { value: 'BRANDING',         label: 'Logo & branding' },
  { value: 'MAINTENANCE',      label: 'Maintenance & support' },
  { value: 'CONSULTING',       label: 'Consulting' },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'NOT_INVOICED',   label: 'Not invoiced',  color: '#94a3b8' }, // slate
  { value: 'PENDING',        label: 'Pending',       color: '#eab308' }, // yellow
  { value: 'PARTIAL',        label: 'Partial',       color: '#f97316' }, // orange
  { value: 'PAID',           label: 'Paid',          color: '#10b981' }, // green
  { value: 'NOT_APPLICABLE', label: 'N/A (self)',    color: '#64748b' }, // muted gray
];

export interface ProjectPayment {
  id: string;
  projectId: string;
  userId: string;
  amount: number;
  currency: string;
  date: string;           // YYYY-MM-DD
  note: string | null;    // 'Advance', 'Milestone 1', 'Final', etc.
  method: string | null;  // 'UPI', 'Bank', 'Cash', ...
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  isSelf: boolean;
  projectType: string | null;
  clientName: string | null;
  clientContact: string | null;
  description: string | null;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  quotedAmount: number | null;
  currency: string;
  startDate: string | null;
  deadline: string | null;
  deliveredAt: string | null;
  progress: number;
  portfolioLinks: string[];
  archived: boolean;
  showInPortfolio: boolean;
  publicSummary: string | null;
  thumbnailUrl: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  figmaUrl: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // --- derived server-side ---
  payments: ProjectPayment[];
  totalReceived: number;
  balance: number;
  isOverdue: boolean;
}

export interface CreateProjectDto {
  title: string;
  isSelf?: boolean;
  projectType?: string;
  clientName?: string;
  clientContact?: string;
  description?: string;
  status?: ProjectStatus;
  paymentStatus?: PaymentStatus;
  quotedAmount?: number;
  currency?: string;
  startDate?: string;
  deadline?: string;
  progress?: number;
  portfolioLinks?: string[];
  showInPortfolio?: boolean;
  publicSummary?: string;
  thumbnailUrl?: string;
  liveUrl?: string;
  repoUrl?: string;
  figmaUrl?: string;
  tags?: string[];
}

export type UpdateProjectDto = Partial<CreateProjectDto> & { archived?: boolean };

export interface CreatePaymentDto {
  amount: number;
  currency?: string;
  date: string;
  note?: string;
  method?: string;
}
