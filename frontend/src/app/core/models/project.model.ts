// Freelance project tracker. A project moves through statuses (LEAD → QUOTED → IN_PROGRESS → DELIVERED → PAID),
// or branches to LOST/ON_HOLD. Each project has many payments recorded over time.

export type ProjectStatus = 'LEAD' | 'QUOTED' | 'IN_PROGRESS' | 'DELIVERED' | 'PAID' | 'LOST' | 'ON_HOLD';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'LEAD',        label: 'Lead',        color: '#94a3b8' }, // slate — initial inquiry
  { value: 'QUOTED',      label: 'Quoted',      color: '#eab308' }, // yellow — waiting on client
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' }, // blue — actively working
  { value: 'DELIVERED',   label: 'Delivered',   color: '#8b5cf6' }, // purple — awaiting final payment
  { value: 'PAID',        label: 'Paid',        color: '#10b981' }, // green — done
  { value: 'LOST',        label: 'Lost',        color: '#ef4444' }, // red — didn't convert
  { value: 'ON_HOLD',     label: 'On Hold',     color: '#f97316' }, // orange — paused
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
  clientName: string | null;
  clientContact: string | null;
  description: string | null;
  status: ProjectStatus;
  quotedAmount: number | null;
  currency: string;
  startDate: string | null;
  deadline: string | null;
  deliveredAt: string | null;
  progress: number;
  portfolioLinks: string[];
  archived: boolean;
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
  clientName?: string;
  clientContact?: string;
  description?: string;
  status?: ProjectStatus;
  quotedAmount?: number;
  currency?: string;
  startDate?: string;
  deadline?: string;
  progress?: number;
  portfolioLinks?: string[];
}

export type UpdateProjectDto = Partial<CreateProjectDto> & { archived?: boolean };

export interface CreatePaymentDto {
  amount: number;
  currency?: string;
  date: string;
  note?: string;
  method?: string;
}
