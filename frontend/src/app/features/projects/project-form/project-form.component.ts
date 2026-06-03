import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../project.service';
import { PROJECT_STATUSES, Project, ProjectStatus } from '../../../core/models/project.model';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'] as const;

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="project-form">
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="e.g. Wedding photo album design" />
      </div>

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

      <div class="form-group">
        <label class="label">Description / scope</label>
        <textarea class="input" formControlName="description" rows="3" placeholder="Brief scope, deliverables, special notes…"></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="label">Status</label>
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

      <div class="form-row">
        <div class="form-group">
          <label class="label">Quoted amount</label>
          <input class="input" type="number" min="0" step="0.01" formControlName="quotedAmount" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="label">Currency</label>
          <select class="input" formControlName="currency">
            @for (c of currencies; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
      </div>

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
  currencies = CURRENCIES;
  portfolioLinks: string[] = [];

  form = this.fb.group({
    title: ['', Validators.required],
    clientName: [''],
    clientContact: [''],
    description: [''],
    status: ['LEAD' as ProjectStatus],
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
        title: '', clientName: '', clientContact: '', description: '',
        status: 'LEAD', quotedAmount: null, currency: 'INR',
        startDate: '', deadline: '', progress: 0,
      });
      return;
    }
    this.portfolioLinks = this.project.portfolioLinks.length > 0 ? [...this.project.portfolioLinks] : [''];
    this.form.patchValue({
      title: this.project.title,
      clientName: this.project.clientName ?? '',
      clientContact: this.project.clientContact ?? '',
      description: this.project.description ?? '',
      status: this.project.status,
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
    const dto = {
      title: raw.title!,
      clientName: raw.clientName?.trim() || undefined,
      clientContact: raw.clientContact?.trim() || undefined,
      description: raw.description?.trim() || undefined,
      status: raw.status ?? 'LEAD',
      quotedAmount: raw.quotedAmount ?? undefined,
      currency: raw.currency || 'INR',
      startDate: raw.startDate || undefined,
      deadline: raw.deadline || undefined,
      progress: raw.progress ?? 0,
      portfolioLinks: this.portfolioLinks.map((l) => l.trim()).filter(Boolean),
    };
    const op$ = this.project
      ? this.projectService.update(this.project.id, dto)
      : this.projectService.create(dto);
    op$.subscribe({
      next: (p) => { this.loading = false; this.saved.emit(p); },
      error: () => { this.loading = false; },
    });
  }
}
