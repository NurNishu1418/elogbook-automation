# Abdominal Wall - Synthetic Logbook Dataset

## Specialty
Abdominal Wall (Form: "Procedural and Interpretative Skills")

## Training context
**Abdominal Wall / Hernia Surgical Unit.** Every generated case (investigations included) reflects a realistic hernia-surgery training case - inguinal, incisional, paraumbilical, umbilical, and recurrent hernia repair, component separation for complex defects, laparoscopic IPOM/IPOM-plus mesh repair, and related abdominal-wall imaging - not unrelated general-surgical cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/abdominal-wall.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS, itemized - NOT portal quota)
- **Grand total: 14 rows** - itemized Interpretative (3) + Procedural (11) sum exactly to the stated total. No arithmetic discrepancy for this specialty (verified programmatically: 1+2+1+3+2+1+1 = 11).
- Interpretative total: **3 rows**
- Procedural total: **11 rows**

| Skill Type | Skill | Count | Competence level(s) used |
|---|---|---|---|
| Interpretative | USG / CT scan / MRI of abdominal wall | 3 | (none - Interpretative Skill has no competence level) |
| Procedural | Component separation techniques | 1 | 1 |
| Procedural | IPOM/ IPOM plus | 2 | 2, 2 |
| Procedural | Open and laparoscopic repair of incisional hernia | 1 | 1 |
| Procedural | Open and laparoscopic repair of inguinal hernia | 3 | 5, 5, 5 |
| Procedural | Open and laparoscopic repair of paraumbilical hernia | 2 | 2, 2 |
| Procedural | Open and laparoscopic repair of recurrent hernia | 1 | 1 |
| Procedural | Open and laparoscopic repair of umbilical hernia | 1 | 1 |

The portal's own mapped minimums are recorded in `specialty-config/abdominal-wall.json` for traceability only - they were **not** used to size this dataset.

## IMPORTANT: single-value competence levels (not a mistake, not row counts)
Unlike every other specialty generated in this project so far, **every single Procedural skill in Abdominal Wall has exactly ONE portal-valid competence level**, not two or three:

- Component separation techniques -> level **"1"** (portal min_value=1)
- IPOM/ IPOM plus -> level **"2"** (portal min_value=3)
- Open and laparoscopic repair of incisional hernia -> level **"1"** (portal min_value=2)
- Open and laparoscopic repair of inguinal hernia -> level **"5"** (portal min_value=5)
- Open and laparoscopic repair of paraumbilical hernia -> level **"2"** (portal min_value=3)
- Open and laparoscopic repair of recurrent hernia -> level **"1"** (portal min_value=2)
- Open and laparoscopic repair of umbilical hernia -> level **"1"** (portal min_value=2)

These were **independently confirmed live against `log_entry_target.compitency_level` in `output/form-map.json`** before any row was generated (re-verified again during this build - see the console query output in the generation session and `01-01-2026_to_30-06-2026/reports/row-count-summary.json` -> `procedural_competenceLevelUsage`). They are genuine portal-valid competence-level **values**, not row counts, and were not "corrected" to anything else. In particular, competence level **"5"** for inguinal hernia repair looks unusual next to the others but is a real, confirmed portal value. Because each skill has only one allowed level, every row of that skill simply uses that single level - no per-row level variation was attempted or is expected for this specialty.

## Skill mapping
All 8 requested skills (1 Interpretative + 7 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. This includes the portal-exact string `IPOM/ IPOM plus` (no space before the slash). See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Adult age realism
Every row uses a clinically plausible adult age (18+, no paediatric ages) rather than a generic spread:
- **Working-age adults (34-56)**: primary inguinal, paraumbilical, umbilical, and incisional hernia repairs, laparoscopic IPOM/IPOM-plus repair, and USG/CT abdominal-wall work-up for suspected incisional hernia or preoperative defect evaluation.
- **Older adults (58-64)**: recurrent inguinal hernia repair, component separation for large complex incisional hernia, and imaging for suspected recurrent hernia - reflecting the real-world tendency for recurrence and complex defects to present later, after a prior repair.

DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date). Recomputed ages matched stored ages for all 14 rows.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates may repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique (14/14 unique, confirmed independently). Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Abdominal_Wall_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only (14/14 rows valid).

## Folder structure (permanent, reusable across future date ranges)
```
Abdominal-Wall/
  README.md                          (this file)
  specialty-config/
    abdominal-wall.json              (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority and totals with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS (itemized breakdown), not portal quota, and the single-value competence levels documented above must be re-verified against the live portal mapping if it may have changed.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
