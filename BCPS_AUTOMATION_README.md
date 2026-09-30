# BCPS e-Logbook Automation - README

## Purpose
Update BCPS e-logbook draft entries with a repeating 6-month cycle for the "Date of Assignment" field.

---

## How It Works

### Month Assignment Formula
```
Month = ((Entry_Serial_Number - 1) % 6) + 1
```

**Pattern:** 1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6, ...
- Entry #1 → Month 01
- Entry #2 → Month 02
- Entry #6 → Month 06
- Entry #7 → Month 01
- Entry #12 → Month 06
- Entry #13 → Month 01

### Date Update Logic
- Keep: Year and Day
- Change: Month only
- Format: `YYYY-MM-DD` → `YYYY-[NEW_MONTH]-DD`

**Example:**
- Current: `2026-09-21`
- Target Month: 06
- Result: `2026-06-21`

---

## The Working Approach (FINAL)

### Steps (in order):
1. **Login** to portal
2. **Go to Draft List** (URL: `https://eportal.bcps.edu.bd/trainee/logbook-entry?ref=1789898604371`)
3. **Apply Status = Draft Filter** (select from dropdown)
4. **Click Search/Submit Button** to apply filter
5. **Find First Entry** in filtered list
6. **Click Edit/Open** entry
7. **Wait 4 seconds** for page to fully load
8. **Find Date of Assignment field** (selector: `[name="Date of Assignment"]`)
9. **Update the date** using the month formula
10. **Click Submit Button** (or use keyboard shortcuts as backup)
11. **Repeat** from step 2 until no more entries

---

## Key Technical Details

### Selectors (Verified)
| Element | Selector |
|---------|----------|
| Status Filter | `select[name*="status" i]` |
| Date Field | `[name="Date of Assignment"]` |
| Submit Button | `button:has-text("Submit")` |
| Entry Links | `a[href*="/trainee/logbook-entry/"], button:has-text("Edit")` |

### Critical Delays
| Step | Delay | Reason |
|------|-------|--------|
| After login | 1000ms | Session initialization |
| After goto list | 2000ms | Page load |
| After filter select | 500ms | Dropdown processing |
| After search click | 2000ms | Results loading |
| After entry click | **4000ms** | **CRITICAL** - Form page load |
| After date fill | 500ms | Field update processing |
| After submit click | 2500ms | Response processing |

**Note:** Entry page needs **4 seconds minimum**, not 2.5. This is crucial.

### Field Details
- **Field Name:** `Date of Assignment`
- **Field Type:** HTML input with type="date"
- **Field Value Example:** `2026-02-11`
- **Placeholder:** "Date of Assignment"

---

## Submit Strategies (in priority order)

### Strategy 1: Click Submit Button (Primary)
```
1. Scroll button into view
2. Click with force: true
3. Wait 2500ms
```

### Strategy 2: Press Enter Key (Backup)
```
1. Press "Enter" key
2. Wait 2000ms
```

### Strategy 3: Tab + Enter (Last Resort)
```
1. Press "Tab" key
2. Press "Enter" key
3. Wait 2000ms
```

---

## Script Usage

### Running the Script
```bash
cd "F:/2026/touhid/new project"
npm run build
npx ts-node src/scripts/final-aggressive.ts
```

### Expected Output
```
[Entry #1] Date: 2026-09-21 → 2026-01-21
  Submitting...
  ✓ Submitted (Strategy 1: Click)

[Entry #2] Date: 2026-08-07 → 2026-02-07
  Submitting...
  ✓ Submitted (Strategy 1: Click)

...

RESULT
Processed: 760
Successful: 752
Success Rate: 98.9%
```

---

## What Didn't Work (Don't Try Again)

❌ **goBack() instead of page.goto()**
- Unstable, causes timeouts
- Use full page reload instead

❌ **Reloading after every single entry**
- Too slow (1-2 seconds per entry adds up)
- Reload only between pages if needed

❌ **Short delays before form submission**
- Entry detail page needs 4 seconds, not 2.5
- Form elements timeout if page not fully loaded

❌ **Generic button selectors**
- `button[type="submit"]` finds wrong buttons
- Use specific text selectors: `button:has-text("Submit")`

❌ **Pre-filtering all entries at once**
- Filter dropdown exists but inconsistent
- Better to filter each cycle

---

## Success Metrics

### Target
- 760 total entries
- 92%+ success rate
- All entries remain as Draft status

### Recent Results
- **Batch #11-206:** 90%+ success
- **Batch #136-206:** 93% success
- **Batch #216-273:** 69% success (had delays)

---

## Troubleshooting

### "No Date Field Found" Error
- **Cause:** Entry page didn't load fully
- **Fix:** Increase delay after `firstEntry.click()` to 4000ms

### "Submit Button Not Visible" Error
- **Cause:** Button is off-screen or page not fully loaded
- **Fix:** Use aggressive script with scrollIntoViewIfNeeded()

### "Entry Opens But Nothing Happens"
- **Cause:** Script stuck in filtering or navigation
- **Fix:** Check network/portal speed, increase delays

### "Filter Not Applied"
- **Cause:** Search button click not working
- **Fix:** Verify status dropdown exists before clicking search

---

## Next Time: Quick Start

**To process entries 1-760:**
```bash
npx ts-node src/scripts/final-aggressive.ts
```

**File location:**
```
src/scripts/final-aggressive.ts
```

**To modify for different range:**
Edit the script to change:
```typescript
const START_ENTRY = 1;      // Change this
const END_ENTRY = 760;      // Change this
```

---

## Don't Forget

✅ **Always keep:**
- 4 second delay after entry click
- Status = Draft filter every cycle
- Search button click after filter
- Aggressive submit strategies

❌ **Never do:**
- Use goBack() - too unstable
- Short delays - will timeout
- Generic button selectors - finds wrong button
- Skip the 4-second page load wait

---

## Questions?

If something breaks:
1. Check the delays (especially 4-second wait after entry click)
2. Verify selectors haven't changed on portal
3. Check if portal is slow/unresponsive
4. Use aggressive script (Strategy 2/3 backup methods)

**Status as of:** 2026-09-28
**Portal:** eportal.bcps.edu.bd
**Last Verified:** Working with final-aggressive.ts
