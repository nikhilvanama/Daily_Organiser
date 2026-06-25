// BuyItem = something you want to buy. Kanban columns: Want → Considering → Bought (→ Skipped).

export type BuyStatus = 'WANT' | 'CONSIDERING' | 'BOUGHT' | 'SKIPPED';
export type BuyUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export const BUY_COLUMNS: { value: BuyStatus; label: string; color: string; tagline: string }[] = [
  { value: 'WANT',        label: 'Want',        color: '#94a3b8', tagline: 'Stuff I need to remember' },
  { value: 'CONSIDERING', label: 'Considering', color: '#eab308', tagline: 'Researching options' },
  { value: 'BOUGHT',      label: 'Bought',      color: '#10b981', tagline: 'Got it' },
  { value: 'SKIPPED',     label: 'Skipped',     color: '#94a3b8', tagline: 'Decided I don\'t need it' },
];

export const URGENCY_OPTIONS: { value: BuyUrgency; label: string; color: string }[] = [
  { value: 'LOW',    label: 'Low',    color: '#10b981' },
  { value: 'MEDIUM', label: 'Medium', color: '#eab308' },
  { value: 'HIGH',   label: 'High',   color: '#ef4444' },
];

export interface BuyItem {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  status: BuyStatus;
  urgency: BuyUrgency;
  estimatedPrice: number | null;
  boughtPrice: number | null;
  currency: string;
  store: string | null;
  link: string | null;
  notes: string | null;
  boughtAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBuyItemDto {
  name: string;
  category?: string;
  status?: BuyStatus;
  urgency?: BuyUrgency;
  estimatedPrice?: number;
  boughtPrice?: number;
  currency?: string;
  store?: string;
  link?: string;
  notes?: string;
  boughtAt?: string;
}

export type UpdateBuyItemDto = Partial<CreateBuyItemDto>;
