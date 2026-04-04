// Import Angular decorators and utilities for component definition, events, and DI
import { Component, EventEmitter, inject, Output } from '@angular/core';
// FormBuilder creates reactive forms; ReactiveFormsModule enables [formGroup] in the template; Validators provides validation rules
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// AsyncPipe subscribes to the categories$ observable in the template
import { AsyncPipe } from '@angular/common';
// CategoryService provides CRUD operations and the categories$ BehaviorSubject
import { CategoryService } from '../../../features/categories/category.service';
// ToastService shows success/error feedback after create/delete operations
import { ToastService } from '../../../core/services/toast.service';
// Category interface for typing the deleteCategory method parameter
import { Category } from '../../../core/models/category.model';

// Predefined palette of 10 colors for category assignment — displayed as selectable circles
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];

// CategoryManagerComponent is a popup form accessed from the sidebar that lets users
// create and delete categories. Categories are used to organize tasks and wishlist items.
// It displays a name input, a color picker row, an "Add" button, and a list of existing categories.
@Component({
  selector: 'app-category-manager', // Used inside the sidebar's category popup
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, AsyncPipe], // Enable reactive forms and async pipe in the template
  template: `
    <!-- Main container card for the category manager popup -->
    <div class="manager">
      <!-- Header with title and close button -->
      <div class="header">
        <h3>Manage Categories</h3>
        <!-- Close button emits the closed event so the sidebar hides the popup -->
        <button class="close-btn" (click)="closed.emit()">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Add category form: name input + color picker + submit button -->
      <form class="add-form" [formGroup]="form" (ngSubmit)="addCategory()">
        <div class="form-input-wrap">
          <!-- Category name input — required, max 40 characters -->
          <input class="input" formControlName="name" placeholder="Category name..." />
        </div>
        <!-- Color selection row: circular buttons for each predefined color -->
        <div class="color-row">
          @for (c of colors; track c) {
            <!-- Each color button updates the form's color value on click -->
            <button type="button" class="color-btn" [class.selected]="form.value.color === c"
              [style.background]="c" (click)="form.patchValue({color: c})">
              <!-- Show a white checkmark SVG on the selected color -->
              @if (form.value.color === c) {
                <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </button>
          }
        </div>
        <!-- Submit button — disabled when form is invalid or a save is in progress -->
        <button type="submit" class="btn-primary add-btn" [disabled]="form.invalid || saving">
          {{ saving ? 'Adding...' : '+ Add Category' }}
        </button>
      </form>

      <!-- Existing categories list with delete buttons -->
      <div class="list">
        @for (cat of catService.categories$ | async; track cat.id) {
          <div class="cat-row">
            <!-- Colored dot indicator for this category -->
            <span class="cat-dot" [style.background]="cat.color"></span>
            <span class="cat-name">{{ cat.name }}</span>
            <!-- Delete button — only visible on hover via CSS opacity transition -->
            <button class="del-btn" (click)="deleteCategory(cat)" title="Delete">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        } @empty {
          <!-- Message shown when no categories have been created yet -->
          <div class="empty-msg">No categories created yet</div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* Popup container: card-styled with fixed width and max height */
    .manager {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      width: 320px;
      max-height: 480px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    /* Header row: title + close button with bottom border */
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .header h3 { font-size: 0.95rem; font-weight: 600; margin: 0; color: var(--text-primary); }
    /* Close button: transparent with hover highlight */
    .close-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      padding: 4px; border-radius: 6px; display: flex;
    }
    .close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* Add form section: padded area with bottom border separating it from the list */
    .add-form { padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
    .form-input-wrap .input { font-size: 0.85rem; padding: 8px 12px; }

    /* Color picker row: wrapping flex container of circular color buttons */
    .color-row { display: flex; gap: 6px; flex-wrap: wrap; }
    /* Individual color circle button */
    .color-btn {
      width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s, border-color 0.15s;
    }
    .color-btn:hover { transform: scale(1.15); }
    /* Selected color: visible border and slightly enlarged */
    .color-btn.selected { border-color: var(--text-primary); transform: scale(1.15); }

    /* Full-width add button */
    .add-btn { font-size: 0.82rem; padding: 8px 14px; width: 100%; }

    /* Scrollable list of existing categories */
    .list { flex: 1; overflow-y: auto; padding: 8px; }
    /* Category row: colored dot + name + delete button */
    .cat-row {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px; transition: background 0.1s;
    }
    .cat-row:hover { background: var(--bg-hover); }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-name { flex: 1; font-size: 0.85rem; color: var(--text-primary); }
    /* Delete button: hidden by default, appears on row hover */
    .del-btn {
      background: none; border: none; cursor: pointer; color: var(--text-muted);
      padding: 4px; border-radius: 6px; display: flex; opacity: 0; transition: all 0.15s;
    }
    .cat-row:hover .del-btn { opacity: 1; }
    .del-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }

    /* Empty state message centered in the list area */
    .empty-msg { text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem; }
  `],
})
export class CategoryManagerComponent {
  // Event emitted when the user closes the manager (via close button or overlay click in sidebar)
  @Output() closed = new EventEmitter<void>();

  // Expose CategoryService publicly so the template can read categories$ via async pipe
  catService = inject(CategoryService);
  // FormBuilder for creating the reactive add-category form
  private fb = inject(FormBuilder);
  // ToastService for displaying success/error feedback after operations
  private toast = inject(ToastService);

  // Expose the predefined color palette to the template for the color picker
  colors = COLORS;
  // Flag to prevent double-submission while a create request is in flight
  saving = false;

  // Reactive form for creating a new category — name is required (max 40 chars),
  // color defaults to the first green in the palette
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    color: ['#10b981'], // Default to the app's primary green accent
  });

  // Submit the add-category form — calls the backend via CategoryService
  addCategory() {
    if (this.form.invalid) return; // Guard against invalid submissions
    this.saving = true; // Show loading state on the button
    this.catService.create(this.form.value as any).subscribe({
      next: () => {
        this.toast.success('Category created'); // Show success toast
        this.form.reset({ name: '', color: '#10b981' }); // Reset form for the next category
        this.saving = false; // Re-enable the button
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Failed to create category'); // Show error toast
        this.saving = false; // Re-enable the button
      },
    });
  }

  // Delete a category after user confirmation — removes it from the backend and the local list
  deleteCategory(cat: Category) {
    if (!confirm(`Delete "${cat.name}"?`)) return; // Ask for confirmation before destructive action
    this.catService.delete(cat.id).subscribe({
      next: () => this.toast.success('Category deleted'), // Show success toast
      error: () => this.toast.error('Failed to delete'), // Show error toast
    });
  }
}
