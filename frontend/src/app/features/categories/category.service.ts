// Import Injectable for DI registration
import { Injectable } from '@angular/core';
// HttpClient for making REST API calls to the NestJS backend
import { HttpClient } from '@angular/common/http';
// BehaviorSubject holds the latest categories list and emits updates to subscribers
import { BehaviorSubject } from 'rxjs';
// tap operator performs side effects (updating the BehaviorSubject) within the observable pipeline
import { tap } from 'rxjs/operators';
// Category-related type definitions and DTOs
import { Category, CreateCategoryDto } from '../../core/models/category.model';
// Environment config provides the base API URL
import { environment } from '../../../environments/environment';

// CategoryService manages CRUD operations for user-defined categories.
// Categories are displayed in the sidebar and used as organizational labels
// for tasks and wishlist items. The service maintains a local cache via
// categories$ BehaviorSubject that the sidebar and form dropdowns subscribe to.
@Injectable({ providedIn: 'root' }) // Singleton — shared by sidebar, category-manager, task-form, and wishlist-form
export class CategoryService {
  // Base URL for the categories REST endpoints on the NestJS backend
  private readonly base = `${environment.apiUrl}/categories`;
  // BehaviorSubject acting as a local cache of the user's categories
  categories$ = new BehaviorSubject<Category[]>([]);

  constructor(private http: HttpClient) {} // Inject HttpClient for API communication

  // Fetch all categories for the current user and update the local cache.
  // Called by the sidebar on initialization to populate the category list.
  loadAll() {
    return this.http.get<Category[]>(this.base).pipe(tap((c) => this.categories$.next(c)));
  }

  // Create a new category and append it to the local cache
  create(dto: CreateCategoryDto) {
    return this.http.post<Category>(this.base, dto).pipe(
      tap((c) => this.categories$.next([...this.categories$.value, c])), // Append to end (alphabetical order is not enforced client-side)
    );
  }

  // Update an existing category (PATCH) and replace it in the local cache
  update(id: string, dto: Partial<CreateCategoryDto>) {
    return this.http.patch<Category>(`${this.base}/${id}`, dto).pipe(
      tap((updated) => this.categories$.next(this.categories$.value.map((c) => c.id === id ? updated : c))),
    );
  }

  // Delete a category and remove it from the local cache.
  // Tasks/wishlist items that referenced this category will have their categoryId set to null by the backend.
  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.categories$.next(this.categories$.value.filter((c) => c.id !== id))),
    );
  }
}
