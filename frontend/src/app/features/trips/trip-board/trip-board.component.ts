import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TripService } from '../trip.service';
import { Trip, TripStatus, TRIP_COLUMNS } from '../../../core/models/trip.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TripFormComponent } from '../trip-form/trip-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-trip-board',
  standalone: true,
  imports: [ModalComponent, TripFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Trips</h2>
          <p>Save inspiration, plan the next one, look back on the last one</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add trip
        </button>
      </div>

      <div class="board-scroll">
        <div class="board">
          @for (col of columns; track col.value) {
            <div class="lane">
              <div class="lane-header" [style.--lane-color]="col.color">
                <div class="lane-title-block">
                  <span class="lane-dot"></span>
                  <h3>{{ col.label }}</h3>
                  <span class="lane-count">{{ tripsByStatus(col.value).length }}</span>
                </div>
                <button class="lane-add" (click)="openAddInColumn(col.value)" title="Add to {{ col.label }}">+</button>
              </div>
              <p class="lane-tagline">{{ col.tagline }}</p>

              <div class="lane-cards"
                   [class.drop-target]="draggingId() && draggingOver() === col.value"
                   (dragover)="onDragOver($event, col.value)"
                   (dragleave)="onDragLeave(col.value)"
                   (drop)="onDrop($event, col.value)">
                @if (tripsByStatus(col.value).length === 0) {
                  <div class="lane-empty">Drop trips here or click + above.</div>
                }
                @for (t of tripsByStatus(col.value); track t.id) {
                  <div class="trip-card"
                       [class.dragging]="draggingId() === t.id"
                       draggable="true"
                       (dragstart)="onDragStart($event, t)"
                       (dragend)="onDragEnd()"
                       (click)="openEdit(t)">
                    <div class="card-top">
                      <span class="card-title">{{ t.title }}</span>
                      @if (t.destination) { <span class="card-dest">📍 {{ t.destination }}</span> }
                    </div>

                    @if (t.startDate) {
                      <div class="card-dates">
                        <span>🗓 {{ formatDate(t.startDate) }}{{ t.endDate && t.endDate !== t.startDate ? ' → ' + formatDate(t.endDate) : '' }}</span>
                        <span class="card-pill">{{ t.startDate.slice(0, 4) }}</span>
                      </div>
                    }

                    <div class="card-meta">
                      @if (t.companions) { <span>👥 {{ t.companions }}</span> }
                      @if (t.budget !== null && t.budget > 0) { <span>{{ formatMoney(t.budget, t.currency) }}</span> }
                      @if (t.references.length > 0) { <span>🔗 {{ t.references.length }}</span> }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <app-modal [isOpen]="showForm" [title]="editing ? 'Edit trip' : 'New trip'" (close)="closeForm()" maxWidth="640px">
      @if (showForm) {
        <app-trip-form
          [trip]="editing"
          [defaultStatus]="formDefaultStatus"
          (saved)="onSaved()"
          (cancelled)="closeForm()"
          (deleted)="askDeleteEditing()" />
      }
    </app-modal>

    <app-confirm-dialog
      [isOpen]="!!deletingTrip"
      title="Delete trip"
      [message]="deletingTrip ? ('Delete &quot;' + deletingTrip.title + '&quot;?' + (deletingTrip.taskId ? ' (will also remove from My Plans + Calendar)' : '')) : ''"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="deletingTrip = null" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .page { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

    /* Board fills remaining height; scrolls in both axes for overflow */
    .board-scroll { flex: 1; overflow: auto; min-height: 0; padding-bottom: 1rem; }
    .board { display: grid; grid-template-columns: repeat(4, minmax(260px, 1fr)); gap: 0.75rem; min-width: 1080px; height: 100%; }

    .lane {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; overflow: hidden;
    }
    .lane-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .lane-title-block { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .lane-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lane-color); flex-shrink: 0; }
    .lane-header h3 { font-size: 0.88rem; font-weight: 600; margin: 0; }
    .lane-count { font-size: 0.7rem; color: var(--text-muted); background: var(--bg-hover); padding: 1px 8px; border-radius: 99px; font-weight: 600; }
    .lane-add {
      width: 24px; height: 24px; border-radius: 6px; border: 1px dashed var(--border);
      background: transparent; color: var(--text-muted); font-size: 1rem; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.15s;
    }
    .lane-add:hover { border-color: var(--lane-color); color: var(--lane-color); }
    .lane-tagline { font-size: 0.7rem; color: var(--text-muted); margin: 0 0 0.25rem; padding-left: 14px; }
    .lane-cards { display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; min-height: 0; }
    .lane-empty { padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.78rem; border: 1px dashed var(--border); border-radius: 8px; }

    .trip-card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 12px; cursor: grab; transition: all 0.15s;
      display: flex; flex-direction: column; gap: 6px;
    }
    .trip-card:active { cursor: grabbing; }
    .trip-card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .trip-card.dragging { opacity: 0.4; transform: rotate(2deg); cursor: grabbing; }
    .card-top { display: flex; flex-direction: column; gap: 2px; }
    .card-title { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .card-dest { font-size: 0.74rem; color: var(--text-secondary); }
    .card-dates { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .card-pill { font-size: 0.65rem; color: var(--text-muted); background: var(--bg-hover); padding: 1px 6px; border-radius: 4px; font-weight: 600; }
    .card-meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.7rem; color: var(--text-muted); }

    /* Lane visual states for drag-and-drop */
    .lane-cards { min-height: 60px; padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.15s, outline-color 0.15s; outline: 2px dashed transparent; scrollbar-width: thin; }
    .lane-cards.drop-target { background: rgba(16, 185, 129, 0.08); outline-color: rgba(16, 185, 129, 0.45); }

    @media (max-width: 900px) {
      .board { grid-template-columns: repeat(4, 280px); }
    }
  `],
})
export class TripBoardComponent implements OnInit, OnDestroy {
  private tripService = inject(TripService);
  private toast = inject(ToastService);
  private sub: Subscription | null = null;

  trips = signal<Trip[]>([]);
  columns = TRIP_COLUMNS;
  showForm = false;
  editing: Trip | null = null;
  formDefaultStatus: TripStatus | null = null;
  deletingTrip: Trip | null = null;

  // Drag-and-drop state. draggingId = the card being dragged, draggingOver = the lane
  // currently underneath the cursor. Used for visual feedback only.
  draggingId = signal<string | null>(null);
  draggingOver = signal<TripStatus | null>(null);

  ngOnInit() {
    this.sub = this.tripService.trips$.subscribe((t) => this.trips.set(t));
    this.tripService.loadAll().subscribe();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  tripsByStatus(status: TripStatus): Trip[] {
    const filtered = this.trips().filter((t) => t.status === status);
    if (status === 'BUCKET') {
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (status === 'VISITED') {
      return filtered.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return b.startDate.localeCompare(a.startDate); // newest first
      });
    }
    // Planning / Booked: nearest upcoming date first, nulls last
    return filtered.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    });
  }

  openAdd() {
    this.editing = null;
    this.formDefaultStatus = null;
    this.showForm = true;
  }

  openAddInColumn(status: TripStatus) {
    this.editing = null;
    this.formDefaultStatus = status;
    this.showForm = true;
  }

  openEdit(t: Trip) {
    this.editing = t;
    this.formDefaultStatus = null;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editing = null;
    this.formDefaultStatus = null;
  }

  onSaved() {
    this.closeForm();
    this.toast.success('Saved');
  }

  // --- Drag and drop (HTML5 native — no extra library) ---

  onDragStart(ev: DragEvent, t: Trip) {
    this.draggingId.set(t.id);
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', t.id);
    }
  }

  onDragEnd() {
    this.draggingId.set(null);
    this.draggingOver.set(null);
  }

  onDragOver(ev: DragEvent, status: TripStatus) {
    // preventDefault is REQUIRED to mark the element as a valid drop target.
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.draggingOver.set(status);
  }

  onDragLeave(status: TripStatus) {
    if (this.draggingOver() === status) this.draggingOver.set(null);
  }

  onDrop(ev: DragEvent, targetStatus: TripStatus) {
    ev.preventDefault();
    const id = ev.dataTransfer?.getData('text/plain') || this.draggingId();
    this.draggingId.set(null);
    this.draggingOver.set(null);
    if (!id) return;
    const trip = this.trips().find((t) => t.id === id);
    if (!trip || trip.status === targetStatus) return;
    // Friendly nudge when booking without dates set yet.
    if (targetStatus === 'BOOKED' && !trip.startDate) {
      this.toast.info('Moved to Booked — add dates to see it on your calendar');
    }
    this.tripService.update(id, { status: targetStatus }).subscribe();
  }

  // --- Delete (triggered from inside the edit form) ---

  askDeleteEditing() {
    if (this.editing) this.deletingTrip = this.editing;
  }

  confirmDelete() {
    if (!this.deletingTrip) return;
    const id = this.deletingTrip.id;
    this.tripService.delete(id).subscribe({
      next: () => this.toast.success('Trip deleted'),
    });
    this.deletingTrip = null;
    // Close the edit modal too if it's still open for the same trip.
    if (this.editing?.id === id) this.closeForm();
  }

  // --- helpers ---

  formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  durationDays(t: Trip): number | null {
    if (!t.startDate || !t.endDate) return null;
    const s = new Date(t.startDate + 'T00:00:00').getTime();
    const e = new Date(t.endDate + 'T00:00:00').getTime();
    const d = Math.round((e - s) / 86400000) + 1;
    return d > 0 ? d : null;
  }

  formatMoney(n: number, currency = 'INR'): string {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency + ' ';
    return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
}
