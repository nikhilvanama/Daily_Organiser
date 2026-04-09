# TaskFlow — Full-Stack Task Management App

A modern productivity app built with **Angular 19** + **NestJS** + **PostgreSQL**....

## Features

| Feature | Details |
|---------|---------|
| **Daily Tasks** | Create, edit, filter tasks with priorities (High/Medium/Low), due dates, status tracking, and built-in time tracker |
| **Goal Tracker** | Set goals with milestone checklists, auto-calculated progress %, and target dates |
| **Wishlist** | Track items to buy with price, URL, image, mark as purchased |
| **Calendar** | Monthly calendar view showing tasks by due date |
| **Dashboard** | Stats overview, today's tasks, recent activity feed |
| **Dark/Light Mode** | System preference detection + manual toggle, persisted to localStorage |
| **Auth** | JWT-based register/login with refresh token rotation |

---

## Tech Stack

```
frontend/   Angular 19 (standalone components, signals), TailwindCSS v4
backend/    NestJS 11, Prisma ORM, PostgreSQL, Passport JWT
```

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** running locally (or update `DATABASE_URL` in `backend/.env`)
- Angular CLI: `npm install -g @angular/cli`

---

## Setup

### 1. Configure the database

Edit `backend/.env`:
```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/taskflow?schema=public"
JWT_SECRET="change-this-to-a-random-32+-char-string"
JWT_REFRESH_SECRET="change-this-to-a-different-random-32+-char-string"
```

### 2. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
```

### 3. Start the backend

```bash
cd backend
npm run start:dev
# API available at http://localhost:3000/api
```

### 4. Start the frontend

```bash
cd frontend
ng serve
# App available at http://localhost:4200
```

---

## API Overview

All routes are prefixed with `/api/` and require JWT auth (except `/api/auth/register` and `/api/auth/login`).

| Resource | Routes |
|----------|--------|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me` |
| Tasks | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks/:id/timer/start`, `POST /tasks/:id/timer/stop` |
| Goals | `GET/POST /goals`, `GET/PATCH/DELETE /goals/:id`, milestone sub-routes |
| Wishlist | `GET/POST /wishlist`, `GET/PATCH/DELETE /wishlist/:id`, `PATCH /wishlist/:id/purchase` |
| Categories | `GET/POST /categories`, `PATCH/DELETE /categories/:id` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/activity`, `GET /dashboard/calendar` |

---

## Project Structure

```
frontend/src/app/
├── core/
│   ├── guards/         auth.guard.ts, no-auth.guard.ts
│   ├── interceptors/   auth.interceptor.ts  (JWT + refresh)
│   ├── models/         TypeScript interfaces for all entities
│   └── services/       auth, theme, token-storage, toast
├── shared/
│   └── components/     layout, sidebar, topbar, modal, toast-container
└── features/
    ├── auth/           login, register
    ├── dashboard/      stats, today tasks, activity
    ├── tasks/          list, form, detail (with timer)
    ├── goals/          list, form, detail (with milestones)
    ├── wishlist/       list, form
    └── calendar/       monthly grid

backend/src/
├── auth/               JWT strategies, guards, register/login
├── tasks/              CRUD + timer start/stop
├── goals/              CRUD + milestone sub-resources, auto-progress
├── wishlist/           CRUD + purchase endpoint
├── categories/         CRUD
├── dashboard/          aggregate stats + calendar data
└── prisma/             PrismaService (global)
```

---

## Theme System

The app uses **CSS custom properties** for theming. Toggle dark mode with the button in the sidebar or topbar. The preference is saved to `localStorage` and respects `prefers-color-scheme` on first visit.

Key design tokens:
- `--color-accent`: `#6366f1` (indigo)
- `--color-bg-sidebar`: always dark (`#1e293b` in light, `#0f172a` in dark)
- Priority colors: High=red, Medium=amber, Low=green
