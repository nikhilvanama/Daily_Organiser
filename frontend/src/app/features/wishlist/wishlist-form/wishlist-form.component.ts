// Import Angular decorators: Component, EventEmitter for outputs, inject for DI, Input/Output for bindings, OnInit lifecycle
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
// FormBuilder creates the reactive form; ReactiveFormsModule enables [formGroup]; Validators for validation
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// AsyncPipe subscribes to the categories$ observable for the category dropdown
import { AsyncPipe } from '@angular/common';
// WishlistService provides create() and update() methods for saving wishlist items
import { WishlistService } from '../wishlist.service';
// CategoryService provides categories$ for the category selection dropdown
import { CategoryService } from '../../categories/category.service';
// WishlistItem model interface for typing the input binding
import { WishlistItem } from '../../../core/models/wishlist-item.model';

// WishlistFormComponent is a reusable form for creating and editing wishlist (buy list) items.
// It is used inside a ModalComponent by the wishlist-list page.
// When an existing item is passed via the [item] input, the form pre-fills for editing.
@Component({
  selector: 'app-wishlist-form', // Used as <app-wishlist-form [item]="..." (saved)="..." (cancelled)="...">
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, AsyncPipe], // Enable reactive forms and async pipe
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="form">
      <!-- Name field: required for every item -->
      <div class="form-group">
        <label class="label">Name *</label>
        <input class="input" formControlName="name" placeholder="Item name" />
      </div>
      <!-- Description field: optional -->
      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="2" placeholder="Optional…"></textarea>
      </div>
      <!-- Price and Currency in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Price</label>
          <!-- Numeric input with 2-decimal step for prices -->
          <input class="input" type="number" formControlName="price" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label class="label">Currency</label>
          <!-- Currency selector with common options -->
          <select class="input" formControlName="currency">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
          </select>
        </div>
      </div>
      <!-- Product URL field: optional link to the product page -->
      <div class="form-group">
        <label class="label">URL</label>
        <input class="input" type="url" formControlName="url" placeholder="https://…" />
      </div>
      <!-- Image URL field: optional product image for the card thumbnail -->
      <div class="form-group">
        <label class="label">Image URL</label>
        <input class="input" type="url" formControlName="imageUrl" placeholder="https://…" />
      </div>
      <!-- Priority and Category in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Priority</label>
          <select class="input" formControlName="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label">Category</label>
          <!-- Dropdown populated from the user's categories via CategoryService -->
          <select class="input" formControlName="categoryId">
            <option value="">None</option>
            @for (cat of catService.categories$ | async; track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>
      </div>
      <!-- Form actions: Cancel and Submit buttons -->
      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <!-- Button label changes between "Add" and "Update" based on edit mode -->
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving…' : (item ? 'Update' : 'Add') }}
        </button>
      </div>
    </form>
  `,
  // Compact inline styles for the form layout (minified for brevity)
  styles: [`.form{display:flex;flex-direction:column;gap:1rem}.form-group{display:flex;flex-direction:column;gap:.25rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}textarea.input{resize:vertical}.form-actions{display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem}`],
})
export class WishlistFormComponent implements OnInit {
  // Optional input: when provided, the form operates in edit mode with pre-filled values
  @Input() item: WishlistItem | null = null;
  // Emitted when the item is successfully saved (created or updated)
  @Output() saved = new EventEmitter<void>();
  // Emitted when the user clicks the Cancel button
  @Output() cancelled = new EventEmitter<void>();

  // Inject dependencies
  private fb = inject(FormBuilder); // For creating the reactive form
  private wishlistService = inject(WishlistService); // For create/update API calls
  // Expose CategoryService publicly so the template can read categories$ for the dropdown
  catService = inject(CategoryService);

  // Loading flag to disable the submit button during API calls
  loading = false;
  // Reactive form: name is required, everything else is optional with sensible defaults
  form = this.fb.group({
    name: ['', Validators.required], // Required item name
    description: [''], // Optional description
    price: [null as number | null], // Optional price (null = no price set)
    currency: ['USD'], // Default currency
    url: [''], // Optional product URL
    imageUrl: [''], // Optional product image URL
    priority: ['MEDIUM'], // Default priority
    categoryId: [''], // Optional category assignment
  });

  // On init, if an existing item was passed, pre-fill the form with its current values
  ngOnInit() {
    if (this.item) {
      this.form.patchValue({
        name: this.item.name,
        description: this.item.description ?? '',
        price: this.item.price,
        currency: this.item.currency,
        url: this.item.url ?? '',
        imageUrl: this.item.imageUrl ?? '',
        priority: this.item.priority,
        categoryId: this.item.categoryId ?? '',
      });
    }
  }

  // Handle form submission — build DTO, call create or update, emit saved event
  submit() {
    if (this.form.invalid) return; // Guard against invalid form state
    this.loading = true;
    const v = this.form.value;
    // Build the DTO, converting empty/null values to undefined so the backend ignores them
    const dto: any = {
      name: v.name,
      description: v.description || undefined,
      price: v.price ?? undefined,
      currency: v.currency,
      url: v.url || undefined,
      imageUrl: v.imageUrl || undefined,
      priority: v.priority,
      categoryId: v.categoryId || undefined,
    };

    // Choose create or update based on whether an existing item was provided
    const req = this.item ? this.wishlistService.update(this.item.id, dto) : this.wishlistService.create(dto);
    req.subscribe({
      next: () => { this.loading = false; this.saved.emit(); }, // Success: notify parent
      error: () => { this.loading = false; }, // Failure: re-enable the button
    });
  }
}
