# North Wood Group — Staff Orientation Tracker

A staff orientation/training tracker for North Wood Group. Staff sign in to view assigned
training modules and mark them complete; admins manage staff, the training module library,
assignment rules, and a completion dashboard.

Full spec: see `staff-orientation-tracker-spec.md` (original spec document — kept for
reference alongside this build).

## Architecture

- **Backend**: Google Apps Script web app, backed by a Google Sheet (`apps-script/`).
- **Frontend**: two self-contained static HTML apps (`staff-app/`, `admin-app/`), calling
  the Apps Script backend as a JSON API. No build step — open the HTML files directly or
  serve via GitHub Pages.
- **Content hosting**: training files live under `materials/{category}/`, committed by the
  admin app via the GitHub REST API. Video content is embedded via YouTube/Vimeo links, not
  stored in-repo.

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture/data-model reference, and
[`SETUP.md`](./SETUP.md) for one-time setup and deployment steps.

## Repo layout

```
NorthWood Group/
  staff-app/index.html       staff sign-in + dashboard + module viewer
  admin-app/index.html       admin: staff, modules, assignments, dashboard, uploads
  apps-script/                backend source (copy into the Apps Script project)
  materials/                  training content, organized by category
  assets/                     logo files used by both frontends
  SETUP.md                    one-time setup + deployment instructions
  CLAUDE.md                   architecture notes for future work on this project
```

## Status

Local-first build in progress — no GitHub repo created yet, no Google Sheet provisioned
yet. See `SETUP.md` for what's needed to go live.
