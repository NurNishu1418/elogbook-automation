# Gastrointestinal & HepatoBiliary System and Pancreas — Specialty Dataset Package

## Specialty
Gastrointestinal & HepatoBiliary System and Pancreas (Case Type under Form "Procedural and Interpretative Skills"), covering both its Interpretative Skill and Procedural skill leaves.

## Current dataset: `01-01-2026_to_30-06-2026`
- **Date range:** 01/01/2026 to 30/06/2026 (inclusive)
- **Workbook path:** `01-01-2026_to_30-06-2026\generated\BCPS_Logbook_Gastrointestinal_HepatoBiliary_Pancreas_01-01-2026_to_30-06-2026.xlsx`
- **Review status:** **PENDING MANUAL REVIEW**
- **Upload status:** **NOT UPLOADED**

## Row counts — IMPORTANT: two different totals exist for this specialty

Two different "required minimum" figures were identified during generation, and **both are preserved** (see `01-01-2026_to_30-06-2026\reports\quota-comparison-report.json` for the full per-skill breakdown):

| Source | Interpretative | Procedural | Grand Total |
|---|---|---|---|
| **User's source document** (original minimum-requirement list) | 36 | 77 | **113** |
| **Live portal's own server-computed quota** (`total_min_target`, read live 2026-09-09) | 69 | 131 | **200** |

**This dataset was generated using the PORTAL-AUTHORITATIVE total (200 rows)**, per explicit user decision, because the live portal's own backend report (`GET /api/auth/elogbook-management/v1/logbook-entry-report-by-from/{formId}`) computes and displays `total_min_target` values that mathematically only reconcile as the sum of every individual competence-level minimum across every skill — i.e. the portal itself requires the higher, summed total. The source-document total of 113 is not discarded; it remains on record here and in every report file for comparison, in case a future dataset run is asked to target it instead.

- Interpretative total generated: **69** (10 skills, all single-level)
- Procedural total generated: **131** (31 skills, each competence level generated as its own independently-counted set of rows, never collapsed into one)

## Created using fictional patient data
Every patient name, registration number, date of birth, and age in this dataset is synthetic/fictional, generated programmatically. No real patient data was copied into the workbook.

## Source PDF used only for style reference
The user's real BCPS Core Surgical Training logbook (PDF) was consulted **only** to confirm the concise clinical-shorthand style of the "Diagnosis/Problems" style fields (e.g. "Fistula in ano," "Chronic calculus cholecystitis"). No real patient name, registration number, date, age, or patient-identifiable diagnosis from that document was copied. The rendered images and extracted content used for this style check were deleted immediately after review.

## No real patient information intentionally copied
Confirmed — see above.

## How to generate a future date-range version of this specialty
1. Reuse `specialty-config\gastrointestinal-hepatobiliary-pancreas.json` (skill list, mapped leaf ids, and per-competence-level counts) — it is date-range-independent by design.
2. Create a new sibling folder under this specialty root named for the new range, e.g. `01-07-2026_to_31-12-2026\`, with the same `generated\ / reviewed\ / reports\ / upload-results\ / archive\` sub-structure.
3. Run a generator script parameterized for that date range and output folder (copy the pattern in `src/uploader/generate-gi-hepatobiliary-pancreas-dataset.ts`, changing only the date-range folder name and the assignment-date range constants — do not touch the skill/quota config).
4. **Never** point a new date-range generation at an existing date-range folder — if the target folder already exists, stop and report it rather than overwriting.

## Warning: do not overwrite this folder
`01-01-2026_to_30-06-2026\` is a permanent record of this specific generation run (including its `reports\` folder, which documents the quota decision made for it). Do not delete, move, or regenerate into it. Future date ranges must use their own new sibling folders.

## Warning: upload requires explicit user approval
The workbook in `01-01-2026_to_30-06-2026\generated\` has **not** been reviewed or approved. No upload, Save as Draft, or Final Submit may occur until:
1. The user has manually reviewed the workbook, and
2. An approved copy has been created in `01-01-2026_to_30-06-2026\reviewed\` (only after explicit approval — never created automatically), and
3. The user has explicitly said to proceed with upload.

Even after approval, only "Save as Draft" is ever used — Final Submit is not supported anywhere in this project.
