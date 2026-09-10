# Disorders of the Breast - Synthetic Logbook Dataset

## Specialty
Disorders of the Breast (Form: "Procedural and Interpretative Skills")

## Date range covered
`01-01-2026_to_30-06-2026` (2026-01-01 to 2026-06-30 inclusive)

## Row counts (PORTAL-AUTHORITATIVE ONLY)
- **Grand total: 84 rows**
- Interpretative Skill: 47 rows (9 skills)
- Procedural skill: 37 rows (14 skills, split across competence levels)

**Quota source: portal-authoritative only.** The document/PDF skill list provided by the user was explicitly **NOT used to determine any row count** for this dataset, per direct instruction. Every count comes solely from the live BCPS portal's own mapped competency data and its own server-computed `total_min_target` aggregate, independently confirmed live via a read-only API call on 2026-09-09 (`GET logbook-entry-report-by-from/{formId}`): case-type total = 84, Interpretative Skill = 47, Procedural skill = 37 - an exact match to the sum of every individual competence-level minimum. See `specialty-config/disorders-of-the-breast.json` and `01-01-2026_to_30-06-2026/reports/portal-quota-report.json` for full detail.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF (`C:\Users\User\Downloads\log book fcps core training.pdf`) was consulted **only** for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset. All clinical scenarios below were authored fresh, generic, and non-identifying.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Any resemblance to a real patient is coincidental. No real BCPS trainee, patient, or portal record was used as a data source.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Disorders_of_the_Breast_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Disorders-of-the-Breast/
  README.md                          (this file)
  specialty-config/
    disorders-of-the-breast.json     (skill/level/count config - reusable, not date-specific)
  <date-range>/
    generated/     - freshly generated workbook(s), not yet reviewed
    reviewed/      - APPROVED copies only, created manually after explicit user sign-off
    reports/       - JSON reports from generation and validation
    upload-results/- populated only after an explicit, approved live upload run
    archive/       - superseded/old copies, if any
```

## Adding a future date range
1. Create a new sibling folder named `<start-date>_to_<end-date>` (e.g. `01-07-2026_to_31-12-2026`) under this specialty directory.
2. Re-run the generator with the new date range - **never reuse or overwrite an existing date-range folder.** If the target folder already exists, the process must stop and report the conflict rather than overwrite it.
3. Re-verify the portal-authoritative quota live before generating, since portal minimums can change between sessions.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
