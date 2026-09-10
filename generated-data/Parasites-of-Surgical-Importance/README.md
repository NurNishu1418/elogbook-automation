# Parasites of Surgical Importance - Synthetic Logbook Dataset

## Specialty
Parasites of Surgical Importance (Form: "Procedural and Interpretative Skills")

## Training context
**Surgical Unit / General Surgical Training.** Every generated case (investigations included) is tied to a surgically important parasitic condition - hepatic hydatid disease or biliary ascariasis/CBD worm - not unrelated general medical parasitology. See the per-skill Diagnosis/Problems mapping in `specialty-config/parasites-of-surgical-importance.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota, NOT PDF minimums)
- **Grand total: 16 rows**
- Interpretative total: **12 rows**
- Procedural total: **4 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums, does **not** use the FCPS PDF's minimum counts, and does **not** multiply any row count by the number of valid competence levels. The exact counts below were used as-is:

| Skill Type | Skill | Count |
|---|---|---|
| Interpretative | CBC | 3 |
| Interpretative | Imaging (USG/CT-scan/MRCP/X-ray abdomen/X-ray chest) | 3 |
| Interpretative | Peripheral blood film | 3 |
| Interpretative | Serological tests | 3 |
| Procedural | Endocystectomy (Level 1) | 1 |
| Procedural | Endoscopic retrieval of CBD worms (Level 1) | 1 |
| Procedural | PAIR (Level 1) | 1 |
| Procedural | Pericystectomy (Level 2) | 1 |

The portal's own mapped minimums and the FCPS PDF's minimum counts are recorded in `specialty-config/parasites-of-surgical-importance.json` for traceability only - neither was used to size this dataset.

## Skill mapping
All 8 requested skills (4 Interpretative + 4 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** - no ambiguity, no guessing required. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF was consulted **only** for concise Diagnosis/Problems wording STYLE. **PDF minimum counts were NOT used** to determine any row count in this dataset. No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis (e.g. a younger adult for biliary ascariasis/CBD worm cases, middle-aged/older adults for hepatic hydatid disease) rather than a generic spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Parasites_of_Surgical_Importance_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Parasites-of-Surgical-Importance/
  README.md                                     (this file)
  specialty-config/
    parasites-of-surgical-importance.json       (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS, not portal quota or PDF-derived - a future date range may be instructed to use a different source, which would require different per-skill counts.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
