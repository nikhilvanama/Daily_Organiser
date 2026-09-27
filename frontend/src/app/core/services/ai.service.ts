import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreateTaskDto } from '../models/task.model';

// AiService — calls the backend's Gemini-backed endpoints. The API key never
// leaves the server; this just sends the user's sentence and gets a plan draft.
@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai`;

  // "lunch with Ravi tomorrow 1pm at Paradise" → { title, type, dueDate, startTime, location, ... }
  quickAdd(text: string) {
    return this.http.post<CreateTaskDto>(`${this.base}/quick-add`, { text });
  }
}
