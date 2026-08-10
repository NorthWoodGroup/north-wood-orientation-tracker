# CLAUDE.md — North Wood Group Staff Orientation Tracker

Architecture and decision reference for this project. Read this before making structural
changes. The original spec is `staff-orientation-tracker-spec.md` in this folder — this
file tracks what was actually decided/built, which may extend or override the spec's
"Open Items" section.

## Decisions made (overriding spec §8 "Open Items")

- **PIN storage: salted hash, not plaintext.** Spec's v1 default was plaintext; user chose
  the hashed upgrade. Staff/Admins tabs store `PINSalt` + `PINHash` (SHA-256(pin + salt),
  hex) instead of a raw `PIN` column. Consequence: admins cannot look up a forgotten PIN —
  only reset it (generate new salt+hash). See `apps-script/Auth.gs`.
- **Branding**: real North Wood Group logo supplied (circular tree/roots emblem, wordmark
  "NORTH-WOOD GROUP"). Two exports live in `assets/`: `logo-dark-bg.png` (light mark, use
  on dark backgrounds) and `logo-light-bg.png` (use on light backgrounds). Brand is strict
  monochrome (black/white/grey) — the UI chrome follows that, but standard status colors
  (green/amber/red) are used for Completed/In Progress/Overdue indicators since the
  dashboard needs that distinction and the brand doesn't specify one.
- **GitHub repo**: not created yet. Building locally in this folder first; user will create
  the empty GitHub repo and push when ready.
- **Google Sheet**: not created yet. `apps-script/Setup.gs` has a `setup()` function that
  provisions all tabs/headers/validation in one run against a blank bound Sheet — no manual
  tab-building needed.

## Data model (as built — see Setup.gs for the authoritative column list)

**Staff**: `StaffID, Name, Username, Email, PINSalt, PINHash, Role, Office, Active`

**Admins**: `AdminID, Name, Username, Email, PINSalt, PINHash`

> `Email` isn't in the spec's draft column list but is required for §5's notification
> requirements (assignment emails to staff, overdue alerts to admins) — added as a
> necessary extension, not a deviation from intent.

**Modules**: `ModuleID, Title, Description, Category, FileType, FilePathOrURL,
CompletionMethod, DaysToComplete, DefaultForRoles`
- `FileType`: `pdf | doc | link | video`
- `CompletionMethod`: `checkbox | scroll | quiz`
- `DefaultForRoles`: comma-separated role list, e.g. `Warehouse,Driver`

**Quizzes** (sub-tab, only rows for modules with `CompletionMethod = quiz`):
`ModuleID, QuestionID, QuestionText, ChoiceA, ChoiceB, ChoiceC, ChoiceD, CorrectChoice`

**Assignments** (core tracking table): `AssignmentID, StaffID, ModuleID, AssignedDate,
DueDate, Status, CompletedDate, Source`
- `Status`: `Not Started | In Progress | Completed | Overdue` — written by the backend, not
  computed client-side. `In Progress` is set the first time a staff member opens a module.
  `Overdue` is set by a daily time-based trigger (`checkOverdueAssignments` in
  `Assignments.gs`) that also fires the admin alert email; it does not un-set itself if the
  module is later completed late (`CompletedDate` on an `Overdue` row is what marks it
  done, not a status flip back).
- `DueDate` is computed once at assignment time (`AssignedDate + Module.DaysToComplete`)
  and stored, not recalculated later — matches spec's stated design.
- `Source`: `role default | individual override`, for traceability per spec.

## Backend (Apps Script, `apps-script/`)

Single web app, `doPost`-only JSON API (no `doGet` API surface — Apps Script web apps
don't support custom CORS response headers, so the frontend posts with
`Content-Type: text/plain;charset=utf-8` to avoid a CORS preflight, and the body is
`{action, payload}`; `Code.gs` dispatches on `action`). Deploy as "Execute as: Me",
"Who has access: Anyone" so the static frontends can call it unauthenticated — auth is
handled at the application layer (username+PIN), not via Google account.

Files:
- `Code.gs` — `doPost` router, dispatches to action handlers, wraps responses as JSON.
- `Setup.gs` — `setup()` one-time tab/header provisioner. Safe to re-run (skips tabs that
  already exist).
- `SheetService.gs` — generic sheet-as-objects helpers (`getRows`, `appendRow`, `updateRow`,
  `nextId`) used by every other file. Don't hand-roll range math elsewhere.
- `Auth.gs` — `hashPin`/`makeSalt`/`authenticateStaff`/`authenticateAdmin`.
- `Assignments.gs` — assignment CRUD, role-default application, status transitions, the
  daily overdue sweep.
- `Notifications.gs` — `MailApp` senders for new-assignment and overdue-alert emails.
- `GitHubService.gs` — commits a base64 file to the materials repo via the GitHub Contents
  API, reading the PAT from `PropertiesService.getScriptProperties().GITHUB_TOKEN`. Never
  log or return the token value.

## Frontends

Both are single self-contained HTML files (no build step, no framework) — same pattern as
other MedPro internal tools (Form Builder, OVP task apps). Each has a `CONFIG.API_URL`
constant near the top of its `<script>` block that must be set to the deployed Apps Script
web app URL before use.

- `staff-app/index.html` — sign-in, dashboard (module list with status/due date), module
  viewer modal that adapts its "mark complete" control to the module's
  `CompletionMethod` (plain checkbox / scroll-to-unlock / quiz).
- `admin-app/index.html` — staff CRUD, module library CRUD, role-default + individual
  assignment management, completion dashboard (staff × module grid, filterable, overdue
  highlighted), content upload (calls `GitHubService.gs` via the backend).

## Known gaps / not yet wired up

- GitHub repo doesn't exist yet — `GitHubService.gs` is written but untestable until the
  repo + PAT exist (see `SETUP.md`).
- Quiz question content is a generic mechanism only — no real module quizzes have been
  authored yet (spec explicitly deferred this).
- No automated tests — these self-contained-HTML + Apps Script projects in this org don't
  use a test harness; verification is manual (see `SETUP.md`).
