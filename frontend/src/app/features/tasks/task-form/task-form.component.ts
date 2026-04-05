import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { TaskService } from '../task.service';
import { CategoryService } from '../../categories/category.service';
import { Task, PLAN_TYPES, PlanType } from '../../../core/models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="plan-form">
      <!-- Plan Type Selector -->
      <div class="type-selector">
        @for (t of planTypes; track t.value) {
          <button type="button" class="type-btn" [class.active]="selectedType === t.value"
            [style.--type-color]="t.color" (click)="selectType(t.value)">
            <span class="type-icon">{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </button>
        }
      </div>

      <!-- Title — always shown -->
      <div class="form-group">
        <label class="label">Title *</label>
        <input class="input" formControlName="title" [placeholder]="titlePlaceholder" />
      </div>

      <!-- Description — always shown -->
      <div class="form-group">
        <label class="label">Description</label>
        <textarea class="input" formControlName="description" rows="2" [placeholder]="descPlaceholder"></textarea>
      </div>

      <!-- ═══ TASK fields ═══ -->
      @if (selectedType === 'task') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Priority</label>
            <select class="input" formControlName="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">Start Time</label>
            <input class="input" type="time" formControlName="startTime" />
          </div>
          <div class="form-group">
            <label class="label">End Time</label>
            <input class="input" type="time" formControlName="endTime" />
          </div>
        </div>
      }

      <!-- ═══ TRIP fields ═══ -->
      @if (selectedType === 'trip') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Start Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">End Date</label>
            <input class="input" type="date" formControlName="endDate" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Destination / Location</label>
          <input class="input" formControlName="location" placeholder="e.g. Kedarnath, Goa, Manali..." />
        </div>
        <div class="form-group">
          <label class="label">Priority</label>
          <select class="input" formControlName="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      }

      <!-- ═══ TRAIN fields ═══ -->
      @if (selectedType === 'train') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Journey Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Departure Time</label>
            <input class="input" type="time" formControlName="departureTime" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">Boarding Station</label>
            <input class="input" formControlName="boardingStation" placeholder="e.g. Secunderabad" />
          </div>
          <div class="form-group">
            <label class="label">Destination Station</label>
            <input class="input" formControlName="destinationStation" placeholder="e.g. Haridwar" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">Train Number / Name</label>
            <input class="input" formControlName="trainNumber" placeholder="e.g. 12760 Charminar Exp" />
          </div>
          <div class="form-group">
            <label class="label">Priority</label>
            <select class="input" formControlName="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
      }

      <!-- ═══ DINNER fields ═══ -->
      @if (selectedType === 'dinner') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Time</label>
            <input class="input" type="time" formControlName="startTime" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Restaurant / Location</label>
          <input class="input" formControlName="location" placeholder="e.g. Paradise Biryani, Jubilee Hills" />
        </div>
      }

      <!-- ═══ MEETING fields ═══ -->
      @if (selectedType === 'meeting') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Priority</label>
            <select class="input" formControlName="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="label">Start Time</label>
            <input class="input" type="time" formControlName="startTime" />
          </div>
          <div class="form-group">
            <label class="label">End Time</label>
            <input class="input" type="time" formControlName="endTime" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Location / Office</label>
          <input class="input" formControlName="location" placeholder="e.g. Conference Room A, Office..." />
        </div>
        <div class="form-group">
          <label class="label">Meeting Link</label>
          <input class="input" formControlName="meetingLink" placeholder="e.g. https://meet.google.com/..." />
        </div>
      }

      <!-- ═══ EVENT fields ═══ -->
      @if (selectedType === 'event') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Time</label>
            <input class="input" type="time" formControlName="startTime" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">Venue / Location</label>
          <input class="input" formControlName="location" placeholder="e.g. HICC, Madhapur..." />
        </div>
        <div class="form-group">
          <label class="label">Priority</label>
          <select class="input" formControlName="priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      }

      <!-- ═══ REMINDER fields ═══ -->
      @if (selectedType === 'reminder') {
        <div class="form-row">
          <div class="form-group">
            <label class="label">Date</label>
            <input class="input" type="date" formControlName="dueDate" />
          </div>
          <div class="form-group">
            <label class="label">Time</label>
            <input class="input" type="time" formControlName="startTime" />
          </div>
        </div>
      }

      <!-- Category + Status — always shown -->
      <div class="form-row">
        <div class="form-group">
          <label class="label">Category</label>
          <select class="input" formControlName="categoryId">
            <option value="">No category</option>
            @for (cat of catService.categories$ | async; track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>
        </div>
        <div class="form-group">
          <label class="label">Status</label>
          <select class="input" formControlName="status">
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="form.invalid || loading">
          {{ loading ? 'Saving...' : (task ? 'Update Plan' : 'Add Plan') }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .plan-form { display: flex; flex-direction: column; gap: 1rem; }
    .type-selector { display: flex; gap: 6px; flex-wrap: wrap; }
    .type-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 12px; border-radius: 20px;
      font-size: 0.78rem; font-weight: 500; cursor: pointer;
      border: 1.5px solid var(--border); background: transparent;
      color: var(--text-secondary); transition: all 0.15s; font-family: inherit;
    }
    .type-btn:hover { border-color: var(--type-color); color: var(--type-color); }
    .type-btn.active { background: var(--type-color); color: #fff; border-color: var(--type-color); }
    .type-icon { font-size: 0.85rem; }
    .form-group { display: flex; flex-direction: column; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    textarea.input { resize: vertical; min-height: 60px; }
    .form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
  `],
})
export class TaskFormComponent implements OnInit, OnChanges {
  @Input() task: Task | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  catService = inject(CategoryService);
  planTypes = PLAN_TYPES;

  loading = false;
  selectedType: PlanType = 'task';

  form = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    type: ['task'],
    priority: ['MEDIUM'],
    status: ['TODO'],
    dueDate: [''],
    endDate: [''],
    startTime: [''],
    endTime: [''],
    location: [''],
    boardingStation: [''],
    destinationStation: [''],
    trainNumber: [''],
    departureTime: [''],
    meetingLink: [''],
    categoryId: [''],
  });

  // Dynamic placeholders based on type
  get titlePlaceholder(): string {
    const map: Record<string, string> = {
      task: "What's the plan?",
      trip: 'Trip name (e.g. Kedarnath Trip)',
      train: 'Journey name (e.g. Train to Delhi)',
      dinner: 'Dinner plan (e.g. Dinner at Paradise)',
      meeting: 'Meeting title (e.g. Sprint Review)',
      event: 'Event name (e.g. Tech Conference)',
      reminder: 'Remind me to...',
    };
    return map[this.selectedType] || "What's the plan?";
  }

  get descPlaceholder(): string {
    const map: Record<string, string> = {
      task: 'Optional details...',
      trip: 'Trip details, who is going, budget...',
      train: 'PNR, seat number, coach...',
      dinner: 'With whom, special occasion...',
      meeting: 'Agenda, topics to discuss...',
      event: 'Event details, tickets, dress code...',
      reminder: 'Additional notes...',
    };
    return map[this.selectedType] || 'Optional details...';
  }

  selectType(type: PlanType) {
    this.selectedType = type;
    this.form.patchValue({ type });
  }

  ngOnInit() { this.fillForm(); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['task']) this.fillForm();
  }

  private fillForm() {
    if (this.task) {
      this.selectedType = (this.task.type as PlanType) || 'task';
      this.form.patchValue({
        title: this.task.title,
        description: this.task.description ?? '',
        type: this.task.type ?? 'task',
        priority: this.task.priority,
        status: this.task.status,
        dueDate: this.task.dueDate ? this.task.dueDate.split('T')[0] : '',
        endDate: this.task.endDate ? this.task.endDate.split('T')[0] : '',
        startTime: this.task.startTime ?? '',
        endTime: this.task.endTime ?? '',
        location: this.task.location ?? '',
        boardingStation: this.task.boardingStation ?? '',
        destinationStation: this.task.destinationStation ?? '',
        trainNumber: this.task.trainNumber ?? '',
        departureTime: this.task.departureTime ?? '',
        meetingLink: this.task.meetingLink ?? '',
        categoryId: this.task.categoryId ?? '',
      });
    } else {
      this.selectedType = 'task';
      this.form.reset({
        title: '', description: '', type: 'task', priority: 'MEDIUM',
        status: 'TODO', dueDate: '', endDate: '', startTime: '', endTime: '',
        location: '', boardingStation: '', destinationStation: '', trainNumber: '',
        departureTime: '', meetingLink: '', categoryId: '',
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.value;
    const dto: any = {
      title: v.title,
      description: v.description || undefined,
      type: v.type,
      priority: v.priority,
      status: v.status,
      dueDate: v.dueDate || undefined,
      endDate: v.endDate || undefined,
      startTime: v.startTime || undefined,
      endTime: v.endTime || undefined,
      location: v.location || undefined,
      boardingStation: v.boardingStation || undefined,
      destinationStation: v.destinationStation || undefined,
      trainNumber: v.trainNumber || undefined,
      departureTime: v.departureTime || undefined,
      meetingLink: v.meetingLink || undefined,
      categoryId: v.categoryId || undefined,
    };

    const req = this.task ? this.taskService.update(this.task.id, dto) : this.taskService.create(dto);
    req.subscribe({
      next: () => { this.loading = false; this.saved.emit(); },
      error: () => { this.loading = false; },
    });
  }
}
