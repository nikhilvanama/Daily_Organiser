import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateTaskDto } from '../models/task.model';
import { CreateTripDto } from '../models/trip.model';
import { CreateBuyItemDto } from '../models/buy-item.model';

// A polished journal entry drafted by the AI.
export interface AiJournalDraft {
  date: string; // YYYY-MM-DD
  title?: string;
  mood?: string;
  body: string;
}

// Discriminated result from the backend: the AI decides whether the sentence
// was a plan, a journal recap, or a trip request.
export type AiQuickAddResult =
  | { kind: 'plan'; plan: CreateTaskDto }
  | { kind: 'journal'; journal: AiJournalDraft }
  | { kind: 'trip'; trip: CreateTripDto }
  | { kind: 'buy'; buy: CreateBuyItemDto };

// Forced target when the user types a /command before the message
export type AiMode = 'plan' | 'journal' | 'trip' | 'buy';

// AiService — calls the backend's Gemini-backed endpoints. The API key never
// leaves the server; this just sends the user's sentence and gets a draft back.
@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai`;

  quickAdd(text: string, mode?: AiMode) {
    return this.http.post<AiQuickAddResult>(`${this.base}/quick-add`, mode ? { text, mode } : { text });
  }
}
