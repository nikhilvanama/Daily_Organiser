import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectService } from '../project.service';
import { PAYMENT_STATUSES, Project, ProjectPayment, PROJECT_STATUSES, PROJECT_TYPES } from '../../../core/models/project.model';
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
            @if (project()!.isSelf) {
              <span class="status-pill self">🏠 Self project</span>
            }
            @if (project()!.clientName) { <span class="muted">{{ project()!.clientName }}</span> }
            @if (project()!.clientContact) { <span class="muted">· {{ project()!.clientContact }}</span> }
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
              <div>
                <span class="muted">Project status</span>
                <span class="status-pill"
                  [style.background]="statusColor() + '22'"
                  [style.color]="statusColor()">{{ statusLabel() }}</span>
              </div>
              <!-- Only render Payment status if non-self AND we have a real status value -->
              @if (!project()!.isSelf && project()!.paymentStatus && project()!.paymentStatus !== 'NOT_APPLICABLE') {
                <div>
                  <span class="muted">Payment status</span>
                  <span class="status-pill"
                    [style.background]="paymentColor() + '22'"
                    [style.color]="paymentColor()">{{ paymentLabel() }}</span>
                </div>
              }
              @if (project()!.projectType) {
                <div><span class="muted">Type</span> <strong>{{ projectTypeLabel(project()!.projectType!) }}</strong></div>
              }
              <!-- Only render Quoted if it's actually a non-zero positive number -->
              @if (!project()!.isSelf && project()!.quotedAmount && project()!.quotedAmount! > 0) {
                <div><span class="muted">Quoted</span> <strong>{{ formatMoney(project()!.quotedAmount!, project()!.currency) }}</strong></div>
              }
              <!-- Strict truthiness — empty strings shouldn't paint an empty value row -->
              @if (project()!.startDate) {
                <div><span class="muted">Start</span> <strong>{{ project()!.startDate }}</strong></div>
              }
              @if (project()!.deadline) {
                <div><span class="muted">End date</span> <strong>{{ project()!.deadline }}</strong></div>
              }
              @if (project()!.deliveredAt) {
                <div><span class="muted">Delivered</span> <strong>{{ formatDate(project()!.deliveredAt!) }}</strong></div>
              }
            </div>

            <!-- Friendly nudge when the user hasn't filled in any payment/quote info yet -->
            @if (!project()!.isSelf
                && !project()!.quotedAmount
                && (!project()!.paymentStatus || project()!.paymentStatus === 'PENDING' || project()!.paymentStatus === 'NOT_INVOICED')
                && project()!.payments.length === 0) {
              <div class="empty-hint">
                💰 No quote or payment info yet — click <strong>Edit</strong> (top-right) to add the quoted amount and payment status, then record payments on the right.
              </div>
            }

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

          <!-- RIGHT: payments (hidden entirely for self projects) -->
          @if (!project()!.isSelf) {
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
          }
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
    .status-pill.self { background: var(--bg-hover); color: var(--text-muted); }
    .overdue-pill { background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 0.72rem; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
    .muted { color: var(--text-muted); }
    .overdue-text { color: #ef4444; }
    .received { color: var(--accent); }
    .balance { color: #f97316; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .section { padding: 1.25rem 1.5rem; }
    /* Section headings: bigger, weightier, with a subtle bottom rule so they read as
       card titles rather than just bold body text. */
    .section h3 {
      font-size: 1.15rem; font-weight: 700; margin: 0 0 1rem;
      padding-bottom: 0.5rem; border-bottom: 1px solid var(--border);
      color: var(--text-primary); letter-spacing: -0.01em;
    }
    .section h4 { font-size: 0.85rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text-secondary); }
    .desc { font-size: 0.9rem; color: var(--text-primary); line-height: 1.55; white-space: pre-wrap; margin: 0; }

    .kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem 1rem; margin-top: 1rem; font-size: 0.85rem; }
    .kv-grid > div { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .kv-grid .status-pill { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 6px; }

    .empty-hint {
      margin-top: 1rem; padding: 12px 14px;
      background: var(--bg-hover); border: 1px dashed var(--border); border-radius: 8px;
      font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;
    }
    .empty-hint strong { color: var(--text-primary); }

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

  // Map a stored projectType code (e.g. 'WEB_APP') to its human label ('Web application').
  // Falls back to the raw value so any future custom types still display something.
  projectTypeLabel(value: string): string {
    return PROJECT_TYPES.find((t) => t.value === value)?.label ?? value;
  }

  statusColor = computed(() => PROJECT_STATUSES.find((s) => s.value === this.project()?.status)?.color ?? '#94a3b8');
  statusLabel = computed(() => PROJECT_STATUSES.find((s) => s.value === this.project()?.status)?.label ?? this.project()?.status ?? '');
  paymentColor = computed(() => PAYMENT_STATUSES.find((p) => p.value === this.project()?.paymentStatus)?.color ?? '#94a3b8');
  paymentLabel = computed(() => PAYMENT_STATUSES.find((p) => p.value === this.project()?.paymentStatus)?.label ?? this.project()?.paymentStatus ?? '');

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
