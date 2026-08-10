# North Wood Group — Staff Orientation Tracker
## Specification Document (v1.0 — Draft)

---

## 1. Purpose

A web-based tool for North Wood Group to assign staff orientation/training materials, let staff view materials and sign off completion, and let admins track and manage the whole process. Built as a standalone project (new dedicated GitHub repo), following a proven architecture pattern of self-contained web apps backed by Google Sheets.

---

## 2. Users & Roles

| Role | Access |
|---|---|
| **Staff** | Sign in with username + PIN. View assigned training modules. Open/read materials. Mark modules complete (method varies by module). See their own completion status. |
| **Admin** | Multiple admins, all with equal/full permissions. Manage staff records, manage the training module library, set role-based default assignments and individual overrides, set per-module due-date windows, upload new training content, view completion dashboard, receive overdue alerts. |

No staff self-registration — admins provision all staff accounts.

---

## 3. Core Features

### 3.1 Staff-Facing App
- Sign in with **username + PIN** (validated against the Sheet).
- Dashboard showing:
  - Assigned modules (role-based defaults + any individually assigned modules)
  - Status per module: Not Started / In Progress / Completed / Overdue
  - Due date per module (calculated from the date it was assigned to that staff member + that module's configured "days to complete")
- Open a module to view its material (PDF, doc, external link, or embedded YouTube/Vimeo video).
- Mark a module complete using the method configured for that module:
  - Simple checkbox self-attestation, **or**
  - Must scroll/view the full document before the "mark complete" control unlocks, **or**
  - Short quiz/questions to confirm understanding
  - (Method is set per-module by the admin — the app needs to support all three.)
- Receive an email when a new module is assigned to them.

### 3.2 Admin App
- **Staff management**: add/edit/remove staff records (name, username, PIN, role, office/department, hire date if relevant).
- **Module library management**: add/edit/remove training modules — title, description, category, file(s)/link(s), completion method, days-to-complete window.
- **Content upload**: admin uploads training files directly through the admin app; the app commits them into the designated folder structure in the GitHub repo (requires a GitHub API token, stored server-side — see Section 6). Video content is handled as YouTube/Vimeo embed links rather than uploaded files.
- **Assignment rules**:
  - Role-based default module sets (e.g., all staff with role "Warehouse" get modules A, B, C automatically)
  - Individual overrides — add or remove specific modules for a specific staff member
- **Completion dashboard**: view all staff × all modules, filterable by office/role, with status and due dates. Flag overdue items visually.
- **Alerts**: automated email to admins/managers when a staff member's module goes overdue. (No export/reporting needed for v1 — dashboard view is sufficient.)

---

## 4. Data Model (Google Sheets)

Proposed tabs (to be refined once building starts):

**Staff** tab
| Column | Notes |
|---|---|
| StaffID | unique key |
| Name | |
| Username | login |
| PIN | plaintext for v1 — see Section 7 security note |
| Role | drives role-based default assignments |
| Office/Department | |
| Active | Y/N — deactivate without deleting history |

**Modules** tab
| Column | Notes |
|---|---|
| ModuleID | unique key |
| Title | |
| Description | |
| Category | |
| FileType | pdf / doc / link / video |
| FilePath or URL | GitHub repo path, external link, or YouTube/Vimeo URL |
| CompletionMethod | checkbox / scroll-unlock / quiz |
| QuizQuestions | (if applicable — could be a linked sub-tab) |
| DaysToComplete | integer — used to calculate individual due dates |
| DefaultForRoles | which roles get this module by default |

**Assignments** tab (the core tracking table)
| Column | Notes |
|---|---|
| StaffID | |
| ModuleID | |
| AssignedDate | when this module was assigned to this staff member (drives due date) |
| DueDate | calculated: AssignedDate + DaysToComplete |
| Status | Not Started / In Progress / Completed / Overdue |
| CompletedDate | |
| Source | "role default" or "individual override", for traceability |

**Admins** tab
| Column | Notes |
|---|---|
| AdminID / Username / PIN or password | equal permissions for all admins in v1 |

---

## 5. Notifications

- **Staff → email on new assignment**: triggered when a module is added to their Assignments (either via role default or individual override).
- **Admin/Manager → email on overdue**: triggered when an assignment passes its DueDate without a CompletedDate. Needs a scheduled check (Apps Script time-based trigger, e.g. daily).

---

## 6. Technical Architecture (Recommended)

- **Backend**: Google Apps Script web app (same pattern as the existing OVP Task App). Handles:
  - Sign-in / PIN verification (server-side, not exposed to client)
  - Reading/writing the Sheet (staff, modules, assignments)
  - Sending emails (MailApp) for assignment and overdue notifications
  - Committing new training files to GitHub (via GitHub REST API, using a Personal Access Token stored in Script Properties — never exposed client-side)
- **Frontend**: Self-contained HTML/CSS/JS pages — a staff-facing app and a separate admin app — following the established single-file pattern, calling the Apps Script backend as an API.
- **Content hosting**: New dedicated GitHub repo, with a folder structure for training materials (e.g. `/materials/{category}/{filename}`), served via GitHub Pages or raw GitHub URLs. Video content is embedded via YouTube/Vimeo, not stored in-repo.
- **Repo structure** (draft):
  ```
  north-wood-orientation-tracker/
    staff-app/
      index.html
    admin-app/
      index.html
    materials/
      onboarding/
      safety/
      role-specific/
    apps-script/
      (backend code, if versioned alongside)
  ```

---

## 7. Credentials & Secrets

**GitHub API access (for the admin app's file-upload/commit feature)**

- Use a **fine-grained GitHub Personal Access Token**, not a classic token.
- **Repository access**: scoped to the single orientation-tracker repo only — not the whole GitHub account.
- **Permissions**: "Contents" set to Read and write. Everything else (Issues, Pull requests, Actions, etc.) left at No access.
- **Expiration**: fine-grained tokens require an expiration date (max 1 year). Set a calendar reminder to rotate it before expiry — an expired token fails silently and will present as a broken "upload" feature in the admin app rather than an obvious error.
- **Storage**: the token value is stored in the Apps Script project's **Script Properties** (Project Settings → Script Properties), read at runtime via `PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN')`. It must never be hardcoded in the script source or committed to the repo.
- **Regeneration**: if the token is ever suspected compromised, revoke it immediately in GitHub Developer Settings and generate a replacement — since it's scoped to one repo with limited permissions, the blast radius of a leak is small.

## 8. Open Items / Considerations to Flag

- **PIN storage**: v1 stores PINs in plaintext in the Sheet, consistent with the low-stakes internal nature of this tool and matching patterns already used elsewhere. Worth a deliberate go/no-go decision before build — a lightweight hash is a cheap upgrade if preferred.
- **Mobile vs desktop**: usage pattern undetermined — recommend building responsive/mobile-friendly by default, matching field-staff-facing tools already in use.
- **GitHub API token scope**: needs `repo` write access to commit files — should be scoped to the new dedicated repo only if using a fine-grained PAT.
- **Branding**: North Wood Group logo/colors to be supplied before UI build begins.
- **Quiz-based completion**: needs a simple question/answer structure defined once specific modules requiring quizzes are identified.

## 9. Out of Scope (v1)

- Exportable reports / CSV downloads / printable certificates
- Staff self-registration
- Integration with any existing MedPro tools or portal
- SSO / Google account login
- Multi-language support
