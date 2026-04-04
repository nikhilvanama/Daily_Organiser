// Import Angular decorators for component definition, input/output bindings
import { Component, EventEmitter, Input, Output } from '@angular/core';

// ModalComponent is a reusable dialog wrapper used across the app for forms and confirmations.
// It renders a centered panel over a semi-transparent backdrop. Used by task-form, goal-form,
// wishlist-form, and the calendar's add-task dialog. Content is projected via <ng-content>.
@Component({
  selector: 'app-modal', // Used as <app-modal [isOpen]="..." title="..." (close)="...">
  standalone: true, // Angular 19 standalone component — no NgModule needed
  template: `
    <!-- Only render the modal DOM when isOpen is true (conditional rendering for performance) -->
    @if (isOpen) {
      <!-- Backdrop: semi-transparent overlay covering the entire viewport -->
      <div class="modal-backdrop" (click)="onBackdropClick($event)">
        <!-- Modal panel: centered card with configurable max-width -->
        <div class="modal-panel" [style.max-width]="maxWidth">
          <!-- Header: title on the left, close button (X) on the right -->
          <div class="modal-header">
            <h2 class="modal-title">{{ title }}</h2>
            <!-- Close button emits the close event so the parent can hide the modal -->
            <button class="modal-close" (click)="close.emit()">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <!-- Body: content projection slot — the parent places form components here -->
          <div class="modal-body">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Backdrop: fixed overlay that dims the background and centers the modal panel */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    /* Modal panel: card-styled container with theme-aware colors and a subtle shadow */
    .modal-panel {
      background: var(--bg-card); border-radius: var(--radius);
      border: 1px solid var(--border); width: 100%; max-height: 90vh;
      overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    /* Header row: flex layout with title and close button separated by space-between */
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
    /* Modal title text: compact, semibold */
    .modal-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
    /* Close button: transparent background, icon-only, subtle hover effect */
    .modal-close { background: transparent; border: none; cursor: pointer; color: var(--text-secondary); padding: 0.25rem; border-radius: 0.25rem; display: flex; }
    .modal-close:hover { background: var(--bg-secondary); }
    /* Body padding for the projected content (forms, etc.) */
    .modal-body { padding: 1.5rem; }
  `],
})
export class ModalComponent {
  // Controls whether the modal is visible — parent sets this to true/false
  @Input() isOpen = false;
  // Title text displayed in the modal header
  @Input() title = '';
  // Maximum width of the modal panel — allows different sizes for different forms
  @Input() maxWidth = '520px';
  // Event emitted when the user clicks the close button or the backdrop — parent should set isOpen=false
  @Output() close = new EventEmitter<void>();

  // Handle clicks on the backdrop — only close if the click was directly on the backdrop element,
  // not on the modal panel itself (prevents closing when interacting with form content).
  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }
}
