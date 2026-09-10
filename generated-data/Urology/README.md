# Urology - Synthetic Logbook Dataset

## Specialty
Urology (Form: "Procedural and Interpretative Skills")

## Training context
**Surgical Unit / Urology Surgical Unit.** Every generated case (investigations included) reflects a problem a Urology Surgical Unit would reasonably evaluate or manage - no unrelated general-medical or nephrology-only cases were generated. See the per-skill Diagnosis/Problems mapping in `specialty-config/urology.json` and `generated-data/.../reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 66 rows**
- Interpretative total: **37 rows**
- Procedural total: **29 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums, does **not** use the reference PDF, and does **not** multiply any row count by the number of valid competence levels. The exact counts below were used as-is:

| Skill Type | Skill | Count |
|---|---|---|
| Interpretative | CT scan/MRI/angiogram | 3 |
| Interpretative | CT-urogram | 3 |
| Interpretative | DMSA/DTPA scan | 1 |
| Interpretative | IVU | 3 |
| Interpretative | Renal biopsy report interpretation | 1 |
| Interpretative | Renal function test | 5 |
| Interpretative | USG of genitourinary system | 5 |
| Interpretative | Urine C/S | 3 |
| Interpretative | Urine routine and microscopical examination | 5 |
| Interpretative | Uroflowmetry | 3 |
| Interpretative | X-ray KUB | 5 |
| Procedural | Amputation of penis (Level 2) | 1 |
| Procedural | Circumcision (Levels 3, 3, 4) | 3 |
| Procedural | Cystolithtomy (Level 1) | 1 |
| Procedural | Cystourethroscopy (Level 1) | 1 |
| Procedural | Meatoplasty (Level 1) | 1 |
| Procedural | Optical internal urethrotomy (Level 1) | 1 |
| Procedural | Orchidectomy (Levels 3, 2) | 2 |
| Procedural | Orchidopexy (Level 1) | 1 |
| Procedural | PCNL (Levels 1, 2, 1) | 3 |
| Procedural | Pyelolithotomy (Level 1) | 1 |
| Procedural | Pyeloplasty (Level 1) | 1 |
| Procedural | Repair of bladder injury (Level 2) | 1 |
| Procedural | Repair of ureteric injury (Level 2) | 1 |
| Procedural | Suprapubiccystostomy (Level 2) | 1 |
| Procedural | URS (Levels 1, 1, 2) | 3 |
| Procedural | Ureterolithotomy (Level 1) | 1 |
| Procedural | Ureteroscopy (Level 1) | 1 |
| Procedural | Urethral catheterization (Levels 3, 3, 3, 4, 4) | 5 |

The portal's own mapped minimums are recorded in `specialty-config/urology.json` for traceability only - they were **not** used to size this dataset.

## Skill mapping
All 29 requested skills (11 Interpretative + 18 Procedural) matched the live portal's mapped competency data exactly. Three Procedural skills carry a trailing space in the portal's own label that the user's provided list did not include - the portal-exact string (with trailing space) was used as authoritative in this dataset, both because it is portal-verified and because the proven upload pipeline's checkbox matcher requires competency names verbatim:

| User-provided name | Portal name |
|---|---|
| Orchidectomy | `Orchidectomy ` |
| Pyelolithotomy | `Pyelolithotomy ` |
| Ureterolithotomy | `Ureterolithotomy ` |

`Cystolithtomy` and `Suprapubiccystostomy` are the portal's own spellings and matched the user's list exactly with no ambiguity. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for full detail.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF was consulted **only** for concise Diagnosis/Problems wording STYLE. No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis/procedure (e.g. pediatric ages for circumcision/meatoplasty/orchidopexy, elderly ages for BPE-related catheterization and chronic subdural-style stone disease, appropriate ages for malignancy) rather than a generic spread. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Urology_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Urology/
  README.md                          (this file)
  specialty-config/
    urology.json                     (skill/level/count config - reusable, not date-specific)
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
