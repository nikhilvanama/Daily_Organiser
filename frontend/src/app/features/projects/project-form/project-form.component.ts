import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../project.service';
import { PAYMENT_STATUSES, PROJECT_STATUSES, PaymentStatus, Project, ProjectStatus } from '../../../core/models/project.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="project-form">
      <!-- Self project: hide client/payment fields when checked -->
      <label class="self-toggle">
        <input type="checkbox" formControlName="isSelf" />
        <span>
          <strong>Self project</strong>
          <small>Personal work — no client or payment tracking</small>
        </span>
      </label>

      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="e.g. Wedding photo album design" />
      </div>

      @if (!form.value.isSelf) {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Client name</label>
            <input class="input" formControlName="clientName" placeholder="Client name" />
          </div>
          <div class="form-group">
            <label class="label">Contact</label>
            <input class="input" formControlName="clientContact" placeholder="Email / phone / handle" />
          </div>
        </div>
      }

      <div class="form-group">
        <label class="label">Description / scope</label>
        <textarea class="input" formControlName="description" rows="3" placeholder="Brief scope, deliverables, special notes…"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Project status</label>
          <select class="input" formControlName="status">
            @for (s of statuses; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="label">Progress (%)</label>
          <input class="input" type="number" min="0" max="100" formControlName="progress" />
        </div>
      </div>

      @if (!form.value.isSelf) {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Payment status</label>
            <select class="input" formControlName="paymentStatus">
              @for (p of paymentStatuses; track p.value) {
                <option [value]="p.value">{{ p.label }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="label">Quoted amount</label>
            <input class="input" type="number" min="0" step="0.01" formControlName="quotedAmount" placeholder="0" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Currency</label>
            <select class="input" formControlName="currency">
              @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
          <div class="form-group">
            <!-- empty to keep two-column rhythm -->
          </div>
        </div>
      }

      <div class="form-row">
        <div class="form-group">
          <label class="label">Start date</label>
          <input class="input" type="date" formControlName="startDate" />
        </div>
        <div class="form-group">
          <label class="label">Deadline</label>
          <input class="input" type="date" formControlName="deadline" />
        </div>
      </div>

      <div class="form-group">
        <label class="label">Portfolio / sample links</label>
        <div class="links-list">
          @for (link of portfolioLinks; track $index) {
            <div class="link-row">
              <input class="input link-input" [value]="link" (input)="updateLink($index, $event)" placeholder="Paste URL (image, drive, behance, etc.)" />
              <button type="button" class="icon-btn danger" (click)="removeLink($index)">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          }
        </div>
        <button type="button" class="btn-ghost sm" (click)="addLink()">+ Add link</button>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving…' : (project ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .project-form { display: flex; flex-direction: column; gap: 1rem; }
    .self-toggle {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
      background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px;
      cursor: pointer; transition: border-color 0.15s;
    }
    .self-toggle:hover { border-color: var(--text-muted); }
    .self-toggle input { margin-top: 4px; cursor: pointer; }
    .self-toggle strong { display: block; font-size: 0.88rem; color: var(--text-primary); }
    .self-toggle small { display: block; font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    textarea.input { resize: vertical; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; }
    .links-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .link-row { display: flex; gap: 0.375rem; align-items: center; }
    .link-input { flex: 1; font-size: 0.82rem; }
    .icon-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.25rem; cursor: pointer; color: var(--text-muted); display: flex; }
    .icon-btn.danger:hover { color: #ef4444; background: var(--bg-secondary); }
    .sm { font-size: 0.8rem; padding: 0.375rem 0.75rem; }
    @media (max-width: 520px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class ProjectFormComponent implements OnInit, OnChanges {
  @Input() project: Project | null = null;
  @Output() saved = new EventEmitter<Project>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);

  loading = false;
  statuses = PROJECT_STATUSES;
  paymentStatuses = PAYMENT_STATUSES.filter((p) => p.value !== 'NOT_APPLICABLE'); // hidden in form; only the backend sets it for self projects
  currencies = CURRENCIES;
  portfolioLinks: string[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    isSelf: [false],
    clientName: [''],
    clientContact: [''],
    description: [''],
    status: ['LEAD' as ProjectStatus],
    paymentStatus: ['PENDING' as PaymentStatus],
    quotedAmount: [null as number | null],
    currency: ['INR'],
    startDate: [''],
    deadline: [''],
    progress: [0],
  });

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['project']) this.fillForm(); }

  private fillForm() {
    if (!this.project) {
      this.portfolioLinks = [''];
      this.form.reset({
        title: '', isSelf: false, clientName: '', clientContact: '', description: '',
        status: 'LEAD', paymentStatus: 'PENDING', quotedAmount: null, currency: 'INR',
        startDate: '', deadline: '', progress: 0,
      });
      return;
    }
    this.portfolioLinks = this.project.portfolioLinks.length > 0 ? [...this.project.portfolioLinks] : [''];
    this.form.patchValue({
      title: this.project.title,
      isSelf: this.project.isSelf,
      clientName: this.project.clientName ?? '',
      clientContact: this.project.clientContact ?? '',
      description: this.project.description ?? '',
      status: this.project.status,
      // NOT_APPLICABLE comes from server-side flagging; in the form we keep a "real" choice for non-self projects.
      paymentStatus: this.project.paymentStatus === 'NOT_APPLICABLE' ? 'PENDING' : this.project.paymentStatus,
      quotedAmount: this.project.quotedAmount,
      currency: this.project.currency,
      startDate: this.project.startDate ?? '',
      deadline: this.project.deadline ?? '',
      progress: this.project.progress,
    });
  }

  addLink() { this.portfolioLinks = [...this.portfolioLinks, '']; }
  removeLink(i: number) { this.portfolioLinks = this.portfolioLinks.filter((_, idx) => idx !== i); }
  updateLink(i: number, ev: Event) {
    const v = (ev.target as HTMLInputElement).value;
    this.portfolioLinks = this.portfolioLinks.map((l, idx) => (idx === i ? v : l));
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const raw = this.form.value;
    const isSelf = !!raw.isSelf;
    const dto: any = {
      title: raw.title!,
      isSelf,
      description: raw.description?.trim() || undefined,
      status: raw.status ?? 'LEAD',
      currency: raw.currency || 'INR',
      startDate: raw.startDate || undefined,
      deadline: raw.deadline || undefined,
      progress: raw.progress ?? 0,
      portfolioLinks: this.portfolioLinks.map((l) => l.trim()).filter(Boolean),
    };
    // Client + payment fields only carried through for non-self projects. The backend also
    // clears them when isSelf=true, but stripping here keeps the request payload clean.
    if (!isSelf) {
      dto.clientName = raw.clientName?.trim() || undefined;
      dto.clientContact = raw.clientContact?.trim() || undefined;
      dto.paymentStatus = raw.paymentStatus ?? 'PENDING';
      dto.quotedAmount = raw.quotedAmount ?? undefined;
    }
    const op$ = this.project
      ? this.projectService.update(this.project.id, dto)
      : this.projectService.create(dto);
    op$.subscribe({
      next: (p) => { this.loading = false; this.saved.emit(p); },
      error: () => { this.loading = false; },
    });
  }
}
