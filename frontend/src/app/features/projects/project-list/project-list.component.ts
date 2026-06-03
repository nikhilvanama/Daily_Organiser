import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProjectService } from '../project.service';
import { PAYMENT_STATUSES, PaymentStatus, Project, PROJECT_STATUSES, ProjectStatus } from '../../../core/models/project.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ProjectFormComponent } from '../project-form/project-form.component';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [RouterLink, ModalComponent, ProjectFormComponent],
  template: `
    <div class="page animate-in">
      <div class="page-header">
        <div>
          <h2>Projects</h2>
          <p>Freelance pipeline — leads, quotes, work, payments</p>
        </div>
        <button class="btn-primary" (click)="openAdd()">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>

      <!-- Stats summary -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ projects().length }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ countByStatus('IN_PROGRESS') }}</span>
          <span class="stat-label">In progress</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ formatMoney(outstanding()) }}</span>
          <span class="stat-label">Outstanding</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ formatMoney(receivedThisMonth()) }}</span>
          <span class="stat-label">This month</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ countByStatus('QUOTED') }}</span>
          <span class="stat-label">Pending quotes</span>
        </div>
      </div>

      <!-- Status filter chips (LEAD intentionally hidden to keep the bar focused) -->
      <div class="chip-row">
        <button class="chip" [class.active]="!filterStatus()" (click)="filterStatus.set(null)">All</button>
        @for (s of filterableStatuses; track s.value) {
          <button class="chip" [class.active]="filterStatus() === s.value" [style.--chip-color]="s.color" (click)="filterStatus.set(s.value)">
            {{ s.label }} <span class="chip-count">{{ countByStatus(s.value) }}</span>
          </button>
        }
      </div>

      @if (filtered().length === 0) {
        <div class="card empty-card">
          @if (projects().length === 0) {
            <p>No projects yet. Create your first one!</p>
          } @else {
            <p>No projects match this filter.</p>
          }
        </div>
      } @else {
        <div class="project-list">
          @for (p of filtered(); track p.id) {
            <a [routerLink]="['/projects', p.id]" class="project-row" [class.overdue]="p.isOverdue">
              <div class="pill-stack">
                <span class="status-pill" [style.background]="statusColor(p.status) + '22'" [style.color]="statusColor(p.status)">
                  {{ statusLabel(p.status) }}
                </span>
                @if (!p.isSelf) {
                  <span class="status-pill payment" [style.background]="paymentColor(p.paymentStatus) + '22'" [style.color]="paymentColor(p.paymentStatus)">
                    {{ paymentLabel(p.paymentStatus) }}
                  </span>
                } @else {
                  <span class="status-pill self">🏠 Self</span>
                }
              </div>
              <div class="proj-main">
                <div class="proj-top">
                  <span class="proj-title">{{ p.title }}</span>
                  @if (p.clientName) { <span class="proj-client">· {{ p.clientName }}</span> }
                </div>
                <div class="proj-meta">
                  @if (p.deadline) {
                    <span class="meta-item" [class.overdue-text]="p.isOverdue">
                      📅 {{ p.deadline }}
                      @if (p.isOverdue) { · overdue }
                      @else { · {{ daysUntil(p.deadline) }} }
                    </span>
                  }
                  @if (!p.isSelf) {
                    @if (p.quotedAmount !== null && p.quotedAmount > 0) {
                      <span class="meta-item">💰 {{ formatMoney(p.quotedAmount, p.currency) }}</span>
                    }
                    @if (p.totalReceived > 0) {
                      <span class="meta-item received">✓ {{ formatMoney(p.totalReceived, p.currency) }} received</span>
                    }
                    @if (p.balance > 0 && p.status !== 'LOST') {
                      <span class="meta-item balance">⌛ {{ formatMoney(p.balance, p.currency) }} pending</span>
                    }
                  }
                </div>
              </div>
              @if (p.status === 'IN_PROGRESS' || p.progress > 0) {
                <div class="proj-progress">
                  <div class="prog-bar"><div class="prog-fill" [style.width.%]="p.progress"></div></div>
                  <span class="prog-pct">{{ p.progress }}%</span>
                </div>
              }
            </a>
          }
        </div>
      }
    </div>

    <app-modal [isOpen]="showForm" title="New Project" (close)="closeForm()" maxWidth="640px">
      @if (showForm) {
        <app-project-form (saved)="onSaved()" (cancelled)="closeForm()" />
      }
    </app-modal>
  `,
  styles: [`
    .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 2px; }
    .stat-num { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); line-height: 1.1; }
    .stat-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

    .chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      padding: 6px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 500;
      border: 1.5px solid var(--border); background: transparent; color: var(--text-secondary);
      cursor: pointer; transition: all 0.15s; font-family: inherit;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .chip:hover { border-color: var(--text-muted); }
    .chip.active { background: var(--chip-color, var(--accent)); color: #fff; border-color: transparent; }
    .chip-count { font-size: 0.7rem; opacity: 0.8; }

    .project-list { display: flex; flex-direction: column; gap: 6px; }
    .project-row {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius);
      text-decoration: none; color: inherit; transition: all 0.15s;
    }
    .project-row:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: var(--shadow-md); }
    .project-row.overdue { border-color: rgba(239, 68, 68, 0.4); }

    /* Two pills stacked vertically: project status on top, payment (or self) below */
    .pill-stack { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; align-items: flex-start; min-width: 96px; }
    .status-pill { font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; white-space: nowrap; }
    .status-pill.payment { font-size: 0.66rem; padding: 3px 8px; }
    .status-pill.self { font-size: 0.66rem; padding: 3px 8px; background: var(--bg-hover); color: var(--text-muted); }
    .proj-main { flex: 1; min-width: 0; }
    .proj-top { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
    .proj-title { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); }
    .proj-client { font-size: 0.82rem; color: var(--text-secondary); }
    .proj-meta { display: flex; gap: 14px; font-size: 0.74rem; color: var(--text-muted); margin-top: 4px; flex-wrap: wrap; }
    .meta-item.received { color: var(--accent); }
    .meta-item.balance { color: #f97316; }
    .meta-item.overdue-text { color: #ef4444; font-weight: 600; }

    .proj-progress { display: flex; align-items: center; gap: 8px; width: 130px; flex-shrink: 0; }
    .prog-bar { flex: 1; height: 6px; background: var(--bg-secondary); border-radius: 99px; overflow: hidden; }
    .prog-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.4s; }
    .prog-pct { font-size: 0.75rem; font-weight: 600; color: var(--text-primary); width: 32px; text-align: right; }

    .empty-card { padding: 2.5rem 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .proj-progress { display: none; }
    }
  `],
})
export class ProjectListComponent implements OnInit, OnDestroy {
  private projectService = inject(ProjectService);
  private toast = inject(ToastService);
  private sub: Subscription | null = null;

  projects = signal<Project[]>([]);
  statuses = PROJECT_STATUSES;
  // Filter bar omits LEAD by design — leads sit at the top by default and clutter the chips row.
  filterableStatuses = PROJECT_STATUSES.filter((s) => s.value !== 'LEAD');
  filterStatus = signal<ProjectStatus | null>(null);
  showForm = false;

  filtered = computed(() => {
    const s = this.filterStatus();
    return s ? this.projects().filter((p) => p.status === s) : this.projects();
  });

  // Outstanding = pending balance across NON-self projects that aren't lost or already fully paid.
  outstanding = computed(() =>
    this.projects()
      .filter((p) => !p.isSelf && p.status !== 'LOST' && p.paymentStatus !== 'PAID')
      .reduce((sum, p) => sum + (p.balance ?? 0), 0)
  );

  receivedThisMonth = computed(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.projects()
      .flatMap((p) => p.payments)
      .filter((pmt) => pmt.date.startsWith(ym))
      .reduce((sum, pmt) => sum + Number(pmt.amount || 0), 0);
  });

  countByStatus(s: ProjectStatus): number {
    return this.projects().filter((p) => p.status === s).length;
  }

  ngOnInit() {
    this.sub = this.projectService.projects$.subscribe((list) => this.projects.set(list));
    this.projectService.loadAll().subscribe();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  openAdd() { this.showForm = true; }
  closeForm() { this.showForm = false; }
  onSaved() { this.closeForm(); this.toast.success('Project created'); }

  statusColor(s: ProjectStatus): string { return PROJECT_STATUSES.find((x) => x.value === s)?.color ?? '#94a3b8'; }
  statusLabel(s: ProjectStatus): string { return PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s; }
  paymentColor(s: PaymentStatus): string { return PAYMENT_STATUSES.find((x) => x.value === s)?.color ?? '#94a3b8'; }
  paymentLabel(s: PaymentStatus): string { return PAYMENT_STATUSES.find((x) => x.value === s)?.label ?? s; }

  formatMoney(n: number, currency = 'INR'): string {
    if (n === 0) return `${this.currencySymbol(currency)}0`;
    return `${this.currencySymbol(currency)}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  currencySymbol(c: string): string {
    switch (c) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return c + ' ';
    }
  }

  daysUntil(date: string): string {
    const target = new Date(date + 'T00:00:00').getTime();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((target - today.getTime()) / 86400000);
    if (days === 0) return 'due today';
    if (days === 1) return 'in 1 day';
    if (days < 0) return `${-days} days late`;
    return `in ${days} days`;
  }
}
