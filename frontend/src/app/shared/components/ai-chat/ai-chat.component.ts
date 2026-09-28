import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AiJournalDraft, AiMode, AiService } from '../../../core/services/ai.service';
import { TaskService } from '../../../features/tasks/task.service';
import { JournalService } from '../../../features/journal/journal.service';
import { TripService } from '../../../features/trips/trip.service';
import { BuyListService } from '../../../features/buy-list/buy-list.service';
import { PLAN_TYPES } from '../../../core/models/task.model';
import { CreateTripDto } from '../../../core/models/trip.model';
import { CreateBuyItemDto } from '../../../core/models/buy-item.model';

// What "Undo" on a success bubble should do. Journal undo restores the entry
// exactly as it was before the AI touched it (or removes it if it was new).
type UndoAction =
  | { type: 'task'; id: string }
  | { type: 'trip'; id: string }
  | { type: 'buy'; id: string }
  | { type: 'journal'; date: string; prev: { title: string | null; body: string; mood: string | null } | null };

// /commands the user can type to force where the message goes.
const COMMANDS: { cmd: string; mode: AiMode }[] = [
  { cmd: '/plan', mode: 'plan' },
  { cmd: '/task', mode: 'plan' },
  { cmd: '/journal', mode: 'journal' },
  { cmd: '/trip', mode: 'trip' },
  { cmd: '/buy', mode: 'buy' },
  { cmd: '/wish', mode: 'buy' },
];

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  ok?: boolean; // bot messages: true = created, false = error
  undo?: UndoAction;
  undone?: boolean;
}

// Floating AI assistant, available on every screen (mounted in the layout).
// A ✨ button at the bottom-right opens a small chat panel: type a sentence,
// Gemini parses it, and the plan is created through the normal task flow.
@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [],
  template: `
    <!-- Floating action button -->
    <button class="ai-fab" [class.open]="open()" (click)="toggle()" [title]="open() ? 'Close AI assistant' : 'AI assistant'">
      @if (open()) {
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      } @else {
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" viewBox="0 0 24 24">
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>
        </svg>
      }
    </button>

    @if (open()) {
      <div class="ai-panel">
        <div class="ai-head">
          <span class="ai-title">✨ AI Assistant</span>
          <span class="ai-sub">Add plans, journal your day, or plan a trip — in your own words</span>
        </div>

        <div class="ai-msgs" #msgsEl>
          @if (messages().length === 0) {
            <div class="ai-welcome">
              <p>Add a plan:</p>
              <button class="ai-example" (click)="useExample('Lunch with Ravi tomorrow 1pm at Paradise')">"Lunch with Ravi tomorrow 1pm at Paradise"</button>
              <button class="ai-example" (click)="useExample('Dentist appointment next friday 10am')">"Dentist appointment next friday 10am"</button>
              <p>Journal your day — I will polish the writing:</p>
              <button class="ai-example" (click)="useExample('/journal had a productive day, finished my Angular work, went to the gym in the evening and cooked dinner at home')">"/journal had a productive day, finished my Angular work…"</button>
              <p>Plan a trip:</p>
              <button class="ai-example" (click)="useExample('/trip Hyderabad from Oct 2 to Oct 4')">"/trip Hyderabad from Oct 2 to Oct 4"</button>
              <p>Add to your buy list:</p>
              <button class="ai-example" (click)="useExample('/buy running shoes under 3000 from Decathlon')">"/buy running shoes under 3000 from Decathlon"</button>
              <p class="ai-cmd-hint">Tip: start with <b>/plan</b>, <b>/journal</b>, <b>/trip</b>, or <b>/buy</b> to tell me exactly where it goes — otherwise I'll guess.</p>
            </div>
          }
          @for (m of messages(); track $index; let i = $index) {
            <div class="msg" [class.user]="m.role === 'user'" [class.err]="m.role === 'bot' && m.ok === false">
              {{ m.text }}
              @if (m.undo && !m.undone) {
                <button class="undo-btn" (click)="undo(i)">↩ Undo</button>
              }
              @if (m.undone) {
                <span class="undone-tag">Removed</span>
              }
            </div>
          }
          @if (thinking()) {
            <div class="msg thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
          }
        </div>

        <div class="ai-input-row">
          <input #inp class="ai-input" type="text" [placeholder]="listening() ? 'Listening…' : 'Type or speak a plan…'"
                 [value]="draft()" (input)="draft.set($any($event.target).value)"
                 (keydown.enter)="send()" [disabled]="thinking()" />
          @if (voiceSupported) {
            <button class="ai-mic" [class.listening]="listening()" (click)="toggleVoice()"
                    [title]="listening() ? 'Stop listening' : 'Speak instead of typing'">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
          }
          <button class="ai-send" (click)="send()" [disabled]="thinking() || draft().trim().length < 3" title="Add plan">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .ai-fab {
      position: fixed; bottom: 20px; right: 20px; z-index: 940;
      width: 50px; height: 50px; border-radius: 16px; cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: linear-gradient(145deg, var(--accent) 0%, var(--accent-hover) 100%);
      color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 8px 22px var(--accent-glow),
                  inset 0 1px 0 rgba(255, 255, 255, 0.35);
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s, border-radius 0.18s;
    }
    .ai-fab:hover {
      transform: translateY(-2px) scale(1.05); border-radius: 18px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18), 0 12px 30px var(--accent-glow),
                  inset 0 1px 0 rgba(255, 255, 255, 0.35);
    }
    .ai-fab:active { transform: scale(0.96); }
    .ai-fab.open { border-radius: 50%; background: var(--bg-card); color: var(--text-secondary); border-color: var(--border); box-shadow: var(--shadow-md); }

    .ai-panel {
      position: fixed; bottom: 84px; right: 20px; z-index: 941;
      width: min(360px, calc(100vw - 2rem)); height: min(460px, calc(100vh - 120px));
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
      display: flex; flex-direction: column; overflow: hidden;
      animation: ai-pop 0.18s ease;
    }
    @keyframes ai-pop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }

    .ai-head { padding: 14px 16px 10px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }
    .ai-title { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
    .ai-sub { font-size: 0.7rem; color: var(--text-muted); }

    .ai-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; scrollbar-width: thin; }
    .ai-welcome { display: flex; flex-direction: column; gap: 6px; padding: 6px 2px; }
    .ai-welcome p { font-size: 0.75rem; color: var(--text-muted); margin: 0 0 2px; }
    .ai-example {
      text-align: left; font-size: 0.76rem; font-family: inherit; cursor: pointer;
      padding: 8px 10px; border-radius: 10px; border: 1px dashed var(--border);
      background: transparent; color: var(--text-secondary); transition: all 0.15s;
    }
    .ai-example:hover { border-color: var(--accent); color: var(--accent); }
    .ai-cmd-hint { font-size: 0.72rem; color: var(--text-muted); margin-top: 8px !important; line-height: 1.5; }
    .ai-cmd-hint b { color: var(--accent); font-weight: 600; }

    .msg {
      max-width: 85%; padding: 8px 12px; border-radius: 12px;
      font-size: 0.82rem; line-height: 1.45; white-space: pre-wrap; word-break: break-word;
      background: var(--bg-hover); color: var(--text-primary); align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .msg.user {
      background: var(--accent); color: #fff; align-self: flex-end;
      border-bottom-left-radius: 12px; border-bottom-right-radius: 4px;
    }
    .msg.err { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .msg.thinking { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); animation: ai-blink 1.2s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ai-blink { 0%, 60%, 100% { opacity: 0.25; } 30% { opacity: 1; } }

    .ai-input-row { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border); }
    .ai-input {
      flex: 1; border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px;
      background: var(--bg-input); outline: none; font-family: inherit; font-size: 0.84rem;
      color: var(--text-primary);
    }
    .ai-input:focus { border-color: var(--accent); }
    .ai-input::placeholder { color: var(--text-muted); }
    .ai-send {
      width: 38px; border-radius: 10px; border: none; cursor: pointer;
      background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .ai-send:hover:not(:disabled) { background: var(--accent-hover); }
    .ai-send:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Mic button — pulses red while listening */
    .ai-mic {
      width: 38px; border-radius: 10px; border: 1px solid var(--border); cursor: pointer;
      background: transparent; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center; transition: all 0.15s;
    }
    .ai-mic:hover { color: var(--text-primary); background: var(--bg-hover); }
    .ai-mic.listening { background: #ef4444; border-color: #ef4444; color: #fff; animation: mic-pulse 1.2s infinite; }
    @keyframes mic-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); }
      50% { box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
    }

    /* Undo affordance on success bubbles */
    .undo-btn {
      display: block; margin-top: 7px; padding: 3px 10px;
      font-size: 0.7rem; font-weight: 600; font-family: inherit; cursor: pointer;
      background: transparent; color: inherit; border: 1px solid currentColor;
      border-radius: 6px; opacity: 0.75; transition: opacity 0.15s;
    }
    .undo-btn:hover { opacity: 1; }
    .undone-tag { display: block; margin-top: 6px; font-size: 0.68rem; font-weight: 600; opacity: 0.6; }

    @media (max-width: 640px) {
      .ai-fab { bottom: 16px; right: 16px; }
      /* Full-width bottom sheet, like messaging apps */
      .ai-panel {
        left: 0; right: 0; bottom: 0; width: 100%;
        height: min(78dvh, 560px);
        border-radius: 20px 20px 0 0; border-left: none; border-right: none; border-bottom: none;
        animation: ai-sheet 0.22s ease;
      }
      .ai-input-row { padding: 12px 14px calc(12px + env(safe-area-inset-bottom)); }
      .ai-input { font-size: 16px; padding: 10px 14px; } /* 16px stops mobile zoom-on-focus */
      .ai-mic, .ai-send { width: 44px; }
      .msg { font-size: 0.92rem; }
    }
    @keyframes ai-sheet { from { transform: translateY(30px); opacity: 0.6; } to { transform: none; opacity: 1; } }
  `],
})
export class AiChatComponent {
  private aiService = inject(AiService);
  private taskService = inject(TaskService);
  private journalService = inject(JournalService);
  private tripService = inject(TripService);
  private buyService = inject(BuyListService);

  @ViewChild('msgsEl') msgsEl?: ElementRef<HTMLDivElement>;
  @ViewChild('inp') inp?: ElementRef<HTMLInputElement>;

  open = signal(false);
  draft = signal('');
  thinking = signal(false);
  messages = signal<ChatMsg[]>([]);
  listening = signal(false);

  // Web Speech API (built into Chrome/Edge/Android — free, no server involved)
  private recognition: any = null;
  readonly voiceSupported = typeof window !== 'undefined'
    && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  toggleVoice() {
    if (this.listening()) { this.recognition?.stop(); return; }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    this.recognition = rec;
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    const base = this.draft() ? this.draft().trim() + ' ' : '';
    rec.onresult = (ev: any) => {
      let transcript = '';
      for (let i = 0; i < ev.results.length; i++) transcript += ev.results[i][0].transcript;
      this.draft.set(base + transcript);
    };
    rec.onend = () => { this.listening.set(false); this.inp?.nativeElement.focus(); };
    rec.onerror = () => this.listening.set(false);
    this.listening.set(true);
    rec.start();
  }

  // Undo the entity a success bubble created; journal restores the previous state.
  undo(index: number) {
    const m = this.messages()[index];
    const u = m?.undo;
    if (!u || m.undone) return;
    const markUndone = () => this.messages.update((list) =>
      list.map((msg, i) => (i === index ? { ...msg, undone: true } : msg)));
    const failed = () => this.push({ role: 'bot', text: 'Undo failed — remove it manually.', ok: false });

    if (u.type === 'task') {
      this.taskService.delete(u.id).subscribe({ next: markUndone, error: failed });
    } else if (u.type === 'trip') {
      this.tripService.delete(u.id).subscribe({ next: markUndone, error: failed });
    } else if (u.type === 'buy') {
      this.buyService.delete(u.id).subscribe({ next: markUndone, error: failed });
    } else if (u.prev) {
      this.journalService.upsert(u.date, {
        body: u.prev.body,
        title: u.prev.title ?? undefined,
        mood: u.prev.mood ?? undefined,
      }).subscribe({ next: markUndone, error: failed });
    } else {
      this.journalService.remove(u.date).subscribe({ next: markUndone, error: failed });
    }
  }

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) setTimeout(() => this.inp?.nativeElement.focus(), 0);
  }

  useExample(text: string) {
    this.draft.set(text);
    this.inp?.nativeElement.focus();
  }

  send() {
    const raw = this.draft().trim();
    if (raw.length < 3 || this.thinking()) return;

    // A leading /command forces the target; strip it before sending.
    let text = raw;
    let mode: AiMode | undefined;
    const lower = raw.toLowerCase();
    for (const c of COMMANDS) {
      if (lower === c.cmd || lower.startsWith(c.cmd + ' ')) {
        mode = c.mode;
        text = raw.slice(c.cmd.length).trim();
        break;
      }
    }
    if (mode && text.length < 3) {
      this.push({ role: 'bot', text: `Add some detail after the command — e.g. "${raw.split(' ')[0]} running shoes under 3000"`, ok: false });
      return;
    }

    this.draft.set('');
    this.push({ role: 'user', text: raw });
    this.thinking.set(true);

    this.aiService.quickAdd(text, mode).subscribe({
      next: (result) => this.handleResult(result),
      error: (err) => {
        // Older backend builds reject the unknown `mode` property (400) —
        // retry once without it and let the AI classify on its own.
        const detail = err?.error?.message;
        const msg = Array.isArray(detail) ? detail.join(' ') : (detail ?? '');
        if (mode && msg.includes('mode')) {
          this.aiService.quickAdd(text).subscribe({
            next: (result) => this.handleResult(result),
            error: (e2) => this.parseFailed(e2),
          });
          return;
        }
        this.parseFailed(err);
      },
    });
  }

  private handleResult(result: any) {
    if (result?.kind === 'journal' && result.journal) this.saveJournal(result.journal);
    else if (result?.kind === 'trip' && result.trip) this.saveTrip(result.trip);
    else if (result?.kind === 'buy' && result.buy) this.saveBuy(result.buy);
    // Fallback to the whole object: an older backend build returns a flat
    // plan without the `kind` wrapper — never call create(undefined).
    else this.savePlan(result?.plan ?? result);
  }

  private parseFailed(err: any) {
    this.thinking.set(false);
    const detail = err?.error?.message;
    const text = Array.isArray(detail) ? detail.join(', ') : detail;
    this.push({ role: 'bot', text: text ?? 'Sorry, I could not understand that.', ok: false });
  }

  private savePlan(dto: any) {
    this.taskService.create(dto).subscribe({
      next: (t) => {
        this.thinking.set(false);
        const type = PLAN_TYPES.find((p) => p.value === t.type);
        const bits = [
          `${type?.icon ?? '✓'} Added: ${t.title}`,
          t.dueDate ? `📅 ${t.dueDate}${t.startTime ? ' · ' + t.startTime : ''}` : null,
          t.location ? `📍 ${t.location}` : null,
        ].filter(Boolean);
        this.push({ role: 'bot', text: bits.join('\n'), ok: true, undo: { type: 'task', id: t.id } });
      },
      error: (e) => this.saveFailed(e),
    });
  }

  // If that day already has an entry, append the polished text below it instead
  // of overwriting — the upsert endpoint replaces the whole entry otherwise.
  private saveJournal(draft: AiJournalDraft) {
    this.journalService.loadAll().subscribe({
      next: () => {
        const existing = this.journalService.entries$.value.find((e) => e.date === draft.date);
        const dto = existing
          ? {
              body: `${existing.body.trimEnd()}\n\n${draft.body}`,
              title: existing.title || draft.title,
              mood: existing.mood || draft.mood,
            }
          : { body: draft.body, title: draft.title, mood: draft.mood };
        const prev = existing ? { title: existing.title, body: existing.body, mood: existing.mood } : null;
        this.journalService.upsert(draft.date, dto).subscribe({
          next: (e) => {
            this.thinking.set(false);
            this.push({
              role: 'bot',
              text: `📓 ${existing ? 'Added to' : 'Saved'} your journal for ${draft.date}${e.title ? ` — "${e.title}"` : ''}\n\n${draft.body}`,
              ok: true,
              undo: { type: 'journal', date: draft.date, prev },
            });
          },
          error: (e) => this.saveFailed(e),
        });
      },
      error: (e) => this.saveFailed(e),
    });
  }

  private saveTrip(dto: CreateTripDto) {
    this.tripService.create(dto).subscribe({
      next: (t) => {
        this.thinking.set(false);
        const bits = [
          `✈️ Trip added: ${t.title}`,
          t.startDate ? `🗓 ${t.startDate}${t.endDate && t.endDate !== t.startDate ? ' → ' + t.endDate : ''}` : null,
          `📌 ${t.status === 'BUCKET' ? 'Bucket List' : t.status === 'PLANNING' ? 'Planning' : t.status === 'BOOKED' ? 'Booked' : 'Visited'} column`,
        ].filter(Boolean);
        this.push({ role: 'bot', text: bits.join('\n'), ok: true, undo: { type: 'trip', id: t.id } });
      },
      error: (e) => this.saveFailed(e),
    });
  }

  private saveBuy(dto: CreateBuyItemDto) {
    this.buyService.create(dto).subscribe({
      next: (item) => {
        this.thinking.set(false);
        const bits = [
          `🛒 Added to Buy List: ${item.name}`,
          item.estimatedPrice ? `💰 ~₹${item.estimatedPrice.toLocaleString('en-IN')}` : null,
          item.store ? `🏬 ${item.store}` : null,
          item.urgency ? `⚡ ${item.urgency} priority` : null,
        ].filter(Boolean);
        this.push({ role: 'bot', text: bits.join('\n'), ok: true, undo: { type: 'buy', id: item.id } });
      },
      error: (e) => this.saveFailed(e),
    });
  }

  // Show the server's actual message when it has one — "saving failed" alone
  // made version/validation problems impossible to diagnose from the UI.
  private saveFailed(err?: any) {
    this.thinking.set(false);
    const detail = err?.error?.message;
    const text = Array.isArray(detail) ? detail.join(', ') : detail;
    this.push({ role: 'bot', text: `I understood it, but saving failed${text ? ` — ${text}` : ' — try again.'}`, ok: false });
  }

  private push(m: ChatMsg) {
    this.messages.update((list) => [...list, m]);
    setTimeout(() => {
      const el = this.msgsEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
