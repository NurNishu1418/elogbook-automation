# Skin and Subcutaneous Tissue - Synthetic Logbook Dataset

## Specialty
Skin and Subcutaneous Tissue (Form: "Procedural and Interpretative Skills")

## Training context
**Skin / Soft Tissue Surgical Unit.** Every generated case reflects a problem a Skin / Soft Tissue Surgical Unit would reasonably evaluate or manage - abscess and carbuncle drainage/excision, skin malignancy excision biopsy, lymph node biopsy, foreign-body management, ingrown-toenail nail avulsion/wedge resection, skin grafting, fasciotomy, flap closure, wound debridement, and wound-infection interpretative workup. See the per-skill Diagnosis/Problems mapping in `specialty-config/skin-subcutaneous-tissue.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 30 rows**
- Interpretative total: **6 rows**
- Procedural total: **24 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums to size row counts, and does **not** multiply any row count by the number of valid competence levels. The itemized per-skill counts sum exactly to the stated totals with **no arithmetic discrepancy** for this specialty (6 Interpretative + 24 Procedural = 30).

| Skill Type | Skill | Count | Competence Level(s) used |
|---|---|---|---|
| Interpretative | Histopathological analysis | 3 | - (Interpretative Skill has no competence level) |
| Interpretative | Wound swab for C/S | 3 | - |
| Procedural | Drainage of superficial abscess | 3 | 3, 4, 3 |
| Procedural | Excision biopsy of SCC / BCC / Melanoma | 3 | 2, 3, 2 |
| Procedural | Excision of carbuncle | 1 | 3 |
| Procedural | Fasciotomy | 1 | 4 |
| Procedural | Flap closure | 1 | 1 |
| Procedural | Lymph node biopsy | 3 | 2, 3, 2 |
| Procedural | Management of foreign bodies | 3 | 2, 3, 2 |
| Procedural | Nail avulsion / Wedge resection | 3 | 3, 4, 3 |
| Procedural | Skin grafting (partial thickness and full thickness) | 3 | 2, 3, 2 |
| Procedural | Wound debridement | 3 | 3, 4, 3 |

The portal's own mapped minimums are recorded in `specialty-config/skin-subcutaneous-tissue.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 12 requested skills (2 Interpretative + 10 Procedural) matched the live portal's mapped competency data exactly, verbatim - no whitespace or spelling differences, and no unmatched skills or invalid competence levels. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for full detail.

**Important - duplicate skill labels across specialties:** two of this specialty's Procedural skill names are identical in label to skills used in *other* specialties, but they are separate portal leaves with different allowed competence levels:
- `Fasciotomy` here uses levels **3, 4** (the Plastic Surgery case type's `Fasciotomy` leaf uses levels 2, 3 - a different leaf entirely).
- `Wound debridement` here uses levels **3, 4** (the Accident & Emergency / Casualty case type's `Wound debridement` leaf uses levels 2, 3 - a different leaf entirely).

This generator resolves the Skin and Subcutaneous Tissue leaf strictly by `CaseType = "Skin and Subcutaneous Tissue"` and only ever applies the levels configured in `specialty-config/skin-subcutaneous-tissue.json`, so the two same-named skills are never conflated with their other-specialty counterparts.

## Reference PDF usage
The FCPS Core Surgical Training logbook skill/count/competence-level table supplied for this specialty was consulted **only** for the exact skill names, per-skill counts, and allowed competence levels, and for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis from any real logbook or patient record was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis/procedure (e.g. younger adult ages for ingrown toenail and foreign-body management, middle-aged and older adult ages for skin malignancy excision, carbuncle, and chronic wound debridement) rather than a generic age spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Skin_Subcutaneous_Tissue_01-01-2026_to_30-06-2026.xlsx`

This workbook is a structural copy of the real `output/BCPS_Logbook_Full_Mapping.xlsx` (never modified) with its `DataEntry` sheet populated by the 30 synthetic rows described above. It follows the same PDF-style/portal-field layout as every other specialty dataset in this project - no structural changes were made to the workbook format itself.

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only (30/30 rows valid, 0 invalid).

## Folder structure (permanent, reusable across future date ranges)
```
Skin-Subcutaneous-Tissue/
  README.md                          (this file)
  specialty-config/
    skin-subcutaneous-tissue.json    (skill/level/count config - reusable, not date-specific)
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
