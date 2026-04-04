// Import Injectable for DI registration and signal for reactive toast list state
import { Injectable, signal } from '@angular/core';

// Toast visual variants — each type gets a distinct color accent (left border + icon)
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Toast data structure — each active toast notification is represented by this interface.
// The id is used for tracking in the template and for programmatic dismissal.
export interface Toast {
  id: number; // Auto-incrementing unique ID for each toast instance
  message: string; // The text content displayed to the user
  type: ToastType; // Visual variant controlling the icon and border color
}

// ToastService manages ephemeral notification messages displayed in the bottom-right corner.
// Components call success(), error(), info(), or warning() to show feedback after user actions.
// The toast-container component reads the toasts signal to render the active notifications.
@Injectable({ providedIn: 'root' }) // Singleton — all components share the same toast queue
export class ToastService {
  // Monotonically increasing counter to assign unique IDs — ensures each toast
  // can be individually dismissed even if multiple have the same message text.
  private counter = 0;
  // Reactive signal holding the array of currently visible toasts.
  // The toast-container component reads this to render notifications.
  toasts = signal<Toast[]>([]);

  // Show a toast notification with the given message, type, and auto-dismiss duration.
  // After `duration` milliseconds, the toast is automatically removed.
  show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = ++this.counter; // Generate a unique ID for this toast
    this.toasts.update((t) => [...t, { id, message, type }]); // Add to the signal array
    setTimeout(() => this.dismiss(id), duration); // Schedule auto-dismissal
  }

  // Convenience method for success feedback (e.g., "Task created", "Category deleted")
  success(msg: string) { this.show(msg, 'success'); }
  // Convenience method for error feedback — uses a longer 5s duration so users can read the message
  error(msg: string)   { this.show(msg, 'error', 5000); }
  // Convenience method for neutral informational messages
  info(msg: string)    { this.show(msg, 'info'); }
  // Convenience method for warning messages
  warning(msg: string) { this.show(msg, 'warning'); }

  // Remove a specific toast by ID — called by the auto-dismiss timer
  // or when the user clicks on a toast to dismiss it manually.
  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
