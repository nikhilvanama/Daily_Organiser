# Daily Organizer

A personal productivity app for managing plans, goals, daily habits, and a calendar — all tied to one account, synced through a custom backend, and stored in Firebase Realtime Database.

> **New here?** Read [DOCUMENTATION.md](./DOCUMENTATION.md) for a complete, beginner-friendly explanation of how the project works (front to back).

---

## Features

| Feature | What it does |
|---------|------|
| **Dashboard** | Today's snapshot: stats, schedule, goal progress, Daily Routine widget (ring + heatmap + interactive checklist) |
| **My Plans** | All plans — tasks, trips, journeys, meals, meetings, events, reminders, outings, health appointments, celebrations — with filters, pagination (15/page), status changes, edit/delete |
| **Goals** | Goals with milestones, mini-goals, progress %, drag-and-drop card reordering, per-goal link, resources, target dates |
| **Daily Routine (Habits)** | Per-weekday habit tracker with streaks, 30-day heatmap, schedule filter chips, backfill past dates, time intervals |
| **Journal** | One reflection entry per day with mood emoji, journaling streak, calendar date-picker with entry dots, past-entries browser |
| **Projects (freelance)** | Project pipeline (LEAD → QUOTED → IN_PROGRESS → DELIVERED → PAID/LOST/ON_HOLD) with per-project payments, outstanding balance / monthly income / total revenue stats, live search, deadlines, progress, sample links |
| **Trips** | Kanban board (Bucket List → Planning → Booked → Visited) with drag-and-drop and per-lane sorting. Trips with dates auto-sync to the calendar AND trigger the habit trip-day exclusion. Past trips auto-move to Visited |
| **Buy List** | Kanban board (Want → Considering → Bought → Skipped) with drag-and-drop. Tracks urgency, estimated vs actual price, store, product link |
| **Calendar** | Monthly grid showing plans + Google Calendar events plotted by date; office-hours / weekends / birthdays / leaves / ✈ trip overlays; month-picker dropdown; horizontally scrolling big-block layout on mobile that opens centered on today |
| **Analytics** | KPI cards, daily activity chart, Weekly Review (Mon–Sun breakdown with trend bars), routine-by-weekday and activity-mix charts |
| **AI Assistant** | Floating Gemini-powered chat on every screen: natural-language quick-add for plans, polished journal entries from rough notes, trip creation and moves, Buy List items — slash commands (/plan /journal /trip /buy), voice input, one-tap Undo. Plus a journal agent that drafts the day's entry from your actual tasks or checked habits |
| **Push reminders** | Web Push: 8 AM daily-routine nudge + 11 PM journal reminder (only if the day's entry is missing), IST-scheduled with catch-up delivery; enable from Profile → Notifications |
| **Global search** | Ctrl+K overlay searching plans, goals, trips, buy-list items, projects, and journal entries at once |
| **Themes & Appearance** | Light, Dark, and Paper (warm serif planner look); six primary colors with per-theme shades; auto day/night switching on by default |
| **Sidebar modules** | Choose which modules appear in the sidebar nav (per device, from Profile) |
| **PWA** | Installable on mobile with app icon and service-worker cached shell |
| **Categories** | User-defined color-coded labels shared by tasks |
| **Google Calendar sync** | Two-way: push app plans to Google AND pull events from your subscribed Google calendars (holidays, birthdays, third-party bookings) for read-only display |
| **Auth** | Email/password register & login, JWT access tokens + refresh-token rotation, auto-redirect on expired session, illustrated light/dark backgrounds |

---

## Tech Stack

```
frontend/   Angular 19 standalone components, signals + RxJS, TypeScript, CSS variables
backend/    NestJS 11, Firebase Admin SDK (Realtime DB), Passport JWT, class-validator
hosting     Vercel (frontend), Render (backend)
```

There is **no SQL database** despite the `prisma/` folder name — that folder is historical and now hosts the `FirebaseService` wrapper.

---

## Run it locally

### 1. Prerequisites
- Node.js 18+
- A Firebase Realtime Database project with a service account key
- `npm install -g @angular/cli` (optional — `npm start` also works)

### 2. Configure the backend
Place your Firebase service account JSON at `backend/serviceAccountKey.json`, then create `backend/.env`:

```env
JWT_SECRET="any-random-32-char-string"
JWT_REFRESH_SECRET="a-different-random-32-char-string"
FIREBASE_DATABASE_URL="https://YOUR-PROJECT-default-rtdb.firebaseio.com"
# Optional for Google Calendar sync:
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
# Optional for the AI Assistant (free key from https://aistudio.google.com):
GEMINI_API_KEY="..."
# Optional for push reminders (generate with: npx web-push generate-vapid-keys):
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@example.com"
```

### 3. Install + run

```bash
# Backend (terminal 1)
cd backend
npm install
npm run start:dev
# → http://localhost:3000/api

# Frontend (terminal 2)
cd frontend
npm install
npm start
# → http://localhost:4200
```

Open http://localhost:4200, register an account, and start adding plans.

---

## API surface (quick reference)

All routes are prefixed with `/api` and require a valid JWT in the `Authorization: Bearer <token>` header (except register/login/refresh).

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me` |
| Tasks | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `GET /tasks/today`, `GET /tasks/upcoming`, `POST /tasks/:id/timer/start`, `POST /tasks/:id/timer/stop` |
| Goals | `GET/POST /goals`, `GET/PATCH/DELETE /goals/:id`, milestone & mini-goal sub-routes |
| Habits | `GET/POST /habits`, `PATCH/DELETE /habits/:id`, `POST /habits/:id/checkin[?today=…]`, `POST /habits/:id/checkin/:date[?today=…]` |
| AI | `POST /ai/quick-add` — natural language (+ optional forced mode) → plan / journal / trip / trip-move / buy-item draft via Gemini; `POST /ai/journal-draft` — drafts a day's journal entry from its tasks or checked habits |
| Push | `GET /push/public-key`, `POST /push/subscribe`, `POST /push/unsubscribe`, `POST /push/test`, `GET /push/health` (public keep-alive target) |
| Journal | `GET /journal`, `GET /journal/:date`, `PUT /journal/:date`, `DELETE /journal/:date` |
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/payments`, `DELETE /projects/:projectId/payments/:paymentId` |
| Trips | `GET/POST /trips`, `GET/PATCH/DELETE /trips/:id` |
| Buy List | `GET/POST /buy-list`, `GET/PATCH/DELETE /buy-list/:id` |
| Categories | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/activity`, `GET /dashboard/calendar?year=…&month=…` |
| Google Calendar | `GET /google/auth`, `GET /google/callback`, `GET /google/status`, `POST /google/disconnect`, `POST /google/sync-all`, `GET /google/events?from=…&to=…` |

---

## Project layout

```
frontend/src/app/
├── core/
│   ├── guards/         authGuard, noAuthGuard
│   ├── interceptors/   authInterceptor (attach JWT + refresh on 401)
│   ├── models/         TypeScript interfaces (Task, Goal, Habit, Journal, Project, Category, User)
│   └── services/       AuthService, TokenStorageService, ThemeService, ToastService, GoogleCalendarService
├── shared/
│   └── components/     LayoutComponent, SidebarComponent, TopbarComponent, ModalComponent, ToastContainer, ConfirmDialog, CategoryManager
└── features/
    ├── auth/           login, register
    ├── dashboard/      stats + habits widget + today's schedule + goal progress
    ├── tasks/          list (My Plans), form, detail (with timer)
    ├── goals/          list, form, detail (milestones + mini-goals)
    ├── habits/         list (Daily Routine), form, service
    ├── journal/        day-end reflection page, service
    ├── projects/       list (pipeline), form, detail (payments), service
    ├── trips/          Kanban board (drag-and-drop) + form, service
    ├── buy-list/       Kanban board (drag-and-drop) + form, service
    ├── calendar/       monthly grid (app plans + Google events)
    ├── categories/     category service
    └── profile/        edit profile

backend/src/
├── auth/               JWT strategies (access + refresh), guards, register/login/refresh
├── users/              profile read/update
├── tasks/              CRUD + timer endpoints
├── goals/              goals + milestones + mini-goals (nested) with auto-progress
├── habits/             habits + check-ins, streak + heatmap computation
├── journal/            daily reflections (one entry per date, PUT-upsert)
├── projects/           freelance projects + nested payments, status pipeline
├── trips/              Kanban for travel plans; auto-syncs Planning/Booked/Visited to /tasks
├── buy-list/           Kanban for things to remember to buy
├── categories/         CRUD
├── dashboard/          stats / activity / calendar aggregations
├── google-calendar/    OAuth + two-way sync (push tasks, pull external events)
├── common/             @Public() decorator, @CurrentUser() decorator
└── prisma/             FirebaseService (Realtime DB wrapper) — name is historical
```

---

## Where to look for things

- **Add a new field to a habit?** Edit `backend/src/habits/dto/create-habit.dto.ts`, `backend/src/habits/habits.service.ts`, `frontend/src/app/core/models/habit.model.ts`, `frontend/src/app/features/habits/habit-form/habit-form.component.ts`.
- **Add a new sidebar link?** `frontend/src/app/shared/components/sidebar/sidebar.component.ts`.
- **Change theme colors?** CSS variables at the top of `frontend/src/styles.css`.
- **Add a new feature module?** See the "Adding a new feature module" walkthrough in [DOCUMENTATION.md](./DOCUMENTATION.md#adding-a-new-feature-module).

---

## License

Personal project — no formal license. Use as inspiration.
