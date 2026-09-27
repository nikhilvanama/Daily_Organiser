import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ACCENT_OPTIONS, AccentOption, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <h2>My Profile</h2>
      </div>

      @if (profile()) {
        <form [formGroup]="form" (ngSubmit)="save()" class="profile-grid">

          <!-- Personal Info Card -->
          <div class="card section">
            <h3 class="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Personal Info
            </h3>
            <div class="form-row">
              <div class="form-group">
                <label class="label">Display Name</label>
                <input class="input" formControlName="displayName" placeholder="Your name" />
              </div>
              <div class="form-group">
                <label class="label">Email</label>
                <input class="input" [value]="profile()?.email" disabled />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="label">Date of Birth</label>
                <input class="input" type="date" formControlName="dateOfBirth" />
              </div>
              <div class="form-group">
                <label class="label">Phone</label>
                <input class="input" formControlName="phone" placeholder="+91 9876543210" />
              </div>
            </div>
            @if (form.value.dateOfBirth) {
              <div class="birthday-note">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                Your birthday will be highlighted in the calendar
              </div>
            }
          </div>

          <!-- Address Card -->
          <div class="card section">
            <h3 class="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Address
            </h3>
            <div class="address-row">
              <div class="form-group address-input">
                <label class="label">Home Address</label>
                <textarea class="input" formControlName="address" rows="3" placeholder="Enter your address..."></textarea>
              </div>
              @if (form.value.address) {
                <div class="map-container">
                <iframe
                  width="100%" height="100%" style="border:0; border-radius: 8px;"
                  loading="lazy"
                  [src]="getMapUrl()"
                  allowfullscreen>
                </iframe>
              </div>
              }
            </div>
          </div>

          <!-- Employment Card -->
          <div class="card section">
            <h3 class="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              Employment
            </h3>
            <div class="form-group">
              <label class="toggle-row">
                <span>Currently Employed</span>
                <input type="checkbox" formControlName="isEmployed" class="toggle" />
              </label>
            </div>

            @if (form.value.isEmployed) {
              <div class="form-group">
                <label class="label">Company Name</label>
                <input class="input" formControlName="companyName" placeholder="e.g. TCS, Infosys, Google..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="label">Office Start Time</label>
                  <input class="input" type="time" formControlName="officeStartTime" />
                </div>
                <div class="form-group">
                  <label class="label">Office End Time</label>
                  <input class="input" type="time" formControlName="officeEndTime" />
                </div>
              </div>
              <div class="form-group">
                <label class="label">Weekend Days</label>
                <div class="weekend-selector">
                  @for (day of allDays; track day) {
                    <button type="button" class="day-chip" [class.selected]="isWeekend(day)"
                      (click)="toggleWeekend(day)">{{ day }}</button>
                  }
                </div>
              </div>
              <div class="form-group">
                <label class="toggle-row">
                  <span>Show office hours in calendar</span>
                  <input type="checkbox" formControlName="syncOfficeToCalendar" class="toggle" />
                </label>
              </div>
            }
          </div>

          <!-- Appearance Card — theme + primary color; applies instantly, saved on this device -->
          <div class="card section">
            <h3 class="section-title">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="10" cy="19" r="2.5"/><path d="M12 2a10 10 0 100 20 2 2 0 002-2v-1a2 2 0 012-2h3a3 3 0 003-3A10 10 0 0012 2z"/></svg>
              Appearance
            </h3>

            <div class="form-group">
              <label class="label">Theme</label>
              <div class="theme-cards">
                <button type="button" class="theme-card" [class.selected]="themeService.theme() === 'light'" (click)="themeService.setTheme('light')">
                  <span class="theme-preview prev-light">
                    <span class="prev-sidebar"></span>
                    <span class="prev-body"><span class="prev-line"></span><span class="prev-line short"></span></span>
                  </span>
                  <span class="theme-name">☀️ Light</span>
                </button>
                <button type="button" class="theme-card" [class.selected]="themeService.theme() === 'dark'" (click)="themeService.setTheme('dark')">
                  <span class="theme-preview prev-dark">
                    <span class="prev-sidebar"></span>
                    <span class="prev-body"><span class="prev-line"></span><span class="prev-line short"></span></span>
                  </span>
                  <span class="theme-name">🌙 Dark</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="label">Primary color</label>
              <div class="accent-row">
                @for (a of accentOptions; track a.id) {
                  <button type="button" class="accent-swatch"
                          [style.background]="swatchColor(a)"
                          [class.selected]="themeService.accent() === a.id"
                          (click)="themeService.setAccent(a.id)"
                          [title]="a.label">
                    @if (themeService.accent() === a.id) {
                      <svg width="14" height="14" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    }
                  </button>
                }
              </div>
              <span class="appearance-hint">Changes apply instantly and are remembered on this device.</span>
            </div>
          </div>

          <!-- Save Button -->
          <div class="save-row">
            <button type="submit" class="btn-primary save-btn" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save Profile' }}
            </button>
          </div>
        </form>
      } @else {
        <div class="loading">Loading profile...</div>
      }
    </div>
  `,
  styles: [`
    .profile-grid { display: flex; flex-direction: column; gap: 1.25rem; }
    .section { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
    .section-title svg { color: var(--accent); }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; }
    textarea.input { resize: vertical; }

    .birthday-note {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.78rem; color: var(--accent); font-weight: 500;
      padding: 8px 12px; background: var(--accent-subtle); border-radius: 8px;
    }

    .address-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: stretch; }
    .address-input { flex: 1; }
    .address-input textarea { height: 100%; min-height: 100px; }
    .map-container { border-radius: 8px; overflow: hidden; border: 1px solid var(--border); min-height: 180px; }
    @media (max-width: 768px) { .address-row { grid-template-columns: 1fr; } }

    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; font-size: 0.9rem; color: var(--text-primary); cursor: pointer;
    }
    .toggle {
      width: 44px; height: 24px; appearance: none; background: var(--border);
      border-radius: 12px; position: relative; cursor: pointer; transition: background 0.2s;
      border: none; flex-shrink: 0;
    }
    .toggle::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: white; transition: transform 0.2s;
    }
    .toggle:checked { background: var(--accent); }
    .toggle:checked::after { transform: translateX(20px); }

    .weekend-selector { display: flex; gap: 6px; flex-wrap: wrap; }
    .day-chip {
      padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; font-weight: 500;
      border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary);
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .day-chip:hover { border-color: var(--accent); color: var(--accent); }
    .day-chip.selected { background: var(--accent); color: #fff; border-color: var(--accent); }

    .save-row { display: flex; justify-content: flex-end; }
    .save-btn { padding: 12px 32px; font-size: 0.95rem; }

    /* Appearance: theme selector cards */
    .theme-cards { display: flex; gap: 12px; }
    .theme-card {
      display: flex; flex-direction: column; gap: 8px; align-items: center;
      padding: 10px; border-radius: 12px; cursor: pointer; font-family: inherit;
      background: transparent; border: 2px solid var(--border); transition: all 0.15s;
      width: 130px;
    }
    .theme-card:hover { border-color: var(--text-muted); }
    .theme-card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }
    .theme-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
    /* Mini app mock-up inside each theme card */
    .theme-preview { display: flex; width: 100%; height: 56px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
    .prev-light { background: #f8fafc; }
    .prev-dark { background: #09090b; }
    .prev-sidebar { width: 26%; height: 100%; }
    .prev-light .prev-sidebar { background: #ffffff; border-right: 1px solid #e2e8f0; }
    .prev-dark .prev-sidebar { background: #18181b; border-right: 1px solid #27272a; }
    .prev-body { flex: 1; display: flex; flex-direction: column; gap: 5px; padding: 9px 8px; }
    .prev-line { height: 6px; border-radius: 3px; background: var(--accent); opacity: 0.9; }
    .prev-line.short { width: 55%; opacity: 0.35; }

    /* Appearance: primary color swatches */
    .accent-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .accent-swatch {
      width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
      border: 2px solid transparent; display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, box-shadow 0.15s; padding: 0;
    }
    .accent-swatch:hover { transform: scale(1.12); }
    .accent-swatch.selected { box-shadow: 0 0 0 3px var(--bg-card), 0 0 0 5px var(--accent); }
    .appearance-hint { font-size: 0.72rem; color: var(--text-muted); margin-top: 8px; }

    .loading { text-align: center; padding: 3rem; color: var(--text-muted); }

    @media (max-width: 768px) {
      .form-row { grid-template-columns: 1fr; }
      .section { padding: 1.25rem; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  themeService = inject(ThemeService);

  accentOptions = ACCENT_OPTIONS;

  // Swatch shows the shade that matches the active theme (dark shades are lighter)
  swatchColor(a: AccentOption): string {
    return this.themeService.theme() === 'dark' ? a.dark.accent : a.light.accent;
  }

  profile = signal<any>(null);
  saving = false;
  allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  form = this.fb.group({
    displayName: [''],
    dateOfBirth: [''],
    phone: [''],
    address: [''],
    isEmployed: [false],
    companyName: [''],
    officeStartTime: [''],
    officeEndTime: [''],
    weekendDays: [['Sat', 'Sun'] as string[]],
    syncOfficeToCalendar: [false],
  });

  ngOnInit() {
    this.http.get(`${environment.apiUrl}/users/profile`).subscribe({
      next: (data: any) => {
        this.profile.set(data);
        this.form.patchValue({
          displayName: data.displayName ?? '',
          dateOfBirth: data.dateOfBirth ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          isEmployed: data.isEmployed ?? false,
          companyName: data.companyName ?? '',
          officeStartTime: data.officeStartTime ?? '',
          officeEndTime: data.officeEndTime ?? '',
          weekendDays: data.weekendDays ?? ['Sat', 'Sun'],
          syncOfficeToCalendar: data.syncOfficeToCalendar ?? false,
        });
      },
    });
  }

  isWeekend(day: string): boolean {
    return (this.form.value.weekendDays ?? []).includes(day);
  }

  toggleWeekend(day: string) {
    const current = [...(this.form.value.weekendDays ?? [])];
    const idx = current.indexOf(day);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(day);
    this.form.patchValue({ weekendDays: current });
  }

  getMapUrl(): SafeResourceUrl {
    const address = encodeURIComponent(this.form.value.address ?? '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${address}&output=embed`);
  }

  save() {
    this.saving = true;
    // Clean the data — remove null/undefined values
    const data: any = {};
    const v = this.form.value;
    if (v.displayName) data.displayName = v.displayName;
    if (v.dateOfBirth) data.dateOfBirth = v.dateOfBirth;
    if (v.phone) data.phone = v.phone;
    if (v.address) data.address = v.address;
    data.isEmployed = !!v.isEmployed;
    if (v.companyName) data.companyName = v.companyName;
    if (v.officeStartTime) data.officeStartTime = v.officeStartTime;
    if (v.officeEndTime) data.officeEndTime = v.officeEndTime;
    if (v.weekendDays) data.weekendDays = v.weekendDays;
    data.syncOfficeToCalendar = !!v.syncOfficeToCalendar;

    this.http.patch(`${environment.apiUrl}/users/profile`, data).subscribe({
      next: (data: any) => {
        this.profile.set(data);
        this.auth.currentUser.update((u) => u ? { ...u, displayName: data.displayName } : u);
        this.toast.success('Profile saved');
        this.saving = false;
      },
      error: (err) => { console.error('Profile save error:', err.error); this.toast.error(err.error?.message?.join?.(', ') || err.error?.message || 'Failed to save'); this.saving = false; },
    });
  }
}
