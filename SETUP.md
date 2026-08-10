# Setup & Deployment

One-time steps to take this from local files to a working app. Do these roughly in order —
later steps depend on earlier ones.

## 1. Create the Google Sheet + Apps Script project

1. Create a new blank Google Sheet (e.g. "North Wood Orientation Tracker — Data").
2. In the Sheet, go to **Extensions → Apps Script**. This opens a bound Apps Script project.
3. Delete the default empty `Code.gs` content, then copy in the contents of each file from
   this repo's `apps-script/` folder as its own file in the Apps Script project (same
   filenames: `Code.gs`, `Setup.gs`, `SheetService.gs`, `Auth.gs`, `Assignments.gs`,
   `Admin.gs`, `Notifications.gs`, `GitHubService.gs`).
4. In the Apps Script editor, select the `setup` function from the function dropdown and
   click **Run**. First run will prompt for authorization — approve it (it's your own
   script acting on your own Sheet). This creates the `Staff`, `Admins`, `Modules`,
   `Quizzes`, and `Assignments` tabs with headers, and installs the daily overdue-check
   trigger.
5. Add yourself as the first admin. Don't add a row to the `Admins` tab by hand — `PINHash`
   has to be computed, not typed in. The Apps Script editor's Run button only runs a chosen
   function with zero arguments (there's no "run with arguments" box), so instead add a
   temporary wrapper function with your real values baked in:
   ```js
   function createFirstAdmin() {
     addAdmin({ Name: 'Your Name', Username: 'yourusername', Email: 'you@example.com' }, '1234');
   }
   ```
   Save, pick `createFirstAdmin` from the function dropdown in the toolbar, click **Run**,
   approve the authorization prompt on first run, then check the `Admins` tab for the new
   row. Delete (or comment out) `createFirstAdmin` afterward so it doesn't get run again by
   accident and create a duplicate. Replace `'1234'` with a real starting PIN; there's no
   self-service PIN change yet — reset via another admin's "Reset PIN" button, or the same
   wrapper-function trick with `setAdminPin('ADM-0001', 'newpin')`.

## 2. Deploy the Apps Script as a web app

1. In the Apps Script editor: **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**. (Auth is handled at the application layer via
   username+PIN — this is intentional, see `CLAUDE.md`.)
5. Deploy, then copy the **Web app URL** (ends in `/exec`).
6. Paste that URL into `CONFIG.API_URL` near the top of the `<script>` block in both
   `staff-app/index.html` and `admin-app/index.html`.
7. Any time you edit the Apps Script source, you need a **new version** under
   **Deploy → Manage deployments → Edit → New version** for changes to take effect on the
   existing URL.

## 3. GitHub repo + content upload

The admin app's "upload a file" option (for pdf/doc modules) commits directly into this
repo via the GitHub API, so it needs a repo to commit into. Everything below is done by
clicking through github.com in your browser — no command line needed.

### 3a. Create the repo

1. Go to [github.com/new](https://github.com/new) (sign in first if needed).
2. **Repository name**: `north-wood-orientation-tracker` (or whatever you'd like).
3. Set it to **Private** (recommended — this is internal MedPro/North Wood content).
4. Leave "Add a README file" and everything else under "Initialize this repository"
   **unchecked**.
5. Click **Create repository**. You'll land on a mostly-empty repo page with a "Quick
   setup" box.

### 3b. Upload the project files

1. On that same page, click the **"uploading an existing file"** link in the Quick setup
   box (if you've navigated away, use the **Add file → Upload files** button instead).
2. Open File Explorer to the `NorthWood Group` folder, select everything *inside* it
   (`README.md`, `CLAUDE.md`, `SETUP.md`, `staff-orientation-tracker-spec.md`, and the
   `staff-app`, `admin-app`, `apps-script`, `materials`, `assets` folders) — not the
   `NorthWood Group` folder itself, just its contents.
3. Drag that whole selection into the browser drop zone (Chrome and Edge both support
   dragging folders this way). GitHub will show a file list building up as it processes
   the drop — give it a moment for everything to appear, especially the two logo images.
4. Note: GitHub's uploader skips genuinely empty folders, so the empty `materials/`
   subfolders (`onboarding/`, `safety/`, `role-specific/`) may not show up — that's fine,
   nothing depends on them existing ahead of time. The GitHub API creates a folder path
   automatically the first time a file is committed into it (i.e. the first module upload
   into `materials/safety/...` creates `materials/safety/` on the spot).
5. Scroll down to "Commit changes", leave it committing directly to `main`, and click
   **Commit changes**.

### 3c. Create the access token

1. Click your profile picture (top right) → **Settings**.
2. Scroll all the way down the left sidebar → **Developer settings**.
3. **Personal access tokens → Fine-grained tokens** → **Generate new token**.
4. **Token name**: something like `northwood-orientation-uploader`.
5. **Expiration**: max is 1 year — set a calendar reminder to rotate it before it expires
   (an expired token fails silently and just looks like a broken upload button later).
6. **Repository access**: choose **Only select repositories** → pick
   `north-wood-orientation-tracker`.
7. **Permissions → Repository permissions**: find **Contents**, set it to
   **Read and write**. Leave every other permission at **No access**.
8. Click **Generate token**, then **copy it immediately** — GitHub only shows it once.

### 3d. Give the token to Apps Script

1. Back in the Apps Script editor (from Section 1): click the gear icon in the left
   sidebar → **Project Settings**.
2. Scroll to **Script Properties** → **Add script property**, and add each of these as its
   own row:
   - `GITHUB_TOKEN` — paste the token from 3c.
   - `GITHUB_OWNER` — your GitHub username (or org name, if you created the repo under one).
   - `GITHUB_REPO` — `north-wood-orientation-tracker` (exactly as you named it in 3a).
   - `GITHUB_BRANCH` — optional; only add this one if you're not using `main`.
3. Click **Save script properties**.

If the token is ever suspected compromised: go back to Developer Settings → Fine-grained
tokens, revoke it, and generate a replacement — repeat 3c/3d. Blast radius is small since
it's scoped to one repo with Contents-only access.

Until this whole section is done, everything else still works — module content just has to
be added via an external URL (a YouTube/Vimeo link, or a link to a file hosted elsewhere)
instead of the upload button.

## 4. Enable GitHub Pages (to actually serve the two apps)

1. In the repo: **Settings → Pages**.
2. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Staff app will be live at `https://<your-org>.github.io/north-wood-orientation-tracker/staff-app/`
   and admin app at `.../admin-app/`.

## 5. Add real staff and modules

Once signed into the admin app:
1. **Modules** tab — add your training modules first (title, category, completion method,
   content). Set `Default For Roles` for anything that should auto-assign.
2. **Staff** tab — add staff. Adding a staff member automatically applies any role-default
   modules for their Role.
3. **Dashboard** tab — use "+ Assign Module" for one-off individual assignments outside the
   role defaults.

## Verifying it works end-to-end

- Sign into the admin app, add a test module (`FileType: link`, `CompletionMethod:
  checkbox`, point it at any URL), add a test staff member with that role in
  `Default For Roles`.
- Sign into the staff app as that test staff member, confirm the module shows up, open it,
  mark it complete, confirm status updates on both sides.
- Check the test staff member's email inbox for the assignment notification (requires
  `Email` to be set on the Staff row).
- To test the overdue trigger without waiting a day: temporarily edit the `DueDate` on a
  test Assignment row to yesterday's date, then manually run `checkOverdueAssignments`
  from the Apps Script editor — the row should flip to `Overdue` and an admin alert email
  should send.
