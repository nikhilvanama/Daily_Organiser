import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { BuyListService } from '../buy-list.service';
import { BUY_COLUMNS, BuyItem, BuyStatus, URGENCY_OPTIONS } from '../../../core/models/buy-item.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { BuyListFormComponent } from '../buy-list-form/buy-list-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-buy-list-board',
  standalone: true,
  imports: [ModalComponent, BuyListFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Buy List</h2>
          <p>Things you'll forget the moment you walk into the shop</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add item
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
                  <span class="lane-count">{{ itemsByStatus(col.value).length }}</span>
                </div>
                <button class="lane-add" (click)="openAddInColumn(col.value)" title="Add to {{ col.label }}">+</button>
              </div>
              <p class="lane-tagline">{{ col.tagline }}</p>

              <div class="lane-cards"
                   [class.drop-target]="draggingId() && draggingOver() === col.value"
                   (dragover)="onDragOver($event, col.value)"
                   (dragleave)="onDragLeave(col.value)"
                   (drop)="onDrop($event, col.value)">
                @if (itemsByStatus(col.value).length === 0) {
                  <div class="lane-empty">Drop items here or click + above.</div>
                }
                @for (i of itemsByStatus(col.value); track i.id) {
                  <div class="buy-card"
                       [class.dragging]="draggingId() === i.id"
                       draggable="true"
                       (dragstart)="onDragStart($event, i)"
                       (dragend)="onDragEnd()"
                       (click)="openEdit(i)">
                    <div class="card-top">
                      <span class="card-title">{{ i.name }}</span>
                      @if (i.category) { <span class="card-cat">{{ i.category }}</span> }
                    </div>

                    <div class="card-meta">
                      @if (i.estimatedPrice !== null && i.estimatedPrice > 0 && i.status !== 'BOUGHT') {
                        <span>~ {{ formatMoney(i.estimatedPrice, i.currency) }}</span>
                      }
                      @if (i.status === 'BOUGHT' && i.boughtPrice !== null && i.boughtPrice > 0) {
                        <span class="paid">✓ {{ formatMoney(i.boughtPrice, i.currency) }}</span>
                      }
                      @if (i.store) { <span>🏬 {{ i.store }}</span> }
                      @if (i.status !== 'BOUGHT' && i.status !== 'SKIPPED') {
                        <span class="urgency-pill" [style.background]="urgencyColor(i.urgency) + '22'" [style.color]="urgencyColor(i.urgency)">
                          {{ i.urgency }}
                        </span>
                      }
                      @if (i.link) {
                        <a class="card-link" [href]="i.link" target="_blank" rel="noopener" (click)="$event.stopPropagation()" title="Open product link">🔗</a>
                      }
                    </div>

                    @if (i.status === 'BOUGHT' && i.boughtAt) {
                      <div class="bought-date">Bought {{ formatDate(i.boughtAt) }}</div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <app-modal [isOpen]="showForm" [title]="editing ? 'Edit item' : 'New item'" (close)="closeForm()" maxWidth="560px">
      @if (showForm) {
        <app-buy-list-form
          [item]="editing"
          [defaultStatus]="formDefaultStatus"
          (saved)="onSaved()"
          (cancelled)="closeForm()"
          (deleted)="askDeleteEditing()" />
      }
    </app-modal>

    <app-confirm-dialog
      [isOpen]="!!deletingItem"
      title="Delete item"
      [message]="deletingItem ? ('Delete &quot;' + deletingItem.name + '&quot;?') : ''"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="deletingItem = null" />
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .page { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

    .board-scroll { flex: 1; overflow: auto; min-height: 0; padding-bottom: 1rem; }
    .board { display: grid; grid-template-columns: repeat(4, minmax(240px, 1fr)); gap: 0.75rem; min-width: 1000px; height: 100%; }

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

    .buy-card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 12px; cursor: grab; transition: all 0.15s;
      display: flex; flex-direction: column; gap: 6px;
    }
    .buy-card:active { cursor: grabbing; }
    .buy-card:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .buy-card.dragging { opacity: 0.4; transform: rotate(2deg); cursor: grabbing; }
    .card-top { display: flex; flex-direction: column; gap: 2px; }
    .card-title { font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
    .card-cat { font-size: 0.7rem; color: var(--text-muted); }

    .card-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 0.74rem; color: var(--text-secondary); }
    .card-meta .paid { color: var(--accent); font-weight: 600; }
    .card-link { font-size: 0.85rem; text-decoration: none; padding: 1px 4px; border-radius: 4px; color: var(--text-muted); }
    .card-link:hover { background: var(--bg-hover); color: var(--accent); }
    .urgency-pill { font-size: 0.65rem; font-weight: 600; padding: 1px 7px; border-radius: 4px; }
    .bought-date { font-size: 0.7rem; color: var(--text-muted); }

    /* Lane visual states for drag-and-drop */
    .lane-cards { min-height: 60px; padding: 4px; margin: -4px; border-radius: 8px; transition: background 0.15s, outline-color 0.15s; outline: 2px dashed transparent; scrollbar-width: thin; }
    .lane-cards.drop-target { background: rgba(16, 185, 129, 0.08); outline-color: rgba(16, 185, 129, 0.45); }
  `],
})
export class BuyListBoardComponent implements OnInit, OnDestroy {
  private buyService = inject(BuyListService);
  private toast = inject(ToastService);
  private sub: Subscription | null = null;

  items = signal<BuyItem[]>([]);
  columns = BUY_COLUMNS;
  showForm = false;
  editing: BuyItem | null = null;
  formDefaultStatus: BuyStatus | null = null;
  deletingItem: BuyItem | null = null;

  // Drag-and-drop state (visual feedback only)
  draggingId = signal<string | null>(null);
  draggingOver = signal<BuyStatus | null>(null);

  ngOnInit() {
    this.sub = this.buyService.items$.subscribe((i) => this.items.set(i));
    this.buyService.loadAll().subscribe();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  itemsByStatus(status: BuyStatus): BuyItem[] {
    return this.items().filter((i) => i.status === status);
  }

  openAdd() { this.editing = null; this.formDefaultStatus = null; this.showForm = true; }
  openAddInColumn(status: BuyStatus) { this.editing = null; this.formDefaultStatus = status; this.showForm = true; }
  openEdit(i: BuyItem) { this.editing = i; this.formDefaultStatus = null; this.showForm = true; }
  closeForm() { this.showForm = false; this.editing = null; this.formDefaultStatus = null; }
  onSaved() { this.closeForm(); this.toast.success('Saved'); }

  // --- Drag and drop (HTML5 native) ---

  onDragStart(ev: DragEvent, i: BuyItem) {
    this.draggingId.set(i.id);
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', i.id);
    }
  }

  onDragEnd() {
    this.draggingId.set(null);
    this.draggingOver.set(null);
  }

  onDragOver(ev: DragEvent, status: BuyStatus) {
    ev.preventDefault(); // required for the element to count as a drop target
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
    this.draggingOver.set(status);
  }

  onDragLeave(status: BuyStatus) {
    if (this.draggingOver() === status) this.draggingOver.set(null);
  }

  onDrop(ev: DragEvent, targetStatus: BuyStatus) {
    ev.preventDefault();
    const id = ev.dataTransfer?.getData('text/plain') || this.draggingId();
    this.draggingId.set(null);
    this.draggingOver.set(null);
    if (!id) return;
    const item = this.items().find((i) => i.id === id);
    if (!item || item.status === targetStatus) return;
    this.buyService.update(id, { status: targetStatus }).subscribe();
  }

  // --- Delete (triggered from inside the edit form) ---

  askDeleteEditing() {
    if (this.editing) this.deletingItem = this.editing;
  }

  confirmDelete() {
    if (!this.deletingItem) return;
    const id = this.deletingItem.id;
    this.buyService.delete(id).subscribe({
      next: () => this.toast.success('Removed'),
    });
    this.deletingItem = null;
    if (this.editing?.id === id) this.closeForm();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatMoney(n: number, currency = 'INR'): string {
    const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency + ' ';
    return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  urgencyColor(u: BuyItem['urgency']): string {
    return URGENCY_OPTIONS.find((o) => o.value === u)?.color ?? '#94a3b8';
  }
}
