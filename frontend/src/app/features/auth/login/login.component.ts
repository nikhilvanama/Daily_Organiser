// Import Component decorator and inject function for DI
import { Component, inject } from '@angular/core';
// FormBuilder creates the reactive login form; ReactiveFormsModule enables [formGroup]; Validators provides validation rules
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// Router handles navigation after login; RouterLink creates the "Create one" link to register
import { Router, RouterLink } from '@angular/router';
// AuthService provides the login() method that authenticates against the NestJS backend
import { AuthService } from '../../../core/services/auth.service';
// ToastService shows error feedback when login fails
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';

// LoginComponent is the full-screen sign-in page shown to unauthenticated users.
// It displays the app logo, email/password form, and a link to the registration page.
// Protected by noAuthGuard — already-logged-in users are redirected to the dashboard.
@Component({
  selector: 'app-login', // Loaded by the router at /auth/login
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, RouterLink], // Enable reactive forms and router links in the template
  template: `
    <!-- Full-screen centered auth page with secondary background -->
    <div class="auth-page" [class.dark-theme-page]="themeService.theme() === 'dark'">
      <!-- Theme toggle in top-right corner of auth page -->
      <button type="button" class="auth-theme-btn" (click)="themeService.toggle()"
        [title]="themeService.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" aria-label="Toggle theme">
        @if (themeService.theme() === 'dark') {
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        } @else {
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        }
      </button>

      <!-- Auth card: centered container holding the logo, form, and footer -->
      <div class="auth-card card" [class.dark-theme-card]="themeService.theme() === 'dark'">
        <!-- Header section with app branding and welcome message -->
        <div class="header">
          <div class="logo">
            <!-- Green gradient logo icon matching the sidebar branding -->
            <div class="logo-icon">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </div>
            <span class="logo-name">Daily Organizer</span>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to continue to your workspace</p>
        </div>

        <!-- Login form: email + password fields with submit button -->
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label class="label">Email</label>
            <!-- Email input with required + email format validation -->
            <input class="input" type="email" formControlName="email" placeholder="you&#64;example.com" />
          </div>
          <div class="form-group">
            <label class="label">Password</label>
            <div class="password-wrapper">
              <input class="input" [type]="showPassword ? 'text' : 'password'" formControlName="password" placeholder="Enter your password" />
              <button type="button" class="toggle-password" (click)="showPassword = !showPassword" tabindex="-1">
                @if (showPassword) {
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                } @else {
                  <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>
          <!-- Submit button: disabled while loading or if the form is invalid -->
          <button class="btn-primary submit-btn" type="submit" [disabled]="loading || form.invalid">
            <!-- Show a spinning loader animation while the login request is in flight -->
            @if (loading) { <span class="spin"></span> Signing in... } @else { Sign in }
          </button>
        </form>

        <!-- Footer link to the registration page for new users -->
        <div class="footer">
          <span>Don't have an account?</span>
          <a routerLink="/auth/register">Create one</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Full-viewport centered layout with the illustrated background.
       Four artworks: light/dark x desktop/mobile — cover-fit so nothing tiles or overlaps. */
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: url('/login-bg.png') center / cover no-repeat, var(--bg-secondary);
      padding: 2rem; position: relative;
    }
    :host-context([data-theme="dark"]) .auth-page,
    [data-theme="dark"] .auth-page {
      background: url('/login-darkbg.png') center / cover no-repeat, var(--bg-secondary);
    }
    @media (max-width: 640px) {
      .auth-page { background: url('/login-mobile-bg.png') center / cover no-repeat, var(--bg-secondary); }
      :host-context([data-theme="dark"]) .auth-page,
      [data-theme="dark"] .auth-page { background: url('/login-mobile-darkbg.png') center / cover no-repeat, var(--bg-secondary); }
    }
    /* Light veil for card contrast only — both artworks already match their theme,
       so the veil stays subtle and never buries the illustration. */
    /* Desktop: the artwork's detail (desk, books, notepad) lives on the right,
       so the card sits in the calm empty space on the left */
    @media (min-width: 641px) {
      .auth-page { justify-content: flex-start; padding-left: calc(clamp(3rem, 11vw, 10rem) + 100px); }
    }
    .auth-page::before { content: ''; position: absolute; inset: 0; background: rgba(255, 255, 255, 0.12); }
    :host-context([data-theme="dark"]) .auth-page::before,
    [data-theme="dark"] .auth-page::before { background: rgba(9, 9, 11, 0.45); }
    .auth-theme-btn {
      position: absolute; top: 1.25rem; right: 1.25rem; z-index: 10;
      width: 40px; height: 40px; border-radius: 12px;
      background: var(--card-surface, var(--bg-card));
      border: 1px solid var(--border);
      color: var(--text-primary);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      transition: all 0.2s ease;
    }
    .auth-theme-btn:hover {
      transform: translateY(-1px);
      border-color: var(--accent);
      color: var(--accent);
    }
    .auth-card { width: 100%; max-width: 400px; padding: 2.5rem; position: relative; z-index: 1; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18); }
    /* Mobile: pin the card to the top so the desk illustration at the bottom
       of the portrait artwork stays fully visible under the form */
    @media (max-width: 640px) {
      .auth-page { align-items: flex-start; padding: 12vh 1rem 1rem; }
      .auth-card { padding: 1.5rem; }
    }
    /* Centered header with bottom margin for spacing */
    .header { text-align: center; margin-bottom: 2rem; position: relative; z-index: 1; }
    /* Logo row: inline-flex to center the icon + text pair */
    .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
    /* Green gradient logo icon with shadow for depth */
    .logo-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), var(--accent-hover));
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    /* App name: large bold text */
    .logo-name { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    /* Heading and subtext styling */
    .header h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 4px; }
    .header p { color: var(--text-secondary); font-size: 0.875rem; }
    /* Form: vertical stack with spacing between fields */
    form { display: flex; flex-direction: column; gap: 1.125rem; position: relative; z-index: 1; }
    /* Full-width submit button with extra padding */
    .submit-btn { width: 100%; padding: 12px; font-size: 0.95rem; margin-top: 4px; }
    /* CSS-only spinning loader for the submit button loading state */
    .spin { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: sp .6s linear infinite; }
    @keyframes sp { to { transform: rotate(360deg); } }
    /* Footer: registration link with accent color */
    .footer { text-align: center; margin-top: 1.75rem; font-size: 0.875rem; color: var(--text-secondary); position: relative; z-index: 1; }
    .footer a { color: var(--accent); font-weight: 600; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
    .password-wrapper { position: relative; }
    .password-wrapper .input { padding-right: 40px; }
    .toggle-password {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: var(--text-secondary);
      padding: 2px; display: flex; align-items: center;
    }
    .toggle-password:hover { color: var(--text-primary); }

    /* ═══════════════════════════════════════════════════════════════════
       DARK THEME STYLING SPECIFIC TO LOGIN PAGE
       Frosted glassmorphic card that blends naturally with the dark blue artwork
       ═══════════════════════════════════════════════════════════════════ */
    :host-context([data-theme="dark"]) .auth-page::before,
    .dark-theme-page::before {
      background: radial-gradient(circle at 30% 50%, rgba(13, 20, 38, 0.15) 0%, rgba(5, 9, 20, 0.4) 100%) !important;
    }

    :host-context([data-theme="dark"]) .auth-card,
    .dark-theme-card {
      background: linear-gradient(165deg, rgba(14, 22, 44, 0.93) 0%, rgba(7, 12, 25, 0.96) 100%) !important;
      backdrop-filter: blur(28px) saturate(190%) !important;
      -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
      border: 1px solid rgba(147, 197, 253, 0.22) !important;
      border-radius: 24px !important;
      box-shadow: 
        0 30px 70px -15px rgba(2, 6, 23, 0.92),
        0 0 0 1px rgba(255, 255, 255, 0.08),
        0 0 40px -5px rgba(56, 189, 248, 0.1),
        inset 0 1px 1px 0 rgba(255, 255, 255, 0.2) !important;
      position: relative;
      overflow: hidden;
    }

    :host-context([data-theme="dark"]) .auth-card::before,
    .dark-theme-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 120px;
      background: radial-gradient(ellipse at 50% -10%, rgba(56, 189, 248, 0.16), transparent 70%);
      pointer-events: none;
    }

    :host-context([data-theme="dark"]) .logo-icon,
    .dark-theme-card .logo-icon {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
    }

    :host-context([data-theme="dark"]) .logo-name,
    .dark-theme-card .logo-name {
      color: #ffffff !important;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="dark"]) .header h1,
    .dark-theme-card .header h1 {
      color: #f8fafc !important;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    :host-context([data-theme="dark"]) .header p,
    .dark-theme-card .header p {
      color: #94a3b8 !important;
    }

    :host-context([data-theme="dark"]) .form-group .label,
    .dark-theme-card .form-group .label {
      color: #cbd5e1 !important;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
      display: block;
    }

    :host-context([data-theme="dark"]) .input,
    .dark-theme-card .input {
      background: rgba(5, 9, 20, 0.72) !important;
      border: 1.5px solid rgba(148, 163, 184, 0.22) !important;
      border-radius: 12px !important;
      color: #ffffff !important;
      padding: 12px 14px !important;
      font-size: 0.92rem !important;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease !important;
    }

    :host-context([data-theme="dark"]) .input::placeholder,
    .dark-theme-card .input::placeholder {
      color: rgba(148, 163, 184, 0.5) !important;
    }

    :host-context([data-theme="dark"]) .input:focus,
    .dark-theme-card .input:focus {
      background: rgba(5, 9, 20, 0.92) !important;
      border-color: #10b981 !important;
      box-shadow: 
        0 0 0 3px rgba(16, 185, 129, 0.25),
        0 0 20px rgba(16, 185, 129, 0.18),
        inset 0 1px 2px rgba(0, 0, 0, 0.2) !important;
    }

    :host-context([data-theme="dark"]) .toggle-password,
    .dark-theme-card .toggle-password {
      color: #94a3b8 !important;
      right: 12px;
      transition: color 0.15s;
    }

    :host-context([data-theme="dark"]) .toggle-password:hover,
    .dark-theme-card .toggle-password:hover {
      color: #10b981 !important;
    }

    :host-context([data-theme="dark"]) .submit-btn,
    .dark-theme-card .submit-btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      border: 1px solid rgba(255, 255, 255, 0.25) !important;
      border-radius: 12px !important;
      font-weight: 600;
      font-size: 0.95rem;
      color: #ffffff !important;
      box-shadow: 0 8px 24px -4px rgba(16, 185, 129, 0.5) !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 6px;
    }

    :host-context([data-theme="dark"]) .submit-btn:hover:not(:disabled),
    .dark-theme-card .submit-btn:hover:not(:disabled) {
      transform: translateY(-1.5px);
      box-shadow: 0 12px 28px -4px rgba(16, 185, 129, 0.65) !important;
      background: linear-gradient(135deg, #34d399 0%, #059669 100%) !important;
    }

    :host-context([data-theme="dark"]) .submit-btn:disabled,
    .dark-theme-card .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none !important;
    }

    :host-context([data-theme="dark"]) .footer,
    .dark-theme-card .footer {
      color: #94a3b8 !important;
      font-size: 0.875rem;
      margin-top: 1.75rem;
    }

    :host-context([data-theme="dark"]) .footer a,
    .dark-theme-card .footer a {
      color: #34d399 !important;
      font-weight: 600;
      text-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
      transition: color 0.15s;
    }

    :host-context([data-theme="dark"]) .footer a:hover,
    .dark-theme-card .footer a:hover {
      color: #6ee7b7 !important;
    }

    :host-context([data-theme="dark"]) .auth-theme-btn,
    .dark-theme-page .auth-theme-btn {
      background: rgba(13, 20, 38, 0.65) !important;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(147, 197, 253, 0.2) !important;
      color: #e2e8f0 !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
    }

    :host-context([data-theme="dark"]) .auth-theme-btn:hover,
    .dark-theme-page .auth-theme-btn:hover {
      border-color: #10b981 !important;
      color: #10b981 !important;
      transform: translateY(-1px);
    }
  `],
})
export class LoginComponent {
  readonly themeService = inject(ThemeService);
  // Inject dependencies using the inject() function (preferred in standalone components)
  private fb = inject(FormBuilder); // For creating the reactive form
  private auth = inject(AuthService); // For calling the login API
  private router = inject(Router); // For redirecting to dashboard after login
  private toast = inject(ToastService); // For showing error messages on login failure
  // Loading flag to show the spinner and disable the submit button during the API call
  loading = false;
  showPassword = false;
  // Reactive form with email (required + email format) and password (required) fields
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  // Handle form submission — validate, call login API, and navigate on success
  submit() {
    if (this.form.invalid) return; // Guard against submitting with validation errors
    this.loading = true; // Show loading state
    this.auth.login(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']), // On success: redirect to the dashboard
      error: (err) => { this.toast.error(err.error?.message ?? 'Login failed'); this.loading = false; }, // On error: show toast and re-enable the form
    });
  }
}
