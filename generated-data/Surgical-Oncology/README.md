# Surgical Oncology - Synthetic Logbook Dataset

## Specialty
Surgical Oncology (Form: "Procedural and Interpretative Skills")

## Training context
**Surgical Oncology Unit.** Every generated case (investigations included) reflects a realistic surgical-oncology training case - suspected or confirmed surgical malignancies spanning breast, colorectal, gastric, thyroid, soft tissue, skin, and lymph node organ systems, with appropriate tumour/biopsy contexts - not unrelated cases from other specialties. See the per-skill Diagnosis/Problems mapping in `specialty-config/surgical-oncology.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
No arithmetic discrepancy was found for this specialty: the itemized per-skill counts sum exactly to the stated totals.
- **Grand total: 35 rows**
- Interpretative total: **20 rows** (10 + 5 + 5)
- Procedural total: **15 rows** (5 skills x 3 rows each)

| Skill Type | Skill | Count | Competence Level(s) used |
|---|---|---|---|
| Interpretative | Histopathology/ cytology/immunohistochemistry/ Tumor markers  | 10 | n/a (Interpretative - no level) |
| Interpretative | Local X-ray  | 5 | n/a (Interpretative - no level) |
| Interpretative | MRI / CT scan / Bone scan | 5 | n/a (Interpretative - no level) |
| Procedural | Core-cut biopsy | 3 | 2, 2, 3 |
| Procedural | Excision biopsy | 3 | 2, 2, 3 |
| Procedural | FNAC | 3 | 2, 2, 3 |
| Procedural | Incision biopsy | 3 | 2, 2, 3 |
| Procedural | Sentinel lymph node biopsy | 3 | 2, 2, 3 |

Note: the two Interpretative skill names above are reproduced **verbatim** with the portal's exact internal/trailing spacing (`"Histopathology/ cytology/immunohistochemistry/ Tumor markers "` and `"Local X-ray "`) - this spacing is intentional and matches the live portal's mapped competency label exactly. See `specialty-config/surgical-oncology.json` notes and `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for confirmation.

The portal's own mapped minimums are recorded in `specialty-config/surgical-oncology.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 8 requested skills (3 Interpretative + 5 Procedural) matched the live portal's mapped competency data **exactly** (2 label differences are pure whitespace, noted above and in the config) - no ambiguity, no guessing required, and all requested competence levels (2 and 3, for every Procedural skill) are portal-valid. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Organ-system variety (the 10-row histopathology skill)
The `Histopathology/ cytology/immunohistochemistry/ Tumor markers ` skill (10 rows) deliberately spans multiple organ systems rather than repeating near-identical entries: breast carcinoma (core-cut histopathology and receptor-status immunohistochemistry), colorectal carcinoma, gastric carcinoma, papillary thyroid carcinoma, soft tissue sarcoma, malignant melanoma, cutaneous squamous cell carcinoma, lymph node metastasis from an occult primary, and tumour-marker (AFP) evaluation for suspected hepatocellular carcinoma.

## Adult age realism
Every row uses a clinically plausible, varied age appropriate to a Surgical Oncology case-mix (all ages 18+, actual range generated: **34-68 years**), rather than a generic or paediatric age spread:
- **40s-60s**: the majority of breast, GI, thyroid, and soft-tissue malignancy cases (the dominant surgical-oncology demographic).
- **30s-40s**: a minority of younger soft-tissue-sarcoma and thyroid cases, for realistic variety.
- **60s**: bone-metastasis, advanced colorectal/gastric, and older-onset skin-malignancy cases.

DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date).

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook-style skill/count/level table was consulted **only** for the exact skill names, counts, and competence levels, and for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis was copied into this dataset.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Surgical_Oncology_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Surgical-Oncology/
  README.md                          (this file)
  specialty-config/
    surgical-oncology.json           (skill/level/count config - reusable, not date-specific)
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
3. Re-confirm row-count authority and totals with the user before reusing this config: this dataset's counts are USER-PROVIDED EXACT COUNTS, not portal quota.

## Do not overwrite warning
Do not overwrite any existing date-range folder under this specialty. Each date range's `generated/`, `reviewed/`, `reports/`, and `upload-results/` folders are permanent records once created.
