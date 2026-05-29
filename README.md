# Daily Organizer

A personal productivity app for managing plans, goals, daily habits, and a calendar — all tied to one account, synced through a custom backend, and stored in Firebase Realtime Database.

> **New here?** Read [DOCUMENTATION.md](./DOCUMENTATION.md) for a complete, beginner-friendly explanation of how the project works (front to back).

---

## Features

| Feature | What it does |
|---------|------|
| **Dashboard** | Today's snapshot: stats, schedule, goal progress, daily routine widget (ring + heatmap + interactive checklist) |
| **My Plans** | All tasks/trips/meetings/events/reminders with filters, pagination (15/page), status changes, edit/delete |
| **Goals** | Goals with milestones, mini-goals, progress %, resources, target dates |
| **Daily Routine (Habits)** | Per-weekday habit tracker with streaks, 30-day heatmap, backfill past dates, time intervals |
| **Calendar** | Monthly grid with all plans plotted by due date, office-hours overlay, holidays, leaves |
| **Categories** | User-defined color-coded labels shared by tasks |
| **Google Calendar sync** | Optional one-way sync: push plans to your Google Calendar |
| **Dark / Light mode** | Auto-detect system preference, manual toggle, persisted |
| **Auth** | Email/password register & login, JWT access tokens + refresh-token rotation |

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
| Categories | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/activity`, `GET /dashboard/calendar?year=…&month=…` |
| Google Calendar | `GET /google/auth`, `GET /google/callback`, `GET /google/status`, `POST /google/disconnect`, `POST /google/sync-all` |

---

## Project layout

```
frontend/src/app/
├── core/
│   ├── guards/         authGuard, noAuthGuard
│   ├── interceptors/   authInterceptor (attach JWT + refresh on 401)
│   ├── models/         TypeScript interfaces (Task, Goal, Habit, Category, User)
│   └── services/       AuthService, TokenStorageService, ThemeService, ToastService, GoogleCalendarService
├── shared/
│   └── components/     LayoutComponent, SidebarComponent, TopbarComponent, ModalComponent, ToastContainer, ConfirmDialog, CategoryManager
└── features/
    ├── auth/           login, register
    ├── dashboard/      stats + habits widget + today's schedule + goal progress
    ├── tasks/          list (My Plans), form, detail (with timer)
    ├── goals/          list, form, detail (milestones + mini-goals)
    ├── habits/         list (Daily Routine), form, service
    ├── calendar/       monthly grid view
    ├── categories/     category service
    └── profile/        edit profile

backend/src/
├── auth/               JWT strategies (access + refresh), guards, register/login/refresh
├── users/              profile read/update
├── tasks/              CRUD + timer endpoints
├── goals/              goals + milestones + mini-goals (nested) with auto-progress
├── habits/             habits + check-ins, streak + heatmap computation
├── categories/         CRUD
├── dashboard/          stats / activity / calendar aggregations
├── google-calendar/    OAuth + sync
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
