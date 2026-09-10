# Accident & Emergency / Casualty - Synthetic Logbook Dataset

## Specialty
Accident & Emergency / Casualty (Form: "Procedural and Interpretative Skills")

## Training context
**Surgical Emergency / Trauma / Casualty Unit.** Every generated case (investigations included) reflects a realistic surgical-emergency/trauma/casualty training case - blunt and penetrating trauma, road traffic accidents, falls, airway/hemorrhage control, and related trauma investigations - not unrelated elective surgical cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/accident-emergency-casualty.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS, itemized - NOT portal quota)
No arithmetic discrepancy was found for this specialty: itemized Interpretative (6 skills x 3 each = 18) and Procedural (3+3+3+3+1+1+3+3+1+1+1+3+3 = 29) sum to 18+29=47, matching the stated totals exactly.

- **Grand total: 47 rows**
- Interpretative total: **18 rows** (6 skills x 3 each)
- Procedural total: **29 rows**

| Skill Type | Skill | Count | Allowed Levels |
|---|---|---|---|
| Interpretative | Contrast X-rays | 3 | - |
| Interpretative | Local X-ray of injured limbs | 3 | - |
| Interpretative | Plain X-ray Abdomen | 3 | - |
| Interpretative | USG / CT scan / MRI | 3 | - |
| Interpretative | X-ray chest A/P | 3 | - |
| Interpretative | X-ray pelvis | 3 | - |
| Procedural | Airway management (Basic and advanced) | 3 | 3, 4 |
| Procedural | Application of cervical collar | 3 | 3, 4 |
| Procedural | Application of tourniquet | 3 | 3, 4 |
| Procedural | Application of traction splint | 3 | 3, 4 |
| Procedural | Central venous catheterization | 1 | 2, 3 |
| Procedural | Chest tube insertion | 1 | 2, 3 |
| Procedural | Laparoscopy | 3 | 1, 2 |
| Procedural | Laparotomy | 3 | 1, 2 |
| Procedural | Pericardiocentesis | 1 | 2, 3 |
| Procedural | Stoma creation (Colostomy and ileostomy) | 1 | 1, 2 |
| Procedural | Tracheostomy | 1 | 2, 3 |
| Procedural | Wound debridement | 3 | 2, 3 |
| Procedural | Wound packing | 3 | 3, 4 |

The portal's own mapped minimums are recorded in `specialty-config/accident-emergency-casualty.json` for traceability only - they were **not** used to size this dataset.

Note: two Procedural skills in this dataset share a name with a skill under a different case type ("Central venous catheterization" also exists under Anaesthesia & Procedural Critical Care; "Wound debridement" also exists under Skin and Subcutaneous Tissue), but each is a distinct, independently defined competency item on the live portal even where the label matches - see the `notes` field in `specialty-config/accident-emergency-casualty.json`.

## Skill mapping
All 19 requested skills (6 Interpretative + 13 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Competence-level handling
For every Procedural skill with more than one allowed competence level and count > 1, individual rows use varying portal-valid levels rather than repeating a single level, and the row count is never multiplied by the number of allowed levels. See `01-01-2026_to_30-06-2026/reports/row-count-summary.json` -> `procedural_competenceLevelUsage` for the exact levels used per skill.

## Age realism
Ages vary realistically across the trauma population rather than using a single fixed age band: predominantly working-age adults for road-traffic-accident and penetrating-trauma cases (airway management, laparotomy, chest tube insertion, tourniquet application, etc.), with some younger and older-adult cases mixed in for falls and limb injuries (e.g. local X-ray of injured limbs, post-reduction checks). No single age value was reused as a template across every row. DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date).

## Reference material usage
Diagnosis/Problems, Brief Procedural Notes / Interpretations, and Brief Description content was authored in FCPS-logbook style; no real patient data was copied from any reference material.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates repeat across different rows where realistic (multiple casualty-unit cases on the same day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Accident_Emergency_Casualty_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Accident-Emergency-Casualty/
  README.md                          (this file)
  specialty-config/
    accident-emergency-casualty.json (skill/level/count config - reusable, not date-specific)
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
