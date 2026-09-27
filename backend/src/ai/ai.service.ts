import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';

// The fields the AI is allowed to fill on a plan. Mirrors CreateTaskDto on the
// tasks module — the frontend passes this straight to POST /api/tasks.
export interface ParsedPlan {
  title: string;
  type?: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate?: string;   // YYYY-MM-DD
  endDate?: string;
  startTime?: string; // HH:mm (24h)
  endTime?: string;
  location?: string;
}

const VALID_TYPES = ['task', 'trip', 'train', 'dinner', 'meeting', 'event', 'reminder', 'outing', 'health', 'celebration'];
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// AiService turns a natural-language sentence ("lunch with Ravi tomorrow 1pm at
// Paradise") into a structured plan using the Gemini API's JSON output mode.
// The API key lives ONLY in the backend env (GEMINI_API_KEY) — never in Angular.
@Injectable()
export class AiService {
  async quickAdd(text: string): Promise<ParsedPlan> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('AI is not configured — set GEMINI_API_KEY on the server');
    }
    if (!text || !text.trim()) throw new BadRequestException('Text is required');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You convert a short natural-language sentence into a JSON plan object for a personal organizer app used in India.

Today is ${weekday}, ${today}. Times the user gives are local.

Return ONLY a JSON object with these fields (omit any field you cannot infer — never invent details):
- "title": string, required. Short and clean, e.g. "Lunch with Ravi" — drop date/time/location words from it.
- "type": one of ${JSON.stringify(VALID_TYPES)}. Pick the best fit: food/meals="dinner", travel to another city/vacation="trip", bus/train/commute journeys="train", calls/meetings="meeting", movies/malls/hangouts="outing", doctor/medicine/checkups="health", birthdays/weddings/festivals="celebration", conferences/shows="event", things to remember="reminder", anything else="task".
- "dueDate": "YYYY-MM-DD". Resolve relative dates from today: "tomorrow", "next friday", "on 15th" (next occurrence). Omit if no date mentioned.
- "endDate": "YYYY-MM-DD", only for multi-day spans ("15th to 18th").
- "startTime": "HH:mm" 24-hour ("1pm"="13:00", "morning"="09:00", "evening"="18:00", "night"="21:00"). Omit if none.
- "endTime": "HH:mm", only when a range or duration is given.
- "location": string, the place name if mentioned.
- "description": string, any leftover useful detail (who is coming, what to carry). Omit if nothing left.
- "priority": "LOW" | "MEDIUM" | "HIGH", only if urgency is expressed ("urgent", "important" = HIGH).

Sentence: ${JSON.stringify(text.trim())}`;

    let res: Response;
    try {
      res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Could not reach the AI service');
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 400 with API_KEY_INVALID etc. — surface a clean message, log the detail
      console.error('Gemini error', res.status, body.slice(0, 500));
      throw new ServiceUnavailableException(`AI request failed (${res.status})`);
    }

    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new ServiceUnavailableException('AI returned no result');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ServiceUnavailableException('AI returned invalid JSON');
    }

    return this.sanitize(parsed);
  }

  // Whitelist + validate every field so a hallucinated shape can never reach the
  // tasks endpoint (which would reject unknown fields via forbidNonWhitelisted).
  private sanitize(p: any): ParsedPlan {
    if (!p || typeof p.title !== 'string' || !p.title.trim()) {
      throw new BadRequestException('Could not understand that — try adding a clearer activity');
    }
    const out: ParsedPlan = { title: p.title.trim().slice(0, 200) };
    if (typeof p.type === 'string' && VALID_TYPES.includes(p.type)) out.type = p.type;
    if (typeof p.description === 'string' && p.description.trim()) out.description = p.description.trim().slice(0, 1000);
    if (['LOW', 'MEDIUM', 'HIGH'].includes(p.priority)) out.priority = p.priority;
    const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const isTime = (v: any) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
    if (isDate(p.dueDate)) out.dueDate = p.dueDate;
    if (isDate(p.endDate)) out.endDate = p.endDate;
    if (isTime(p.startTime)) out.startTime = p.startTime;
    if (isTime(p.endTime)) out.endTime = p.endTime;
    if (typeof p.location === 'string' && p.location.trim()) out.location = p.location.trim().slice(0, 200);
    return out;
  }
}
