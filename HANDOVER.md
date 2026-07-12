# HANDOVER — ShuleOne Mobile (`shuleoneparentsreact`)

> Living digest for cross-session continuity. **Update this at the end of every working pass.**
> Full reference plan: `~/.claude/plans/latest-shuleoneparentsreact-app-latest-memoized-thunder.md`.

_Last updated: 2026-07-02 — Phase 3 (parent parity) in progress._

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

**Backend** (from `lms-spring`): set env vars then run (IntelliJ run config already has them).
```
DB=sec  DB_USERNAME=root  DB_PASSWORD=walgotech  SHULEONE_BASE_URL=...  SHULEONE_INTERNAL_TOKEN=...
./mvnw spring-boot:run     # or run com.educraft.lmsbacknew.LmsApp from IntelliJ
```
- **Run the class `com.educraft.lmsbacknew.LmsApp`** (the `@SpringBootApplication`). Do NOT run
  `org.springframework.boot.SpringApplication` — that throws `IllegalStateException: No sources defined`.
- **Backend listens on port `8091`** (not 8080) — mobile `.env` must point at `:8091`.
- **MariaDB 12.3.2** installed locally via winget; service name `MariaDB`, auto-start,
  `localhost:3306`, root password `walgotech`. Client: `C:\Program Files\MariaDB 12.3\bin\mariadb.exe`.
- DB `sec` created and loaded from dump `C:\EDUCRAFT PROJECTS\DB BACKUP\03-Jul-2026_..._backup.sql\...backup.sql`
  (3.4 GB; the ShuleOne monolith DB — the repo has NO migrations/dump, `ddl-auto=none`, Flyway off).
  Re-import: `mariadb -u root -pwalgotech sec < <dumpfile>`.
- Datasource keys: `spring.datasource.url=jdbc:mariadb://localhost:3306/${DB:sec}...`,
  `username=${DB_USERNAME}`, `password=${DB_PASSWORD}`.
- Also requires `SHULEONE_BASE_URL` + `SHULEONE_INTERNAL_TOKEN` (Companion calls ShuleOne-main via REST).
- Health check: `GET http://localhost:8091/actuator/health`. JWT: set `JWT_SECRET` for stable tokens
  (otherwise a random key is generated each restart and existing tokens are invalidated).

**Toolchain:** Node **24 LTS** installed at `C:\Program Files\nodejs` (via winget).
NOTE: pre-existing tool shells were snapshotted before install — if `node` isn't
found, prepend `C:\Program Files\nodejs` to PATH for that shell. New terminals get it.

**Mobile** (from `shuleoneparentsreact`):
```
npm install
npx expo start        # then a=Android, w=web
```
- Stack: **Expo SDK 56**, RN 0.85.3, React 19.2.3, expo-router 56.2, TS 5.9.
- API base URL is read from `EXPO_PUBLIC_API_BASE_URL` (see `.env.example`); copy to
  `.env` / `.env.local`. From a physical phone use the laptop LAN IP
  (`ipconfig | findstr IPv4`), not localhost. Fallback is the dev ngrok URL.
- Smoke test: `npx expo export --platform web` (bundles all routes) + `npx expo-doctor`.

## 5. Status

- [x] **Phase 1** — Branch reorg (`master`→`main`), `.idea/` gitignored, HANDOVER created.
- [x] **Phase 2** — Modernization done: Expo 54→**56** (RN 0.85.3/React 19.2.3);
      `@react-navigation/*` removed (now via `expo-router/react-navigation` + `expo-router/js-tabs`);
      tokens → `expo-secure-store`; env-based API config (`EXPO_PUBLIC_API_BASE_URL`);
      TanStack Query provider in `app/_layout.tsx`; `expo-notifications` + `react-native-webview`
      installed. `expo-doctor` 21/21, web export clean. **Maps lib deferred to Phase 3**
      (needs a dev build; breaks Expo Go).
- [~] **Phase 3** — Parent parity (P1), IN PROGRESS. Shipped this session:
      **School Calendar** screen, **Live Classes** screen + Jitsi join (opens joinUrl via
      expo-web-browser), **push registration** (`usePushRegistration` → existing
      `registerFcmToken`), **forgot/reset password** flow. See "Corrected gap analysis" below.
- [ ] **Phase 4** — Student learning wired (P2): curriculum, lesson player, quest engine,
      quiz, AI tutor, gamification/leaderboard, progress/mastery/diagnostic, exams, live
      classes, portfolio (replace mock data).
- [ ] **Phase 5** — Coding labs (P3, via WebView) + Independent Learner role (P4).

## 5a. Parent-side web-parity redesign (screen-by-screen port, IN PROGRESS)

Porting the ENTIRE parent side to match the `lms-react` web parent app, screen by
screen, redesigned for mobile with the indigo/Inter design system (`fonts` from
`constants/theme.ts`, colors from `useTheme()`). Priority order: Fees → Class Diary
→ Communication → Academics + Attendance → Transport/Calendar/Documents/Settings.

- [x] **Today (Home)** — greeting hero, status tiles, needs-attention, upcoming, recent activity.
- [x] **Learning** — level/XP/streak hero, subject bars, AI insight, recent activity.
- [x] **More** — full grouped menu (For your child / Messages / Account).
- [x] **Child switcher** — professional bottom sheet (`ChildSwitcherModal`).
- [x] **Fees (`FinanceScreen`)** — segmented **Overview / Statement / Payments** tabs:
      Overview = balance card + % paid donut (react-native-svg) + brought-fwd/this-term/paid
      breakdown + Pay-with-M-Pesa (`FeePaymentSheet`) + latest receipts; Statement = ledger
      lines + term/whole PDF download (`downloadAuthFile`); Payments = pay CTA + M-Pesa
      app-payment list (`getChildFeePayments`) + manual pay instructions (`getPaymentOptions`).
- [x] **Class Diary (`DiaryScreen`)** — week **list** (stats strip + search + week cards
      with sign-progress bars) and **detail** (teacher header, Mon–Fri+Weekly day tabs with
      content dots, learning-plan rows, teacher comment, **parent sign form** →
      `signDiaryEntry` POST `/diary/sign`).
- [x] **Communication (`CommunicationScreen`)** — rebuilt as tabbed **Messages** (Tasks /
      Updates / Chats) matching web: **Assignments** list (new `api/assignments.ts` →
      `GET /api/parent/children/{id}/assignments`, status chips, subject icons),
      **Updates** (announcements with type icons, NEW chips + read-state via
      `getAnnouncementReadIds`/`markAnnouncementRead`, newsletter attachments),
      **Chats** (thread list → `/conversation`). Also fixed the `markAnnouncementRead`
      double-encode bug. *Follow-up: the "help do it" AssignmentPlayer (ParentExamController)
      is a separate P1 build — list is read-only for now.*
- [ ] **Academics + Attendance** — NEXT.
- [ ] Transport, Calendar, Documents, Settings.

## 5b. Corrected gap analysis (parent side is more complete than first assumed)

Tracing the code (not just the web-app summary) revealed the parent side already
has more than the original plan assumed. **Already built** (do NOT rebuild):
- `api/communication.ts` + `useCommunication` load **announcements, live-class list,
  and term events**; `CommunicationScreen` renders announcements. (Live-class list
  and events had data but no dedicated UI — now added as standalone screens.)
- `api/notifications.ts` already has `registerFcmToken`, notif inbox, prefs, reminders.

**Genuinely still missing on the parent side (real backlog):**
1. **Parent Assignments** — `GET /api/parent/children/{id}/assignments` (no `api/assignments.ts`).
2. **Parent Exams** — `ParentExamController` (`/{examId}`, `/{examId}/review`, `POST /{examId}/submit`).
3. **AI Coach / Insights / Weekly report** — `/api/guardian/children/{id}/coach` (+`/stream`,`/history`),
   `.../insights`, `/api/learner/{id}/weekly-report`. Gate behind subscription.
4. **Transport live map** — `GET .../transport/live`; `TransportScreen` is list-only (needs a maps lib + dev build).
5. **Documents/PDF hub** — statements/receipts/report PDFs via `utils/downloadAuthFile.ts`.
6. **Google Sign-In** — `loginWithGoogle` exists in `api/auth.ts` but the button is a stub.

**Systemic bug to fix (mechanical, ~12 call sites):** several `api/*.ts` POST helpers
pass `body: JSON.stringify(obj)` while `apiFetch` also stringifies → double-encoded
requests + the `TS2322 'string' is not assignable to 'object'` errors. Fix: pass the
raw object as `body` (see the corrected `registerFcmToken`, and `api/auth.ts` which is
already correct). Affects billing, call, chat, communication(markRead), fees,
notifications(prefs/reminder), parent, transport.

## 5c. Upstream sync (2026-07-10) — new features to fold into parity backlog

Both sibling repos pulled to latest `main` and rebuilt green:
`lms-react` → `0a86657` (added `sweetalert2`); `lms-spring` → `469d3f2`
(added `spring-boot-starter-websocket` + `pdfbox 3.0.3`). New capabilities that
the mobile app does NOT have yet — add to P2/P3 parity as appropriate:
- **Realtime student events/push** over WebSocket (`realtime/StudentEventsHandler`,
  `StudentPushController`, `StudentWsHandshakeInterceptor`) — first native WS in the
  backend (previously all realtime was delegated to ShuleOne-main). Web uses SockJS/STOMP.
- **AI "Explain this"** (`ai/explain/**` + web `quests/ExplainThis.jsx`, `CheckYourself.jsx`,
  `InteractiveHtml.jsx`) — in-lesson AI explanation/feedback.
- **Professional certificates** (`certificate/**`, PDF via pdfbox; web cert views) —
  completion certificates + public verification.
- **Readiness** endpoints (`ai/readiness/**`, web `ReadinessCard.jsx`).
- **Student nudges / professional routing** (`student/web/StudentNudgeController`,
  `student/service/ProfessionalRouting`, `SchoolCategoryLookup`).
- Tutor: **ExamBuilder**, **QuestReviewQueue/Detail** (web `tutor/pages/*`).
Local runtime `logs/` changes in lms-spring were stashed (`git stash@{0}`) before the pull.

## 5d. Local run state (all three up, 2026-07-12)

All env vars from the reference machine are set at **User scope** (DB creds, `SHULEONE_*`,
`JWT_SECRET`, payment/AI/SMTP keys, etc.). `OPENAI_API_KEY` was truncated in the source dump
so it's unset (Gemini is the active LLM — fine). `IMAGE_STYLE` was empty in the dump → set to
`natural` (image-gen also needs the OpenAI key, so inert).

Running:
- **Backend** `lms-spring` → `http://localhost:8091` (LmsApp, JDK 25). **Functional** — parent
  login hits the real `sec` DB (returns 401 on bad creds). `/actuator/health` returns **503**
  but that's benign: a health indicator times out reaching **ShuleOne‑main at :8090** (that
  separate app isn't running here). DB-backed features work; features that proxy to
  ShuleOne‑main won't until :8090 is up.
- **Web** `lms-react` → `http://localhost:8088` (Vite; its config uses 8088).
- **Mobile** Expo Metro → `http://localhost:8081`; `.env` sets
  `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:8091` (LAN IP was 192.168.100.180 — regenerate per network). `.env` is gitignored.

Run gotchas discovered:
- **Missing Companion tables:** the dump is ShuleOne‑main's DB and lacks the Companion's own
  tables (`app_session`, new-feature tables). Booted **once** with `SPRING_JPA_HIBERNATE_DDL_AUTO=update`
  to create them (additive, non-destructive). They now persist, so normal `ddl-auto=none` runs
  (IntelliJ) work — provided the env vars are present (restart IntelliJ to inherit User-scope vars,
  or add them to the run config).
- **Stale upstream test:** `LearnerBillingServicePaystackRoutingTest` misses the new `PromoService`
  ctor arg → `mvn test`/testCompile fails. Run with `-Dmaven.test.skip=true`. Report upstream.
- Backend launched via `mvnw '-Dmaven.test.skip=true' spring-boot:run` with env loaded from User scope.
- If the phone can't reach the backend, allow inbound **8091**/**8081** through Windows Firewall.

## 6. Architecture notes (for reuse)

- **API client:** `config/api.ts` (`apiFetch`, `ApiError`). Typed mirrors in `api/*.types.ts`.
- **Data hooks pattern:** `hooks/use*.ts` (custom `useState`+`useFocusEffect`) — migrating to TanStack Query.
- **Data fetching (new):** TanStack Query is available app-wide (`QueryClientProvider` in
  `app/_layout.tsx`). New hooks should use `useQuery`/`useMutation`; migrate legacy `use*` hooks opportunistically.
- **Auth/child context:** `context/AuthContext.tsx` (tokens now in `expo-secure-store`, keys use dots),
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
- **Pre-existing WIP type errors** (`npx tsc --noEmit`) inherited from the "wip" commit:
  api client files double-`JSON.stringify` the body (they pass a stringified body to
  `apiFetch`, which stringifies again — fix by passing raw objects), plus gamification
  type drift (`GamificationBar`) and `icon-symbol` typing. These don't block Metro
  bundling; fix each as its screen is touched in P1/P2.
- Node lives at `C:\Program Files\nodejs`; some automated shells may need it re-added to PATH.
