# Anaesthesia & Procedural Critical Care - Synthetic Logbook Dataset

## Specialty
Anaesthesia & Procedural Critical Care (Form: "Procedural and Interpretative Skills"; portal CaseType label: "Anaesthesia & Procedural critical care")

## Training context
**Operating Theatre / Anaesthesia / Surgical Critical Care.** Every generated case reflects a realistic anaesthesia/critical-care training case - airway management, general and regional anaesthesia, central venous access, titrated infusions, tracheostomy, and interpretative skills (ABG analysis, monitor reading) drawn from adult surgical patients, including occasional elderly/critically-ill patients for the higher-acuity skills - not paediatric or unrelated cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/anaesthesia-procedural-critical-care.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS, itemized - NOT portal quota)
No arithmetic discrepancy was found for this specialty: the itemized per-skill counts sum exactly to the stated totals.

- **Grand total: 25 rows**
- Interpretative total: **6 rows** (2 skills x 3 each)
- Procedural total: **19 rows** (itemized sum: 3+1+1+1+3+3+1+3+3 = 19)

| Skill Type | Skill | Count | Allowed Levels |
|---|---|---|---|
| Interpretative | ABG analysis | 3 | n/a |
| Interpretative | Monitor reading | 3 | n/a |
| Procedural | Central venous catheterization | 3 | 3, 4 |
| Procedural | Cricothyroidotomy / Cricothyroidostomy | 1 | 2, 3 |
| Procedural | Endotracheal intubation | 1 | 2, 3 |
| Procedural | General anaesthesia | 1 | 2, 3 |
| Procedural | Infiltration of local anaesthetics and regional nerve block | 3 | 3, 4 |
| Procedural | Infusion/ syringe pump of fluids, nutrients and medications | 3 | 3, 4 |
| Procedural | Insertion of laryngeal mask airway | 1 | 2, 3 |
| Procedural | Regional anaesthesia | 3 | 3, 4 |
| Procedural | Tracheostomy | 3 | 2, 3 |

The portal's own mapped minimums are recorded in `specialty-config/anaesthesia-procedural-critical-care.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 11 requested skills (2 Interpretative + 9 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. Note the internal space in the portal-exact string "Infusion/ syringe pump of fluids, nutrients and medications" was verified and used verbatim. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Competence-level handling
For every Procedural skill with 3 rows and 2 allowed levels, individual rows use varying portal-valid levels (never multiplying row count). For single-row skills (Cricothyroidotomy / Cricothyroidostomy, Endotracheal intubation, General anaesthesia, Insertion of laryngeal mask airway), one portal-valid level was used. See `01-01-2026_to_30-06-2026/reports/row-count-summary.json` -> `procedural_competenceLevelUsage` for the exact levels used per skill.

## Age realism
Every row uses an adult surgical-population age (34-72 years) appropriate to Operating Theatre / Anaesthesia / Surgical Critical Care, with occasional elderly/critically-ill patients for higher-acuity skills such as central venous catheterization, tracheostomy, and titrated infusions/inotropic support. No paediatric ages were used anywhere in this dataset. DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date).

## Reference PDF usage
Clinical content style was informed **only** by concise Diagnosis/Problems and Brief Procedural Notes/Interpretations wording style consistent with the FCPS Core Surgical Training logbook. No real patient name, registration number, date, age, or diagnosis from any source document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates repeat across different rows where realistic (multiple cases in theatre/ICU on the same day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Anaesthesia_Procedural_Critical_Care_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Anaesthesia-Procedural-Critical-Care/
  README.md                          (this file)
  specialty-config/
    anaesthesia-procedural-critical-care.json  (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority and totals with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS (itemized breakdown), not portal quota.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
