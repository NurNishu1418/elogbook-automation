# Orthopaedic Surgery - Synthetic Logbook Dataset

## Specialty
Orthopaedic Surgery (Form: "Procedural and Interpretative Skills")

## Training context
**Orthopaedic Surgical Unit.** Every generated case (investigations included) reflects a problem an Orthopaedic Surgical Unit would reasonably evaluate or manage - fractures, dislocations, bone tumours, tendon injuries, and their associated investigations - no unrelated general-medical cases were generated. See the per-skill Diagnosis/Problems mapping in `specialty-config/orthopaedic-surgery.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 34 rows**
- Interpretative total: **15 rows**
- Procedural total: **19 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums, does **not** use the reference PDF, and does **not** multiply any row count by the number of valid competence levels. The exact counts below were used as-is:

| Skill Type | Skill | Count |
|---|---|---|
| Interpretative | CT-scan | 3 |
| Interpretative | Histopathological report analysis | 3 |
| Interpretative | Local X-ray | 5 |
| Interpretative | MRI | 3 |
| Interpretative | Radionuclide scan | 1 |
| Procedural | Amputation (Levels 2, 3) | 2 |
| Procedural | Application of splint/cast (Levels 2, 2, 3) | 3 |
| Procedural | Arthroscopic examination (Level 1) | 1 |
| Procedural | Curettage & bone grafting (Levels 2, 2, 3) | 3 |
| Procedural | External fixation (Level 1) | 1 |
| Procedural | ORIF (Levels 1, 1, 2) | 3 |
| Procedural | Reduction immobilisation of fractures and dislocations (Levels 2, 2, 3) | 3 |
| Procedural | Tendon repair (Levels 2, 2, 3) | 3 |

The portal's own mapped minimums are recorded in `specialty-config/orthopaedic-surgery.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 13 requested skills (5 Interpretative + 8 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF was consulted **only** for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis/procedure (e.g. a child for a forearm cast and benign bone cyst curettage, an elderly patient for an intertrochanteric hip fracture and a Colles' fracture, working-age adults for tendon injuries and trauma amputation) rather than a generic spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Orthopaedic_Surgery_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Orthopaedic-Surgery/
  README.md                          (this file)
  specialty-config/
    orthopaedic-surgery.json         (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS, not portal quota - a future date range may be instructed to use portal quota instead, which would require different per-skill counts.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
