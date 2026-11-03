// Dashboard — redesigned "command center" landing page.
// Main column: hero greeting, sparkline stat cards, the Daily Routine card
// (progress ring + stats + checklist), a 30-day heat strip, and today's
// schedule. Right rail: mini month calendar, streak card, and insights.
// All colors run through the theme tokens so Light / Dark / Paper all work.
import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TaskService } from '../tasks/task.service';
import { GoalService } from '../goals/goal.service';
import { HabitService } from '../habits/habit.service';
import { Habit } from '../../core/models/habit.model';
import { environment } from '../../../environments/environment';
import { Task, PLAN_TYPES } from '../../core/models/task.model';
import { Goal } from '../../core/models/goal.model';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { TaskFormComponent } from '../tasks/task-form/task-form.component';
import { computed } from '@angular/core';

interface Stats { totalTasks: number; completedToday: number; activeTasks: number; activeGoals: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, ModalComponent, TaskFormComponent],
  template: `
    @if (loading()) {
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <p>Loading your plans...</p>
        <span class="loading-hint">First load may take ~30s if the server was sleeping</span>
      </div>
    }

    <!-- Decorative aurora curves pinned to the very top of the viewport,
         flowing behind the transparent header (pointer-transparent).
         Lives outside .dash so position:fixed isn't trapped by its animation. -->
    @if (!loading()) {
      <svg class="aurora" viewBox="0 0 900 260" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <defs>
          <linearGradient id="auroraV" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0"/>
            <stop offset="45%" stop-color="#8b5cf6" stop-opacity=".55"/>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="auroraG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
            <stop offset="50%" stop-color="#34d399" stop-opacity=".5"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
          </linearGradient>
          <filter id="auroraBlur" x="-20%" y="-50%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="14"/>
          </filter>
        </defs>
        <path d="M240 -40 C 420 90, 620 20, 940 130" stroke="url(#auroraV)" stroke-width="56" fill="none" filter="url(#auroraBlur)"/>
        <path d="M380 -60 C 560 110, 740 -10, 980 70" stroke="url(#auroraG)" stroke-width="40" fill="none" filter="url(#auroraBlur)"/>
        <path d="M300 -30 C 500 100, 680 10, 920 100" stroke="#a78bfa" stroke-opacity=".35" stroke-width="2" fill="none"/>
        <path d="M420 -40 C 600 100, 760 0, 960 60" stroke="#34d399" stroke-opacity=".3" stroke-width="1.6" fill="none"/>
      </svg>
    }

    <div class="dash animate-in" [style.display]="loading() ? 'none' : ''">

      <!-- ═══ MAIN COLUMN ═══ -->
      <div class="dash-main">

        <!-- Hero -->
        <div class="hero">
          <div>
            <h1>Good {{ greeting }}, {{ auth.currentUser()?.displayName ?? 'there' }} <span class="wave">👋</span></h1>
            <p>{{ today | date:'EEEE, MMMM d, y' }}</p>
          </div>
          <button class="btn-primary add-btn" (click)="showAddPlan = true">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Plan
          </button>
        </div>

        <!-- Stat cards with custom gradient icons + sparklines -->
        <div class="stats-row">
          <a routerLink="/tasks" class="stat-card hue-green">
            <span class="stat-tile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-linejoin="round" stroke-linecap="round">
                <path d="M12 3.4 20.6 7.7 12 12 3.4 7.7z" fill="rgba(255,255,255,.28)" stroke-width="1.7"/>
                <path d="M3.4 12 12 16.3 20.6 12M3.4 16.3 12 20.6l8.6-4.3" stroke-width="1.8"/>
              </svg>
            </span>
            <div class="stat-body">
              <span class="stat-num">{{ stats()?.activeTasks ?? 0 }}</span>
              <span class="stat-label">Active Plans</span>
            </div>
            <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none">
              <path class="spark-glow" [attr.d]="sparkPlans()" fill="none" stroke="#10b981" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkPlans()" fill="none" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>

          <a routerLink="/tasks" class="stat-card hue-violet">
            <span class="stat-tile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3.4" y="4.6" width="17.2" height="15.8" rx="3.4" stroke-width="1.7" fill="rgba(255,255,255,.14)"/>
                <path d="M8 2.8v3.4M16 2.8v3.4" stroke-width="1.7"/>
                <path d="M8.4 13.6l2.5 2.5 4.8-5" stroke-width="2"/>
              </svg>
            </span>
            <div class="stat-body">
              <span class="stat-num">{{ stats()?.completedToday ?? 0 }}</span>
              <span class="stat-label">Done Today</span>
            </div>
            <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none">
              <path class="spark-glow" [attr.d]="sparkDone()" fill="none" stroke="#8b5cf6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkDone()" fill="none" stroke="#8b5cf6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>

          <a routerLink="/goals" class="stat-card hue-blue">
            <span class="stat-tile">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff">
                <circle cx="12" cy="12" r="8.4" stroke-width="1.7"/>
                <circle cx="12" cy="12" r="4.8" stroke-width="1.7" opacity=".65"/>
                <circle cx="12" cy="12" r="1.9" fill="#fff" stroke="none"/>
              </svg>
            </span>
            <div class="stat-body">
              <span class="stat-num">{{ stats()?.activeGoals ?? 0 }}</span>
              <span class="stat-label">Goals</span>
            </div>
            <svg class="spark" viewBox="0 0 120 36" preserveAspectRatio="none">
              <path class="spark-glow" [attr.d]="sparkGoals()" fill="none" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
              <path [attr.d]="sparkGoals()" fill="none" stroke="#3b82f6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>

        <!-- Daily Routine -->
        @if (habits().length > 0) {
          <div class="card routine-card">
            <div class="card-head">
              <span class="head-title">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke-linecap="round">
                  <defs><linearGradient id="icoRoutine" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent-hover)"/></linearGradient></defs>
                  <rect x="3.2" y="4.5" width="17.6" height="16" rx="3.4" stroke="url(#icoRoutine)" stroke-width="1.8"/>
                  <path d="M8 2.8v3.4M16 2.8v3.4M3.5 9.6h17" stroke="url(#icoRoutine)" stroke-width="1.8"/>
                </svg>
                Daily Routine
              </span>
              <a routerLink="/habits" class="head-link">All Habits →</a>
            </div>

            <div class="routine-top">
              <!-- Progress ring -->
              <div class="ring-wrap">
                <svg width="128" height="128" viewBox="0 0 110 110">
                  <defs><linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent-hover)"/></linearGradient></defs>
                  <circle cx="55" cy="55" r="42" fill="none" stroke="var(--bg-hover)" stroke-width="10"/>
                  <circle cx="55" cy="55" r="42" fill="none" stroke="url(#ringG)" stroke-width="10" stroke-linecap="round"
                    [attr.stroke-dasharray]="ringCirc" [attr.stroke-dashoffset]="ringOffset()"
                    transform="rotate(-90 55 55)" style="transition: stroke-dashoffset .6s cubic-bezier(.22,.9,.3,1)"/>
                </svg>
                <div class="ring-text">
                  <strong>{{ todayPct() | number:'1.0-0' }}%</strong>
                  <span>{{ doneToday() }}/{{ scheduledToday() }}</span>
                  <small>TODAY</small>
                </div>
              </div>

              <!-- Key numbers -->
              <div class="routine-stats">
                <div class="rs-row">
                  <span class="rs-ico">🔥</span>
                  <div><strong>{{ bestStreak() }}</strong><span>Best Current Streak</span></div>
                </div>
                <div class="rs-row">
                  <span class="rs-ico">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M5 20v-7M12 20V4M19 20v-11"/></svg>
                  </span>
                  <div><strong>{{ habits().length }}</strong><span>Total Habits</span></div>
                </div>
                <div class="rs-row">
                  <span class="rs-ico">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>
                  </span>
                  <div><strong>{{ consistency30() | number:'1.0-0' }}%</strong><span>30-Day Consistency</span></div>
                </div>
              </div>

              <!-- Sunrise illustration + encouragement (floats on the card, no box) -->
              <div class="cheer">
                <svg class="cheer-art" viewBox="0 0 300 126" fill="none">
                  <defs>
                    <radialGradient id="sunCore" cx=".5" cy=".4" r=".65">
                      <stop offset="0%" stop-color="#fef3c7"/><stop offset="45%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#f59e0b"/>
                    </radialGradient>
                    <radialGradient id="sunHalo" cx=".5" cy=".5" r=".5">
                      <stop offset="0%" stop-color="#fbbf24" stop-opacity=".55"/><stop offset="60%" stop-color="#fbbf24" stop-opacity=".18"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
                    </radialGradient>
                    <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2dd48f"/><stop offset="100%" stop-color="#0b5c3e"/></linearGradient>
                    <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16b47d"/><stop offset="100%" stop-color="#07432e"/></linearGradient>
                  </defs>
                  <!-- glow behind everything -->
                  <ellipse cx="150" cy="70" rx="104" ry="58" fill="url(#sunHalo)"/>
                  <!-- sun, partially hidden by the mound drawn after it -->
                  <circle cx="150" cy="64" r="28" fill="url(#sunCore)"/>
                  <circle cx="150" cy="64" r="36" stroke="#fbbf24" stroke-opacity=".3" stroke-width="1.8"/>
                  <!-- side slopes -->
                  <path d="M0 126 C 36 102, 74 96, 108 104 L112 126 Z" fill="url(#hillBack)" opacity=".85"/>
                  <path d="M300 126 C 266 100, 228 95, 192 104 L188 126 Z" fill="url(#hillBack)" opacity=".85"/>
                  <!-- central mound rising in front of the sun -->
                  <path d="M44 126 C 82 88, 120 74, 150 74 C 180 74, 218 88, 256 126 Z" fill="url(#hillFront)"/>
                  <!-- subtle mound highlight -->
                  <path d="M92 112 C 116 90, 136 82, 150 82" stroke="#6ee7b7" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
                  <!-- left trees: round tree + pine -->
                  <g>
                    <rect x="66.6" y="88" width="2.8" height="10" rx="1.2" fill="#064e36"/>
                    <circle cx="68" cy="82" r="8" fill="#0e8a5f"/><circle cx="63" cy="86" r="5.4" fill="#0b7a53"/><circle cx="73" cy="86.5" r="5" fill="#0b7a53"/>
                    <path d="M94 88 l7.5-14 7.5 14 z M96 80 l5.5-10.5 5.5 10.5 z" fill="#0a6b49"/><rect x="100" y="88" width="2.8" height="8" rx="1.2" fill="#064e36"/>
                  </g>
                  <!-- right trees: pine + round tree -->
                  <g>
                    <path d="M196 86 l8-15 8 15 z M198 78 l6-11.5 6 11.5 z" fill="#0a6b49"/><rect x="202.6" y="86" width="2.8" height="9" rx="1.2" fill="#064e36"/>
                    <rect x="228.6" y="90" width="2.6" height="9" rx="1.1" fill="#064e36"/>
                    <circle cx="230" cy="84.5" r="7" fill="#0e8a5f"/><circle cx="225.5" cy="88" r="4.6" fill="#0b7a53"/><circle cx="234.5" cy="88.2" r="4.4" fill="#0b7a53"/>
                  </g>
                  <!-- tiny sparkles in the sky -->
                  <g fill="#fcd34d">
                    <circle cx="96" cy="38" r="1.6" opacity=".7"/><circle cx="208" cy="30" r="1.3" opacity=".6"/><circle cx="236" cy="52" r="1.5" opacity=".5"/><circle cx="64" cy="56" r="1.2" opacity=".5"/>
                  </g>
                </svg>
                <strong>{{ cheerTitle() }}</strong>
                <span>You're {{ consistency30() | number:'1.0-0' }}% consistent this month.</span>
              </div>
            </div>

            <!-- Today's checklist -->
            <h3 class="checklist-title">Today's Checklist</h3>
            @if (todayHabits().length > 0) {
              <div class="checklist">
                @for (h of todayHabits(); track h.id) {
                  <button class="chk-row" [class.done]="h.doneToday" (click)="toggleHabit(h)">
                    <span class="chk-box" [class.on]="h.doneToday">
                      @if (h.doneToday) {
                        <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </span>
                    <!-- Custom filled glyph on a per-category gradient tile with matching glow -->
                    <span class="chk-ico" [style.background]="tileBg(h)" [style.box-shadow]="tileShadow(h)">
                      @switch (habitGlyph(h)) {
                        @case ('sun') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.6" fill="#fff"/><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"/></g></svg>
                        }
                        @case ('bed') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="11.4" width="18" height="3.8" rx="1.9" fill="#fff"/><circle cx="7.2" cy="9" r="2.1" fill="#fff"/><path d="M3.4 19.2v-3.4M20.6 19.2v-3.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>
                        }
                        @case ('run') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="14.8" cy="4.4" r="2.2" fill="#fff" stroke="none"/><path d="M12.6 8.2 9 10.4l1.4 3.2-3.6 5.6"/><path d="M12.6 8.2l3 1.5 3 .4"/><path d="M12.6 8.2l-.9 4.8 3.6 2.5 1 4.1"/></svg>
                        }
                        @case ('book') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 6.2C10.7 5 9 4.4 6.9 4.4c-1.1 0-2.1.2-2.9.6v13.2c.8-.4 1.8-.6 2.9-.6 2.1 0 3.8.7 5.1 1.9 1.3-1.2 3-1.9 5.1-1.9 1.1 0 2.1.2 2.9.6V5c-.8-.4-1.8-.6-2.9-.6-2.1 0-3.8.6-5.1 1.8z" fill="#fff"/><path d="M12 6.4v13" stroke="rgba(0,0,0,.25)" stroke-width="1.6"/></svg>
                        }
                        @case ('pencil') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m4.8 19.2 1-4L15.9 5.1a2.3 2.3 0 0 1 3.2 3.2L9 18.4z" fill="#fff"/><path d="m14.2 6.8 3 3" stroke="rgba(0,0,0,.28)" stroke-width="1.6" stroke-linecap="round"/></svg>
                        }
                        @case ('laptop') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="5" y="4.6" width="14" height="9.4" rx="1.8" fill="#fff"/><rect x="7" y="6.6" width="10" height="5.4" rx=".9" fill="rgba(0,0,0,.24)"/><path d="M4.4 14.8 3.2 18.2h17.6l-1.2-3.4z" fill="#fff"/></svg>
                        }
                        @case ('meal') {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 12.4h16a8 8 0 0 1-16 0z" fill="#fff"/><path d="M10 9.6c0-1.3 1-1.6 1-2.9M14 9.6c0-1.3 1-1.6 1-2.9" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
                        }
                        @default {
                          <svg width="17" height="17" viewBox="0 0 24 24"><path d="M12 3.6l2 6L20.4 12l-6.4 2.4-2 6-2-6L3.6 12l6.4-2.4z" fill="#fff"/></svg>
                        }
                      }
                    </span>
                    <span class="chk-title">{{ h.title }}</span>
                    @if (habitTimeLabel(h)) { <span class="chk-time">{{ habitTimeLabel(h) }}</span> }
                    <span class="chk-streak">🔥 {{ h.streak }}</span>
                  </button>
                }
              </div>
            } @else {
              <p class="muted-note">No habits scheduled today — a rest day 😌</p>
            }
          </div>
        }

        <!-- Last 30 days -->
        @if (heatmap().length > 0) {
          <div class="card strip-card">
            <div class="card-head">
              <span class="head-title">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke-linecap="round">
                  <defs><linearGradient id="icoHeat" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent-hover)"/></linearGradient></defs>
                  <rect x="3" y="3" width="8" height="8" rx="2" stroke="url(#icoHeat)" stroke-width="1.8"/>
                  <rect x="13" y="3" width="8" height="8" rx="2" fill="url(#icoHeat)" opacity=".45"/>
                  <rect x="3" y="13" width="8" height="8" rx="2" fill="url(#icoHeat)"/>
                  <rect x="13" y="13" width="8" height="8" rx="2" stroke="url(#icoHeat)" stroke-width="1.8"/>
                </svg>
                Last 30 Days
              </span>
              <a routerLink="/analytics" class="head-link">View Analytics →</a>
            </div>
            <div class="heat-strip">
              @for (c of heatmap(); track c.date) {
                <span class="heat-cell" [style.background]="c.color" [title]="c.tooltip"></span>
              }
            </div>
          </div>
        }

        <!-- Today's schedule -->
        <div class="card sched-card">
          <div class="card-head">
            <span class="head-title">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke-linecap="round">
                <defs><linearGradient id="icoSched" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--accent)"/><stop offset="100%" stop-color="var(--accent-hover)"/></linearGradient></defs>
                <circle cx="12" cy="12" r="8.8" stroke="url(#icoSched)" stroke-width="1.8"/>
                <path d="M12 7.5V12l3.2 2" stroke="url(#icoSched)" stroke-width="1.9"/>
              </svg>
              Today's Schedule
            </span>
            <a routerLink="/tasks" class="head-link">View all plans →</a>
          </div>
          @if (todayPlans().length > 0) {
            <div class="sched-list">
              @for (t of todayPlans(); track t.id) {
                <div class="sched-row" [class.done]="t.status === 'DONE'">
                  <span class="sched-time">{{ t.startTime ?? '—' }}</span>
                  <span class="sched-chip" [style.background]="getPlanColor(t.type) + '1e'" [style.color]="getPlanColor(t.type)">{{ getPlanIcon(t.type) }}</span>
                  <span class="sched-title">{{ t.title }}</span>
                  @if (t.location) { <span class="sched-loc">📍 {{ t.location }}</span> }
                </div>
              }
            </div>
          } @else {
            <p class="muted-note">No plans for today — add one, or ask the AI ✨</p>
          }
        </div>
      </div>

      <!-- ═══ RIGHT RAIL ═══ -->
      <div class="dash-side">

        <!-- Mini calendar -->
        <div class="card mini-cal">
          <div class="mc-head">
            <strong>{{ calLabel() }}</strong>
            <span class="mc-nav">
              <button (click)="calShift(-1)" aria-label="Previous month"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
              <button (click)="calShift(1)" aria-label="Next month"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
            </span>
          </div>
          <div class="mc-grid">
            @for (d of mcDow; track d) { <span class="mc-dow">{{ d }}</span> }
            @for (c of calCells(); track c.key) {
              <button class="mc-cell" [class.out]="!c.inMonth" [class.today]="c.isToday" (click)="goCalendar()">{{ c.day }}</button>
            }
          </div>
        </div>

        <!-- Streak -->
        <div class="card streak-card">
          <div class="card-head slim">
            <span class="head-title">🔥 Streak</span>
            @if (trendDelta() !== 0) {
              <span class="delta-chip" [class.down]="trendDelta() < 0">
                {{ trendDelta() > 0 ? '▲' : '▼' }} {{ trendDelta() > 0 ? '+' : '' }}{{ trendDelta() }}%
              </span>
            }
          </div>
          <div class="streak-num">{{ bestStreak() }} <span>{{ bestStreak() === 1 ? 'day' : 'days' }}</span></div>
          <div class="week-dots">
            @for (d of weekDots(); track d.label) {
              <span class="wd" [class.dim]="d.state === 'none' || d.state === 'future'">
                <span class="wd-dot" [class.on]="d.state === 'done'" [class.part]="d.state === 'partial'"
                  [class.off]="d.state === 'none'" [class.future]="d.state === 'future'">
                  @if (d.state === 'done') {
                    <svg width="11" height="11" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  } @else if (d.state === 'partial') {
                    <span class="wd-core"></span>
                  }
                </span>
                <small>{{ d.label }}</small>
              </span>
            }
          </div>
        </div>

        <!-- Insights -->
        <div class="card insights-card">
          <div class="card-head slim">
            <span class="head-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke-linecap="round">
                <defs><linearGradient id="icoIns" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs>
                <path d="M5 20v-6M12 20V6M19 20v-10" stroke="url(#icoIns)" stroke-width="2.2"/>
              </svg>
              Insights
            </span>
            <span class="head-sub">This Month</span>
          </div>
          <div class="ins-body">
            <div class="ins-ring">
              <svg width="86" height="86" viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="42" fill="none" stroke="var(--bg-hover)" stroke-width="11"/>
                <circle cx="55" cy="55" r="42" fill="none" stroke="url(#ringG)" stroke-width="11" stroke-linecap="round"
                  [attr.stroke-dasharray]="ringCirc" [attr.stroke-dashoffset]="ringCirc * (1 - consistency30() / 100)"
                  transform="rotate(-90 55 55)"/>
              </svg>
              <div class="ins-ring-text"><strong>{{ consistency30() | number:'1.0-0' }}%</strong><small>Consistency</small></div>
            </div>
            <div class="ins-list">
              <div class="ins-row">
                <span class="ins-ico ok">
                  <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div><strong>{{ doneToday() + (stats()?.completedToday ?? 0) }}</strong><span>Completed Today</span></div>
              </div>
              <div class="ins-row">
                <span class="ins-ico goal">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/></svg>
                </span>
                <div><strong>{{ stats()?.activeGoals ?? 0 }}</strong><span>Goals in Progress</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-modal [isOpen]="showAddPlan" title="Add Plan" (close)="showAddPlan = false">
      @if (showAddPlan) {
        <app-task-form (saved)="onPlanAdded()" (cancelled)="showAddPlan = false" />
      }
    </app-modal>
  `,
  styles: [`
    /* ── Layout ─────────────────────────────────────────── */
    /* Pulled up a little so the greeting sits closer to the header */
    .dash { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1.1rem; align-items: start; position: relative; margin-top: -0.9rem; }
    .dash-main { display: flex; flex-direction: column; gap: 1.1rem; min-width: 0; position: relative; z-index: 1; }
    /* Right rail stays pinned while the main column scrolls; capped to the
       viewport with hidden overflow so it never travels with the page */
    .dash-side {
      display: flex; flex-direction: column; gap: .9rem; z-index: 1;
      position: sticky; top: 0; align-self: start;
      max-height: calc(100dvh - 64px - 4rem); overflow-y: auto;
      scrollbar-width: none;
    }
    .dash-side::-webkit-scrollbar { display: none; }
    @media (max-width: 1150px) { .dash { grid-template-columns: 1fr; } .dash-side { position: static; max-height: none; overflow: visible; } }

    /* Aurora curves pinned to the top of the viewport, behind the
       transparent header bar (topbar has z-index 2, cards z-index 1) */
    .aurora {
      position: fixed; top: 0; right: 0; width: min(72vw, 1150px); height: 220px;
      pointer-events: none; z-index: 0; opacity: .35;
    }
    [data-theme="dark"] .aurora { opacity: .85; }
    @media (max-width: 768px) { .aurora { display: none; } }

    .card {
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 18px;
      box-shadow: var(--shadow-sm);
      padding: 1.1rem 1.25rem;
    }
    /* Dark cards: navy-blue border + soft indigo surface tint — no white
       hairline highlight on the top edge */
    [data-theme="dark"] .card {
      border-color: rgba(100, 112, 190, 0.30);
      background: linear-gradient(168deg, rgba(104, 118, 196, 0.085), rgba(104, 118, 196, 0.015) 55%), var(--bg-card);
      box-shadow: 0 14px 34px -18px rgba(0, 0, 0, 0.85);
    }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .9rem; }
    .card-head.slim { margin-bottom: .6rem; }
    .head-title { display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 1.02rem; letter-spacing: -0.01em; color: var(--text-primary); }
    .head-link { font-size: .8rem; font-weight: 600; color: var(--accent); text-decoration: none; }
    .head-link:hover { text-decoration: underline; }
    .head-sub { font-size: .74rem; color: var(--text-muted); font-weight: 600; }
    .muted-note { color: var(--text-muted); font-size: .88rem; padding: .4rem 0; }

    /* ── Hero ───────────────────────────────────────────── */
    .hero { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 .1rem; }
    .hero h1 { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text-primary); }
    .hero p { color: var(--text-secondary); font-size: .92rem; margin-top: 2px; }
    .wave { display: inline-block; animation: wave 2.2s ease .4s 1; transform-origin: 70% 70%; }
    @keyframes wave { 0%,100% { transform: rotate(0); } 15% { transform: rotate(16deg); } 30% { transform: rotate(-8deg); } 45% { transform: rotate(14deg); } 60% { transform: rotate(-4deg); } 75% { transform: rotate(8deg); } }
    .add-btn { flex-shrink: 0; }

    /* ── Stat cards ─────────────────────────────────────── */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .9rem; }
    @media (max-width: 760px) { .stats-row { grid-template-columns: 1fr; } }
    .stat-card {
      display: flex; align-items: center; gap: 13px;
      background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
      padding: 1rem 1.1rem; text-decoration: none; box-shadow: var(--shadow-sm);
      transition: transform .16s, box-shadow .16s, border-color .16s; position: relative; overflow: hidden;
    }
    .stat-card::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5;
      background: radial-gradient(240px 90px at 15% 0%, var(--hue-soft), transparent 70%);
    }
    .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--hue-border); }
    [data-theme="dark"] .stat-card {
      border-color: rgba(100, 112, 190, 0.30);
      background: linear-gradient(168deg, rgba(104, 118, 196, 0.085), rgba(104, 118, 196, 0.015) 58%), var(--bg-card);
      box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.8);
    }
    .hue-green  { --hue-soft: rgba(16,185,129,.12);  --hue-border: rgba(16,185,129,.45);  --hue-g1: #34d399; --hue-g2: #059669; --hue-sh: rgba(16,185,129,.5); }
    .hue-violet { --hue-soft: rgba(139,92,246,.12);  --hue-border: rgba(139,92,246,.45);  --hue-g1: #a78bfa; --hue-g2: #7c3aed; --hue-sh: rgba(139,92,246,.5); }
    .hue-blue   { --hue-soft: rgba(59,130,246,.12);  --hue-border: rgba(59,130,246,.45);  --hue-g1: #60a5fa; --hue-g2: #2563eb; --hue-sh: rgba(59,130,246,.5); }
    .stat-tile {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(140deg, var(--hue-g1), var(--hue-g2));
      box-shadow: 0 7px 16px var(--hue-sh), inset 0 1px 0 rgba(255,255,255,.35);
    }
    .stat-body { display: flex; flex-direction: column; min-width: 0; }
    .stat-num { font-size: 1.7rem; font-weight: 800; color: var(--text-primary); line-height: 1.1; letter-spacing: -0.02em; }
    .stat-label { font-size: .78rem; color: var(--text-muted); font-weight: 600; }
    /* Sparkline: crisp line over a blurred copy of itself = soft glow that
       follows the curve, plus a colored drop shadow below */
    .spark { margin-left: auto; width: 92px; height: 36px; flex-shrink: 0; overflow: visible; filter: drop-shadow(0 5px 8px var(--hue-sh)); }
    .spark-glow { opacity: .35; filter: blur(4px); }

    /* ── Routine card ───────────────────────────────────── */
    .routine-top {
      display: grid; grid-template-columns: auto auto 1fr; gap: 1.6rem; align-items: center;
      padding-bottom: 1rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem;
    }
    @media (max-width: 860px) { .routine-top { grid-template-columns: auto 1fr; } .cheer { grid-column: 1 / -1; } }
    .ring-wrap { position: relative; width: 128px; height: 128px; }
    .ring-text {
      position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
    }
    .ring-text strong { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em; }
    .ring-text span { font-size: .8rem; color: var(--text-secondary); font-weight: 600; }
    .ring-text small { font-size: .56rem; letter-spacing: .14em; color: var(--text-muted); font-weight: 700; margin-top: 2px; }

    .routine-stats { display: flex; flex-direction: column; gap: .85rem; }
    .rs-row { display: flex; align-items: center; gap: 11px; }
    .rs-ico {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 1rem;
      background: var(--accent-subtle); border: 1px solid var(--border);
    }
    .rs-row strong { display: block; font-size: 1.05rem; font-weight: 800; color: var(--text-primary); line-height: 1.1; }
    .rs-row span { font-size: .74rem; color: var(--text-muted); font-weight: 600; }

    /* The illustration floats directly on the card (no boxed sub-panel),
       separated from the stats by a quiet vertical divider */
    .cheer {
      display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
      padding: 0 .6rem 0 1.6rem; min-height: 150px;
      border-left: 1px solid var(--border);
    }
    [data-theme="dark"] .cheer { border-left-color: rgba(100, 112, 190, 0.22); }
    @media (max-width: 860px) { .cheer { border-left: none; padding-left: .6rem; } }
    .cheer-art { width: min(280px, 100%); height: auto; margin-bottom: .15rem; }
    .cheer strong { font-size: 1.08rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.01em; }
    .cheer span { font-size: .8rem; color: var(--text-secondary); }

    .checklist-title { font-size: .95rem; font-weight: 700; color: var(--text-primary); margin: 0 0 .7rem; }
    .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    @media (max-width: 860px) { .checklist { grid-template-columns: 1fr; } }
    /* Each row is its own rounded pill, like the reference checklist */
    .chk-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px; width: 100%;
      background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px;
      cursor: pointer; font-family: inherit; text-align: left; transition: background .12s, border-color .12s; min-width: 0;
    }
    [data-theme="dark"] .chk-row { background: rgba(100, 112, 190, 0.07); border-color: rgba(100, 112, 190, 0.20); }
    .chk-row:hover { background: var(--bg-hover); border-color: var(--hue-border, var(--border)); }
    [data-theme="dark"] .chk-row:hover { background: rgba(100, 112, 190, 0.13); }
    .chk-box {
      width: 21px; height: 21px; border-radius: 7px; border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s;
    }
    .chk-box.on { background: linear-gradient(140deg, var(--accent), var(--accent-hover)); border-color: transparent; }
    /* Gradient + glow come inline per category via tileBg()/tileShadow() */
    .chk-ico {
      width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .chk-title { font-size: .88rem; font-weight: 600; color: var(--text-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chk-row.done .chk-title { text-decoration: line-through; color: var(--text-muted); font-weight: 500; }
    .chk-time { font-size: .7rem; color: var(--text-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .chk-streak { font-size: .72rem; font-weight: 700; color: #f97316; flex-shrink: 0; }

    /* ── Heat strip ─────────────────────────────────────── */
    .heat-strip { display: grid; grid-template-columns: repeat(30, 1fr); gap: 5px; }
    .heat-cell { aspect-ratio: 1; border-radius: 5px; transition: transform .12s; }
    .heat-cell:hover { transform: scale(1.3); }
    @media (max-width: 700px) { .heat-strip { grid-template-columns: repeat(15, 1fr); } }

    /* ── Schedule ───────────────────────────────────────── */
    .sched-list { display: flex; flex-direction: column; gap: 2px; }
    .sched-row { display: flex; align-items: center; gap: 11px; padding: 8px 8px; border-radius: 10px; min-width: 0; }
    .sched-row:hover { background: var(--bg-hover); }
    .sched-row.done { opacity: .55; }
    .sched-row.done .sched-title { text-decoration: line-through; }
    .sched-time { font-size: .74rem; font-weight: 700; color: var(--text-muted); width: 44px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
    .sched-chip { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .85rem; flex-shrink: 0; }
    .sched-title { font-size: .88rem; font-weight: 600; color: var(--text-primary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sched-loc { font-size: .72rem; color: var(--text-muted); margin-left: auto; flex-shrink: 0; }

    /* ── Mini calendar ──────────────────────────────────── */
    .mini-cal { padding: .9rem 1rem; flex-shrink: 0; }
    .mc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
    .mc-head strong { font-size: .95rem; font-weight: 700; color: var(--text-primary); }
    .mc-nav { display: flex; gap: 4px; }
    .mc-nav button {
      width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--border);
      background: transparent; color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .mc-nav button:hover { background: var(--bg-hover); color: var(--text-primary); }
    .mc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px 2px; }
    .mc-dow { text-align: center; font-size: .6rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .02em; padding: 3px 0 7px; }
    .mc-cell {
      height: 28px; border: none; background: transparent; border-radius: 9px;
      font-size: .76rem; font-weight: 600; color: var(--text-primary); cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: center; transition: background .12s;
    }
    .mc-cell:hover { background: var(--bg-hover); }
    .mc-cell.out { color: var(--text-muted); opacity: .45; }
    .mc-cell.today { background: linear-gradient(140deg, var(--accent), var(--accent-hover)); color: #fff; font-weight: 800; box-shadow: 0 3px 9px var(--accent-glow); }

    /* ── Streak card ────────────────────────────────────── */
    .streak-num { font-size: 1.9rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.03em; margin: .1rem 0 .65rem; }
    .streak-num span { font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
    .delta-chip {
      font-size: .7rem; font-weight: 800; padding: 3px 9px; border-radius: 8px;
      background: var(--accent-subtle); color: var(--accent);
    }
    .delta-chip.down { background: rgba(239,68,68,.12); color: #ef4444; }
    /* Week dots: four clearly distinct states —
       done = filled gradient + check · partial = accent ring with core dot ·
       missed = dim filled disc · future = faint dashed outline */
    .week-dots { display: flex; justify-content: space-between; }
    .wd { display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .wd-dot {
      width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center; transition: all .15s;
    }
    .wd-dot.on { background: linear-gradient(140deg, var(--accent), var(--accent-hover)); border-color: transparent; box-shadow: 0 2px 8px var(--accent-glow); }
    .wd-dot.part { border-color: var(--accent); background: var(--accent-subtle); }
    .wd-core { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
    .wd-dot.off { background: var(--bg-hover); border-color: transparent; }
    .wd-dot.future { border-style: dashed; opacity: .5; }
    .wd small { font-size: .6rem; font-weight: 700; color: var(--text-secondary); }
    .wd.dim small { color: var(--text-muted); opacity: .65; }
    .wd.dim .wd-dot { transform: scale(.92); }

    /* ── Insights ───────────────────────────────────────── */
    .ins-body { display: flex; align-items: center; gap: 1.1rem; }
    .ins-ring { position: relative; width: 86px; height: 86px; flex-shrink: 0; }
    .ins-ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.05; }
    .ins-ring-text strong { font-size: .98rem; font-weight: 800; color: var(--text-primary); }
    .ins-ring-text small { font-size: .5rem; color: var(--text-muted); font-weight: 700; letter-spacing: .04em; }
    .ins-list { display: flex; flex-direction: column; gap: .8rem; min-width: 0; }
    .ins-row { display: flex; align-items: center; gap: 10px; }
    .ins-ico { width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ins-ico.ok { background: var(--accent-subtle); color: var(--accent); }
    .ins-ico.goal { background: rgba(59,130,246,.12); color: #3b82f6; }
    .ins-row strong { display: block; font-size: 1rem; font-weight: 800; color: var(--text-primary); line-height: 1.1; }
    .ins-row span { font-size: .72rem; color: var(--text-muted); font-weight: 600; }

    /* ── Loading ────────────────────────────────────────── */
    .loading-screen {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 60vh; gap: 14px; color: var(--text-secondary);
    }
    .loading-spinner {
      width: 38px; height: 38px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--accent);
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-hint { font-size: .76rem; color: var(--text-muted); }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private taskService = inject(TaskService);
  private goalService = inject(GoalService);
  private habitService = inject(HabitService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  stats = signal<Stats | null>(null);
  todayPlans = signal<Task[]>([]);
  activeGoals = signal<Goal[]>([]);
  habits = signal<Habit[]>([]);

  // --- Habit widget computeds ---
  todayHabits = computed(() =>
    this.habits()
      .filter((h) => h.scheduledToday)
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      })
  );
  scheduledToday = computed(() => this.todayHabits().length);
  doneToday = computed(() => this.todayHabits().filter((h) => h.doneToday).length);
  todayPct = computed(() => {
    const total = this.scheduledToday();
    return total === 0 ? 0 : (this.doneToday() / total) * 100;
  });

  readonly ringCirc = 2 * Math.PI * 42;
  ringOffset = computed(() => this.ringCirc * (1 - this.todayPct() / 100));

  toggleHabit(h: Habit) {
    const wasDone = h.doneToday;
    this.habitService.toggleToday(h.id).subscribe({
      next: (u) => {
        if (u.doneToday && !wasDone) this.toast.success(`Nice — ${u.streak}-day streak`);
      },
    });
  }

  consistency30 = computed(() => {
    let scheduledSlots = 0;
    let doneSlots = 0;
    for (const h of this.habits()) {
      for (const d of h.history) {
        if (d.scheduled) {
          scheduledSlots++;
          if (d.done) doneSlots++;
        }
      }
    }
    return scheduledSlots === 0 ? 0 : (doneSlots / scheduledSlots) * 100;
  });

  bestStreak = computed(() => this.habits().reduce((max, h) => Math.max(max, h.streak), 0));

  cheerTitle = computed(() => {
    const c = this.consistency30();
    return c >= 80 ? 'On fire!' : c >= 55 ? 'Keep going!' : c > 0 ? 'Small steps count!' : 'Start today!';
  });

  // Per-day aggregate completion ratio across the 30-day history window.
  // -1 = rest day (nothing scheduled). Feeds the heat strip, sparklines,
  // the week dots, and the trend chip.
  dailyRatios = computed<{ date: string; ratio: number }[]>(() => {
    const habits = this.habits();
    if (habits.length === 0) return [];
    const len = habits[0].history.length;
    const out: { date: string; ratio: number }[] = [];
    for (let i = 0; i < len; i++) {
      const date = habits[0].history[i].date;
      let scheduled = 0, done = 0;
      for (const h of habits) {
        const cell = h.history[i];
        if (cell?.scheduled) { scheduled++; if (cell.done) done++; }
      }
      out.push({ date, ratio: scheduled === 0 ? -1 : done / scheduled });
    }
    return out;
  });

  heatmap = computed<{ date: string; color: string; tooltip: string }[]>(() =>
    this.dailyRatios().map((d) => ({
      date: d.date,
      color: this.heatColor(d.ratio),
      tooltip: d.ratio < 0 ? `${d.date} · rest day` : `${d.date} · ${Math.round(d.ratio * 100)}% done`,
    }))
  );

  private heatColor(ratio: number): string {
    if (ratio < 0) return 'var(--bg-hover)';
    if (ratio === 0) return 'rgba(239, 68, 68, 0.18)';
    const alpha = 0.25 + ratio * 0.75;
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  }

  // Trend: 2nd half of the 30-day window vs the 1st half (percentage points).
  trendDelta = computed(() => {
    const days = this.dailyRatios().filter((d) => d.ratio >= 0);
    if (days.length < 6) return 0;
    const mid = Math.floor(days.length / 2);
    const avg = (arr: { ratio: number }[]) => arr.reduce((s, d) => s + d.ratio, 0) / arr.length;
    return Math.round((avg(days.slice(mid)) - avg(days.slice(0, mid))) * 100);
  });

  // This week's Sun..Sat completion dots
  weekDots = computed<{ label: string; state: 'done' | 'partial' | 'none' | 'future' }[]>(() => {
    const byDate = new Map(this.dailyRatios().map((d) => [d.date, d.ratio]));
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return labels.map((label, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (d > now) return { label, state: 'future' as const };
      const ratio = byDate.get(key);
      if (ratio === undefined || ratio < 0) return { label, state: 'none' as const };
      return { label, state: ratio >= 1 ? 'done' as const : ratio > 0 ? 'partial' as const : 'none' as const };
    });
  });

  // --- Sparklines: smooth SVG paths from real recent data.
  // Quadratic segments through midpoints give the soft curve the design wants.
  private sparkPoints(values: number[]): string {
    if (values.length < 2) return 'M0 30 L120 30';
    const max = Math.max(...values, 0.001);
    const stepX = 120 / (values.length - 1);
    const pts = values.map((v, i) => [i * stepX, 32 - (v / max) * 24 + 2] as const);
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const mx = (px + cx) / 2, my = (py + cy) / 2;
      d += ` Q${px.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    return d;
  }
  sparkPlans = computed(() => {
    const days = this.dailyRatios().slice(-14);
    return this.sparkPoints(days.map((d) => Math.max(0, d.ratio)));
  });
  sparkDone = computed(() => {
    const days = this.dailyRatios().slice(-14);
    // slight phase shift so the three lines don't look identical
    return this.sparkPoints(days.map((d, i) => Math.max(0.05, d.ratio < 0 ? 0.05 : d.ratio * (0.7 + 0.3 * Math.sin(i / 2)))));
  });
  sparkGoals = computed(() => {
    const g = this.activeGoals();
    if (g.length >= 2) return this.sparkPoints(g.map((x) => x.progress + 5));
    return this.sparkPoints(this.dailyRatios().slice(-14).map((d, i) => 0.4 + 0.2 * Math.sin(i / 3) + Math.max(0, d.ratio) * 0.3));
  });

  // --- Mini calendar ---
  readonly mcDow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private calRef = signal(new Date());
  calLabel = computed(() => this.calRef().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
  calCells = computed(() => {
    const ref = this.calRef();
    const y = ref.getFullYear(), m = ref.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // back to Sunday
    const today = new Date();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push({
        key: d.toISOString().slice(0, 10) + i,
        day: d.getDate(),
        inMonth: d.getMonth() === m,
        isToday: d.toDateString() === today.toDateString(),
      });
    }
    return cells;
  });
  calShift(delta: number) {
    const ref = new Date(this.calRef());
    ref.setMonth(ref.getMonth() + delta, 1);
    this.calRef.set(ref);
  }
  goCalendar() { this.router.navigate(['/calendar']); }

  habitTimeLabel(h: Habit): string {
    if (h.startTime && h.endTime) return `${h.startTime} – ${h.endTime}`;
    return h.startTime ?? h.endTime ?? '';
  }

  // Each glyph category gets its own gradient tile + glow so the checklist
  // reads as a colorful icon set, independent of the habit's stored color.
  private static readonly TILES: Record<string, { bg: string; glow: string }> = {
    sun:    { bg: 'linear-gradient(140deg, #fde047, #f59e0b)', glow: 'rgba(245, 158, 11, .45)' },
    bed:    { bg: 'linear-gradient(140deg, #a78bfa, #6d28d9)', glow: 'rgba(139, 92, 246, .45)' },
    run:    { bg: 'linear-gradient(140deg, #4ade80, #059669)', glow: 'rgba(16, 185, 129, .45)' },
    book:   { bg: 'linear-gradient(140deg, #60a5fa, #2563eb)', glow: 'rgba(59, 130, 246, .45)' },
    pencil: { bg: 'linear-gradient(140deg, #f9a8d4, #db2777)', glow: 'rgba(236, 72, 153, .45)' },
    laptop: { bg: 'linear-gradient(140deg, #fb923c, #ea580c)', glow: 'rgba(249, 115, 22, .45)' },
    meal:   { bg: 'linear-gradient(140deg, #2dd4bf, #0d9488)', glow: 'rgba(20, 184, 166, .45)' },
    spark:  { bg: 'linear-gradient(140deg, #94a3b8, #475569)', glow: 'rgba(100, 116, 139, .45)' },
  };
  tileBg(h: Habit): string {
    return DashboardComponent.TILES[this.habitGlyph(h)].bg;
  }
  tileShadow(h: Habit): string {
    const t = DashboardComponent.TILES[this.habitGlyph(h)];
    return `inset 0 1.5px 0 rgba(255,255,255,.4), 0 4px 12px ${t.glow}`;
  }

  // Pick a custom checklist glyph from the habit's name (order matters:
  // "Study / Work" should read as a book, not a laptop).
  habitGlyph(h: Habit): string {
    const t = (h.title ?? '').toLowerCase();
    if (/wake|morning|sunrise|rise/.test(t)) return 'sun';
    if (/sleep|nap|bed|night/.test(t)) return 'bed';
    if (/walk|run|jog|gym|exercise|excercise|workout|yoga|sport|cycle|swim/.test(t)) return 'run';
    if (/study|read|revis|learn|course|class/.test(t)) return 'book';
    if (/doodl|draw|sketch|design|note|journal|write|plan/.test(t)) return 'pencil';
    if (/office|work|freelance|code|project|job|meeting/.test(t)) return 'laptop';
    if (/eat|meal|breakfast|lunch|dinner|food|cook|water|drink/.test(t)) return 'meal';
    return 'spark';
  }

  showAddPlan = false;
  today = new Date();
  planTypes = PLAN_TYPES;

  get greeting() { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }

  ngOnInit() {
    this.loadAll();
    this.habitService.habits$.subscribe((habits) => this.habits.set(habits));
    if (this.route.snapshot.queryParams['gcal'] === 'connected') {
      this.toast.success('Google Calendar connected! Your plans will now sync automatically.');
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  loading = signal(true);

  loadAll() {
    this.loading.set(true);
    let loaded = 0;
    const checkDone = () => { loaded++; if (loaded >= 3) this.loading.set(false); };

    this.http.get<Stats>(`${environment.apiUrl}/dashboard/stats`).subscribe({
      next: (s) => { this.stats.set(s); checkDone(); },
      error: () => { checkDone(); this.retryOnce(); },
    });
    this.taskService.getToday().subscribe({
      next: (t) => {
        const sorted = t.sort((a, b) => {
          if (!a.startTime && !b.startTime) return 0;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });
        this.todayPlans.set(sorted);
        checkDone();
      },
      error: () => checkDone(),
    });
    this.goalService.loadAll().subscribe({
      next: (goals) => { this.activeGoals.set(goals.filter((g: Goal) => g.status === 'ACTIVE').slice(0, 4)); checkDone(); },
      error: () => checkDone(),
    });
    this.habitService.loadAll().subscribe({ error: () => {} });
  }

  private retryOnce() {
    setTimeout(() => this.loadAll(), 3000);
  }

  onPlanAdded() { this.showAddPlan = false; this.loadAll(); }

  getPlanColor(type: string): string { return this.planTypes.find((t) => t.value === type)?.color ?? '#3b82f6'; }
  getPlanIcon(type: string): string { return this.planTypes.find((t) => t.value === type)?.icon ?? '✓'; }
  getPlanLabel(type: string): string { return this.planTypes.find((t) => t.value === type)?.label ?? 'Task'; }
}
