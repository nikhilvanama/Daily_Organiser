import { Component, Input } from '@angular/core';

// Shared habit category glyphs + gradient tile palette — the same visual
// language as the dashboard "Today's Checklist" tiles, reusable on the
// Daily Routine page (and anywhere else habits appear).

export const HABIT_TILES: Record<string, { bg: string; glow: string }> = {
  sun:    { bg: 'linear-gradient(140deg, #fde047, #f59e0b)', glow: 'rgba(245, 158, 11, .45)' },
  bed:    { bg: 'linear-gradient(140deg, #a78bfa, #6d28d9)', glow: 'rgba(139, 92, 246, .45)' },
  run:    { bg: 'linear-gradient(140deg, #4ade80, #059669)', glow: 'rgba(16, 185, 129, .45)' },
  book:   { bg: 'linear-gradient(140deg, #60a5fa, #2563eb)', glow: 'rgba(59, 130, 246, .45)' },
  pencil: { bg: 'linear-gradient(140deg, #f9a8d4, #db2777)', glow: 'rgba(236, 72, 153, .45)' },
  laptop: { bg: 'linear-gradient(140deg, #fb923c, #ea580c)', glow: 'rgba(249, 115, 22, .45)' },
  meal:   { bg: 'linear-gradient(140deg, #2dd4bf, #0d9488)', glow: 'rgba(20, 184, 166, .45)' },
  spark:  { bg: 'linear-gradient(140deg, #94a3b8, #475569)', glow: 'rgba(100, 116, 139, .45)' },
};

// Map a habit title to a glyph key by keyword
export function habitGlyphFor(title: string | null | undefined): string {
  const t = (title ?? '').toLowerCase();
  if (/wake|morning|sunrise|rise/.test(t)) return 'sun';
  if (/sleep|nap|bed|night/.test(t)) return 'bed';
  if (/walk|run|jog|gym|exercise|excercise|workout|yoga|sport|cycle|swim/.test(t)) return 'run';
  if (/study|read|revis|learn|course|class/.test(t)) return 'book';
  if (/doodl|draw|sketch|design|note|journal|write|plan/.test(t)) return 'pencil';
  if (/office|work|freelance|code|project|job|meeting/.test(t)) return 'laptop';
  if (/eat|meal|breakfast|lunch|dinner|food|cook|water|drink/.test(t)) return 'meal';
  return 'spark';
}

export function habitTileBg(title: string | null | undefined): string {
  return HABIT_TILES[habitGlyphFor(title)].bg;
}

export function habitTileShadow(title: string | null | undefined): string {
  const t = HABIT_TILES[habitGlyphFor(title)];
  return `inset 0 1.5px 0 rgba(255,255,255,.4), 0 4px 12px ${t.glow}`;
}

@Component({
  selector: 'app-habit-icon',
  standalone: true,
  template: `
    @switch (glyph) {
      @case ('sun') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.6" fill="#fff"/><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"/></g></svg>
      }
      @case ('bed') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><rect x="3" y="11.4" width="18" height="3.8" rx="1.9" fill="#fff"/><circle cx="7.2" cy="9" r="2.1" fill="#fff"/><path d="M3.4 19.2v-3.4M20.6 19.2v-3.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>
      }
      @case ('run') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.8" cy="4.4" r="2.2" fill="#fff" stroke="none"/><path d="M12.6 8.2 9 10.4l1.4 3.2-3.6 5.6"/><path d="M12.6 8.2l3 1.5 3 .4"/><path d="M12.6 8.2l-.9 4.8 3.6 2.5 1 4.1"/></svg>
      }
      @case ('book') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><path d="M12 6.2C10.7 5 9 4.4 6.9 4.4c-1.1 0-2.1.2-2.9.6v13.2c.8-.4 1.8-.6 2.9-.6 2.1 0 3.8.7 5.1 1.9 1.3-1.2 3-1.9 5.1-1.9 1.1 0 2.1.2 2.9.6V5c-.8-.4-1.8-.6-2.9-.6-2.1 0-3.8.6-5.1 1.8z" fill="#fff"/><path d="M12 6.4v13" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/></svg>
      }
      @case ('pencil') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><path d="m4.8 19.2 1-4L15.9 5.1a2.3 2.3 0 0 1 3.2 3.2L9 18.4z" fill="#fff"/><path d="m14.2 6.8 3 3" stroke="rgba(0,0,0,.28)" stroke-width="1.6" stroke-linecap="round"/></svg>
      }
      @case ('laptop') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><rect x="5" y="4.6" width="14" height="9.4" rx="1.8" fill="#fff"/><rect x="7" y="6.6" width="10" height="5.4" rx=".9" fill="rgba(0,0,0,.24)"/><path d="M4.4 14.8 3.2 18.2h17.6l-1.2-3.4z" fill="#fff"/></svg>
      }
      @case ('meal') {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"><path d="M4 12.4h16a8 8 0 0 1-16 0z" fill="#fff"/><path d="M10 9.6c0-1.3 1-1.6 1-2.9M14 9.6c0-1.3 1-1.6 1-2.9" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
      }
      @default {
        <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24"><path d="M12 3.6l2 6L20.4 12l-6.4 2.4-2 6-2-6L3.6 12l6.4-2.4z" fill="#fff"/></svg>
      }
    }
  `,
  styles: [`:host { display: inline-flex; line-height: 0; }`],
})
export class HabitIconComponent {
  @Input({ required: true }) glyph = 'spark';
  @Input() size = 17;
}
