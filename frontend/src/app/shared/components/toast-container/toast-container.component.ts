// Import Component decorator and inject function for DI
import { Component, inject } from '@angular/core';
// ToastService provides the reactive toasts signal that holds all active notifications
import { ToastService } from '../../../core/services/toast.service';

// ToastContainerComponent renders the stack of toast notifications in the bottom-right corner.
// It reads the toasts signal from ToastService and displays each toast with a type-specific
// icon (success checkmark, error circle, warning triangle, info circle) and colored left border.
// Clicking a toast dismisses it immediately; otherwise it auto-dismisses after its duration.
@Component({
  selector: 'app-toast-container', // Placed inside the LayoutComponent template
  standalone: true, // Angular 19 standalone component
  template: `
    <!-- Fixed-position container in the bottom-right corner (styled in global styles.css) -->
    <div class="toast-container">
      <!-- Iterate over all active toast notifications from the ToastService signal -->
      @for (toast of toastService.toasts(); track toast.id) {
        <!-- Each toast gets a type-specific CSS class (toast-success, toast-error, etc.) for left-border color.
             Clicking anywhere on the toast dismisses it immediately. -->
        <div class="toast toast-{{ toast.type }}" (click)="toastService.dismiss(toast.id)">
          <!-- Success icon: green checkmark -->
          @if (toast.type === 'success') {
            <svg width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          } @else if (toast.type === 'error') {
            <!-- Error icon: red circle with exclamation mark -->
            <svg width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          } @else if (toast.type === 'warning') {
            <!-- Warning icon: amber triangle -->
            <svg width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          } @else {
            <!-- Info icon: blue circle with info mark (default fallback) -->
            <svg width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          <!-- Toast message text — uses inline style for consistent sizing and theme color -->
          <span style="font-size:0.875rem;color:var(--text-primary)">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  // Inject ToastService and expose it publicly so the template can read toasts() and call dismiss()
  toastService = inject(ToastService);
}
