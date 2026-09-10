# Thoracic and Cardiovascular Surgery - Synthetic Logbook Dataset

## Specialty
Thoracic and Cardiovascular Surgery (Form: "Procedural and Interpretative Skills")

## Training context
**Thoracic / Cardiothoracic Surgical Unit.** Every generated case (investigations included) reflects a realistic thoracic/cardiothoracic surgical training case - pneumothorax, pleural effusion, empyema, chest trauma, pericardial effusion with tamponade, and resectable lung disease, together with the perioperative investigations that accompany them - not unrelated general-surgical cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/thoracic-cardiovascular-surgery.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## No count discrepancy for this specialty
Unlike some earlier specialties in this batch, the itemized per-skill counts for Thoracic and Cardiovascular Surgery sum exactly to the stated totals with no arithmetic discrepancy to resolve: Interpretative 3+3+3 = 9, Procedural 3+1+1+1 = 6, Grand Total 9+6 = 15 - matching the user-provided totals exactly. See `specialty-config/thoracic-cardiovascular-surgery.json` -> `quotaSource.arithmeticCheck`.

## Row counts (USER-PROVIDED EXACT COUNTS, itemized - NOT portal quota)
- **Grand total: 15 rows**
- Interpretative total: **9 rows** (3 skills x 3 each)
- Procedural total: **6 rows**

| Skill Type | Skill | Count | Competence Level(s) used |
|---|---|---|---|
| Interpretative | Blood gas analysis | 3 | n/a (no competence level for Interpretative Skill) |
| Interpretative | Wound swab for C/S | 3 | n/a |
| Interpretative | X-ray chest P/A | 3 | n/a |
| Procedural | Chest tube drain insertion | 3 | 3, 3, 4 (allowed: 3, 4) |
| Procedural | Pericardiocentesis | 1 | 2 (allowed: 2, 3) |
| Procedural | Thoracoscopy | 1 | 1 (allowed: 1, 2) |
| Procedural | Thoracotomy | 1 | 1 (allowed: 1, 2) |

The portal's own mapped minimums are recorded in `specialty-config/thoracic-cardiovascular-surgery.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 7 requested skills (3 Interpretative + 4 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. All requested competence levels (Chest tube drain insertion: 3, 4; Pericardiocentesis: 2, 3; Thoracoscopy: 1, 2; Thoracotomy: 1, 2) were confirmed portal-valid. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

Note: "Pericardiocentesis" under this case type (levels 2, 3) is a distinct competency item from the same-named skill under Accident & Emergency / Casualty (also levels 2, 3, but a separate leaf) - each case type has its own independent leaf and the two are not conflated in this dataset.

## Age realism
Every row uses a clinically plausible, varied adult age appropriate to a Thoracic/Cardiothoracic Surgical Unit case-mix (ages ranging from the mid-20s through the mid-60s across the 15 rows) rather than a generic or repeated single-age spread. DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date).

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Reference PDF usage
Any FCPS Core Surgical Training logbook reference material was consulted **only** for concise Diagnosis/Problems and Brief Procedural Notes wording STYLE. No real patient name, registration number, date, age, or diagnosis from any reference document was copied into this dataset.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Thoracic_Cardiovascular_Surgery_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Thoracic-Cardiovascular-Surgery/
  README.md                          (this file)
  specialty-config/
    thoracic-cardiovascular-surgery.json  (skill/level/count config - reusable, not date-specific)
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
