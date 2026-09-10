/**
 * READ-ONLY inventory of Basic Surgical Skill editable Drafts (both
 * Communication and Writing Skill, and Procedural skill). Issues GET
 * requests only - no form is opened, no checkbox is touched, no button is
 * clicked. Used to scope the "review and correct Basic Surgical Skill
 * Drafts" task before any live action.
 */
import fs from 'fs';
import path from 'path';
import { launchBrowser, newContext } from '../utils/browser';
import { ensureLoggedIn } from '../auth/login';
import { authGet } from './api';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'output', 'basic-surgical-skill-inventory.json');

const COMM_LEAF_ID = '99e21e93-cccc-41a2-a170-43876ff867a6'; // Communication and Writing Skill
const PROC_LEAF_ID = '18aab29a-bb60-4aad-965e-a669ab6648bf'; // Procedural skill

const ALLOWED_LEVELS: Record<string, string[]> = {
  'Ability to use Surgical instruments and energy devices': ['2', '3'],
  'Accurate and safe administration of local anaesthetic agent': ['2', '3'],
  'Application and removal of skin staples/stitches': ['2', '3'],
  'Biopsy techniques (Core-cut biopsy, excision biopsy, incision biopsy)': ['2', '3'],
  'Central venous catheterization': ['1', '2', '3'],
  "Drainage of superficial abscesses including Hilton's method": ['2', '3', '4'],
  'Excision biopsy of benign lesions (lipoma, cyst, skin lesions etc.)': ['2', '3', '4'],
  'Exposure, antiseptic wash and draping': ['2', '3'],
  'Handling a Procedural specimen': ['3', '4'],
  'Intravenous cannulation': ['4'],
  'Introduction and removal of Procedural drains': ['1', '2', '3'],
  'Positioning of the patient': ['2', '3'],
  'Safe tying of knots (hand/instrumental/on the surface and at depth)': ['2', '3'],
  'Securing bleeding vessels': ['2', '3'],
  'Skin incision and closure': ['2', '3'],
  'Surgical Ritual (Effective and safe hand washing, donning and doffing)': ['3', '4'],
  'Urinary bladder catheterization': ['3', '4'],
};

function normalize(s: string): string {
  return s.replace(/’/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

interface CompetencyGroupEntry {
  skill_name: string;
  level1: boolean;
  level2: boolean;
  level3: boolean;
  level4: boolean;
  status: boolean;
}
interface RawPortalEntry {
  id: string;
  logbook_entry_setup_master_id: string;
  approved_status: string;
  submit_ind: number;
  details_json: string;
  competency_group: CompetencyGroupEntry[];
}

function levelsChecked(c: CompetencyGroupEntry): string[] {
  const out: string[] = [];
  if (c.level1) out.push('1');
  if (c.level2) out.push('2');
  if (c.level3) out.push('3');
  if (c.level4) out.push('4');
  return out;
}

function parseDetails(entry: RawPortalEntry): Record<string, any> {
  try {
    return JSON.parse(entry.details_json);
  } catch {
    return {};
  }
}

async function fetchAllEntries(page: any): Promise<RawPortalEntry[]> {
  const all: RawPortalEntry[] = [];
  for (let p = 1; p <= 80; p++) {
    const url = `${env.baseUrl}/api/auth/elogbook-management/v1/trainee-log-entry-list?page=${p}&paginate_per_page=20`;
    const r = await authGet<{ success: boolean; data: { data: RawPortalEntry[]; last_page: number } }>(page, url);
    if (r.status !== 200 || !Array.isArray(r.body?.data?.data)) break;
    all.push(...r.body.data.data);
    if (p >= (r.body.data.last_page ?? 1)) break;
  }
  return all;
}

async function main() {
  const browser = await launchBrowser();
  const context = await newContext(browser, { useStoredSession: true });
  const page = await context.newPage();

  try {
    const loginResult = await ensureLoggedIn(page);
    if (!loginResult.success) {
      logger.error(`Login failed: ${loginResult.reason}`);
      process.exit(2);
    }
    logger.info('Login confirmed. Read-only GET requests only - no form opened, no checkbox touched.');

    const entries = await fetchAllEntries(page);
    logger.info(`Fetched ${entries.length} total portal entries.`);

    const basicSurgicalEntries = entries.filter(
      (e) => (e.logbook_entry_setup_master_id === COMM_LEAF_ID || e.logbook_entry_setup_master_id === PROC_LEAF_ID)
    );
    logger.info(`Basic Surgical Skill entries (any status): ${basicSurgicalEntries.length}`);

    const draftEntries = basicSurgicalEntries.filter((e) => e.approved_status === 'Draft' && e.submit_ind === 0);
    logger.info(`Basic Surgical Skill EDITABLE DRAFT entries: ${draftEntries.length}`);

    const rows = draftEntries.map((e) => {
      const details = parseDetails(e);
      const skillType = e.logbook_entry_setup_master_id === COMM_LEAF_ID ? 'Communication and Writing Skill' : 'Procedural skill';
      const checkedItems = (e.competency_group ?? []).filter((c) => c.status);
      const checkedSkillNames = checkedItems.map((c) => normalize(c.skill_name));

      let levelInfo: any = null;
      if (skillType === 'Procedural skill') {
        levelInfo = checkedItems.map((c) => {
          const current = levelsChecked(c);
          const allowed = ALLOWED_LEVELS[normalize(c.skill_name)] ?? null;
          return {
            skill: normalize(c.skill_name),
            currentLevels: current,
            allowedLevels: allowed,
            isValid: allowed !== null && current.length === 1 && allowed.includes(current[0]),
          };
        });
      }

      return {
        entryId: e.id,
        leafId: e.logbook_entry_setup_master_id,
        skillType,
        approvedStatus: e.approved_status,
        submitInd: e.submit_ind,
        checkedSkillNames,
        checkedItemCount: checkedItems.length,
        levelInfo,
        frozenFields: {
          patientName: details['Name of the Patient'] ?? null,
          patientRegNo: details['Patient Reg No'] ?? null,
          dob: details['Date of Birth'] ?? null,
          age: details['Age'] ?? null,
          assignmentDate: details['Date of Assignment'] ?? null,
        },
        clinicalFields: {
          diagnosisProblems: details['Diagnosis/Problems'] ?? null,
          briefProceduralNotes: details['Brief Procedural Notes'] ?? null,
          briefDescription: details['Brief Description'] ?? null,
        },
        fullDetailsJson: details,
      };
    });

    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalPortalEntriesScanned: entries.length,
          totalBasicSurgicalSkillEntriesAnyStatus: basicSurgicalEntries.length,
          totalBasicSurgicalSkillEditableDrafts: draftEntries.length,
          communicationCount: rows.filter((r) => r.skillType === 'Communication and Writing Skill').length,
          proceduralCount: rows.filter((r) => r.skillType === 'Procedural skill').length,
          rows,
        },
        null,
        2
      ),
      'utf-8'
    );
    logger.info(`Inventory written to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  logger.error(`basic-surgical-skill-inventory crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
