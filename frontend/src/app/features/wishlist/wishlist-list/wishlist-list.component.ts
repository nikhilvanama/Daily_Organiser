// Import Angular core utilities: Component, inject for DI, OnInit lifecycle
import { Component, inject, OnInit } from '@angular/core';
// AsyncPipe subscribes to items$ BehaviorSubject; CurrencyPipe formats prices
import { AsyncPipe, CurrencyPipe } from '@angular/common';
// FormBuilder creates the filter form; ReactiveFormsModule enables [formGroup] in the template
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
// WishlistService provides the items$ observable, CRUD methods, and getTotalValue()
import { WishlistService } from '../wishlist.service';
// ModalComponent wraps the wishlist form in a dialog
import { ModalComponent } from '../../../shared/components/modal/modal.component';
// WishlistFormComponent renders the item creation/edit form inside the modal
import { WishlistFormComponent } from '../wishlist-form/wishlist-form.component';
// ToastService shows success/error feedback after operations
import { ToastService } from '../../../core/services/toast.service';
// WishlistItem model interface for typing
import { WishlistItem } from '../../../core/models/wishlist-item.model';

// WishlistListComponent ("Buy List" page) displays all wishlist items in a responsive card grid.
// Each card shows a product image (or placeholder), name, price, description, priority badge,
// category, and action buttons (view link, mark purchased, edit, delete).
// Includes status and priority filter dropdowns.
@Component({
  selector: 'app-wishlist-list', // Loaded by the router at /wishlist
  standalone: true, // Angular 19 standalone component
  imports: [AsyncPipe, CurrencyPipe, ReactiveFormsModule, ModalComponent, WishlistFormComponent],
  template: `
    <!-- Page container with fade-in animation -->
    <div class="page animate-in">
      <!-- Page header: title, item count, total value, and "Add Item" button -->
      <div class="page-header">
        <div>
          <h2>Buy List</h2>
          <!-- Display count and total USD value of WANTED items -->
          <p>{{ (wishlistService.items$ | async)?.length ?? 0 }} products to buy · Total: {{ wishlistService.getTotalValue() | currency }}</p>
        </div>
        <!-- Opens the modal with an empty WishlistFormComponent for adding a new item -->
        <button class="btn-primary" (click)="showForm = true">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Item
        </button>
      </div>

      <!-- Filter dropdowns: status and priority -->
      <div class="filters card" [formGroup]="filterForm">
        <select class="input filter-select" formControlName="status">
          <option value="">All statuses</option>
          <option value="WANTED">Wanted</option>
          <option value="PURCHASED">Purchased</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select class="input filter-select" formControlName="priority">
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <!-- Reset button clears all filters -->
        <button class="btn-ghost" (click)="resetFilters()">Reset</button>
      </div>

      <!-- Responsive card grid for wishlist items -->
      <div class="wishlist-grid">
        @for (item of wishlistService.items$ | async; track item.id) {
          <!-- Each card: image + body; faded when already purchased -->
          <div class="wishlist-card card" [class.purchased]="item.status === 'PURCHASED'">
            <!-- Product image or placeholder -->
            @if (item.imageUrl) {
              <div class="card-image">
                <img [src]="item.imageUrl" [alt]="item.name" />
              </div>
            } @else {
              <!-- Placeholder with an image icon when no product image is available -->
              <div class="card-image placeholder">
                <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            }
            <!-- Card body: name, price, description, badges, actions -->
            <div class="card-body">
              <div class="card-header">
                <h3 class="item-name">{{ item.name }}</h3>
                <!-- Price displayed in the item's currency using CurrencyPipe -->
                @if (item.price !== null) {
                  <span class="item-price">{{ item.price | currency:item.currency }}</span>
                }
              </div>
              <!-- Optional description: clamped to 2 lines -->
              @if (item.description) {
                <p class="item-desc">{{ item.description }}</p>
              }
              <!-- Metadata: priority badge and category name -->
              <div class="card-meta">
                <span class="badge badge-{{ item.priority.toLowerCase() }}">{{ item.priority }}</span>
                @if (item.category) {
                  <span class="item-category" [style.color]="item.category.color">{{ item.category.name }}</span>
                }
              </div>
              <!-- Action buttons row -->
              <div class="card-actions">
                <!-- External link to the product page (if URL provided) -->
                @if (item.url) {
                  <a [href]="item.url" target="_blank" rel="noopener" class="btn-ghost sm">View →</a>
                }
                <!-- "Mark Purchased" button only shown for WANTED items -->
                @if (item.status === 'WANTED') {
                  <button class="btn-primary sm" (click)="purchaseItem(item.id)">Mark Purchased</button>
                }
                <!-- Edit button: opens the modal pre-filled with this item's data -->
                <button class="icon-btn" (click)="editItem(item)">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <!-- Delete button: confirms before removing the item -->
                <button class="icon-btn danger" (click)="deleteItem(item.id)">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        } @empty {
          <!-- Empty state: shown when no wishlist items exist, with a heart icon and CTA -->
          <div class="empty-full card">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <p>Your wishlist is empty. Add your first item!</p>
            <button class="btn-primary" (click)="showForm = true">Add Item</button>
          </div>
        }
      </div>
    </div>

    <!-- Modal for creating or editing a wishlist item -->
    <app-modal [isOpen]="showForm" [title]="editingItem ? 'Edit Item' : 'Add Wishlist Item'" (close)="closeForm()">
      <app-wishlist-form [item]="editingItem" (saved)="onSaved()" (cancelled)="closeForm()" />
    </app-modal>
  `,
  styles: [`
    /* Page layout */
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { font-size: 1.375rem; font-weight: 700; margin: 0 0 0.25rem; color: var(--text-primary); }
    .page-header p { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
    /* Filter bar: horizontal flex with wrapping */
    .filters { display: flex; gap: 0.75rem; padding: 1rem; align-items: center; flex-wrap: wrap; }
    .filter-select { width: auto; min-width: 140px; }
    /* Responsive card grid: auto-fill columns at 260px minimum */
    .wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    /* Card: flex column with subtle hover lift effect */
    .wishlist-card { overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s; }
    .wishlist-card:hover { transform: translateY(-2px); }
    /* Purchased items: reduced opacity to de-emphasize them */
    .wishlist-card.purchased { opacity: 0.65; }
    /* Product image area: fixed height with cover fit */
    .card-image { height: 160px; overflow: hidden; background: var(--bg-secondary); }
    .card-image img { width: 100%; height: 100%; object-fit: cover; }
    /* Placeholder: centered icon when no image URL is provided */
    .card-image.placeholder { display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
    /* Card body: padded content area that grows to fill the card */
    .card-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.625rem; flex: 1; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
    .item-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin: 0; }
    /* Price: accent-colored, bold, no wrapping */
    .item-price { font-size: 1rem; font-weight: 700; color: var(--accent); white-space: nowrap; }
    /* Description: clamped to 2 lines */
    .item-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .item-category { font-size: 0.75rem; font-weight: 500; }
    /* Actions: wrapping flex row pushed to the bottom of the card body */
    .card-actions { display: flex; gap: 0.375rem; flex-wrap: wrap; align-items: center; margin-top: auto; }
    .sm { font-size: 0.78rem; padding: 0.3rem 0.6rem; }
    /* Icon buttons */
    .icon-btn { background: transparent; border: none; padding: 0.375rem; border-radius: 0.375rem; cursor: pointer; color: var(--text-secondary); display: flex; }
    .icon-btn:hover { background: var(--bg-secondary); }
    .icon-btn.danger:hover { background: #fef2f2; color: var(--red); }
    /* Empty state: spans full grid width */
    .empty-full { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: var(--text-muted); grid-column: 1 / -1; }
  `],
})
export class WishlistListComponent implements OnInit {
  // Expose WishlistService publicly so the template can subscribe to items$ and call getTotalValue()
  wishlistService = inject(WishlistService);
  // ToastService for success/error feedback
  private toast = inject(ToastService);
  // FormBuilder for creating the filter form
  private fb = inject(FormBuilder);

  // Controls visibility of the create/edit modal
  showForm = false;
  // Holds the item being edited (null for new item creation)
  editingItem: WishlistItem | null = null;
  // Reactive form for status and priority filter dropdowns
  filterForm = this.fb.group({ status: [''], priority: [''] });

  // On init, load items and subscribe to filter changes for automatic re-fetching
  ngOnInit() {
    this.loadItems(); // Initial load with no filters
    this.filterForm.valueChanges.subscribe(() => this.loadItems()); // Re-fetch when filters change
  }

  // Fetch wishlist items from the backend with the current filter values
  loadItems() {
    this.wishlistService.loadAll(this.filterForm.value as Record<string, string>).subscribe();
  }

  // Mark an item as purchased via the backend API
  purchaseItem(id: string) {
    this.wishlistService.purchase(id).subscribe({
      next: () => this.toast.success('Marked as purchased!'),
      error: () => this.toast.error('Failed to update'),
    });
  }

  // Open the edit modal pre-filled with the selected item's data
  editItem(item: WishlistItem) { this.editingItem = item; this.showForm = true; }

  // Delete an item after user confirmation
  deleteItem(id: string) {
    if (!confirm('Remove this item?')) return;
    this.wishlistService.delete(id).subscribe({
      next: () => this.toast.success('Item removed'),
      error: () => this.toast.error('Failed to delete'),
    });
  }

  // Called when the form saves — close modal and show appropriate success message
  onSaved() { this.closeForm(); this.toast.success(this.editingItem ? 'Item updated' : 'Item added'); }
  // Close the modal and reset the editing state
  closeForm() { this.showForm = false; this.editingItem = null; }
  // Reset all filters to their default values
  resetFilters() { this.filterForm.reset({ status: '', priority: '' }); }
}
