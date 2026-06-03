import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectService } from '../project.service';
import { Project, ProjectPayment, PROJECT_STATUSES, ProjectStatus } from '../../../core/models/project.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, ModalComponent, ProjectFormComponent, ConfirmDialogComponent],
  template: `
    <div class="page animate-in">
      @if (project()) {
        <div class="detail-header">
          <a routerLink="/projects" class="back-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            All projects
          </a>
          <div class="actions">
            <button class="btn-ghost sm" (click)="showForm = true">Edit</button>
            <button class="btn-ghost sm danger" (click)="showDelete = true">Delete</button>
          </div>
        </div>

        <div class="title-block">
          <h1>{{ project()!.title }}</h1>
          <div class="title-meta">
            <span class="status-pill"
              [style.background]="statusColor() + '22'"
              [style.color]="statusColor()">{{ statusLabel() }}</span>
            @if (project()!.clientName) { <span class="muted">· {{ project()!.clientName }}</span> }
            @if (project()!.clientContact) { <span class="muted">· {{ project()!.clientContact }}</span> }
            @if (project()!.isOverdue) { <span class="overdue-pill">⚠ Overdue</span> }
          </div>
        </div>

        <!-- Quick status & progress controls -->
        <div class="card quick-controls">
          <div class="control-block">
            <label class="label">Status</label>
            <select class="input" [value]="project()!.status" (change)="updateStatus($any($event.target).value)">
              @for (s of statuses; track s.value) {
                <option [value]="s.value">{{ s.label }}</option>
              }
            </select>
          </div>
          <div class="control-block">
            <label class="label">Progress · {{ project()!.progress }}%</label>
            <input type="range" min="0" max="100" step="5" [value]="project()!.progress" (input)="onProgressInput($any($event.target).value)" (change)="updateProgress($any($event.target).value)" />
          </div>
        </div>

        <div class="grid-2">
          <!-- LEFT: project details -->
          <div class="card section">
            <h3>Details</h3>
            @if (project()!.description) {
              <p class="desc">{{ project()!.description }}</p>
            } @else {
              <p class="muted">No description yet.</p>
            }

            <div class="kv-grid">
              @if (project()!.quotedAmount !== null) {
                <div><span class="muted">Quoted</span> <strong>{{ formatMoney(project()!.quotedAmount!, project()!.currency) }}</strong></div>
              }
              @if (project()!.startDate) {
                <div><span class="muted">Start</span> <strong>{{ project()!.startDate }}</strong></div>
              }
              @if (project()!.deadline) {
                <div><span class="muted">Deadline</span> <strong [class.overdue-text]="project()!.isOverdue">{{ project()!.deadline }}</strong></div>
              }
              @if (project()!.deliveredAt) {
                <div><span class="muted">Delivered</span> <strong>{{ formatDate(project()!.deliveredAt!) }}</strong></div>
              }
            </div>

            @if (project()!.portfolioLinks.length > 0) {
              <h4>Portfolio / samples</h4>
              <div class="links-list">
                @for (link of project()!.portfolioLinks; track $index) {
                  <a [href]="link" target="_blank" rel="noopener" class="link-item">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    {{ shortenUrl(link) }}
                  </a>
                }
              </div>
            }
          </div>

          <!-- RIGHT: payments -->
          <div class="card section payments-section">
            <div class="payments-header">
              <h3>Payments</h3>
              <div class="totals">
                <div><span class="muted">Received</span> <strong class="received">{{ formatMoney(project()!.totalReceived, project()!.currency) }}</strong></div>
                @if (project()!.quotedAmount !== null && project()!.quotedAmount! > 0) {
                  <div><span class="muted">Balance</span> <strong [class.balance]="project()!.balance > 0">{{ formatMoney(project()!.balance, project()!.currency) }}</strong></div>
                }
              </div>
            </div>

            <form [formGroup]="paymentForm" (ngSubmit)="addPayment()" class="payment-form">
              <div class="pay-row">
                <input class="input" type="number" min="0" step="0.01" formControlName="amount" placeholder="Amount" />
                <input class="input" type="date" formControlName="date" />
              </div>
              <div class="pay-row">
                <input class="input" formControlName="note" placeholder="Note (Advance / Milestone / Final)" />
                <input class="input" formControlName="method" placeholder="Method (UPI/Bank/Cash)" />
              </div>
              <button type="submit" class="btn-primary sm" [disabled]="paymentForm.invalid || addingPayment">
                {{ addingPayment ? 'Adding…' : '+ Record payment' }}
              </button>
            </form>

            @if (project()!.payments.length === 0) {
              <p class="muted small">No payments recorded yet.</p>
            } @else {
              <ul class="payments-list">
                @for (pay of project()!.payments; track pay.id) {
                  <li class="payment-row">
                    <div class="pay-main">
                      <span class="pay-amount">{{ formatMoney(pay.amount, pay.currency) }}</span>
                      <span class="pay-date">{{ pay.date }}</span>
                    </div>
                    <div class="pay-tags">
                      @if (pay.note) { <span class="pay-tag">{{ pay.note }}</span> }
                      @if (pay.method) { <span class="pay-tag method">{{ pay.method }}</span> }
                    </div>
                    <button class="icon-btn danger" (click)="askRemovePayment(pay)" title="Delete payment">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      } @else if (!loading()) {
        <div class="card empty-card">
          <p>Project not found.</p>
          <a routerLink="/projects" class="link">← Back to projects</a>
        </div>
      }
    </div>

    <app-modal [isOpen]="showForm" title="Edit Project" (close)="showForm = false" maxWidth="640px">
      @if (showForm && project()) {
        <app-project-form [project]="project()" (saved)="onSaved()" (cancelled)="showForm = false" />
      }
    </app-modal>

    <app-confirm-dialog
      [isOpen]="showDelete"
      title="Delete project"
      [message]="'Delete &quot;' + (project()?.title ?? '') + '&quot; and all its payments? This cannot be undone.'"
      confirmText="Delete"
      (confirmed)="confirmDelete()"
      (cancelled)="showDelete = false" />

    <app-confirm-dialog
      [isOpen]="paymentToDelete !== null"
      title="Delete payment"
      [message]="paymentToDelete ? ('Delete ' + formatMoney(paymentToDelete.amount, paymentToDelete.currency) + ' payment from ' + paymentToDelete.date + '?') : ''"
      confirmText="Delete"
      (confirmed)="confirmRemovePayment()"
      (cancelled)="paymentToDelete = null" />
  `,
  styles: [`
    .detail-header { display: flex; justify-content: space-between; align-items: center; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--text-secondary); text-decoration: none; }
    .back-link:hover { color: var(--accent); }
    .actions { display: flex; gap: 8px; }
    .sm { font-size: 0.78rem; padding: 5px 10px; }
    .btn-ghost.danger { color: #ef4444; }
    .btn-ghost.danger:hover { background: rgba(239, 68, 68, 0.1); }

    .title-block { display: flex; flex-direction: column; gap: 6px; }
    .title-block h1 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .title-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.85rem; }
    .status-pill { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; }
    .overdue-pill { background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
    .muted { color: var(--text-muted); }
    .overdue-text { color: #ef4444; }
    .received { color: var(--accent); }
    .balance { color: #f97316; }

    .quick-controls { display: flex; gap: 1.5rem; padding: 1rem 1.25rem; align-items: center; flex-wrap: wrap; }
    .control-block { display: flex; flex-direction: column; gap: 4px; min-width: 200px; flex: 1; }
    .control-block input[type="range"] { width: 100%; }
    .label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .section { padding: 1.25rem 1.5rem; }
    .section h3 { font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem; }
    .section h4 { font-size: 0.85rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
    .desc { font-size: 0.9rem; color: var(--text-primary); line-height: 1.55; white-space: pre-wrap; margin: 0; }

    .kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-top: 1rem; font-size: 0.85rem; }
    .kv-grid > div { display: flex; flex-direction: column; gap: 2px; }

    .links-list { display: flex; flex-direction: column; gap: 4px; }
    .link-item { display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px; background: var(--bg-hover); border-radius: 6px; font-size: 0.82rem; color: var(--text-primary); text-decoration: none; max-width: 100%; }
    .link-item:hover { background: var(--bg-secondary); color: var(--accent); }

    .payments-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .payments-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .totals { display: flex; gap: 1rem; font-size: 0.85rem; }
    .totals strong { font-size: 1rem; }

    .payment-form { display: flex; flex-direction: column; gap: 6px; padding: 10px; background: var(--bg-hover); border-radius: 8px; }
    .pay-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .pay-row .input { font-size: 0.82rem; padding: 6px 8px; }
    .payment-form .btn-primary { align-self: flex-end; }

    .payments-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .payment-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; transition: background 0.1s; }
    .payment-row:hover { background: var(--bg-hover); }
    .pay-main { display: flex; flex-direction: column; gap: 2px; min-width: 100px; }
    .pay-amount { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
    .pay-date { font-size: 0.7rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .pay-tags { flex: 1; display: flex; gap: 6px; flex-wrap: wrap; }
    .pay-tag { font-size: 0.7rem; padding: 2px 6px; background: var(--bg-secondary); border-radius: 4px; color: var(--text-secondary); }
    .pay-tag.method { color: var(--accent); }
    .icon-btn { background: transparent; border: none; padding: 4px; border-radius: 6px; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn.danger:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

    .small { font-size: 0.82rem; }
    .empty-card { padding: 2rem 1.5rem; text-align: center; color: var(--text-muted); }
    .link { color: var(--accent); text-decoration: none; font-size: 0.85rem; }

    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
  `],
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private sub: Subscription | null = null;

  statuses = PROJECT_STATUSES;
  project = signal<Project | null>(null);
  loading = signal(true);
  showForm = false;
  showDelete = false;
  addingPayment = false;
  paymentToDelete: ProjectPayment | null = null;

  paymentForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    date: [this.todayKey(), Validators.required],
    note: [''],
    method: [''],
  });

  statusColor = computed(() => PROJECT_STATUSES.find((s) => s.value === this.project()?.status)?.color ?? '#94a3b8');
  statusLabel = computed(() => PROJECT_STATUSES.find((s) => s.value === this.project()?.status)?.label ?? this.project()?.status ?? '');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/projects']); return; }
    this.loadProject(id);
    // Keep in sync with cache updates from list mutations
    this.sub = this.projectService.projects$.subscribe((list) => {
      const found = list.find((p) => p.id === id);
      if (found) this.project.set(found);
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  private loadProject(id: string) {
    this.projectService.getOne(id).subscribe({
      next: (p) => { this.project.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  updateStatus(status: ProjectStatus) {
    const p = this.project();
    if (!p) return;
    this.projectService.update(p.id, { status }).subscribe({
      next: (u) => { this.project.set(u); this.toast.success('Status updated'); },
    });
  }

  // Show the live slider value without firing API calls on every tick.
  onProgressInput(value: string) {
    const p = this.project();
    if (p) this.project.set({ ...p, progress: Number(value) });
  }

  updateProgress(value: string) {
    const p = this.project();
    if (!p) return;
    const progress = Number(value);
    this.projectService.update(p.id, { progress }).subscribe({
      next: (u) => this.project.set(u),
    });
  }

  addPayment() {
    if (this.paymentForm.invalid) return;
    const p = this.project();
    if (!p) return;
    const raw = this.paymentForm.value;
    this.addingPayment = true;
    this.projectService.addPayment(p.id, {
      amount: Number(raw.amount),
      date: raw.date!,
      note: raw.note?.trim() || undefined,
      method: raw.method?.trim() || undefined,
    }).subscribe({
      next: (u) => {
        this.project.set(u);
        this.paymentForm.reset({ amount: null, date: this.todayKey(), note: '', method: '' });
        this.addingPayment = false;
        this.toast.success('Payment recorded');
      },
      error: () => { this.addingPayment = false; this.toast.error('Could not record payment'); },
    });
  }

  askRemovePayment(pay: ProjectPayment) { this.paymentToDelete = pay; }

  confirmRemovePayment() {
    const p = this.project();
    const pay = this.paymentToDelete;
    if (!p || !pay) return;
    this.projectService.removePayment(p.id, pay.id).subscribe({
      next: (u) => { this.project.set(u); this.toast.success('Payment deleted'); },
    });
    this.paymentToDelete = null;
  }

  onSaved() {
    this.showForm = false;
    const p = this.project();
    if (p) this.loadProject(p.id);
    this.toast.success('Project updated');
  }

  confirmDelete() {
    const p = this.project();
    if (!p) return;
    this.projectService.delete(p.id).subscribe({
      next: () => { this.toast.success('Project deleted'); this.router.navigate(['/projects']); },
    });
    this.showDelete = false;
  }

  // --- helpers ---

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString();
  }

  formatMoney(n: number, currency = 'INR'): string {
    return `${this.currencySymbol(currency)}${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  private currencySymbol(c: string): string {
    switch (c) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return c + ' ';
    }
  }

  shortenUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '…' : '') : '');
    } catch {
      return url.length > 50 ? url.slice(0, 50) + '…' : url;
    }
  }
}
