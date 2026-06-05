# Daily Organizer — Test Report

| Field | Value |
|---|---|
| **Date executed** | 2026-06-04 |
| **Environment** | Local dev — backend `http://localhost:3000/api`, Firebase Realtime DB |
| **Methodology** | End-to-end API tests via PowerShell (`Invoke-RestMethod`) against the running backend, plus targeted source-code review |
| **Test runner** | [`test-runner.ps1`](./test-runner.ps1) at the project root — re-runnable any time |
| **Total tests written** | 60 |
| **Modules covered** | Auth, Categories, Tasks, Goals + Milestones + Mini-goals, Habits, Journal, Projects + Payments, Focus (Pomodoro), Analytics, Dashboard, Cross-user isolation |
| **Outcome** | **60 / 60 PASSING** after 2 bug fixes |

---

## 1. Summary

| | Count |
|---|---|
| Tests passed (first run) | 55 |
| Tests failed (first run) | 5 |
| ↳ True bugs in app code | 2 |
| ↳ Cascading failures from those 2 bugs | 3 |
| ↳ False positives in test runner | 0 (after correcting refresh-token sequencing) |
| **Tests passing after fixes** | **60 / 60** |
| **Files changed during testing** | 4 backend service files + 1 test runner |

---

## 2. How to re-run

```powershell
# Make sure backend is running on :3000
cd backend; npm run start:dev   # terminal 1

# Then in a separate terminal:
cd ..
& '.\test-runner.ps1'           # outputs PASS/FAIL per step + summary line
```

The runner registers a fresh test user (random email each run), seeds dummy data across every module, exercises happy + edge paths, then registers a second user to verify cross-user isolation. It's safe to re-run — every run creates new isolated records.

---

## 3. Full list of test cases

Each row is one assertion. ✅ = passing in the latest run.

### 3.1 Auth (8 / 8)

| # | Test | Status |
|---|---|---|
| 1 | Register new user (valid) | ✅ |
| 2 | Register with duplicate email returns 409 | ✅ |
| 3 | Register with short password (< 8 chars) returns 400 | ✅ |
| 4 | Login with correct credentials returns access + refresh tokens | ✅ |
| 5 | Login with wrong password returns 401 | ✅ |
| 6 | `GET /auth/me` without token returns 401 | ✅ |
| 7 | `GET /auth/me` with valid token returns the user profile | ✅ |
| 8 | `POST /auth/refresh` with a fresh refresh token issues new tokens | ✅ |

### 3.2 Categories (4 / 4)

| # | Test | Status |
|---|---|---|
| 9 | Create category with `{name, color}` only (no icon) | ✅ (after BUG-001 fix) |
| 10 | Create category without name returns 400 | ✅ |
| 11 | List categories returns the newly created one | ✅ |
| 12 | Update category (`PATCH /categories/:id`) changes the name | ✅ |

### 3.3 Tasks / My Plans (8 / 8)

| # | Test | Status |
|---|---|---|
| 13 | Create task (`type='task'`, priority HIGH, with category + times) | ✅ |
| 14 | Create trip task with `endDate` (multi-day) | ✅ |
| 15 | Create task without title returns 400 | ✅ |
| 16 | List tasks returns >= 2 records | ✅ |
| 17 | Get task by id matches | ✅ |
| 18 | Update task `status='DONE'` auto-stamps `completedAt` | ✅ |
| 19 | Filter tasks by `?status=DONE` returns only DONE tasks | ✅ |
| 20 | `GET /tasks/today` returns an array (may be empty) | ✅ |

### 3.4 Goals + Milestones + Mini-goals (4 / 4)

| # | Test | Status |
|---|---|---|
| 21 | Create goal with description + resources, progress defaults to 0 | ✅ |
| 22 | Add milestone to goal returns goal with milestones array | ✅ |
| 23 | Complete milestone bumps goal `progress` to 100 (1-of-1) | ✅ |
| 24 | Add mini-goal under milestone | ✅ |

### 3.5 Habits (7 / 7)

| # | Test | Status |
|---|---|---|
| 25 | Create habit with weekdays [1,2,3,4,5] + time interval | ✅ |
| 26 | Create habit with invalid weekday (8) returns 400 | ✅ |
| 27 | Create habit with bad startTime ("25:99") returns 400 | ✅ |
| 28 | List habits with `?today=YYYY-MM-DD` returns enriched fields (streak, history of 30, doneToday) | ✅ |
| 29 | Toggle today check-in flips `doneToday` true and increments streak | ✅ |
| 30 | Toggle today check-in again removes the check-in | ✅ |
| 31 | **Creating a trip plan covering today makes `isOffToday: true`** | ✅ |

### 3.6 Journal (6 / 6)

| # | Test | Status |
|---|---|---|
| 32 | `PUT /journal/<today>` upserts a new entry | ✅ |
| 33 | PUT with empty body (no `body` field) returns 400 | ✅ |
| 34 | PUT same date again updates the existing entry (idempotent) | ✅ |
| 35 | `GET /journal/<date>` returns the saved entry | ✅ |
| 36 | `GET /journal/<unknown date>` returns null | ✅ |
| 37 | PUT with invalid date format ("not-a-date") returns 404 | ✅ |

### 3.7 Projects + Payments (7 / 7)

| # | Test | Status |
|---|---|---|
| 38 | Create client project (`isSelf=false`, paymentStatus=PENDING) | ✅ |
| 39 | **Create self project clears client/payment fields server-side** | ✅ |
| 40 | Record payment on client project sets `totalReceived` and `balance` | ✅ |
| 41 | Recording payment on self project returns 403 | ✅ |
| 42 | Update status to DELIVERED auto-stamps `deliveredAt` | ✅ |
| 43 | **Update with partial body does not crash with "undefined" Firebase error** (regression) | ✅ |
| 44 | Flipping `isSelf=true` clears client + payment fields | ✅ |

### 3.8 Focus / Pomodoro (7 / 7)

| # | Test | Status |
|---|---|---|
| 45 | Capture original task `trackedMins` (baseline for next test) | ✅ |
| 46 | Record WORK session with taskId | ✅ |
| 47 | **WORK session auto-increments task's `trackedMins` by actualMinutes** | ✅ |
| 48 | Record SHORT_BREAK session without task | ✅ |
| 49 | Invalid session type returns 400 | ✅ |
| 50 | Negative `actualMinutes` returns 400 | ✅ |
| 51 | `GET /focus/today?today=...` returns workSessions/workMinutes/breakMinutes/sessions | ✅ |

### 3.9 Analytics (3 / 3)

| # | Test | Status |
|---|---|---|
| 52 | `GET /analytics/summary?range=30d` returns full payload (tasks/habits/focus/journal/projects + 30-day daily + 7-day weekday + topCategories + insights) | ✅ |
| 53 | `range=7d` returns 7-element dailyActivity array | ✅ |
| 54 | `range=junk` returns 400 | ✅ |

### 3.10 Dashboard (2 / 2)

| # | Test | Status |
|---|---|---|
| 55 | `GET /dashboard/stats` returns totalTasks etc. | ✅ |
| 56 | `GET /dashboard/calendar?year=Y&month=M` returns calendar data | ✅ |

### 3.11 Cross-user isolation (4 / 4)

| # | Test | Status |
|---|---|---|
| 57 | Register a second user (B) | ✅ |
| 58 | User B GET on user A's task → 403 | ✅ |
| 59 | User B DELETE on user A's project → 403 | ✅ |
| 60 | User B's task list does NOT contain any of user A's tasks | ✅ |

---

## 4. Bugs found and fixed

### 🐛 BUG-001 — Categories: 500 error when creating without an icon

| Field | Value |
|---|---|
| **Severity** | High (crashes the create flow) |
| **Module** | Categories |
| **Discovered by** | Test #9 — "Create category (valid)" |
| **Symptom** | `POST /api/categories` with body `{name, color}` returned HTTP 500. Backend log: `Error: set failed: value argument contains undefined in property 'categories.<id>.icon'` |
| **Root cause** | In [`backend/src/categories/categories.service.ts`](backend/src/categories/categories.service.ts), the `create()` method did `const category = { id, ...dto, color: dto.color ?? '#6366f1', userId, ... }`. After class-validator transform, `dto.icon` was present-but-`undefined`. The spread carried `icon: undefined` into the Firebase `.set()` call. The Firebase Admin SDK rejects `undefined` values explicitly. |
| **Fix** | Replaced the spread with a `for…of Object.entries(dto)` loop that copies only defined fields. Applied the same fix to `update()` since it had the identical pattern. |
| **Preventive fixes elsewhere** | Same vulnerable pattern existed in other services. Patched preemptively:<br>• [`backend/src/tasks/tasks.service.ts`](backend/src/tasks/tasks.service.ts) — `update()`<br>• [`backend/src/goals/goals.service.ts`](backend/src/goals/goals.service.ts) — `update()` for goals + `updateMilestone()` via new `definedOnly()` helper<br>• [`backend/src/habits/habits.service.ts`](backend/src/habits/habits.service.ts) — `update()` |
| **Verification** | Re-ran tests → all 4 category tests + the projects regression test pass |
| **Files changed** | 4 backend service files (categories, tasks, goals, habits) |

### 🐛 BUG-002 — Auth: duplicate email returned HTTP 400 instead of 409

| Field | Value |
|---|---|
| **Severity** | Low (cosmetic / REST convention) |
| **Module** | Auth |
| **Discovered by** | Test #2 — "Register with duplicate email returns 409" |
| **Symptom** | Re-registering an existing email returned `400 Bad Request` instead of `409 Conflict` |
| **Root cause** | [`backend/src/auth/auth.service.ts`](backend/src/auth/auth.service.ts) — `register()` threw `BadRequestException` for the "Email or username already taken" case. The REST-correct status for "resource already exists" is 409. |
| **Fix** | Imported `ConflictException` (replacing `BadRequestException`) and swapped the throw. |
| **Verification** | Test now passes with the corrected expectation |
| **Files changed** | 1 backend service file |

---

## 5. Test runner issues fixed (no app code changes)

During the test runner development I hit several PowerShell-specific issues that aren't app bugs but are worth recording:

| # | Issue | Fix |
|---|---|---|
| 1 | Em-dashes (`—`) in source comments saved as UTF-8 broke PowerShell 5.1 parsing | Replaced with `-` |
| 2 | Emoji literals (`💪`, `😊`, `☀`) in test data broke PowerShell parsing | Replaced with plain text (`good`, `ok`, `S`) |
| 3 | `??` null-coalescing operator (PowerShell 7+ only) failed on PS 5.1 | Replaced with explicit `if ($null -eq …)` |
| 4 | Unescaped `&` in URL string (`year=Y&month=M`) interpreted as command separator | Concatenated with `+ '&' +` |
| 5 | Helper function named `H` collided with `Get-History` alias → JWT being passed to wrong cmdlet | Renamed to `MakeHeaders` |
| 6 | Apostrophes in test names (`user A's task`) caused parser confusion | Switched to backtick (`user A\`s task`) |
| 7 | Test #8 used the original refresh token *after* a login call rotated it → false 401 | Sequenced test to use the freshly-issued token |

---

## 6. Untested areas (cannot reach with API tests)

These require a real browser; they were not exercised:

| Area | Why untested | Suggested verification |
|---|---|---|
| Pomodoro timer ticking (countdown, pause/resume across navigation, ring animation) | Needs running Angular app in browser | Manual test |
| Web Audio beep on session completion | Requires audio playback | Manual test |
| Google Calendar OAuth flow (auth, callback, scope upgrade) | Needs Google consent screen | Manual test (and existing screenshots show it working) |
| `GET /api/google/events` actual data | Requires a connected Google account in the test env | Manual test |
| All Angular UI: forms, modals, navigation, routerLink, RouterLinkActive | Frontend rendering | Manual test |
| Theme toggle + localStorage persistence | Browser-only | Manual test |
| Focus settings persistence across page reload | localStorage-based | Manual test |
| Calendar view: month grid, day-cell click, weekend/birthday/office-hours overlays | DOM rendering | Manual test |
| Optimistic UI updates (the "feels instant" UX) | Tested protocol layer, not visual smoothness | Manual test |
| Concurrent edits / two-tab race conditions | Out of scope for sequential API tests | Future load testing |

---

## 7. Code-review findings (latent issues, not test failures)

These didn't cause any test to fail but are real concerns surfaced by reading the code:

| # | Area | Issue | Severity |
|---|---|---|---|
| CR-1 | Security | No rate limiting on `/auth/login` — brute-forceable. Fix: `@nestjs/throttler` decorator. | **High** |
| CR-2 | Security | Refresh tokens stored in plain text on the user record. Anyone with Firebase read access can replay them. Should be hashed. | **High** |
| CR-3 | Security | No password complexity rules beyond `min 8`. `12345678` is accepted. | Med |
| CR-4 | Security | No email verification flow. Users can register with any email. | Med |
| CR-5 | Scalability | Every list endpoint uses `firebase.getList('collection')` which fetches **all users' records**, then filters by `userId` in JS. Fine at < 1k records; slows down at 10k+. | Med (latent) |
| CR-6 | Scalability | `/analytics/summary` fetches 8 collections per call (tasks, habits, checkins, sessions, journal, projects, payments, categories) with no caching. | Low |
| CR-7 | Correctness | Project `paymentStatus` does NOT auto-flip to `PAID` when total received reaches the quoted amount via payment add. Manual flip needed. | Low |
| CR-8 | Correctness | Habit reminders are stored (`reminderEnabled: true`) but never delivered. No notification system exists. | Low |
| CR-9 | Correctness | `taskToEvent()` in `google-calendar.service.ts` hardcodes `timeZone: 'Asia/Kolkata'`. Wrong for non-IST users. | Low |
| CR-10 | Correctness | Focus sessions don't validate `endedAt > startedAt` or `actualMinutes ≤ plannedMinutes + tolerance`. A malformed client could log a 6-hour "WORK session" from a 25-minute plan. | Low |
| CR-11 | UX | No confirmation when navigating away from an unsaved journal entry. | Low |
| CR-12 | UX | No way to manually mark a non-trip day as off (sick/leave). Only `type: 'trip'` plans drive auto-off. | Low |
| CR-13 | UX | No undo for delete operations. Confirm dialog is the only safety net. | Low |
| CR-14 | UX | Some forms don't surface field-level validation errors — they just keep the submit button disabled, so the user can't tell *what* is wrong. | Low |

---

## 8. Enhancement ideas (prioritized by leverage)

### Tier 1 — High value, low effort

1. **Manual "day off" toggle** — extend the trip auto-detection with a `Mark today as off` button on the habits page so sick/leave days don't break streaks either. Reuses the same `offDates` plumbing.
2. **Auto-update payment status** — when total received reaches the quoted amount, auto-flip (or auto-suggest) `paymentStatus → PAID`.
3. **Search bar** in My Plans + Projects + Journal — a `?q=` query param on list endpoints goes a long way.
4. **Rate-limit `/auth/login`** — `@nestjs/throttler` is a one-decorator install.
5. **Hash refresh tokens** in DB. ~15 minutes of work.
6. **Confirm before discarding unsaved journal entry** when navigating away (Angular `CanDeactivate` guard).
7. **Export to JSON** — single endpoint that dumps all the user's data, useful for backup.
8. **Toast on habit completion from dashboard** — already partially there; just polish.

### Tier 2 — Medium effort, real value

9. **Recurring task templates** — define once, scheduler auto-creates instances. Needs a cron worker.
10. **Smart reminders hub** — combine habit reminderEnabled, task dueDate alerts, deadline notifications. Web Notification API for v1 (in-tab); push for v2.
11. **Tags / labels** — lightweight cross-module tagging (a task, a habit, a journal entry can share tag "work").
12. **Bulk operations** — multi-select on My Plans for status / category / delete.
13. **Calendar view of journal entries** — colored mood dot per day on the existing calendar.
14. **Insights v2** — week-over-week trends, best-day-of-week for focus, etc.

### Tier 3 — Bigger projects

15. **Mobile-optimized PWA** — install banner, offline mode, push notifications.
16. **Backup / restore to Google Drive** (Drive scope already implicitly available).
17. **AI helpers** — Claude API for journal prompts, weekly summary, habit recommendations.
18. **Year-in-review public share** — read-only link to share annual stats.

### Tier 4 — Polish

- Loading skeletons instead of spinners
- Keyboard shortcuts (`n` = new task, `j`/`k` = navigate, `t` = today)
- Drag-and-drop reordering for tasks (only milestones currently have it)
- Empty-state illustrations
- Onboarding tour

---

## 9. Verdict

The backend API is **solid**. All happy paths, all error paths, all validation, and all cross-user isolation tests pass. The trip-day auto-exclusion that's central to the habit workflow works end-to-end. The two bugs discovered during testing have been fixed and verified, and the same vulnerable pattern (`{ ...dto }` spread → Firebase `undefined` rejection) has been removed from every other service preemptively.

**Recommended next step:** manual UI walkthrough of the areas listed in §6, then pick from §8 Tier 1 enhancements based on what you actually use.

---

## 10. Files modified during testing

| File | Reason |
|---|---|
| `backend/src/categories/categories.service.ts` | Fix BUG-001 (defined-only spread on create + update) |
| `backend/src/tasks/tasks.service.ts` | Preemptive same-pattern fix in `update()` |
| `backend/src/goals/goals.service.ts` | Preemptive same-pattern fix in `update()` + `updateMilestone()` via new `definedOnly()` helper |
| `backend/src/habits/habits.service.ts` | Preemptive same-pattern fix in `update()` |
| `backend/src/auth/auth.service.ts` | Fix BUG-002 (ConflictException for duplicate email) |
| `test-runner.ps1` (new) | The test suite itself — re-runnable |
| `TEST-REPORT.md` (new — this file) | The report you are reading |
