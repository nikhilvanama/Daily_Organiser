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

// LoginComponent is the full-screen sign-in page shown to unauthenticated users.
// It displays the app logo, email/password form, and a link to the registration page.
// Protected by noAuthGuard — already-logged-in users are redirected to the dashboard.
@Component({
  selector: 'app-login', // Loaded by the router at /auth/login
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, RouterLink], // Enable reactive forms and router links in the template
  template: `
    <!-- Full-screen centered auth page with secondary background -->
    <div class="auth-page">
      <!-- Auth card: centered container holding the logo, form, and footer -->
      <div class="auth-card card">
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
            <!-- Password input with required validation -->
            <input class="input" type="password" formControlName="password" placeholder="Enter your password" />
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
    /* Full-viewport centered layout for the auth page */
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: var(--bg-secondary); padding: 2rem;
    }
    /* Auth card: constrained width with generous padding */
    .auth-card { width: 100%; max-width: 400px; padding: 2.5rem; }
    /* Centered header with bottom margin for spacing */
    .header { text-align: center; margin-bottom: 2rem; }
    /* Logo row: inline-flex to center the icon + text pair */
    .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
    /* Green gradient logo icon with shadow for depth */
    .logo-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    /* App name: large bold text */
    .logo-name { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    /* Heading and subtext styling */
    .header h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 4px; }
    .header p { color: var(--text-secondary); font-size: 0.875rem; }
    /* Form: vertical stack with spacing between fields */
    form { display: flex; flex-direction: column; gap: 1.125rem; }
    /* Full-width submit button with extra padding */
    .submit-btn { width: 100%; padding: 12px; font-size: 0.95rem; margin-top: 4px; }
    /* CSS-only spinning loader for the submit button loading state */
    .spin { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: sp .6s linear infinite; }
    @keyframes sp { to { transform: rotate(360deg); } }
    /* Footer: registration link with accent color */
    .footer { text-align: center; margin-top: 1.75rem; font-size: 0.875rem; color: var(--text-secondary); }
    .footer a { color: var(--accent); font-weight: 600; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
  `],
})
export class LoginComponent {
  // Inject dependencies using the inject() function (preferred in standalone components)
  private fb = inject(FormBuilder); // For creating the reactive form
  private auth = inject(AuthService); // For calling the login API
  private router = inject(Router); // For redirecting to dashboard after login
  private toast = inject(ToastService); // For showing error messages on login failure
  // Loading flag to show the spinner and disable the submit button during the API call
  loading = false;
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
