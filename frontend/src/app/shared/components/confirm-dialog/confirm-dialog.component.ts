import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (isOpen) {
      <div class="overlay" (click)="onCancel()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-icon">
            <svg width="24" height="24" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="onCancel()">Cancel</button>
            <button class="btn-delete" (click)="onConfirm()">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 2000; display: flex; align-items: center; justify-content: center;
      padding: 1rem; animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .dialog {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 2rem; width: 100%; max-width: 380px;
      text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

    .dialog-icon {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(239,68,68,0.1); display: flex;
      align-items: center; justify-content: center;
      margin: 0 auto 1rem;
    }
    h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem; }
    p { font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 1.5rem; line-height: 1.5; }

    .dialog-actions { display: flex; gap: 10px; justify-content: center; }
    .btn-cancel {
      padding: 10px 24px; border-radius: 8px; font-size: 0.875rem; font-weight: 500;
      background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border);
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .btn-cancel:hover { background: var(--bg-tertiary); }
    .btn-delete {
      padding: 10px 24px; border-radius: 8px; font-size: 0.875rem; font-weight: 600;
      background: #ef4444; color: #fff; border: none;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .btn-delete:hover { background: #dc2626; }
  `],
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Delete';
  @Input() message = 'Are you sure? This action cannot be undone.';
  @Input() confirmText = 'Delete';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() { this.confirmed.emit(); }
  onCancel() { this.cancelled.emit(); }
}
