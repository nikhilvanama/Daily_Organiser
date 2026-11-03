import { Component, Input } from '@angular/core';

// Custom duotone glyph set for the plan categories (PLAN_TYPES). Replaces the
// emoji icons on the My Plans page so chips and row tiles match the dashboard's
// hand-drawn icon style. Glyphs paint with currentColor, so the parent decides
// the color: white on a gradient tile, the category color inside a filter chip.
// Darker accents use translucent black so they read on any background.
@Component({
  selector: 'app-plan-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      @switch (type) {
        @case ('task') {
          <path d="M5 12.8l4.3 4.3L19 7.6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('trip') {
          <path d="M21.5 15.6v-2.1l-8-5V4.7a1.5 1.5 0 10-3 0v3.8l-8 5v2.1l8-2.4v4.6l-2.2 1.6v1.7l3.7-1.1 3.7 1.1v-1.7l-2.2-1.6v-4.6l8 2.4z" fill="currentColor"/>
        }
        @case ('train') {
          <rect x="4.5" y="2.8" width="15" height="15" rx="3" fill="currentColor"/>
          <rect x="7" y="5.8" width="10" height="4.6" rx="1" fill="rgba(0,0,0,.30)"/>
          <circle cx="8.6" cy="14" r="1.4" fill="rgba(0,0,0,.30)"/>
          <circle cx="15.4" cy="14" r="1.4" fill="rgba(0,0,0,.30)"/>
          <rect x="6.6" y="19" width="3" height="2.2" rx="1.1" fill="currentColor"/>
          <rect x="14.4" y="19" width="3" height="2.2" rx="1.1" fill="currentColor"/>
        }
        @case ('dinner') {
          <path d="M4 2.5v6.5a2.3 2.3 0 002.3 2.3A2.3 2.3 0 008.6 9V2.5M6.3 2.5v19M8.6 2.5V9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19.6 15.5V2.5a4.6 4.6 0 00-4.6 4.6v6.1c0 1.3 1 2.3 2.3 2.3h2.3zm0 0v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('meeting') {
          <circle cx="9" cy="8.2" r="3.5" fill="currentColor"/>
          <path d="M2.6 19.8a6.4 6.4 0 0112.8 0z" fill="currentColor"/>
          <circle cx="17.3" cy="9.4" r="2.6" fill="currentColor"/>
          <path d="M21.6 19.8a4.7 4.7 0 00-6.7-4.2 7.8 7.8 0 012.1 4.2z" fill="currentColor"/>
        }
        @case ('event') {
          <rect x="3.5" y="4.8" width="17" height="16.2" rx="3" fill="currentColor"/>
          <path d="M3.5 7.8a3 3 0 013-3h11a3 3 0 013 3v1.6h-17z" fill="rgba(0,0,0,.30)"/>
          <rect x="6.9" y="2.4" width="2.2" height="4.2" rx="1.1" fill="currentColor"/>
          <rect x="14.9" y="2.4" width="2.2" height="4.2" rx="1.1" fill="currentColor"/>
          <circle cx="8.6" cy="13.4" r="1.3" fill="rgba(0,0,0,.30)"/>
          <circle cx="12" cy="13.4" r="1.3" fill="rgba(0,0,0,.30)"/>
          <circle cx="15.4" cy="13.4" r="1.3" fill="rgba(0,0,0,.30)"/>
          <circle cx="8.6" cy="17.2" r="1.3" fill="rgba(0,0,0,.30)"/>
          <circle cx="12" cy="17.2" r="1.3" fill="rgba(0,0,0,.30)"/>
        }
        @case ('reminder') {
          <path d="M12 2.6a6.3 6.3 0 00-6.3 6.3v3.2l-1.5 3.1a1.1 1.1 0 001 1.7h13.6a1.1 1.1 0 001-1.7l-1.5-3.1V8.9A6.3 6.3 0 0012 2.6z" fill="currentColor"/>
          <path d="M9.7 19.3a2.4 2.4 0 004.6 0z" fill="currentColor"/>
        }
        @case ('outing') {
          <path d="M3 8.2A2.2 2.2 0 015.2 6h13.6A2.2 2.2 0 0121 8.2v1.4a2.4 2.4 0 000 4.8v1.4a2.2 2.2 0 01-2.2 2.2H5.2A2.2 2.2 0 013 15.8v-1.4a2.4 2.4 0 000-4.8V8.2z" fill="currentColor"/>
          <path d="M15.2 7.2v1.6M15.2 11.2v1.6M15.2 15.2v1.6" stroke="rgba(0,0,0,.32)" stroke-width="1.7" stroke-linecap="round"/>
        }
        @case ('health') {
          <path d="M12 21.2S3.8 16.2 2.7 11A5.3 5.3 0 0112 6.2 5.3 5.3 0 0121.3 11c-1.1 5.2-9.3 10.2-9.3 10.2z" fill="currentColor"/>
          <path d="M12 9.4v5.6M9.2 12.2h5.6" stroke="rgba(0,0,0,.30)" stroke-width="2.2" stroke-linecap="round"/>
        }
        @case ('celebration') {
          <path d="M4.2 19.8l4-11 7 7-11 4z" fill="currentColor"/>
          <path d="M6.9 12.5l4.6 4.6" stroke="rgba(0,0,0,.28)" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M13.8 6.6l1.9-1.9M16.8 9.9l2.5-.9M15.4 3.2l-.3 2.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="19.6" cy="4.9" r="1.3" fill="currentColor"/>
          <circle cx="20.9" cy="13.6" r="1.1" fill="currentColor"/>
        }
        @default {
          <path d="M12 2.8l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.2l6.1-.8L12 2.8z" fill="currentColor"/>
        }
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; line-height: 0; }`],
})
export class PlanIconComponent {
  @Input({ required: true }) type = 'task';
  @Input() size = 16;
}
