# Vascular Surgery - Synthetic Logbook Dataset

## Specialty
Vascular Surgery (Form: "Procedural and Interpretative Skills")

## Training context
**Vascular Surgical Unit.** Every generated case (investigations included) reflects a realistic vascular surgical training case - peripheral arterial disease, aortic/peripheral aneurysm, carotid artery stenosis, deep vein thrombosis, venous insufficiency, arterial embolism, and traumatic vascular injury - not unrelated general-surgical or medical cases. See the per-skill Diagnosis/Problems mapping in `specialty-config/vascular-surgery.json` and `01-01-2026_to_30-06-2026/reports/generated-rows-raw.json` for the full clinical rationale behind every row.

## Date range covered
`01-01-2026_to_30-06-2026` (01/01/2026 to 30/06/2026 inclusive)

## Row counts (USER-PROVIDED EXACT COUNTS - NOT portal quota)
- **Grand total: 13 rows**
- Interpretative total: **8 rows**
- Procedural total: **5 rows**

**Quota source: user-provided exact counts only.** Per explicit instruction, this dataset does **not** use the portal's own mapped minimums and does **not** multiply any row count by the number of valid competence levels. There is **no arithmetic discrepancy** for this specialty: the itemized per-skill counts (3 + 5 = 8 Interpretative; 1x5 = 5 Procedural) sum exactly to the stated Grand Total of 13 - verified programmatically before generation. The exact counts below were used as-is:

| Skill Type | Skill | Count | Competence Level Used |
|---|---|---|---|
| Interpretative | Angiogram/CT angiogram | 3 | n/a (Interpretative Skill has no level) |
| Interpretative | Color Doppler / Duplex imaging /MRA / MRV / DSA | 5 | n/a (Interpretative Skill has no level) |
| Procedural | Arterial thrombo-embolectomy | 1 | 2 |
| Procedural | Carotid end arterectomy | 1 | 2 |
| Procedural | Ligation and excision of hemangioma and aneurysm | 1 | 1 |
| Procedural | Use of vascular grafts | 1 | 2 |
| Procedural | Vascular repair | 1 | 1 |

The portal's own mapped minimums are recorded in `specialty-config/vascular-surgery.json` for traceability only - they were **not** used to size this dataset. Note: two Procedural skill names carry a portal-verbatim trailing space ("Arterial thrombo-embolectomy ", "Ligation and excision of hemangioma and aneurysm ") and the Doppler/imaging Interpretative skill has no space before "MRA" ("imaging /MRA") - all copied exactly from the live portal mapping, see `01-01-2026_to_30-06-2026/reports/mapping-match-report.json`.

## Skill mapping
All 7 requested skills (2 Interpretative + 5 Procedural) matched the live portal's mapped competency data **exactly, verbatim, with zero unmatched skills and zero invalid competence levels** - the 2 label differences noted above (trailing-space and missing-space variants) were resolved by using the portal-exact string as authoritative, with zero ambiguity. See `01-01-2026_to_30-06-2026/reports/mapping-match-report.json` for the full confirmation.

## Age realism
Every row uses a condition-specific adult age rather than a generic spread:
- **Middle-aged to older adult (45-72 years)**: peripheral arterial disease, abdominal aortic aneurysm, carotid artery stenosis, arterial embolism/acute limb ischemia, popliteal artery aneurysm, arterial reconstruction with vascular grafts, deep vein thrombosis, venous insufficiency/varicose veins, pre-fistula vessel mapping.
- **Younger adult (28 years)**: the one trauma-related vascular repair case (traumatic vascular injury following a road traffic accident), consistent with the demographic most commonly affected by vascular trauma.

No paediatric ages were used anywhere in this dataset. DOB/age were verified programmatically for every row (DOB strictly before Assignment Date, exact completed age on Assignment Date).

## Fictional data statement
All patient names, registration numbers, dates of birth, and assignment dates in this dataset are entirely fictional and synthetically generated. Some assignment dates repeat across different rows where realistic (multiple cases on the same clinic/theatre day), but every patient name, registration number, and ExternalRowId is unique. Any resemblance to a real patient is coincidental.

## Workbook location
`01-01-2026_to_30-06-2026/generated/BCPS_Logbook_Vascular_Surgery_01-01-2026_to_30-06-2026.xlsx`

## Review status
**PENDING MANUAL REVIEW** - this dataset has NOT been approved. No `reviewed/` copy has been created.

## Upload status
**NOT UPLOADED.** No login, browser session, or Save-as-Draft action has been performed against the live portal for this dataset. Dry-run structural/field validation only.

## Folder structure (permanent, reusable across future date ranges)
```
Vascular-Surgery/
  README.md                        (this file)
  specialty-config/
    vascular-surgery.json          (skill/level/count config - reusable, not date-specific)
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
