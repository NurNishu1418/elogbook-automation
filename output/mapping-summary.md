# BCPS e-Logbook - Mapping Summary

Generated: 2026-10-17T07:07:23.452Z

## Target
- Login: https://eportal.bcps.edu.bd/login
- Form: https://eportal.bcps.edu.bd/e-logbook/logbook-entry/add
- Hierarchy source: `get-form-list/1` (auto-matched against the live "form" dropdown, not hardcoded)

## Coverage
| Metric | Value |
|---|---|
| Total leaf combinations (Form > Case Type > Skill Type) | 43 |
| Total fields captured | 597 |
| Total controlling fields | 3 |
| Total dropdown options | 85 |
| Total dependency relationships | 19 |
| Successful paths | 67 |
| Failed paths | 0 |
| Pending/unexplored paths | 0 |
| Second independent crawl run | Yes |
| Second crawl reconciled with first | true |
| id-drift instances observed (see below) | 2 |

## Failures
None.

## Discovered portal quirks
1. **Field name sanitization**: dynamic-form-property's `column_name` (e.g. "Patient Reg. No") has periods stripped by the live frontend before becoming the rendered label/name/id ("Patient Reg No").
2. **Competency checklist text is verbatim**: Competency Group checkbox names use the API's `particulars` text exactly, including periods and trailing whitespace - unlike dynamic fields.
3. **"radio" field type does not render**: fields declared with `column_value_type="radio"` (all under Patient Management) have no corresponding control in the live DOM. Documented in the Fields sheet, excluded from the uploader's fillable set.
4. **get-form-list id instability for 2 leaves**: "Vascular Surgery > Interpretative Skill" / "> Procedural skill" - a direct API call and a live page session can reference two different (but both valid) backend ids for the same visible label. Reproduced identically in two independent crawls. The mapper/uploader always resolve the live id from the actual UI, never a cached id.

## Deliverables
- `output/BCPS_Logbook_Full_Mapping.xlsx`
- `output/form-map.json`, `dependency-graph.json`, `dropdown-options.json`, `combination-paths.json`, `fields.json`, `lookups.json`
- `output/coverage-report.json`, `output/verification-reconciliation.json`
