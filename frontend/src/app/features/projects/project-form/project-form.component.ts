import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../project.service';
import { PAYMENT_STATUSES, PROJECT_STATUSES, PROJECT_TYPES, PaymentStatus, Project, ProjectStatus } from '../../../core/models/project.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="project-form">
      <!-- Self project iOS-style toggle -->
      <label class="self-toggle">
        <input type="checkbox" formControlName="isSelf" class="toggle-input" />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">Self project</span>
        <span class="toggle-hint">personal work, no client or payment tracking</span>
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
          <label class="label">Project type</label>
          <select class="input" formControlName="projectType">
            <option value="">Not specified</option>
            @for (t of projectTypes; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="label">Project status</label>
          <select class="input" formControlName="status">
            @for (s of statuses; track s.value) {
              <option [value]="s.value">{{ s.label }}</option>
            }
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Progress (%)</label>
          <input class="input" type="number" min="0" max="100" formControlName="progress" />
        </div>
        <div class="form-group"><!-- spacer --></div>
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
          <div class="form-group"><!-- empty to keep two-column rhythm --></div>
        </div>
      }

      <div class="form-row">
        <div class="form-group">
          <label class="label">Start date</label>
          <input class="input" type="date" formControlName="startDate" />
        </div>
        <div class="form-group">
          <label class="label">End date / Completion date</label>
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

      <!-- Portfolio section (collapsible) -->
      <div class="section-divider">
        <button type="button" class="section-toggle" (click)="showPortfolio = !showPortfolio">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Portfolio settings
          <svg class="chevron" [class.open]="showPortfolio" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      @if (showPortfolio) {
        <label class="self-toggle">
          <input type="checkbox" formControlName="showInPortfolio" class="toggle-input" />
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">Show in portfolio</span>
          <span class="toggle-hint">makes this project visible on your public portfolio site</span>
        </label>

        <div class="form-group">
          <label class="label">Public summary</label>
          <textarea class="input" formControlName="publicSummary" rows="2" placeholder="Public-facing description (leave blank to use project description)"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Live URL</label>
            <input class="input" formControlName="liveUrl" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label class="label">Repo URL</label>
            <input class="input" formControlName="repoUrl" placeholder="https://github.com/..." />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Figma URL</label>
            <input class="input" formControlName="figmaUrl" placeholder="https://figma.com/..." />
          </div>
          <div class="form-group">
            <label class="label">Thumbnail URL</label>
            <input class="input" formControlName="thumbnailUrl" placeholder="https://... (image URL)" />
          </div>
        </div>

        <div class="form-group">
          <label class="label">Tags (comma-separated)</label>
          <input class="input" [value]="tagsInput" (input)="tagsInput = $any($event.target).value" placeholder="Angular, NestJS, Firebase..." />
        </div>
      }

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

    /* iOS-style toggle switch */
    .self-toggle {
      display: inline-flex; align-items: center; gap: 8px;
      cursor: pointer; padding: 4px 0;
      font-size: 0.85rem; user-select: none;
    }
    .toggle-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
    .toggle-track {
      width: 34px; height: 20px; border-radius: 999px;
      background: var(--bg-secondary); border: 1px solid var(--border);
      position: relative; flex-shrink: 0;
      transition: background 0.2s, border-color 0.2s;
    }
    .toggle-thumb {
      position: absolute; top: 1px; left: 1px;
      width: 16px; height: 16px; border-radius: 50%;
      background: var(--text-muted);
      transition: transform 0.2s, background 0.2s;
    }
    .toggle-input:checked + .toggle-track { background: var(--accent); border-color: var(--accent); }
    .toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(14px); background: #fff; }
    .toggle-input:focus-visible + .toggle-track { box-shadow: 0 0 0 3px rgba(16,185,129,0.25); }
    .toggle-label { color: var(--text-primary); font-weight: 600; }
    .toggle-hint { color: var(--text-muted); font-size: 0.78rem; }

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
    .section-divider { margin: 0.25rem 0; }
    .section-toggle { display: flex; align-items: center; gap: 8px; background: none; border: none; font-family: inherit; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; padding: 6px 0; width: 100%; text-align: left; transition: color 0.15s; }
    .section-toggle:hover { color: var(--text-primary); }
    .chevron { margin-left: auto; transition: transform 0.2s; }
    .chevron.open { transform: rotate(180deg); }
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
  showPortfolio = false;
  tagsInput = '';
  statuses = PROJECT_STATUSES;
  paymentStatuses = PAYMENT_STATUSES.filter((p) => p.value !== 'NOT_APPLICABLE');
  projectTypes = PROJECT_TYPES;
  currencies = CURRENCIES;
  portfolioLinks: string[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    isSelf: [false],
    projectType: [''],
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
    showInPortfolio: [false],
    publicSummary: [''],
    liveUrl: [''],
    repoUrl: [''],
    figmaUrl: [''],
    thumbnailUrl: [''],
  });

  ngOnInit() { this.fillForm(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['project']) this.fillForm(); }

  private fillForm() {
    if (!this.project) {
      this.portfolioLinks = [''];
      this.tagsInput = '';
      this.form.reset({
        title: '', isSelf: false, projectType: '',
        clientName: '', clientContact: '', description: '',
        status: 'LEAD', paymentStatus: 'PENDING', quotedAmount: null, currency: 'INR',
        startDate: '', deadline: '', progress: 0,
        showInPortfolio: false, publicSummary: '', liveUrl: '', repoUrl: '', figmaUrl: '', thumbnailUrl: '',
      });
      return;
    }
    const links = this.project.portfolioLinks ?? [];
    this.portfolioLinks = links.length > 0 ? [...links] : [''];
    this.tagsInput = (this.project.tags ?? []).join(', ');
    this.form.patchValue({
      title: this.project.title,
      isSelf: this.project.isSelf,
      projectType: this.project.projectType ?? '',
      clientName: this.project.clientName ?? '',
      clientContact: this.project.clientContact ?? '',
      description: this.project.description ?? '',
      status: this.project.status,
      paymentStatus: this.project.paymentStatus === 'NOT_APPLICABLE' ? 'PENDING' : this.project.paymentStatus,
      quotedAmount: this.project.quotedAmount,
      currency: this.project.currency,
      startDate: this.project.startDate ?? '',
      deadline: this.project.deadline ?? '',
      progress: this.project.progress,
      showInPortfolio: this.project.showInPortfolio ?? false,
      publicSummary: this.project.publicSummary ?? '',
      liveUrl: this.project.liveUrl ?? '',
      repoUrl: this.project.repoUrl ?? '',
      figmaUrl: this.project.figmaUrl ?? '',
      thumbnailUrl: this.project.thumbnailUrl ?? '',
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
    const isEdit = !!this.project;
    const dto: any = {
      title: raw.title!,
      isSelf,
      projectType: raw.projectType ? raw.projectType : (isEdit ? null : undefined),
      description: raw.description?.trim() || undefined,
      status: raw.status ?? 'LEAD',
      currency: raw.currency || 'INR',
      startDate: raw.startDate || undefined,
      deadline: raw.deadline || undefined,
      progress: raw.progress ?? 0,
      portfolioLinks: this.portfolioLinks.map((l) => l.trim()).filter(Boolean),
      showInPortfolio: raw.showInPortfolio ?? false,
      publicSummary: raw.publicSummary?.trim() || undefined,
      liveUrl: raw.liveUrl?.trim() || undefined,
      repoUrl: raw.repoUrl?.trim() || undefined,
      figmaUrl: raw.figmaUrl?.trim() || undefined,
      thumbnailUrl: raw.thumbnailUrl?.trim() || undefined,
      tags: this.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };
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
