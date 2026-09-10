# Procedural Nutrition - Synthetic Logbook Dataset

## Specialty
Procedural Nutrition (Form: "Procedural and Interpretative Skills")

## Training context
**Surgical Nutrition / Perioperative Nutritional-Support Unit.** Every generated case is tied to a surgical or perioperative nutritional-support scenario - preoperative/postoperative nutritional assessment, enteral tube feeding, feeding gastrostomy/jejunostomy, PEG tube placement, and parenteral nutrition access - not an unrelated generic diet-clinic case. See the per-skill Diagnosis/Problems mapping in `specialty-config/procedural-nutrition.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 11 rows**
- Interpretative total: **5 rows**
- Procedural total: **6 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums to size row counts, and does **not** multiply any row count by the number of valid competence levels. The itemized counts (5 Interpretative + 3+1+1+1=6 Procedural = 11) sum exactly to the stated totals - no arithmetic discrepancy for this specialty. The exact counts below were used as-is:

| Skill Type | Skill | Count | Competence Level(s) Used |
|---|---|---|---|
| Interpretative | Laboratory and biochemical analysis of nutritional status | 5 | n/a (Interpretative Skill has no competence level) |
| Procedural | Administration of nasogastric / nasojejunal feeding | 3 | 4, 4, 4 (ONLY level 4 is portal-valid for this skill) |
| Procedural | Construction of feeding gastrostomy / Jejunostomy | 1 | 2 (allowed: 2, 3) |
| Procedural | PEG tube insertion / replacement | 1 | 1 (allowed: 1, 2) |
| Procedural | Venous cannulation for central and peripheral parenteral feeding | 1 | 2 (allowed: 2, 3) |

The portal's own mapped minimums are recorded in `specialty-config/procedural-nutrition.json` for traceability only - they were **not** used to size this dataset.

### Note on "Administration of nasogastric / nasojejunal feeding"
This skill has **only level 4** as a portal-valid competence value on the live portal (verified via `output/form-map.json`) - there is no level 1/2/3 to vary into. All 3 rows for this skill correctly use level 4. This is expected and correct, not a bug or an oversight.

## Skill mapping
All 5 requested skills (1 Interpretative + 4 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. All requested competence levels (4; 2,3; 1,2; 2,3) were confirmed portal-valid. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible adult ages for each specific perioperative nutritional-support scenario (e.g. older adults for oesophageal/head-and-neck cancer feeding-access cases, a younger adult for short bowel syndrome) rather than a generic spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/ward day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## PDF/portal style-reference note
Clinical wording style (concise Diagnosis/Problems, Brief Procedural Notes/Interpretations, Brief Description phrasing) was authored to match the real BCPS Core Surgical Training logbook style only - no real patient name, registration number, date, age, or diagnosis from any reference document was copied into this dataset.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Procedural_Nutrition_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only (11/11 rows valid).

## Folder structure (permanent, reusable across future date ranges)
```
Procedural-Nutrition/
  README.md                              (this file)
  specialty-config/
    procedural-nutrition.json            (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS, not portal quota - a future date range may be instructed to use a different source, which would require different per-skill counts.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
