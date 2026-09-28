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

// A polished journal entry — the frontend passes this to PUT /api/journal/:date.
export interface ParsedJournal {
  date: string; // YYYY-MM-DD; mentioned date, else today
  title?: string;
  mood?: string; // one of the app's mood emojis
  body: string;
}

// A trip draft — the frontend passes this to POST /api/trips.
export interface ParsedTrip {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status?: 'BUCKET' | 'PLANNING' | 'BOOKED' | 'VISITED';
  notes?: string;
}

// A wishlist item draft — the frontend passes this to POST /api/buy-list.
export interface ParsedBuy {
  name: string;
  category?: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedPrice?: number;
  store?: string;
  notes?: string;
}

// Discriminated result: what the sentence turned out to be.
export type QuickAddResult =
  | { kind: 'plan'; plan: ParsedPlan }
  | { kind: 'journal'; journal: ParsedJournal }
  | { kind: 'trip'; trip: ParsedTrip }
  | { kind: 'buy'; buy: ParsedBuy };

// The user can force a kind with a chat command (/plan, /journal, /trip, /buy).
export type QuickAddMode = 'plan' | 'journal' | 'trip' | 'buy';

const MOODS = ['😊', '😌', '💪', '🎯', '😐', '😔', '😴', '🤔'];

const VALID_TYPES = ['task', 'trip', 'train', 'dinner', 'meeting', 'event', 'reminder', 'outing', 'health', 'celebration'];

// Google retires model names over time (gemini-2.0-flash died with a 404), so we
// try a chain: the -latest alias first, then current stable names. A model that
// answers 404 (gone) or 503/429 (busy) is skipped; the first one that works is
// remembered and tried first on subsequent requests.
const MODEL_CHAIN = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// AiService turns a natural-language sentence ("lunch with Ravi tomorrow 1pm at
// Paradise") into a structured plan using the Gemini API's JSON output mode.
// The API key lives ONLY in the backend env (GEMINI_API_KEY) — never in Angular.
@Injectable()
export class AiService {
  async quickAdd(text: string, mode?: QuickAddMode): Promise<QuickAddResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('AI is not configured — set GEMINI_API_KEY on the server');
    }
    if (!text || !text.trim()) throw new BadRequestException('Text is required');

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are the assistant inside a personal organizer app used in India. Convert the user's message into ONE JSON object. Today is ${weekday}, ${today}. Times are local. Resolve every relative date from today ("tomorrow", "next friday", "sept 19" = the most recent/relevant occurrence).

${mode
  ? `The user explicitly selected kind="${mode}" — output that kind, do not reclassify.`
  : `First decide "kind":
- "journal" — the user is describing what they DID or experienced (past tense day recap, feelings), or says journal/diary/"note down my day".
- "trip" — the user wants to add/plan a trip or vacation to some place ("add a trip to Hyd from oct 2 to oct 4").
- "buy" — the user wants to remember to BUY/purchase a thing ("add running shoes to my buy list", "need a new phone under 20k").
- "plan" — everything else: an upcoming task, meeting, meal, reminder, appointment, outing.`}

Shape by kind (omit fields you cannot infer — NEVER invent facts):

kind="plan": {"kind":"plan","plan":{
  "title": required, short and clean ("Lunch with Ravi") — drop date/time/location words,
  "type": one of ${JSON.stringify(VALID_TYPES)} (food="dinner", city travel="trip", bus/train="train", calls="meeting", movies/malls="outing", doctor="health", birthdays/weddings/festivals="celebration", conferences="event", remember-to="reminder", else "task"),
  "dueDate":"YYYY-MM-DD", "endDate": only for multi-day spans,
  "startTime":"HH:mm" 24h ("1pm"="13:00","morning"="09:00","evening"="18:00","night"="21:00"), "endTime": only if range given,
  "location": place if mentioned, "description": leftover useful detail,
  "priority":"LOW"|"MEDIUM"|"HIGH" only if urgency expressed}}

kind="journal": {"kind":"journal","journal":{
  "date":"YYYY-MM-DD" — the day being described; today if none mentioned,
  "title": short headline (max 60 chars, e.g. "Exploring Vijayawada"),
  "mood": ONE emoji from ${JSON.stringify(MOODS)} matching the tone (omit if unclear),
  "body": REWRITE the user's rough notes into a warm first-person journal entry. KEEP IT COMPACT: 40–80 words, never longer than roughly 1.5x the user's own text. Natural flowing sentences, fix grammar, keep EVERY fact and name they mentioned, add nothing they didn't say, no filler or padding.}}

kind="trip": {"kind":"trip","trip":{
  "title": like "Hyderabad Trip",
  "destination": the place,
  "startDate"/"endDate":"YYYY-MM-DD" if dates given,
  "status": "BOOKED" if tickets/booking mentioned, "VISITED" if the trip is entirely in the past, "PLANNING" if dates are set, "BUCKET" if no dates,
  "notes": who is going, budget, ideas — leftover detail}}

kind="buy": {"kind":"buy","buy":{
  "name": the thing to buy, short ("Running shoes"),
  "category": one word if obvious (Electronics, Clothing, Fitness, Home, Books...),
  "urgency": "HIGH" if urgent/needed soon, "LOW" if someday/nice-to-have, else omit,
  "estimatedPrice": number only, no currency symbol ("under 3000" = 3000, "20k" = 20000),
  "store": shop/site name if mentioned (Amazon, Decathlon...),
  "notes": size, color, model, why — leftover detail}}

Message: ${JSON.stringify(text.trim())}`;

    const raw = await this.callGemini(apiKey, prompt);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ServiceUnavailableException('AI returned invalid JSON');
    }

    // A forced mode wins even if the model mislabeled the kind field.
    const kind = mode ?? parsed?.kind;
    if (kind === 'journal') return { kind: 'journal', journal: this.sanitizeJournal(parsed.journal ?? parsed, today) };
    if (kind === 'trip') return { kind: 'trip', trip: this.sanitizeTrip(parsed.trip ?? parsed) };
    if (kind === 'buy') return { kind: 'buy', buy: this.sanitizeBuy(parsed.buy ?? parsed) };
    return { kind: 'plan', plan: this.sanitize(parsed?.plan ?? parsed) };
  }

  private sanitizeBuy(b: any): ParsedBuy {
    if (!b || typeof b.name !== 'string' || !b.name.trim()) {
      throw new BadRequestException('Could not understand the item — tell me what to buy');
    }
    const out: ParsedBuy = { name: b.name.trim().slice(0, 160) };
    if (typeof b.category === 'string' && b.category.trim()) out.category = b.category.trim().slice(0, 60);
    if (['LOW', 'MEDIUM', 'HIGH'].includes(b.urgency)) out.urgency = b.urgency;
    if (typeof b.estimatedPrice === 'number' && b.estimatedPrice >= 0) out.estimatedPrice = b.estimatedPrice;
    if (typeof b.store === 'string' && b.store.trim()) out.store = b.store.trim().slice(0, 120);
    if (typeof b.notes === 'string' && b.notes.trim()) out.notes = b.notes.trim().slice(0, 1000);
    return out;
  }

  private sanitizeJournal(j: any, today: string): ParsedJournal {
    if (!j || typeof j.body !== 'string' || !j.body.trim()) {
      throw new BadRequestException('Could not turn that into a journal entry — add a bit more detail');
    }
    const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const out: ParsedJournal = {
      date: isDate(j.date) ? j.date : today,
      body: j.body.trim().slice(0, 1200), // hard cap keeps entries small in Firebase
    };
    if (typeof j.title === 'string' && j.title.trim()) out.title = j.title.trim().slice(0, 120);
    if (typeof j.mood === 'string' && MOODS.includes(j.mood)) out.mood = j.mood;
    return out;
  }

  private sanitizeTrip(t: any): ParsedTrip {
    if (!t || typeof t.title !== 'string' || !t.title.trim()) {
      throw new BadRequestException('Could not understand the trip — tell me the destination');
    }
    const isDate = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const out: ParsedTrip = { title: t.title.trim().slice(0, 200) };
    if (typeof t.destination === 'string' && t.destination.trim()) out.destination = t.destination.trim().slice(0, 200);
    if (isDate(t.startDate)) out.startDate = t.startDate;
    if (isDate(t.endDate)) out.endDate = t.endDate;
    if (['BUCKET', 'PLANNING', 'BOOKED', 'VISITED'].includes(t.status)) out.status = t.status;
    if (typeof t.notes === 'string' && t.notes.trim()) out.notes = t.notes.trim().slice(0, 1000);
    return out;
  }

  // Last model that answered successfully — tried first on the next request.
  private workingModel: string | null = null;

  // Walks the model chain until one answers. 404 = model retired, 503/429 = busy;
  // both mean "try the next one". Any other error stops immediately (bad key etc.).
  private async callGemini(apiKey: string, prompt: string): Promise<string> {
    const chain = this.workingModel
      ? [this.workingModel, ...MODEL_CHAIN.filter((m) => m !== this.workingModel)]
      : MODEL_CHAIN;

    let lastStatus = 0;
    for (const model of chain) {
      let res: Response;
      try {
        res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
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

      if (res.ok) {
        const data: any = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          this.workingModel = model;
          return raw;
        }
        lastStatus = 200; // answered but empty — try the next model
        continue;
      }

      lastStatus = res.status;
      const body = await res.text().catch(() => '');
      console.error(`Gemini ${model} -> ${res.status}`, body.slice(0, 300));
      if (res.status === 404 || res.status === 503 || res.status === 429) {
        if (this.workingModel === model) this.workingModel = null;
        continue; // retired or busy — try the next model
      }
      // 400 (bad key), 403 (no access) — no point trying other models
      throw new ServiceUnavailableException(`AI request failed (${res.status})`);
    }

    throw new ServiceUnavailableException(
      lastStatus === 503 || lastStatus === 429
        ? 'The AI is busy right now — try again in a minute'
        : 'No AI model is available right now',
    );
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
