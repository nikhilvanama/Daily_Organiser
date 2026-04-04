// Import Component decorator and inject function for DI
import { Component, inject } from '@angular/core';
// FormBuilder creates the reactive registration form; ReactiveFormsModule enables [formGroup]; Validators provides validation rules
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// Router handles navigation after registration; RouterLink creates the "Sign in" link
import { Router, RouterLink } from '@angular/router';
// AuthService provides the register() method that creates a new account on the NestJS backend
import { AuthService } from '../../../core/services/auth.service';
// ToastService shows error feedback when registration fails
import { ToastService } from '../../../core/services/toast.service';

// RegisterComponent is the full-screen account creation page for new users.
// It displays the app logo, a form with display name/username/email/password fields,
// and a link to the login page. Protected by noAuthGuard — logged-in users are redirected.
@Component({
  selector: 'app-register', // Loaded by the router at /auth/register
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, RouterLink], // Enable reactive forms and router links in the template
  template: `
    <!-- Full-screen centered auth page with secondary background -->
    <div class="auth-page">
      <!-- Auth card: centered container holding the logo, form, and footer -->
      <div class="auth-card card">
        <!-- Header section with app branding and creation prompt -->
        <div class="header">
          <div class="logo">
            <!-- Green gradient logo icon matching the login page and sidebar branding -->
            <div class="logo-icon">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
            </div>
            <span class="logo-name">Daily Organizer</span>
          </div>
          <h1>Create your account</h1>
          <p>Get started with Daily Organizer for free</p>
        </div>

        <!-- Registration form: display name, username, email, password -->
        <form [formGroup]="form" (ngSubmit)="submit()">
          <!-- Two-column row for display name and username -->
          <div class="form-row">
            <div class="form-group"><label class="label">Display Name</label><input class="input" formControlName="displayName" placeholder="Your name" /></div>
            <div class="form-group"><label class="label">Username</label><input class="input" formControlName="username" placeholder="username" /></div>
          </div>
          <!-- Email field: required + email format validation -->
          <div class="form-group"><label class="label">Email</label><input class="input" type="email" formControlName="email" placeholder="you&#64;example.com" /></div>
          <!-- Password field: required + minimum 8 characters for security -->
          <div class="form-group"><label class="label">Password</label><input class="input" type="password" formControlName="password" placeholder="Min 8 characters" /></div>
          <!-- Submit button: disabled while loading or if the form is invalid -->
          <button class="btn-primary submit-btn" type="submit" [disabled]="loading || form.invalid">
            <!-- Show a spinning loader while the registration request is in flight -->
            @if (loading) { <span class="spin"></span> Creating... } @else { Create account }
          </button>
        </form>

        <!-- Footer link to the login page for existing users -->
        <div class="footer">
          <span>Already have an account?</span>
          <a routerLink="/auth/login">Sign in</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Full-viewport centered layout for the auth page */
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-secondary); padding: 2rem; }
    /* Auth card: slightly wider than login to accommodate the two-column row */
    .auth-card { width: 100%; max-width: 440px; padding: 2.5rem; }
    /* Centered header with bottom margin */
    .header { text-align: center; margin-bottom: 2rem; }
    /* Logo row */
    .logo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
    /* Green gradient logo icon with shadow */
    .logo-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    /* App name text */
    .logo-name { font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
    /* Heading and subtext */
    .header h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 4px; }
    .header p { color: var(--text-secondary); font-size: 0.875rem; }
    /* Form vertical stack */
    form { display: flex; flex-direction: column; gap: 1.125rem; }
    /* Full-width submit button */
    .submit-btn { width: 100%; padding: 12px; font-size: 0.95rem; margin-top: 4px; }
    /* CSS spinner for loading state */
    .spin { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: sp .6s linear infinite; }
    @keyframes sp { to { transform: rotate(360deg); } }
    /* Footer with login link */
    .footer { text-align: center; margin-top: 1.75rem; font-size: 0.875rem; color: var(--text-secondary); }
    .footer a { color: var(--accent); font-weight: 600; margin-left: 4px; }
    .footer a:hover { text-decoration: underline; }
  `],
})
export class RegisterComponent {
  // Inject dependencies
  private fb = inject(FormBuilder); // For creating the reactive form
  private auth = inject(AuthService); // For calling the register API
  private router = inject(Router); // For redirecting to dashboard after registration
  private toast = inject(ToastService); // For showing error messages on registration failure
  // Loading flag for the submit button spinner
  loading = false;
  // Reactive form: displayName is optional, username requires 3+ chars, email must be valid, password requires 8+ chars
  form = this.fb.group({ displayName: [''], username: ['', [Validators.required, Validators.minLength(3)]], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]] });

  // Handle form submission — validate, call register API, and navigate on success
  submit() {
    if (this.form.invalid) return; // Guard against invalid submissions
    this.loading = true; // Show loading state
    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/dashboard']), // On success: redirect to dashboard (user is now logged in)
      error: (err) => { this.toast.error(err.error?.message ?? 'Registration failed'); this.loading = false; }, // On error: show toast and re-enable form
    });
  }
}
