// Import Angular decorators and utilities: Component, EventEmitter for outputs, inject for DI, Input/Output for bindings, OnInit lifecycle
import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { GoalService } from '../goal.service';
import { Goal } from '../../../core/models/goal.model';

// GoalFormComponent is a reusable form for creating and editing goals.
// It is used inside a ModalComponent by the goal-list page.
// When an existing goal is passed via the [goal] input, the form pre-fills for editing.
@Component({
  selector: 'app-goal-form', // Used as <app-goal-form [goal]="..." (saved)="..." (cancelled)="...">
  standalone: true, // Angular 19 standalone component
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="goal-form">
      <!-- Title field: required for every goal -->
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" placeholder="Goal title" />
      </div>
      <!-- Description field: optional longer text -->
      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="3" placeholder="Describe your goal…"></textarea>
      </div>
      <!-- Status and Target Date in a two-column grid -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Status</label>
          <!-- Status dropdown: ACTIVE (default), PAUSED, COMPLETED, ABANDONED -->
          <select class="input" formControlName="status">
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label">Target Date</label>
          <!-- Optional target completion date -->
          <input class="input" type="date" formControlName="targetDate" />
        </div>
      </div>
      <!-- Resources: links, references, or notes -->
      <div class="form-group">
        <label class="label">Resources</label>
        <div class="resources-list">
          @for (res of resources; track $index) {
            <div class="resource-row">
              <input class="input resource-input" [value]="res" (input)="updateResource($index, $event)" placeholder="Link or reference..." />
              <button type="button" class="icon-btn danger" (click)="removeResource($index)">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          }
        </div>
        <button type="button" class="btn-ghost sm" (click)="addResource()">+ Add Resource</button>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <!-- Button label changes between "Create" and "Update" based on edit mode -->
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving…' : (goal ? 'Update' : 'Create') }}
        </button>
      </div>
    </form>
  `,
  // Compact inline styles for the form layout (minified for brevity)
  styles: [`.goal-form{display:flex;flex-direction:column;gap:1rem}.form-group{display:flex;flex-direction:column;gap:.25rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}textarea.input{resize:vertical}.form-actions{display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem}.resources-list{display:flex;flex-direction:column;gap:.375rem}.resource-row{display:flex;gap:.375rem;align-items:center}.resource-input{flex:1}.icon-btn{background:transparent;border:none;padding:.25rem;border-radius:.25rem;cursor:pointer;color:var(--text-muted);display:flex}.icon-btn:hover{color:var(--text-primary);background:var(--bg-secondary)}.icon-btn.danger:hover{color:var(--red)}.sm{font-size:.8rem;padding:.375rem .75rem}`],
})
export class GoalFormComponent implements OnInit, OnChanges {
  // Optional input: when provided, the form operates in edit mode with pre-filled values
  @Input() goal: Goal | null = null;
  // Emitted when the goal is successfully saved (created or updated)
  @Output() saved = new EventEmitter<void>();
  // Emitted when the user clicks the Cancel button
  @Output() cancelled = new EventEmitter<void>();

  // Inject dependencies
  private fb = inject(FormBuilder); // For creating the reactive form
  private goalService = inject(GoalService); // For create/update API calls

  loading = false;
  resources: string[] = [''];
  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    status: ['ACTIVE'],
    targetDate: [''],
  });

  ngOnInit() { this.fillForm(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['goal']) this.fillForm();
  }

  private fillForm() {
    if (this.goal) {
      this.form.patchValue({
        title: this.goal.title,
        description: this.goal.description ?? '',
        status: this.goal.status,
        targetDate: this.goal.targetDate ? this.goal.targetDate.split('T')[0] : '',
      });
      this.resources = this.goal.resources?.length ? [...this.goal.resources] : [''];
    } else {
      this.form.reset({ title: '', description: '', status: 'ACTIVE', targetDate: '' });
      this.resources = [''];
    }
  }

  addResource() { this.resources.push(''); }
  removeResource(i: number) { this.resources.splice(i, 1); if (!this.resources.length) this.resources.push(''); }
  updateResource(i: number, event: Event) { this.resources[i] = (event.target as HTMLInputElement).value; }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const value = this.form.value;
    const filteredResources = this.resources.filter(r => r.trim());
    const dto: any = {
      title: value.title,
      description: value.description || undefined,
      status: value.status,
      targetDate: value.targetDate || undefined,
      resources: filteredResources,
    };

    const req = this.goal ? this.goalService.update(this.goal.id, dto) : this.goalService.create(dto);
    req.subscribe({
      next: () => {
        this.loading = false;
        this.form.reset({ title: '', description: '', status: 'ACTIVE', targetDate: '' });
        this.resources = [''];
        this.saved.emit();
      },
      error: () => { this.loading = false; },
    });
  }
}
