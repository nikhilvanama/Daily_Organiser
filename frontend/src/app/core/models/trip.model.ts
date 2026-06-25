// Trip = a place you want to go or have been to. Lives on a Kanban board with
// four columns: Bucket List → Planning → Booked → Visited.
// When a trip moves to BOOKED with a start date, the backend auto-creates a matching
// plan in the Tasks module (type='trip') which then shows on the calendar and triggers
// the habit trip-day auto-exclusion.

export type TripStatus = 'BUCKET' | 'PLANNING' | 'BOOKED' | 'VISITED' | 'CANCELLED';

// Column definitions ordered left-to-right. CANCELLED is a soft-hidden status; not shown
// as a column but accessible via the edit form.
export const TRIP_COLUMNS: { value: TripStatus; label: string; color: string; tagline: string }[] = [
  { value: 'BUCKET',   label: 'Bucket List', color: '#94a3b8', tagline: 'Places I want to go' },
  { value: 'PLANNING', label: 'Planning',    color: '#eab308', tagline: 'Researching, deciding' },
  { value: 'BOOKED',   label: 'Booked',      color: '#3b82f6', tagline: 'Dates set, ready to go' },
  { value: 'VISITED',  label: 'Visited',     color: '#10b981', tagline: 'Memories made' },
];

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string | null;
  description: string | null;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  companions: string | null;
  budget: number | null;
  currency: string;
  notes: string | null;
  references: string[];
  taskId: string | null; // set when status=BOOKED with dates
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripDto {
  title: string;
  destination?: string;
  description?: string;
  status?: TripStatus;
  startDate?: string;
  endDate?: string;
  companions?: string;
  budget?: number;
  currency?: string;
  notes?: string;
  references?: string[];
}

export type UpdateTripDto = Partial<CreateTripDto>;
