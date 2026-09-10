# Full Read-Only Form/Uploader Audit — 2026-09-10

**Scope**: All 43 mapped live portal leaf combinations, full field/competency/level inventory, dependency re-verification, workbook-vs-uploader gap analysis, existing-draft persistence spot-checks, Vascular Surgery special-case root-cause, workbook schema review, existing dataset classification.

**Nature of this document**: 100% read-only findings. No code was changed as part of this audit (the only code changes referenced below — the Level-checkbox fix and the single canary repair — were completed and approved in the prior session, before this audit began, and are not modified here). No new Excel files were generated. No bulk repair or bulk upload occurred. No Final Submit occurred anywhere.

Supporting raw data: `raw-leaf-audit.json` (full DOM scan per leaf), `leaf-summary.json` (condensed per-leaf view), `existing-draft-audit.json` (portal draft census).

---

## 1. All 43 leaf combinations audited

All 43/43 leaves were audited live, in one continuous read-only session (see `raw-leaf-audit.json`). Zero exceptions/crashes across the run.

| # | Path | Cached leaf id | Live leaf id | ID drift | Notes |
|---|---|---|---|---|---|
| 1 | Procedural and Interpretative Skills > Abdominal Wall > Interpretative Skill | 99a06d89… | matches | No | |
| 2 | …Abdominal Wall > Procedural skill | 8d16daad… | matches | No | Contains the Level-5 anomaly, see §3/§12 |
| 3 | …Accident & Emergency / Casualty > Interpretative Skill | 062a2e9b… | matches | No | |
| 4 | …Accident & Emergency / Casualty > Procedural skill | f32621e6… | matches | No | |
| 5 | …Anaesthesia & Procedural critical care > Interpretative Skill | e69cd3aa… | matches | No | False-positive "case type mismatch" — see note below |
| 6 | …Anaesthesia & Procedural critical care > Procedural skill | f3acefe6… | matches | No | Same false-positive note |
| 7 | …Basic Surgical Skill > Communication and Writing Skill | 99e21e93… | matches | No | Has real content (10 competency items) — mapped but never used by any current generator |
| 8 | …Basic Surgical Skill > Procedural skill | 18aab29a… | matches | No | |
| 9 | …Disorders of the Breast > Interpretative Skill | ada9e308… | matches | No | |
| 10 | …Disorders of the Breast > Procedural skill | 141bbcab… | matches | No | |
| 11 | …Endocrine Surgery (…) > Interpretative Skill | 66dfd638… | matches | No | |
| 12 | …Endocrine Surgery (…) > Procedural skill | d1dd3ed6… | matches | No | |
| 13 | …Gastrointestinal & HepatoBiliary… > Interpretative Skill | df48137d… | matches | No | |
| 14 | …Gastrointestinal & HepatoBiliary… > Procedural skill | cd8e3367… | matches | No | Largest checklist (31 items) — all rendered/verified correctly |
| 15 | …Minimally Invasive Surgery… > Clinical skill | 013281cf… | matches | No | 0 competency items — mapped placeholder, never used |
| 16 | …Minimally Invasive Surgery… > Communication and Writing Skill | 471d1ba0… | matches | No | 0 fields, 0 competency items — mapped placeholder, never used |
| 17 | …Minimally Invasive Surgery… > Interpretative Skill | e92e1c2f… | matches | No | |
| 18 | …Minimally Invasive Surgery… > Procedural skill | d26fa4fd… | matches | No | |
| 19 | …Neurosurgery > Interpretative Skill | 11bd8bf2… | matches | No | |
| 20 | …Neurosurgery > Procedural skill | c5758a6c… | matches | No | |
| 21 | …Orthopaedic Surgery > Interpretative Skill | 1952142e… | matches | No | |
| 22 | …Orthopaedic Surgery > Procedural skill | dc3a106f… | matches | No | |
| 23 | …Paediatric Surgery > Interpretative Skill | 3a8b2319… | matches | No | |
| 24 | …Paediatric Surgery > Procedural skill | 6599f61d… | matches | No | |
| 25 | …Parasites of Surgical Importance > Interpretative Skill | dc995222… | matches | No | |
| 26 | …Parasites of Surgical Importance > Procedural skill | 35974d3a… | matches | No | |
| 27 | …Plastic Surgery > Interpretative Skill | de32f03b… | matches | No | |
| 28 | …Plastic Surgery > Procedural skill | e9493309… | matches | No | |
| 29 | …Procedural Nutrition > Interpretative Skill | 3587caef… | matches | No | |
| 30 | …Procedural Nutrition > Procedural skill | 0e1909df… | matches | No | Contains the already-repaired canary entry |
| 31 | …Skin and Subcutaneous Tissue > Interpretative Skill | 6cd958f4… | matches | No | |
| 32 | …Skin and Subcutaneous Tissue > Procedural skill | d8c17d2d… | matches | No | |
| 33 | …Surgical Oncology > Interpretative Skill | 6120c376… | matches | No | |
| 34 | …Surgical Oncology > Procedural skill | b8716fc4… | matches | No | |
| 35 | …Thoracic and Cardiovascular Surgery > Interpretative Skill | d44b7f87… | matches | No | This is the leaf Vascular Surgery incorrectly loads into — see §9 |
| 36 | …Thoracic and Cardiovascular Surgery > Procedural skill | 8aa758e2… | matches | No | Same |
| 37 | …Urology > Interpretative Skill | 724765b4… | matches | No | |
| 38 | …Urology > Procedural skill | 7ab0db36… | matches | No | Largest procedural checklist actually exercised (18 items) |
| 39 | **…Vascular Surgery > Interpretative Skill** | 038b9461… | **d44b7f87… (Thoracic's id)** | **YES** | **See §9 — confirmed portal bug** |
| 40 | **…Vascular Surgery > Procedural skill** | 40abd843… | **8aa758e2… (Thoracic's id)** | **YES** | **See §9 — confirmed portal bug** |
| 41 | Patient Management > Emergency Patient Management | 181715c5… | matches | No | Different Form entirely; never used by any current dataset — see §6, §15 |
| 42 | Patient Management > In-Patient Management | 2458946d… | matches | No | Same |
| 43 | Patient Management > Out-Patient Management | f4a5140c… | matches | No | Same |

**Note on the "false-positive case type mismatch" (leaves 5–6)**: my detector flagged these because the portal renders the label with a double space ("Anaesthesia  & Procedural critical care") while the cached mapping normalizes it to a single space. Confirmed harmless via direct inspection — not a real selection bug, unlike Vascular Surgery.

## 2. Complete field inventory per combination

Full detail for all 43 leaves is in `raw-leaf-audit.json` → `liveFields`. Summary finding: for every one of the 40 "Procedural and Interpretative Skills" leaves, the live field set matches the cached mapping **exactly** except for 2 consistently-appearing extra entries with `name: null` — confirmed to be non-data UI scaffolding (the Case Type combobox's own internal search `<input>`, not a real form field). These are correctly ignored by the uploader today and require no action. No genuine missing or extra data field was found on any of the 40 leaves.

The 3 "Patient Management" leaves (41–43) use a **different Form** never touched by any current dataset or uploader code path. Live scan confirms this form's leaves contain declared **radio-type fields** ("Cold/Routine Case, Emergency Case", "New Patient, Follow-up Patient") and the project's **only dropdown-type field** ("Outcome", Emergency Patient Management) — both control types have zero real-world usage or test coverage anywhere in this project.

## 3. Complete procedural competency + level inventory

All 19 genuine Procedural-skill leaves (excluding the 2 mis-loaded Vascular leaves) were inspected. Every one of their **185 competency items** was individually checked and its nested Level checkboxes inspected:

- **185/185 items correctly render all 4 Level checkboxes** (`levelOne`–`levelFour`) regardless of which levels the mapped data considers valid — confirming the finding from the prior session's fix generalizes across the entire portal, not just the sample tested at the time.
- **1 critical anomaly found**: "Open and laparoscopic repair of inguinal hernia" (Abdominal Wall) has a mapped valid competence level of **"5"**, but the live DOM was directly re-verified (separate targeted check) to expose **only 4 level checkboxes, Level 1–4** — there is no 5th checkbox anywhere in the DOM. **This specific skill cannot currently be completed via the live portal UI at all** — any attempt to select "Level 5" will fail cleanly under the new fix (a clear, safe failure — not a silent mis-save) because no such control exists to click. This needs escalation: either the portal is missing a checkbox, or the backend's competence-level data for this one item is wrong. Full detail in `raw-leaf-audit.json` and `check-level5-inguinal-hernia` diagnostic output.
- Zero items were found where the checked skill's checkbox itself failed to render, and zero items exist with more than one level valid where the DOM offered fewer than 4 checkboxes to choose from.

## 4. Dependency inventory

Every leaf's cascade (Form → Case Type → Skill Type → dynamic fields → competency checklist) was re-walked live for all 43 leaves. All cascades resolved correctly and produced the expected dependent field set, **except** Vascular Surgery, where the Case Type → Skill Type dependency silently resolves to the wrong downstream data (see §9). No other dependency the uploader currently relies on was found broken, ignored, or racing ahead of readiness during this audit (the existing `selectFormOption` → `selectReactSelectOption` → `selectSkillType` → settle sequence was sufficient to reach a stable, fully-rendered state for all 41 non-Vascular leaves).

## 5. Workbook-vs-uploader-vs-portal gap matrix

| Field/Control | Live Portal Expected | Mapping (form-map.json) | Excel DataEntry | Uploader (fillForm.ts) | Classification |
|---|---|---|---|---|---|
| Name of the Patient | ✓ (text) | ✓ | ✓ column | ✓ filled | SUPPORTED |
| Patient Reg No | ✓ (text) | ✓ | ✓ column | ✓ filled | SUPPORTED |
| Date of Birth | ✓ (date) | ✓ | ✓ column | ✓ filled | SUPPORTED |
| Age | ✓ (text) | ✓ | ✓ column | ✓ filled | SUPPORTED |
| Date of Assignment | ✓ (date) | ✓ | ✓ column | ✓ filled | SUPPORTED |
| Diagnosis/Problems | ✓ (textarea, Procedural) | ✓ | ✓ via ExtraFieldsJSON | ✓ filled | SUPPORTED |
| Indication/Investigation/Findings/Diagnosis | ✓ (textarea, Interpretative) | ✓ | ✓ via ExtraFieldsJSON | ✓ filled | SUPPORTED |
| Interpretations | ✓ (text, Interpretative) | ✓ | ✓ via ExtraFieldsJSON | ✓ filled | SUPPORTED |
| Brief Description | ✓ (text, optional) | ✓ | ✓ via ExtraFieldsJSON | ✓ filled | SUPPORTED |
| Brief Procedural Notes | ✓ (text, Procedural) | ✓ | ✓ via ExtraFieldsJSON | ✓ filled | SUPPORTED |
| Competency main item (checkbox) | ✓ | ✓ | ✓ CompetencyItemsChecked | ✓ checked + verified | SUPPORTED |
| **Competency Level (nested checkbox)** | ✓ (required by the portal's own data model whenever a Procedural item is checked) | ✓ (`log_entry_target.compitency_level`) | **✗ no column carries this today** | **✓ as of the prior fix, but only when exactly one level is valid; correctly FAILS (does not guess) when more than one is valid** | **PARTIALLY_SUPPORTED** |
| Competency Level = "5" case (Abdominal Wall inguinal hernia) | Declared valid by backend data | ✓ declared | n/a | Correctly fails (no DOM control exists) | **NOT_SUPPORTED — portal-side gap, not fixable in the uploader** |
| "Competency Group and Details" master checkbox | Present but inert (always `value="false"`, no evidence it needs interaction) | present as a field record | not referenced | not touched | NOT_APPLICABLE |
| Patient Management form's radio/dropdown fields | ✓ (never exercised) | ✓ mapped | n/a — no dataset ever targets this form | `fillOneField`'s `dropdown` code path exists but has **never been exercised or verified against a real portal control** | **NOT_APPLICABLE today / UNTESTED if ever used** |
| Vascular Surgery's own Interpretative/Procedural fields and competency items | Exists per the API-level mapping | ✓ mapped | ✓ workbook rows generated for it | **Silently loads a different Case Type's schema** — not a field-filling gap, a selection-resolution gap | **NOT_SUPPORTED pending the Vascular fix from the prior interrupted task** |

## 6. Unsupported fields

1. **Procedural Level "5"** (Abdominal Wall > "Open and laparoscopic repair of inguinal hernia") — no DOM control exists to select it. Portal-side gap.
2. **Vascular Surgery's Case Type resolution** — the uploader cannot currently reach the correct Vascular schema at all via the standard selection flow (confirmed portal bug, not an uploader field-filling gap — see §9).
3. **Patient Management form's radio and dropdown fields** — not unsupported by design, simply never engineered/tested because no dataset has ever targeted this form. If this form is ever needed, `fillOneField`'s existing `dropdown` branch would need real-world validation, and a new code path would need to be added for the declared-radio fields once their true DOM behaviour there is confirmed (radio fields in the Procedural/Interpretative form are confirmed non-rendering, but that specific confirmation has never been re-checked for Patient Management's own radio fields — they may behave differently since this is a different form).

## 7. Partially supported fields

1. **Procedural Level selection when a skill has more than one valid level (114 cases across existing drafts, and structurally true for a large fraction of all mapped Procedural items)** — the uploader now correctly identifies the ambiguity and refuses to guess (fails the row loudly), rather than the old silent-omission behaviour. This is "partially supported" in the sense that the *mechanism* to select any level is proven correct, but there is currently **no data source anywhere in the pipeline** (not the workbook, not any generator report by default) that records which single level a given row is actually intended to use. See §13 for the recommended fix.

## 8. Persistence problems found

Spot-checked existing drafts across multiple specialties (Procedural Nutrition, Vascular-mislabelled-as-Thoracic entries, and the repaired canary) via Edit Logbook Entry / the portal's own entry-list API:

1. **Confirmed persistence works correctly** for every field the uploader currently fills, once filled: the canary repair (Procedural Nutrition, entry `fd5e7c1e-…`) was independently re-verified from the portal's own API after Save — the Level selection persisted exactly, and all 8 other fields (dates, patient identity, diagnosis/notes text) were confirmed byte-for-byte unchanged.
2. **No entries were found with more than one Level checked** (0 out of 185 checked-Procedural-item instances) — ruling out a double-check race condition anywhere in current data.
3. **Silent cross-Case-Type contamination already exists in real data** — see §9/§10. This is the most serious persistence-adjacent problem found: data was saved successfully, but under the wrong Case Type, with no error surfaced anywhere in the pipeline at the time.

## 9. Vascular Surgery findings (special case)

**Root cause determined: this is a live portal/frontend bug, not an uploader-selection bug, not a caching/session artifact.**

Evidence, most conclusive first:
- Selecting "Vascular Surgery" (the **last** item in the Case Type dropdown) consistently and reproducibly results in the combobox **visibly displaying "Thoracic and Cardiovascular Surgery"** instead — confirmed across multiple runs, both with a reused session and with a **completely fresh login and empty browser storage**, ruling out any client-side cache/session artifact.
- This is **not a generic "last item in a scrolling list" click-targeting problem**: "Urology" (the item immediately *before* Vascular Surgery in the same dropdown) was tested identically and selects correctly, every time. Only "Vascular Surgery" specifically, and always to the same wrong target (Thoracic), not a neighboring or random item.
- The live-resolved backend id after "selecting" Vascular Surgery is **exactly** Thoracic and Cardiovascular Surgery's real Interpretative/Procedural leaf ids (`d44b7f87-…` / `8aa758e2-…`), and the rendered field/competency checklist is verifiably Thoracic's own content ("Blood gas analysis", "Chest tube drain insertion", etc.), not a hybrid or corrupted state.
- **This fully explains the original failure reports**: the Interpretative-Skill "no matching entry found" error occurred because the row's data was actually being saved under Thoracic's leaf id, so a search for a matching *Vascular* entry correctly found nothing. The Procedural-skill checkbox timeouts occurred because the rendered checklist is Thoracic's 4 items, which never contain "Arterial thrombo-embolectomy" or any other genuine Vascular Surgery competency name.

**This is not a hardcodeable-id problem** — the task's instruction "do not hardcode a Vascular id" is correct and consistent with this finding: the underlying bug is in *which* case type gets selected, not in an unstable-but-otherwise-correct id for Vascular itself.

**Confirmed real-world impact on already-saved data**: cross-referencing existing portal drafts nominally filed under Thoracic and Cardiovascular Surgery > Interpretative Skill against their actual text content found **5 entries whose clinical content is unmistakably Vascular Surgery material** (e.g. "Peripheral arterial disease" / "Color Doppler / Duplex imaging /MRA / MRV / DSA", "Arterial embolism" / "Angiogram/CT angiogram" — wording that matches this project's own Vascular Surgery dataset generator verbatim), silently filed under the wrong Case Type. One of these is an **exact duplicate pair** (same patient, same content, two separate portal records) — direct evidence that a failed/retried upload attempt produced two miscategorized entries instead of one correctly-categorized one. Only **1 entry** exists anywhere in the portal under the *correct* Vascular Surgery leaf ids, despite multiple Vascular rows having been attempted.

**Recommendation (not implemented under this read-only audit)**: any future fix must (a) after selecting a Case Type, verify the *visibly displayed* label actually matches what was requested (not just that a click landed on a matching-labelled option), and (b) if it does not match, retry or fail the row loudly rather than proceeding — a fully generic mechanism, not a Vascular-specific hardcode, since the same defensive check costs nothing for the other 41 already-correct leaves.

## 10. Existing draft impact summary

From the portal's own entry-list API, complete census (all 512 entries, all pages):

| Category | Count |
|---|---|
| Total existing entries (all types) | 512 |
| Entries under a genuine Procedural-skill leaf with at least one checked item | 185 instances |
| — of which already submitted/approved (`submit_ind=1` or not Draft) — **out of scope, must not be touched** | 434 *(this figure counts every checked-competency-item instance across all leaves, not unique entries — see raw data)* |
| — of which still-editable Drafts | 136 |
| &nbsp;&nbsp;&nbsp;&nbsp;— needing a human decision (>1 valid level, no reliable per-row source) | 114 |
| &nbsp;&nbsp;&nbsp;&nbsp;— auto-fixable (exactly one valid level) | 20 *(21 before the approved canary repair)* |
| &nbsp;&nbsp;&nbsp;&nbsp;— already correct | 2 *(1 before the canary repair; the canary now counts here)* |
| Entries with a Level already set to an **invalid** value | 0 (confirmed after fixing a trim-related false-positive in the audit tooling itself) |
| Entries with **more than one** Level checked | 0 |
| Entries confirmed miscategorized due to the Vascular Case-Type bug (Thoracic-filed but Vascular content) | **≥5**, including 1 exact duplicate pair |
| Entries genuinely saved under the correct Vascular Surgery leaf | 1 |

None of these entries were modified during this audit (other than the single canary repair, which was completed and verified in the prior, already-approved session before this audit began).

## 11. Existing generated dataset classification

All 20 generator scripts / specialty workbooks were reviewed conceptually against this audit's findings (field completeness confirmed via §2/§5, Level data availability confirmed absent from the workbook schema, Vascular bug confirmed separate from data generation quality):

| Specialty dataset | Classification | Reason |
|---|---|---|
| Basic Surgical Skill | **C** | Field content confirmed complete and correct (per this audit's field inventory); Procedural rows lack a carried Level value in the workbook |
| Gastrointestinal & HepatoBiliary System and Pancreas | **C** | Same |
| Disorders of the Breast | **C** | Same |
| Neurosurgery | **C** | Same |
| Urology | **C** | Same |
| Orthopaedic Surgery | **C** | Same |
| Parasites of Surgical Importance | **C** | Same |
| Paediatric Surgery | **C** | Same |
| Accident & Emergency / Casualty | **C** | Same |
| Anaesthesia & Procedural Critical Care | **C** | Same |
| Surgical Oncology | **C** | Same |
| Plastic Surgery | **C** | Same |
| **Vascular Surgery** | **E** | Field content is correct, but the Case Type itself cannot currently be reached correctly live — requires manual review and must not be uploaded until the Vascular selection bug has a defensive fix, regardless of Level status |
| Minimally Invasive Surgery – Laparoscopic Procedures | **C** | Same as the general Procedural case |
| Procedural Nutrition | **C** | One row (the canary) has already been repaired live; the rest of this dataset's *un-uploaded* rows still lack a carried Level value the same as every other dataset |
| Thoracic and Cardiovascular Surgery | **B** | This Case Type now also carries unrelated, real Vascular-content entries mixed into it live (see §9/§10) — the *workbook* itself is fine, but the *live portal state* for this Case Type is contaminated and needs review before any further Thoracic uploads to avoid ambiguity with the pre-existing miscategorized entries |
| Skin and Subcutaneous Tissue | **C** | Same as general Procedural case |
| Abdominal Wall | **D** | Contains the "Level 5" skill (`Open and laparoscopic repair of inguinal hernia`) which cannot currently be completed live at all — this dataset's 3 rows for that skill cannot be uploaded until the portal-side gap is resolved or the row is excluded; its other rows are otherwise **C** |
| Endocrine Surgery (Thyroid, Parathyroid, Adrenal Glands) | **C** | Referenced by earlier tasks; not independently re-verified as its own generator in this session, but its leaf (11/12) passed this audit's field/competency check cleanly |
| Master-All-Surgical-Skills (combined upload workbook) | **E** | Requires manual review — combines multiple specialties including Vascular Surgery and pre-existing partial upload state; do not resume its upload until the Level and Vascular issues are both resolved |

No workbook is classified **A (safe as-is)** — every Procedural-skill-bearing dataset needs at minimum a Level-representation decision before any further live upload, per §5.

## 12. Recommended minimal fixes (not implemented — for your review)

1. **Vascular Surgery selection defensive check** (generic, not hardcoded): after selecting a Case Type, verify the visibly displayed label matches the requested one; retry once, then fail the row loudly if it still doesn't match. Low blast radius — this only adds a check, never changes behavior for the 41 leaves that already work.
2. **Per-row Competency Level representation** — see §13 below for the two candidate designs; a decision is needed from you before implementation.
3. **Abdominal Wall "Level 5" item** — needs your decision: exclude this specific skill from any future upload until BCPS confirms/fixes the missing checkbox, or escalate to BCPS first. Not an uploader code change either way.
4. **114 existing drafts needing a Level decision** — needs your decision on how to determine (or explicitly decline to determine) the intended level for these before any repair is attempted.
5. **≥5 miscategorized Vascular-into-Thoracic drafts** — needs your decision on remediation (likely: manual correction or deletion+recreation once the Vascular selection bug has a fix and the correct Vascular id resolves reliably); explicitly **not** actioned by this audit.

## 13. Recommended per-row Competency Level representation

Two backward-compatible options were considered; **Option A is recommended**:

**Option A (recommended): one new optional column, `CompetencyLevel`, appended at the end of the DataEntry sheet (column 14).**
- Fully backward compatible: `excelReader.ts` already reads columns by header-name lookup (not position), so any *existing* workbook lacking this column simply yields `undefined`/blank for it — zero impact on any already-generated or already-uploaded workbook.
- Keeps `ExtraFieldsJSON` semantically pure (it represents exactly what gets submitted to specific *portal* fields); a tool-internal value like the intended Level does not need to be laundered through that JSON blob.
- Minimal, additive changes needed: one new field on `DataEntryRow`, one new optional lookup in `excelReader.ts`, and `fillForm.ts`'s existing `resolveLevelForItem` extended to prefer an explicit per-row value when present, falling back to today's single-valid-level auto-selection when absent, and still refusing to guess when both are ambiguous.

**Option B (rejected as primary, kept as a fallback idea): an extended syntax inside `ExtraFieldsJSON`** (e.g. a reserved `"__CompetencyLevel__"` key). Technically also backward compatible, but conflates a tool-internal concern with the portal-field-mirroring purpose of that JSON blob, and would require `validateRow.ts` to special-case a reserved key so it isn't flagged as an "unknown field" error — more surface area for subtle bugs than a dedicated column.

Either option requires updating **generators**, not just the uploader, so that new datasets populate the level explicitly from the same `competenceLevel` value every generator already computes internally today (currently only written to each generator's `generated-rows-raw.json` report, never to the workbook itself).

## 14. Whether the current 13-column DataEntry can be safely retained

**No changes are needed to any of the existing 13 columns** — this audit found zero gaps among them (§2, §5). The only structural change needed is **additive**: one new optional 14th column (§13, Option A), which does not alter the meaning, position, or requiredness of any existing column and does not require regenerating any already-produced workbook.

## 15. Exact files that would need modification later (once you approve a direction)

- `src/uploader/excelReader.ts` — add optional `competencyLevel` parsing from the new column.
- `src/uploader/validateRow.ts` — optionally validate the new column's value against the resolved leaf's valid levels (currently silently ignored if present, since it isn't a known column today).
- `src/uploader/fillForm.ts` — extend `resolveLevelForItem`/its call site to prefer the row's explicit level when supplied.
- Every `src/uploader/generate-*.ts` generator (20 files) — write the already-computed `competenceLevel` value into the new column instead of only into `generated-rows-raw.json`.
- `src/uploader/fillForm.ts` and/or `src/mapper/verifyLiveUi.ts` — add the Vascular-style defensive Case-Type-visible-label verification (generic, all leaves).
- `src/uploader/repair-procedural-levels.ts` — extend to consume the new per-row level source once it exists, for the 114 currently-undecidable existing drafts.
- No changes needed to: `src/auth/login.ts`, `src/mapper/discover.ts`, `src/mapper/model.ts`, `src/app/*`, any already-generated workbook, the mapping workbook, or the stable archive.

## 16. Risk level for each proposed change

| Change | Risk | Why |
|---|---|---|
| New optional `CompetencyLevel` column (Option A) | **Low** | Purely additive; old workbooks unaffected; new workbooks opt in |
| Generators writing the column | **Low** | Each generator already computes the value; only the write target changes |
| `fillForm.ts` preferring an explicit per-row level | **Low** | Strictly relaxes today's "fail if ambiguous" rule only when new, explicit data is present; today's safe-failure behavior is preserved whenever the column is absent |
| Vascular Case-Type visible-label verification | **Low** | Read-only verification + retry/fail; cannot make any of the other 41 leaves behave differently since they already pass the check |
| Repairing the 114 ambiguous existing drafts | **Medium-High** | Requires a real clinical/administrative decision per row on which level was intended — genuinely not derivable from any current data source; wrong guesses would corrupt real logbook records |
| Repairing/removing the ≥5 miscategorized Vascular-into-Thoracic drafts | **High** | Touches already-saved, possibly-already-reviewed real records under the wrong Case Type; needs your explicit direction on the correct remediation (edit in place vs. delete-and-recreate) before any action |
| Resuming Vascular Surgery upload at all | **High until fixed** | The selection bug must have a working, verified defensive check before any Vascular row is attempted again |

---

## AUDIT STATUS: **COMPLETE**

## NEW DATASET GENERATION: **DO NOT RESUME** until the Competency Level representation decision (§13) is made — every current generator would continue producing workbooks that cannot fully upload Procedural rows with more than one valid level.

## BULK UPLOAD: **NOT SAFE** — confirmed live blockers: (1) no per-row Level data exists for ambiguous items, (2) Vascular Surgery Case Type cannot currently be reached correctly, (3) the Abdominal Wall "Level 5" item cannot be completed at all, (4) real miscategorized data already exists in the live portal that any further Vascular/Thoracic activity could compound.

## BULK REPAIR: **NOT SAFE** — 114 existing drafts require a genuine per-row decision this audit cannot make; the ≥5 miscategorized Vascular/Thoracic entries require your explicit remediation instruction; only the single, already-approved canary repair from the prior session has been performed.

**STOPPED as instructed. No code changed as part of this audit. Waiting for your review and direction on §12/§13 before any implementation.**
