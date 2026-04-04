// Import Injectable for DI registration
import { Injectable } from '@angular/core';
// HttpClient for REST API calls; HttpParams for building query strings
import { HttpClient, HttpParams } from '@angular/common/http';
// BehaviorSubject holds the latest wishlist items and emits updates to subscribers
import { BehaviorSubject } from 'rxjs';
// tap operator performs side effects (updating the BehaviorSubject) within the observable pipeline
import { tap } from 'rxjs/operators';
// WishlistItem-related type definitions and DTOs
import { WishlistItem, CreateWishlistItemDto, UpdateWishlistItemDto } from '../../core/models/wishlist-item.model';
// Environment config provides the base API URL
import { environment } from '../../../environments/environment';

// WishlistService manages all CRUD operations for the "Buy List" feature.
// It maintains a local cache via items$ BehaviorSubject so that the wishlist-list
// component reactively updates after any mutation (create, update, purchase, delete).
@Injectable({ providedIn: 'root' }) // Singleton — shared by wishlist-list and wishlist-form components
export class WishlistService {
  // Base URL for the wishlist REST endpoints on the NestJS backend
  private readonly base = `${environment.apiUrl}/wishlist`;
  // BehaviorSubject acting as a local cache of wishlist items
  items$ = new BehaviorSubject<WishlistItem[]>([]);

  constructor(private http: HttpClient) {} // Inject HttpClient for API communication

  // Fetch all wishlist items with optional filters (status, priority).
  // Query parameters are dynamically built from the filters object.
  loadAll(filters: Record<string, string> = {}) {
    let params = new HttpParams();
    // Add each non-empty filter as a query parameter (e.g., ?status=WANTED&priority=HIGH)
    Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    return this.http.get<WishlistItem[]>(this.base, { params }).pipe(
      tap((items) => this.items$.next(items)), // Update the local cache with server response
    );
  }

  // Fetch a single wishlist item by ID
  getOne(id: string) { return this.http.get<WishlistItem>(`${this.base}/${id}`); }

  // Create a new wishlist item and prepend it to the local cache (newest first)
  create(dto: CreateWishlistItemDto) {
    return this.http.post<WishlistItem>(this.base, dto).pipe(
      tap((item) => this.items$.next([item, ...this.items$.value])), // Add new item to the beginning
    );
  }

  // Update an existing wishlist item (PATCH) and replace it in the local cache
  update(id: string, dto: UpdateWishlistItemDto) {
    return this.http.patch<WishlistItem>(`${this.base}/${id}`, dto).pipe(
      tap((updated) => this.items$.next(this.items$.value.map((i) => i.id === id ? updated : i))),
    );
  }

  // Mark a wishlist item as purchased — the backend sets status to 'PURCHASED'
  // and records the purchasedAt timestamp. Updates the local cache.
  purchase(id: string) {
    return this.http.patch<WishlistItem>(`${this.base}/${id}/purchase`, {}).pipe(
      tap((updated) => this.items$.next(this.items$.value.map((i) => i.id === id ? updated : i))),
    );
  }

  // Delete a wishlist item and remove it from the local cache
  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`).pipe(
      tap(() => this.items$.next(this.items$.value.filter((i) => i.id !== id))),
    );
  }

  // Calculate the total value of items matching a given status (default: WANTED).
  // Only sums items with USD currency and a non-null price.
  // Used by the wishlist-list header to show "Total: $X.XX".
  getTotalValue(status: 'WANTED' | 'PURCHASED' = 'WANTED'): number {
    return this.items$.value
      .filter((i) => i.status === status && i.price !== null && i.currency === 'USD')
      .reduce((sum, i) => sum + (i.price ?? 0), 0);
  }
}
