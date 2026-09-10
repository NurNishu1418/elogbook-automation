# Neurosurgery - Synthetic Logbook Dataset

## Specialty
Neurosurgery (Form: "Procedural and Interpretative Skills")

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 11 rows**
- Interpretative total: **7 rows**
- Procedural total: **4 rows**

**Quota source: user-provided exact counts only.** Unlike the Gastrointestinal and Disorders-of-the-Breast datasets, this dataset does **not** use the portal's own mapped minimums to size itself. Per explicit instruction, the exact counts below were used as-is, and were **not** expanded to match the portal's minimums or multiplied by the number of valid competence levels:

| Skill Type | Skill | Count |
|---|---|---|
| Interpretative | CT/MRI /MRA of brain | 3 |
| Interpretative | Nerve conduction study | 1 |
| Interpretative | X-ray skull | 3 |
| Procedural | Burr hole (Level 1) | 1 |
| Procedural | Craniotomy (Level 2) | 1 |
| Procedural | Repair of meningocoele (Level 1) | 1 |
| Procedural | Repair of peripheral nerves (Level 2) | 1 |

The portal's own mapped minimums (Interpretative: 5/2/5; Procedural: 1+1 per level for each of the 4 skills) are recorded in `specialty-config/neurosurgery.json` for traceability only - they were **not** used to size this dataset.

The live portal mapping (`output/form-map.json`, from a prior already-approved read-only crawl) was used only to verify: exact skill names, field schemas, and which competence levels (1 and 2, for all 4 Procedural skills) are portal-valid. All 7 requested skills matched exactly; no skill was guessed or fabricated.

## Reference PDF usage
The user-supplied FCPS Core Surgical Training logbook PDF was consulted **only** for concise Diagnosis/Problems wording STYLE (e.g. "Chronic subdural hematoma," "Repair of ulnar nerve," "Meningocoele"). No real patient name, registration number, date, age, or diagnosis from that document was copied into this dataset.

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Ages were chosen to be clinically plausible for each specific diagnosis/procedure (e.g. an infant for meningocoele repair, an elderly patient for chronic subdural hematoma) rather than a generic spread. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Neurosurgery_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Neurosurgery/
  README.md                          (this file)
  specialty-config/
    neurosurgery.json                (skill/level/count config - reusable, not date-specific)
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
