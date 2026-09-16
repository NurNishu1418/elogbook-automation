# BCPS e-Logbook Mapper & Draft Uploader

Automated discovery/mapping tool and Excel-to-draft uploader for the BCPS
e-Logbook "Add Logbook Entry" form
(`https://eportal.bcps.edu.bd/e-logbook/logbook-entry/add`).

## What this does

1. **Mapper** (`npm run map`) logs in, discovers the *entire* live form
   hierarchy (Form → Case Type → Skill Type → Competency Group), captures
   every field's schema, validation rules and dropdown options, cross-checks
   all of it against the real rendered DOM in a headless/headed browser, and
   generates `output/BCPS_Logbook_Full_Mapping.xlsx` plus several JSON
   sidecar files.
2. **Uploader** (`npm run workbook:dry-run` / `workbook:execute`, pointed at
   any workbook via `UPLOAD_WORKBOOK_PATH`) reads user-filled rows from the
   `DataEntry` sheet, validates each row against the mapped combinations,
   and (only in `--execute` mode) drives the browser to fill the form and
   click **Save as Draft** - never Final Submit.

## How the mapping actually works

The portal is a React SPA backed by two key authenticated JSON endpoints
(discovered via network inspection, not guessed):

- `GET /api/auth/elogbook-management/v1/get-form-list/{N}` returns the
  **entire** Form → Case Type → Skill Type → Competency Group hierarchy as
  one recursive tree for a given `particulary_type` (`N`). The mapper tries
  `N=1..10` and picks whichever tree's top-level ids match the live "form"
  `<select>` on the actual page - it never hardcodes `N`.
- `GET /api/auth/elogbook-management/v1/dynamic-form-property-by-particular/{id}`
  returns the exact field schema (label, type, required flag) for one leaf
  node of that tree.

Both are read-only GET calls that mirror exactly what the portal's own
frontend requests - no destructive or write endpoints are ever called during
mapping.

Because a live browser session's in-memory copy of that tree can (rarely)
diverge from a fresh API call for the same-labelled node (reproduced for
"Vascular Surgery > Interpretative Skill / Procedural skill" - see
`output/mapping-summary.md`), the mapper always re-derives the live id from
the actual page and re-fetches its schema when a mismatch is detected, and
records the drift for transparency. See **Discovered portal quirks** in the
generated README sheet / `mapping-summary.md` for the full list (field-name
sanitization, verbatim competency-item text, non-rendering `radio` fields).

Every discovered leaf combination is additionally replayed through a real
Playwright browser (fresh page load per combination) and the rendered field
names are diffed against the API-derived expectation - this is the
"live cross-check" referenced throughout the codebase. `npm run verify-map`
repeats the entire crawl independently and reconciles the two runs.

## Setup

```bash
npm install
npx playwright install chromium   # if not already installed
cp .env.example .env              # then fill in real values
```

`.env` variables (see `.env.example`):

| Variable | Meaning |
|---|---|
| `BCPS_USERNAME` / `BCPS_PASSWORD` | Portal login credentials |
| `BCPS_USER_TYPE` | Matched live against both the `doctor_type` (MBBS/BDS) and `login_type` (Trainee/Supervisor/Fellow) selects - whichever one's options actually contain this value gets it applied. |
| `BASE_URL`, `LOGIN_PATH`, `FORM_PATH` | Portal URLs |
| `MAX_DEPTH`, `MAX_OPTIONS_PER_FIELD` | Safety bounds for any future deeper hierarchy (the current portal hierarchy is only 3 levels deep, well within these) |
| `HEADLESS` | `true`/`false` - defaults to headed for easier debugging |

**Never** commit `.env`, anything under `sessions/`, or `*.storageState.json`
- they're already listed in `.gitignore`.

## Commands

| Command | What it does |
|---|---|
| `npm run map` | Full mapping crawl: login → discover hierarchy → fetch every leaf's field schema → live-verify every combination → write all `output/*.json` + the Excel workbook. |
| `npm run map:resume` | Same, but resumes from `checkpoints/discover.json` (skips already-fetched/verified leaves). |
| `npm run verify-map` | Runs an **independent second crawl** under a separate checkpoint and reconciles it against the primary run's `form-map.json`, writing `output/verification-reconciliation.json`. |
| `npm run validate-excel` | Opens the generated workbook, checks all required sheets exist with no duplicate columns, and that every JSON sidecar file parses. |
| `npm run report` | Regenerates `coverage-report.json` and `mapping-summary.md` from the existing `output/*.json` files (no browser needed). |
| `npm run workbook:dry-run` | **Current approved pipeline, default/safe mode.** Runs `src/uploader/run-workbook.ts` against any workbook via `UPLOAD_WORKBOOK_PATH`. Validates every `DataEntry` row locally against the mapped combinations. Never logs in, never opens a browser. |
| `npm run workbook:execute` | **Current approved pipeline, live mode.** Actually logs in and creates drafts for eligible rows. Only clicks "Save as Draft", never "Submit". |
| `npm run legacy:upload:dry-run` / `npm run legacy:upload:drafts` | **Legacy, do not use for the AutoScript-Input workbook.** Runs `src/uploader/run.ts`, hardcoded to the older fixed path `output/BCPS_Logbook_Full_Mapping.xlsx` - cannot be pointed at any other workbook. Kept only for that original file's own workflow. |
| `npm run test` | Runs the Jest unit test suite (pure logic - no live portal access). |

Diagnostic-only scripts (not part of the required pipeline, useful if the
portal's markup changes and something needs re-investigating):
`npx ts-node src/mapper/login-check.ts`, `npx ts-node src/mapper/recon-login.ts`,
`npx ts-node src/mapper/recon-form.ts`.

## Filling out the DataEntry sheet

Open `output/BCPS_Logbook_Full_Mapping.xlsx` → `DataEntry` sheet:

- `Form` / `CaseType` / `SkillType` have dependent dropdown validation (pick
  Form first, then CaseType, then SkillType - each list narrows to only
  valid live options for the previous choice).
- The 5 universal fields (Date of Assignment, Name of the Patient, Patient
  Reg No, Date of Birth, Age) are always applicable and have their own
  columns.
- `CompetencyItemsChecked` - semicolon-separated list of competency
  checkbox labels to tick (see `FieldCatalogByCombination` sheet for the
  valid list per combination).
- `ExtraFieldsJSON` - a JSON object for any combination-specific extra
  fields beyond the 5 universal ones (e.g.
  `{"Indication/Investigation/Findings/Diagnosis": "...", "Interpretations": "..."}`).
  See `FieldCatalogByCombination` for exactly which extra fields apply to
  your chosen combination and which are required.
- `Action` must be `SAVE_DRAFT` - it's the only supported value.

Run `npm run workbook:dry-run` (with `UPLOAD_WORKBOOK_PATH` set to your file)
after filling rows in to catch mistakes before touching the portal at all.

## Project structure

```
src/
  auth/       login + session handling (auth/login.ts)
  mapper/     discovery pipeline: api.ts, model.ts, discover.ts,
              verifyLiveUi.ts, run.ts, verify.ts, report.ts
  excel/      generate.ts (workbook builder), validate.ts
  uploader/   excelReader.ts, validateRow.ts, fillForm.ts, run.ts
  models/     shared TypeScript types
  utils/      env, logger (credential-redacting), browser bootstrap,
              domScan (generic DOM introspection), checkpoint, waitStable
tests/        Jest unit tests (pure logic, no live network access)
output/       generated deliverables (git-ignored except via explicit review)
checkpoints/  resumable crawl state (git-ignored)
logs/         winston logs, credentials redacted (git-ignored)
screenshots/  error screenshots from failed uploader rows (git-ignored)
sessions/     saved browser storage state (git-ignored, contains a live
              auth token - treat like a credential)
```

## Safety notes

- The mapper never clicks "Submit", "Approve", "Forward", or any workflow
  action - only navigation, selection, and DOM inspection.
- The uploader's dry-run mode is the default; `--execute` must be passed
  explicitly to create real drafts, and even then only "Save as Draft" is
  ever clicked.
- The auth token is read from `localStorage` and used only inside the
  browser's own `fetch()` calls (via `page.evaluate`) - it is never returned
  to Node, logged, or written to disk in cleartext outside Playwright's own
  `sessions/storageState.json` (which is git-ignored).
- If a CAPTCHA, OTP/2FA prompt, or an account-lock message is detected, the
  tool raises `LoginBlockedError` and stops immediately rather than
  attempting to bypass it.
