# Minimally Invasive Surgery – Laparoscopic Procedures - Synthetic Logbook Dataset

## Specialty
Minimally Invasive Surgery – Laparoscopic Procedures (Form: "Procedural and Interpretative Skills")

## Training context
**Laparoscopic / Minimally Invasive Surgical Unit.** Every generated case (investigations included) reflects a realistic laparoscopic/minimally invasive surgical training case - port access technique, diagnostic laparoscopy, laparoscopic appendicectomy, laparoscopic cholecystectomy, laparoscopic control of bleeding, laparoscopic hernioplasty, laparoscopic suturing and knotting, and related preoperative investigations - not unrelated open-surgery or other-specialty cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/minimally-invasive-surgery-laparoscopic-procedures.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 25 rows**
- Interpretative total: **6 rows**
- Procedural total: **19 rows**

**Quota source: user-provided exact counts only.** This dataset does **not** use the portal's own mapped minimums to size itself. Per explicit instruction, the exact counts below were used as-is, and were **not** expanded to match the portal's minimums or multiplied by the number of valid competence levels. The itemized breakdown sums exactly to the stated totals - no arithmetic discrepancy for this specialty (Interpretative 3+3=6; Procedural 5+3+1+3+3+1+3=19; grand total 6+19=25).

| Skill Type | Skill | Count | Competence Level(s) used |
|---|---|---|---|
| Interpretative | Plain X-ray Abdomen | 3 | n/a (no competence level) |
| Interpretative | USG /CT abdomen | 3 | n/a (no competence level) |
| Procedural | Closed and open techniques for port creation and closure | 5 | 2, 3, 2, 3, 2 |
| Procedural | Diagnostic laparoscopy | 3 | 2, 3, 2 |
| Procedural | Laparoscopic appendicectomy | 1 | 1 |
| Procedural | Laparoscopic cholecystectomy | 3 | 1, 2, 1 |
| Procedural | Laparoscopic control of bleeding | 3 | 2, 3, 2 |
| Procedural | Laparoscopic hernioplasty (TAPP & TEP) | 1 | 2 |
| Procedural | Laparoscopic suturing and knotting | 3 | 3, 2, 3 |

The portal's own mapped minimums are recorded in `specialty-config/minimally-invasive-surgery-laparoscopic-procedures.json` for traceability only - they were **not** used to size this dataset.

The live portal mapping (`output/form-map.json`, from a prior already-approved read-only crawl) was used only to verify: exact skill names, field schemas, and which competence levels are portal-valid for each Procedural skill. All 9 requested skills (2 Interpretative + 7 Procedural) matched exactly, verbatim; no skill was guessed or fabricated. For every Procedural skill with more than one allowed competence level, the level is varied across its rows rather than being fixed or used to multiply the row count.

## IMPORTANT: exact case-type label (en-dash)
The portal's exact case-type label for this specialty uses an **EN-DASH (–)**, not a hyphen, and lowercase "procedures": `Minimally Invasive Surgery – Laparoscopic procedures`. This exact string (copied verbatim from `output/form-map.json`, never retyped by hand) is used as `CASE_TYPE_LABEL` in the generator. This case type also has two other unrelated leaves in the portal ("Clinical skill", "Communication and Writing Skill") with no competency items - they are not used by this dataset.

## Reference material usage
The clinical content (Diagnosis/Problems, Brief Procedural Notes/Interpretations, Brief Description) was authored fresh for this specialty, in the concise FCPS-logbook style used throughout this project. No real patient name, registration number, date, age, or patient-identifiable diagnosis was copied from any source document.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis/procedure in a general adult surgical population (e.g. younger adults for appendicitis, middle-aged and older adults for cholelithiasis/hernia), rather than a generic flat spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Minimally_Invasive_Surgery_Laparoscopic_Procedures_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Minimally-Invasive-Surgery-Laparoscopic-Procedures/
  README.md                          (this file)
  specialty-config/
    minimally-invasive-surgery-laparoscopic-procedures.json  (skill/level/count config - reusable, not date-specific)
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
