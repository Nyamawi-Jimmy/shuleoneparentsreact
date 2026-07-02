# HANDOVER — ShuleOne Mobile (`shuleoneparentsreact`)

> Living digest for cross-session continuity. **Update this at the end of every working pass.**
> Full reference plan: `~/.claude/plans/latest-shuleoneparentsreact-app-latest-memoized-thunder.md`.

_Last updated: 2026-07-02 — Phase 1 (branch reorg + handover) complete._

---

## 1. Project goals

Bring the Expo/React-Native mobile app to feature parity with the `lms-react` web
front-end, wired to the real `lms-spring` backend, on the latest tech.

**Roles in scope:** Parent, School Student, **Independent Learner**. (Tutor stays web-only.)

## 2. The three repos

| Repo | Path | Stack | Default branch |
|------|------|-------|----------------|
| Mobile | `C:/EDUCRAFT PROJECTS/LMS APP/shuleoneparentsreact` | Expo / RN / TS | `main` |
| Web | `C:/EDUCRAFT PROJECTS/LMS WEB/lms-react` | React 19 / Vite 8 | `main` |
| Backend | `C:/EDUCRAFT PROJECTS/LMS WEB/lms-spring` | Spring Boot 4 / Java 17 / MariaDB | `main` |

**Standing rule:** commit all work to `main` in every repo. (`origin/ken` on the web/backend repos is legacy — leave untouched.)

## 3. Branch topology (done)

Mobile app history now lives on `main`. The old empty `main` and the `master`
branch have been retired. `origin/HEAD → main`.

## 4. Run / env instructions

**Backend** (from `lms-spring`): set env vars then run.
```
DB=sec  DB_USERNAME=root  DB_PASSWORD=walgotech
./mvnw spring-boot:run
```
- MariaDB must be up on `localhost:3306` with database `sec`.
- Datasource keys: `spring.datasource.url=jdbc:mariadb://localhost:3306/${DB:sec}...`,
  `username=${DB_USERNAME}`, `password=${DB_PASSWORD}`.
- Health check: `GET /actuator/health`.

**Mobile** (from `shuleoneparentsreact`):
```
npm install
npx expo start        # then a=Android, w=web
```
- API base URL currently hardcoded in `config/api.ts` (ngrok). **Phase 2 moves this
  to `app.config` + `expo-constants` extra.** For a phone, point it at the laptop
  LAN IP (`ipconfig | findstr IPv4`), not localhost.

## 5. Status

- [x] **Phase 1** — Branch reorg (`master`→`main`), `.idea/` gitignored, HANDOVER created.
- [ ] **Phase 2** — Modernization: Expo 54→56 (RN 0.85/React 19.2), `expo-secure-store`
      tokens, env-based API config, TanStack Query, `expo-notifications`, maps, `react-native-webview`.
- [ ] **Phase 3** — Parent parity (P1): calendar/events, live classes+join, announcements,
      parent assignments, exams, documents/PDF, push, forgot-password, transport live map,
      AI coach/insights/weekly report.
- [ ] **Phase 4** — Student learning wired (P2): curriculum, lesson player, quest engine,
      quiz, AI tutor, gamification/leaderboard, progress/mastery/diagnostic, exams, live
      classes, portfolio (replace mock data).
- [ ] **Phase 5** — Coding labs (P3, via WebView) + Independent Learner role (P4).

## 6. Architecture notes (for reuse)

- **API client:** `config/api.ts` (`apiFetch`, `ApiError`). Typed mirrors in `api/*.types.ts`.
- **Data hooks pattern:** `hooks/use*.ts` (custom `useState`+`useFocusEffect`) — migrating to TanStack Query.
- **Auth/child context:** `context/AuthContext.tsx` (tokens in AsyncStorage → moving to SecureStore),
  `context/SelectedChildContext.tsx`, `context/ParentProfileContext.tsx`.
- **Billing/tier gating:** `api/billing.ts`, `config/tier.ts`, `components/FeePaymentSheet.tsx`.
- **Authed download:** `utils/downloadAuthFile.ts`.
- **Theming:** `theme/ThemeContext.tsx`, `theme/palettes.ts`.
- **Routing:** expo-router file-based under `app/` — parent `(tabs)`, student `(student-tabs)`.

## 7. Current state: mobile vs web

- **Parent side:** ~85% API-wired (home, academics, fees, billing, chat, calls,
  communication, diary, notifications, transport-list, reminders).
- **Student side:** UI complete but **mostly mock data** (`mockData`/`learningData`/`lessonContent`).
- **Independent Learner role:** not present yet.

## 8. Known gotchas

- `config/api.ts` LAN-IP/ngrok pitfall (localhost = phone, not laptop).
- Backend real-time (calls) is delegated to ShuleOne-main WebSocket; chat is REST polling.
- Tokens currently in AsyncStorage (insecure) — Phase 2 moves to SecureStore.
- Expo SDK upgrade (54→56) may surface library-compat issues; run `npx expo-doctor` after.
