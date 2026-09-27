import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AiService } from '../../../core/services/ai.service';
import { TaskService } from '../../../features/tasks/task.service';
import { PLAN_TYPES } from '../../../core/models/task.model';

interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  ok?: boolean; // bot messages: true = plan created, false = error
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
    <button class="ai-fab" [class.open]="open()" (click)="toggle()" [title]="open() ? 'Close AI assistant' : 'AI quick add'">
      @if (open()) {
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      } @else {
        <span class="fab-spark">✨</span>
      }
    </button>

    @if (open()) {
      <div class="ai-panel">
        <div class="ai-head">
          <span class="ai-title">✨ AI Quick Add</span>
          <span class="ai-sub">Describe a plan in your own words</span>
        </div>

        <div class="ai-msgs" #msgsEl>
          @if (messages().length === 0) {
            <div class="ai-welcome">
              <p>Try things like:</p>
              <button class="ai-example" (click)="useExample('Lunch with Ravi tomorrow 1pm at Paradise')">"Lunch with Ravi tomorrow 1pm at Paradise"</button>
              <button class="ai-example" (click)="useExample('Dentist appointment next friday 10am')">"Dentist appointment next friday 10am"</button>
              <button class="ai-example" (click)="useExample('Movie with friends saturday evening at PVR')">"Movie with friends saturday evening at PVR"</button>
            </div>
          }
          @for (m of messages(); track $index) {
            <div class="msg" [class.user]="m.role === 'user'" [class.err]="m.role === 'bot' && m.ok === false">
              {{ m.text }}
            </div>
          }
          @if (thinking()) {
            <div class="msg thinking"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
          }
        </div>

        <div class="ai-input-row">
          <input #inp class="ai-input" type="text" placeholder="Type a plan…"
                 [value]="draft()" (input)="draft.set($any($event.target).value)"
                 (keydown.enter)="send()" [disabled]="thinking()" />
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
      width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
      background: linear-gradient(135deg, var(--accent), var(--accent-hover)); color: #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 20px var(--accent-glow); transition: transform 0.15s, box-shadow 0.15s;
    }
    .ai-fab:hover { transform: scale(1.07); box-shadow: 0 8px 26px var(--accent-glow); }
    .fab-spark { font-size: 1.35rem; }

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

    @media (max-width: 640px) {
      .ai-fab { bottom: 16px; right: 16px; }
      .ai-panel { bottom: 78px; right: 16px; }
    }
  `],
})
export class AiChatComponent {
  private aiService = inject(AiService);
  private taskService = inject(TaskService);

  @ViewChild('msgsEl') msgsEl?: ElementRef<HTMLDivElement>;
  @ViewChild('inp') inp?: ElementRef<HTMLInputElement>;

  open = signal(false);
  draft = signal('');
  thinking = signal(false);
  messages = signal<ChatMsg[]>([]);

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) setTimeout(() => this.inp?.nativeElement.focus(), 0);
  }

  useExample(text: string) {
    this.draft.set(text);
    this.inp?.nativeElement.focus();
  }

  send() {
    const text = this.draft().trim();
    if (text.length < 3 || this.thinking()) return;
    this.draft.set('');
    this.push({ role: 'user', text });
    this.thinking.set(true);

    this.aiService.quickAdd(text).subscribe({
      next: (dto) => {
        this.taskService.create(dto).subscribe({
          next: (t) => {
            this.thinking.set(false);
            const type = PLAN_TYPES.find((p) => p.value === t.type);
            const bits = [
              `${type?.icon ?? '✓'} Added: ${t.title}`,
              t.dueDate ? `📅 ${t.dueDate}${t.startTime ? ' · ' + t.startTime : ''}` : null,
              t.location ? `📍 ${t.location}` : null,
            ].filter(Boolean);
            this.push({ role: 'bot', text: bits.join('\n'), ok: true });
          },
          error: () => {
            this.thinking.set(false);
            this.push({ role: 'bot', text: 'I understood it, but saving failed — try again.', ok: false });
          },
        });
      },
      error: (err) => {
        this.thinking.set(false);
        this.push({ role: 'bot', text: err.error?.message ?? 'Sorry, I could not understand that.', ok: false });
      },
    });
  }

  private push(m: ChatMsg) {
    this.messages.update((list) => [...list, m]);
    setTimeout(() => {
      const el = this.msgsEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
