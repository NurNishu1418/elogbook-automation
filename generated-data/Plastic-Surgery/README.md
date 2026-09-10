# Plastic Surgery - Synthetic Logbook Dataset

## Specialty
Plastic Surgery (Form: "Procedural and Interpretative Skills")

## Training context
**Plastic Surgery / Burns / Reconstructive Surgical Unit.** Every generated case (investigations included) reflects a problem a Plastic Surgery / Burns / Reconstructive Surgical Unit would reasonably evaluate or manage - burns of varying depth/site/percentage, escharotomy and fasciotomy for burn-related compartment/vascular compromise, flap reconstruction for soft tissue defects, release of post-burn contractures, skin grafting for raw areas, and the associated nutritional/electrolyte investigations - no unrelated general-medical cases were generated. See the per-skill Diagnosis/Problems mapping in `specialty-config/plastic-surgery.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 24 rows**
- Interpretative total: **10 rows**
- Procedural total: **14 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums, does **not** use the reference PDF, and does **not** multiply any row count by the number of valid competence levels. The itemized counts sum exactly to the required totals (10 + 14 = 24 - no arithmetic discrepancy). The exact counts below were used as-is:

| Skill Type | Skill | Count | Levels used |
|---|---|---|---|
| Interpretative | Nutritional status | 5 | n/a |
| Interpretative | Serum electrolytes | 5 | n/a |
| Procedural | Burn dressing | 5 | 3, 4, 3, 4, 3 |
| Procedural | Escharotomy | 1 | 2 |
| Procedural | Fasciotomy | 1 | 3 |
| Procedural | Flap reconstruction | 1 | 2 |
| Procedural | Release of burn contractures | 3 | 2, 3, 2 |
| Procedural | Skin grafting | 3 | 3, 2, 3 |

Note: the portal's mapped labels for "Nutritional status" and "Release of burn contractures" carry a trailing space (`"Nutritional status "`, `"Release of burn contractures "`) - the dataset uses the portal-exact strings verbatim; the table above omits the trailing space for readability only.

The portal's own mapped minimums are recorded in `specialty-config/plastic-surgery.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 8 requested skills (2 Interpretative + 6 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero label or spelling differences** (including the trailing-space labels above) - no ambiguity, no guessing required. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF was consulted **only** for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Because burns and reconstructive trauma span all ages, ages were chosen to be clinically plausible per scenario rather than a single fixed age band - e.g. paediatric ages for a scald burn of the lower limb and a major burn nutritional/electrolyte assessment, working-age adults for burn dressings, escharotomy, fasciotomy, flap reconstruction, contracture release, and skin grafting, and an elderly patient for a post-skin-graft nutritional assessment. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Plastic_Surgery_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Plastic-Surgery/
  README.md                          (this file)
  specialty-config/
    plastic-surgery.json             (skill/level/count config - reusable, not date-specific)
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
