/**
 * Synthetic test-dataset generator for Basic Surgical Skill
 * (Communication and Writing Skill + Procedural Skill).
 *
 * This does NOT modify src/mapper, src/excel, or any existing file under
 * src/uploader - it only imports and reuses existing exported functions
 * (readDataEntryRows, validateRow) against a brand-new workbook created in
 * generated-data/Basic-Surgical-Skill/, copied structurally from the real
 * output/BCPS_Logbook_Full_Mapping.xlsx (never modified).
 *
 * Generates rows, writes them into the new workbook's DataEntry sheet, runs
 * the existing dry-run validation logic, and STOPS. No login, no browser,
 * no draft is created by this script.
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';
import { readDataEntryRows, DataEntryRow } from './excelReader';
import { validateRow, LeafForValidation } from './validateRow';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const REAL_XLSX_PATH = path.join(OUTPUT_DIR, 'BCPS_Logbook_Full_Mapping.xlsx');
const DATASET_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill');
const DATASET_XLSX_PATH = path.join(DATASET_DIR, 'BCPS_Logbook_Basic_Surgical_Skill_TestData.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Basic Surgical Skill';

interface Scenario {
  diagnosis: string;
  notes: string;
  description: string;
}

interface SkillSpec {
  skillType: 'Communication and Writing Skill' | 'Procedural skill';
  competencyItemMatch: string; // exact particulars string to match in form-map.json (may have trailing space)
  requestedName: string; // name as given by the user, for reporting
  count: number;
  ageRange: [number, number];
  scenarios: Scenario[]; // must have length === count
}

// ---------------------------------------------------------------------
// Fully-specified skills (name + count both confirmed against the user's
// message). Every "notes"/"description" below is hand-written to be
// specific to that exact skill - no generic filler text reused across
// unrelated skills.
// ---------------------------------------------------------------------
const SKILLS: SkillSpec[] = [
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Death Certificate',
    requestedName: 'Death Certificate',
    count: 3,
    ageRange: [55, 88],
    scenarios: [
      { diagnosis: 'Acute myocardial infarction with cardiogenic shock.', notes: 'Death certificate issued after confirming irreversible cardiac arrest; time of death recorded and family counselled.', description: 'Death certificate completed for a case of fatal myocardial infarction.' },
      { diagnosis: 'Severe traumatic brain injury following a road traffic accident.', notes: 'Death certificate prepared following brain-stem death confirmation by the attending team; cause and manner of death documented.', description: 'Death certificate issued for a fatal head injury case.' },
      { diagnosis: 'End-stage septic shock secondary to a perforated peptic ulcer.', notes: 'Death certificate completed after unsuccessful resuscitation; findings and timeline documented per hospital protocol.', description: 'Death certificate issued following death from septic shock.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Discharge certificate',
    requestedName: 'Discharge certificate',
    count: 3,
    ageRange: [20, 70],
    scenarios: [
      { diagnosis: 'Recovered right inguinal hernia repair.', notes: 'Discharge certificate issued confirming fitness to resume light duties after uneventful hernia repair recovery.', description: 'Discharge certificate for post-herniorrhaphy recovery.' },
      { diagnosis: 'Healed appendicectomy wound.', notes: 'Discharge certificate provided certifying satisfactory wound healing and readiness for discharge.', description: 'Discharge certificate after appendicectomy.' },
      { diagnosis: 'Resolved cellulitis of the left leg.', notes: 'Discharge certificate issued after completion of intravenous antibiotics and clinical resolution of the cellulitis.', description: 'Discharge certificate for treated cellulitis.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Discharge summary',
    requestedName: 'Discharge summary',
    count: 3,
    ageRange: [20, 70],
    scenarios: [
      { diagnosis: 'Laparoscopic cholecystectomy for symptomatic cholelithiasis.', notes: 'Discharge summary prepared detailing the operative course, post-operative recovery, and follow-up advice.', description: 'Discharge summary after laparoscopic cholecystectomy.' },
      { diagnosis: 'Incision and drainage of a perianal abscess.', notes: 'Discharge summary documented outlining the procedure, wound care instructions, and review schedule.', description: 'Discharge summary following perianal abscess drainage.' },
      { diagnosis: 'Conservatively managed blunt abdominal trauma.', notes: 'Discharge summary compiled summarising the observation period, investigations, and discharge advice.', description: 'Discharge summary for observed abdominal trauma.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Documentation of injuries and disabilities',
    requestedName: 'Documentation of injuries and disabilities',
    count: 5,
    ageRange: [18, 65],
    scenarios: [
      { diagnosis: 'Multiple soft tissue injuries following an assault.', notes: 'Injuries documented in detail with measurements, and disability assessment recorded for medico-legal purposes.', description: 'Injury documentation for an alleged assault case.' },
      { diagnosis: 'Degloving injury of the left hand from a machinery accident.', notes: 'Extent of injury and resulting functional disability carefully documented for a medico-legal certificate.', description: 'Documentation of an industrial hand injury.' },
      { diagnosis: 'Compound fracture of the tibia from a road traffic accident.', notes: 'Nature, site, and severity of the injury documented along with expected duration of disability.', description: 'Injury/disability documentation for an RTA case.' },
      { diagnosis: 'Laceration and blunt trauma from a domestic altercation.', notes: 'Injuries examined and documented systematically, including approximate age of injuries, for the legal record.', description: 'Medico-legal injury documentation.' },
      { diagnosis: 'Burn injury (15% TBSA) from a household accident.', notes: 'Extent and depth of burns documented with disability implications recorded for certification.', description: 'Injury documentation for a burn case.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Obtaining informed written consent',
    requestedName: 'Obtaining informed written consent',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Planned open appendicectomy.', notes: 'Procedure, risks, benefits and alternatives explained in the patient’s own language; written informed consent obtained and witnessed.', description: 'Informed consent for appendicectomy.' },
      { diagnosis: 'Planned laparoscopic cholecystectomy.', notes: 'Risks including bile duct injury and conversion to open surgery discussed; signed consent form completed.', description: 'Informed consent for cholecystectomy.' },
      { diagnosis: 'Planned incision and drainage of an abscess.', notes: 'Procedure explained with expected outcome and risk of recurrence; written consent taken.', description: 'Informed consent for abscess drainage.' },
      { diagnosis: 'Planned hernia repair with mesh.', notes: 'Mesh-related risks and recurrence rates discussed; patient signed consent after clarifying doubts.', description: 'Informed consent for hernioplasty.' },
      { diagnosis: 'Planned exploratory laparotomy.', notes: 'Emergency nature, risks of the procedure, and possible findings explained to patient/attendant; consent documented.', description: 'Informed consent for emergency laparotomy.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Operation note',
    requestedName: 'Operation note',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Acute appendicitis.', notes: 'Operation note recorded detailing the open appendicectomy steps, findings of an inflamed appendix, and closure technique.', description: 'Operation note for appendicectomy.' },
      { diagnosis: 'Strangulated inguinal hernia.', notes: 'Operative findings, bowel viability assessment, and hernioplasty steps documented in detail.', description: 'Operation note for hernia repair.' },
      { diagnosis: 'Perforated duodenal ulcer.', notes: 'Operation note completed describing the omental patch repair and peritoneal lavage findings.', description: 'Operation note for perforation repair.' },
      { diagnosis: 'Obstructed umbilical hernia.', notes: 'Steps of hernia reduction, sac excision, and repair documented with intra-operative findings.', description: 'Operation note for umbilical hernia repair.' },
      { diagnosis: 'Pilonidal sinus.', notes: 'Excision technique and wound closure method recorded in the operative note.', description: 'Operation note for pilonidal sinus excision.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Post-operative order',
    requestedName: 'Post-operative order',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Post-appendicectomy care.', notes: 'Post-operative orders written including analgesia, IV fluids, diet advancement plan, and wound care instructions.', description: 'Post-operative orders after appendicectomy.' },
      { diagnosis: 'Post-cholecystectomy care.', notes: 'Orders documented for pain control, early mobilisation, and monitoring for bile leak or fever.', description: 'Post-operative orders after cholecystectomy.' },
      { diagnosis: 'Post-herniorrhaphy care.', notes: 'Post-op instructions written for activity restriction, analgesia, and follow-up review.', description: 'Post-operative orders after hernia repair.' },
      { diagnosis: 'Post-laparotomy care.', notes: 'Detailed post-operative plan documented including NG tube management, fluid balance, and antibiotic course.', description: 'Post-operative orders after laparotomy.' },
      { diagnosis: 'Post-abscess-drainage care.', notes: 'Orders written for dressing changes, analgesia, and review of wound healing.', description: 'Post-operative orders after abscess drainage.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Preoperative order',
    requestedName: 'Preoperative order',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Pre-operative preparation for elective cholecystectomy.', notes: 'Pre-operative orders written including fasting instructions, consent verification, and pre-anaesthetic check-up.', description: 'Preoperative orders for cholecystectomy.' },
      { diagnosis: 'Pre-operative preparation for hernia repair.', notes: 'Orders documented for skin preparation, prophylactic antibiotics, and fasting status confirmation.', description: 'Preoperative orders for hernioplasty.' },
      { diagnosis: 'Pre-operative preparation for emergency appendicectomy.', notes: 'Urgent pre-op checklist completed including investigations, consent, and antibiotic prophylaxis.', description: 'Preoperative orders for appendicectomy.' },
      { diagnosis: 'Pre-operative preparation for exploratory laparotomy.', notes: 'Pre-op orders written covering resuscitation status, blood arrangement, and theatre readiness.', description: 'Preoperative orders for laparotomy.' },
      { diagnosis: 'Pre-operative preparation for pilonidal sinus excision.', notes: 'Standard pre-operative checklist and bowel preparation instructions documented.', description: 'Preoperative orders for pilonidal sinus surgery.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Referral note',
    requestedName: 'Referral note',
    count: 3,
    ageRange: [20, 75],
    scenarios: [
      { diagnosis: 'Suspected deep vein thrombosis.', notes: 'Referral note written summarising clinical findings, relevant investigations, and reason for specialist review.', description: 'Referral note to vascular surgery.' },
      { diagnosis: 'Incidental mass found on imaging.', notes: 'Referral letter prepared outlining the findings and urgency of oncological evaluation.', description: 'Referral note to oncology department.' },
      { diagnosis: 'Complex wound requiring specialist closure.', notes: 'Referral note documented detailing wound characteristics and reason for specialist input.', description: 'Referral note to plastic surgery.' },
    ],
  },
  {
    skillType: 'Communication and Writing Skill',
    competencyItemMatch: 'Requisition for investigations (Laboratory, Biochemical, Imaging, Histopathological analysis and immunohistochemitry)',
    requestedName: 'Requisition for investigations',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Suspected cholelithiasis.', notes: 'Investigation request form completed with relevant clinical details for radiology correlation.', description: 'Requisition for abdominal ultrasound.' },
      { diagnosis: 'Blunt abdominal trauma.', notes: 'Urgent imaging requisition completed with a clinical summary for prompt reporting.', description: 'Requisition for CT scan of the abdomen.' },
      { diagnosis: 'Pre-operative work-up.', notes: 'Laboratory requisition completed listing required tests and the clinical indication.', description: 'Requisition for pre-operative blood tests.' },
      { diagnosis: 'Excised specimen pending analysis.', notes: 'Histopathology request form completed with specimen details and clinical history.', description: 'Requisition for histopathological analysis.' },
      { diagnosis: 'Pre-anaesthetic work-up.', notes: 'Imaging requisition completed as part of the pre-anaesthetic work-up.', description: 'Requisition for chest X-ray.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Ability to use Surgical instruments and energy devices',
    requestedName: 'Ability to use Surgical instruments and energy devices',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Acute appendicitis.', notes: 'Used monopolar diathermy for haemostasis during open appendicectomy under supervision.', description: 'Instrument/energy device use during appendicectomy.' },
      { diagnosis: 'Inguinal hernia.', notes: 'Demonstrated safe handling of bipolar forceps during hernia repair dissection.', description: 'Instrument use during hernia repair.' },
      { diagnosis: 'Symptomatic cholelithiasis.', notes: 'Used a harmonic scalpel for tissue dissection while assisting laparoscopic cholecystectomy.', description: 'Energy device use during cholecystectomy assist.' },
      { diagnosis: 'Perianal abscess.', notes: 'Applied surgical clips and diathermy safely during abscess drainage.', description: 'Instrument use during abscess drainage.' },
      { diagnosis: 'Post-laparotomy closure.', notes: 'Used needle holder and instruments correctly for skin closure after laparotomy.', description: 'Instrument use during wound closure.' },
      { diagnosis: 'Sebaceous cyst.', notes: 'Demonstrated safe use of electrocautery during excision of a sebaceous cyst.', description: 'Energy device use during cyst excision.' },
      { diagnosis: 'Inguinal hernia dissection.', notes: 'Used retractors and diathermy appropriately during inguinal hernia dissection.', description: 'Instrument use during hernia dissection.' },
      { diagnosis: 'Pilonidal sinus.', notes: 'Applied the energy device safely for haemostasis during pilonidal sinus excision.', description: 'Energy device use during pilonidal sinus excision.' },
      { diagnosis: 'Bowel anastomosis assist.', notes: 'Used a surgical stapler correctly while assisting with bowel anastomosis.', description: 'Instrument use during bowel anastomosis.' },
      { diagnosis: 'Diabetic foot ulcer.', notes: 'Demonstrated correct instrument handling during wound debridement of a diabetic foot ulcer.', description: 'Instrument use during wound debridement.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Accurate and safe administration of local anaesthetic agent',
    requestedName: 'Accurate and safe administration of local anaesthetic agent',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Excision of a sebaceous cyst.', notes: 'Local anaesthetic (lignocaine 2%) infiltrated safely around the lesion prior to excision, with aspiration performed before injection to avoid intravascular administration.', description: 'Local anaesthesia for cyst excision.' },
      { diagnosis: 'Incision and drainage of an abscess.', notes: 'Field block with local anaesthetic administered safely before incision and drainage, with attention to maximum safe dose.', description: 'Local anaesthesia for abscess drainage.' },
      { diagnosis: 'Suturing of a laceration wound.', notes: 'Local infiltration anaesthesia given around the wound margins before cleaning and suturing.', description: 'Local anaesthesia for wound suturing.' },
      { diagnosis: 'Excision biopsy of a skin lesion.', notes: 'Local anaesthetic administered with aspiration technique to ensure safe subcutaneous infiltration before biopsy.', description: 'Local anaesthesia for skin biopsy.' },
      { diagnosis: 'Removal of an ingrown toenail.', notes: 'Digital nerve block performed safely using local anaesthetic without epinephrine.', description: 'Local anaesthesia for toenail removal.' },
      { diagnosis: 'Repair of a scalp laceration.', notes: 'Local anaesthetic infiltrated along the wound edges with careful dose calculation given the vascularity of the scalp.', description: 'Local anaesthesia for scalp laceration repair.' },
      { diagnosis: 'Drainage of a paronychia.', notes: 'Digital block administered safely prior to incision and drainage of the paronychia.', description: 'Local anaesthesia for paronychia drainage.' },
      { diagnosis: 'Excision of a lipoma.', notes: 'Local anaesthetic infiltrated around and beneath the lipoma with aspiration to avoid vascular injection.', description: 'Local anaesthesia for lipoma excision.' },
      { diagnosis: 'Central line insertion site preparation.', notes: 'Local anaesthetic infiltrated at the planned insertion site prior to central venous catheterization.', description: 'Local anaesthesia prior to central line insertion.' },
      { diagnosis: 'Chest tube insertion site preparation.', notes: 'Local anaesthetic administered layer by layer down to the pleura, with careful aspiration technique throughout.', description: 'Local anaesthesia prior to a minor procedure.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Application and removal of skin staples/stitches',
    requestedName: 'Application and removal of skin staples/stitches',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Post-laparotomy wound closure.', notes: 'Skin staples applied evenly along the laparotomy incision under aseptic technique.', description: 'Skin staple application after laparotomy.' },
      { diagnosis: 'Suture removal after appendicectomy.', notes: 'Sutures removed from a well-healed appendicectomy wound after confirming adequate healing.', description: 'Suture removal after appendicectomy.' },
      { diagnosis: 'Post-hernia-repair wound closure.', notes: 'Interrupted skin sutures applied to close the hernia repair incision.', description: 'Skin suturing after hernia repair.' },
      { diagnosis: 'Staple removal after cholecystectomy port closure.', notes: 'Skin staples removed from healed laparoscopic port sites.', description: 'Staple removal after laparoscopic surgery.' },
      { diagnosis: 'Closure of a traumatic laceration.', notes: 'Wound edges approximated and closed with interrupted sutures after thorough cleaning.', description: 'Suturing of a traumatic wound.' },
      { diagnosis: 'Post-abscess-drainage wound edge closure.', notes: 'Loose approximation sutures applied at the wound edge after abscess drainage.', description: 'Wound closure after abscess drainage.' },
      { diagnosis: 'Suture removal after skin biopsy.', notes: 'Sutures removed from a healed excision biopsy site.', description: 'Suture removal after biopsy.' },
      { diagnosis: 'Staple application after bowel surgery closure.', notes: 'Skin staples applied for rapid closure of the abdominal wound after bowel surgery.', description: 'Skin staple application after bowel surgery.' },
      { diagnosis: 'Suture removal following pilonidal sinus excision.', notes: 'Sutures removed after confirming satisfactory wound healing post pilonidal sinus excision.', description: 'Suture removal after pilonidal sinus surgery.' },
      { diagnosis: 'Closure of a surgical drain site.', notes: 'Skin sutured at the drain site after removal of a surgical drain.', description: 'Wound closure after drain removal.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Biopsy techniques (Core-cut biopsy, excision biopsy, incision biopsy)',
    requestedName: 'Biopsy techniques (Core-cut biopsy, excision biopsy, incision biopsy)',
    count: 5,
    ageRange: [25, 75],
    scenarios: [
      { diagnosis: 'Palpable breast lump.', notes: 'Core-cut biopsy performed under local anaesthesia with an adequate tissue sample obtained for histopathology.', description: 'Core-cut biopsy of a breast lump.' },
      { diagnosis: 'Suspicious skin lesion.', notes: 'Excision biopsy performed with clear margins and the specimen sent for histopathological analysis.', description: 'Excision biopsy of a skin lesion.' },
      { diagnosis: 'Non-healing ulcer requiring tissue diagnosis.', notes: 'Incision biopsy performed at the ulcer edge to obtain a representative tissue sample.', description: 'Incision biopsy of a non-healing ulcer.' },
      { diagnosis: 'Enlarged lymph node of uncertain cause.', notes: 'Excision biopsy of the lymph node performed under local anaesthesia and sent for histopathology.', description: 'Excision biopsy of a lymph node.' },
      { diagnosis: 'Soft tissue mass of the thigh.', notes: 'Core-cut biopsy performed under aseptic technique to obtain tissue for diagnosis prior to definitive surgery.', description: 'Core-cut biopsy of a soft tissue mass.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Central venous catheterization',
    requestedName: 'Central venous catheterization',
    count: 3,
    ageRange: [30, 78],
    scenarios: [
      { diagnosis: 'Septic shock requiring central venous access for vasopressor support.', notes: 'Right internal jugular central line inserted under ultrasound guidance; position confirmed on chest X-ray.', description: 'Central venous catheterization for septic shock.' },
      { diagnosis: 'Poor peripheral venous access requiring central access for treatment.', notes: 'Subclavian central venous catheter placed using standard landmark technique; no immediate complications.', description: 'Central line insertion for venous access.' },
      { diagnosis: 'Major abdominal surgery requiring central monitoring access.', notes: 'Central venous catheter inserted pre-operatively via the right internal jugular vein for haemodynamic monitoring.', description: 'Central venous catheterization pre-laparotomy.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Drainage of superficial abscesses including Hilton’s method',
    requestedName: 'Drainage of superficial abscesses including Hilton\'s method',
    count: 3,
    ageRange: [18, 65],
    scenarios: [
      { diagnosis: 'Superficial gluteal abscess.', notes: 'Abscess drained using Hilton\'s method with blunt dissection following the initial stab incision, avoiding injury to underlying structures.', description: 'Abscess drainage using Hilton\'s method.' },
      { diagnosis: 'Axillary abscess.', notes: 'Incision made over the point of maximum fluctuance and the cavity opened by blunt dissection per Hilton\'s method.', description: 'Drainage of an axillary abscess.' },
      { diagnosis: 'Perianal abscess.', notes: 'Abscess drained via Hilton\'s method, with the cavity broken down by blunt finger dissection and adequate pus evacuation confirmed.', description: 'Drainage of a perianal abscess.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Excision biopsy of benign lesions (lipoma, cyst, skin lesions etc.)',
    requestedName: 'Excision biopsy of benign lesions (lipoma, cyst, skin lesions etc.)',
    count: 3,
    ageRange: [20, 70],
    scenarios: [
      { diagnosis: 'Lipoma of the back.', notes: 'Lipoma excised in toto with the capsule intact and sent for histopathological confirmation.', description: 'Excision of a lipoma.' },
      { diagnosis: 'Sebaceous cyst of the scalp.', notes: 'Sebaceous cyst excised completely along with its wall to prevent recurrence.', description: 'Excision of a sebaceous cyst.' },
      { diagnosis: 'Benign skin lesion of the forearm.', notes: 'Skin lesion excised with a narrow margin of normal skin and sent for histopathology.', description: 'Excision of a benign skin lesion.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Exposure, antiseptic washand draping',
    requestedName: 'Exposure, antiseptic wash and draping',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Pre-operative preparation for appendicectomy.', notes: 'Operative site exposed, cleaned with antiseptic solution, and draped in a sterile fashion before incision.', description: 'Exposure and draping for appendicectomy.' },
      { diagnosis: 'Pre-operative preparation for hernia repair.', notes: 'Skin prepared with antiseptic wash and sterile draping performed prior to hernia repair.', description: 'Exposure and draping for hernia repair.' },
      { diagnosis: 'Pre-operative preparation for laparotomy.', notes: 'Wide antiseptic skin preparation and sterile draping carried out before the laparotomy incision.', description: 'Exposure and draping for laparotomy.' },
      { diagnosis: 'Pre-operative preparation for abscess drainage.', notes: 'Site of the abscess cleaned with antiseptic solution and draped appropriately before incision.', description: 'Exposure and draping for abscess drainage.' },
      { diagnosis: 'Pre-operative preparation for cyst excision.', notes: 'Operative field exposed, cleaned, and draped under aseptic precautions before cyst excision.', description: 'Exposure and draping for cyst excision.' },
      { diagnosis: 'Pre-operative preparation for pilonidal sinus surgery.', notes: 'Antiseptic wash performed and sterile drapes applied prior to pilonidal sinus excision.', description: 'Exposure and draping for pilonidal sinus surgery.' },
      { diagnosis: 'Pre-operative preparation for central line insertion.', notes: 'Insertion site widely prepared with antiseptic solution and draped using maximal sterile barrier precautions.', description: 'Exposure and draping for central line insertion.' },
      { diagnosis: 'Pre-operative preparation for wound debridement.', notes: 'Wound and surrounding skin cleaned with antiseptic solution and draped before debridement.', description: 'Exposure and draping for wound debridement.' },
      { diagnosis: 'Pre-operative preparation for biopsy.', notes: 'Biopsy site prepared with antiseptic solution and sterile drapes applied before the procedure.', description: 'Exposure and draping for biopsy.' },
      { diagnosis: 'Pre-operative preparation for suturing a laceration.', notes: 'Wound and surrounding area cleaned with antiseptic solution and draped prior to suturing.', description: 'Exposure and draping for wound suturing.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Handling a Procedural specimen',
    requestedName: 'Handling a Procedural specimen',
    count: 5,
    ageRange: [20, 75],
    scenarios: [
      { diagnosis: 'Appendicectomy specimen.', notes: 'Excised appendix handled appropriately, labelled correctly, and sent in formalin to histopathology.', description: 'Handling of an appendicectomy specimen.' },
      { diagnosis: 'Excision biopsy specimen.', notes: 'Excised tissue specimen orientated, labelled, and preserved correctly for histopathological examination.', description: 'Handling of a biopsy specimen.' },
      { diagnosis: 'Gallbladder specimen after cholecystectomy.', notes: 'Gallbladder specimen collected, labelled, and sent to pathology following laparoscopic cholecystectomy.', description: 'Handling of a cholecystectomy specimen.' },
      { diagnosis: 'Lymph node biopsy specimen.', notes: 'Excised lymph node handled with care to preserve architecture and sent appropriately labelled to histopathology.', description: 'Handling of a lymph node specimen.' },
      { diagnosis: 'Hernial sac specimen.', notes: 'Excised hernial sac specimen labelled and sent for histopathological examination as per protocol.', description: 'Handling of a hernial sac specimen.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Intravenous cannulation',
    requestedName: 'Intravenous cannulation',
    count: 20,
    ageRange: [18, 80],
    scenarios: [
      { diagnosis: 'Acute gastroenteritis with dehydration.', notes: 'IV cannula inserted for fluid resuscitation in a dehydrated patient.', description: 'IV cannulation for fluid resuscitation.' },
      { diagnosis: 'Pre-operative preparation for elective hernia repair.', notes: 'Peripheral IV line secured pre-operatively for elective hernia repair.', description: 'IV cannulation pre-operatively.' },
      { diagnosis: 'Cellulitis requiring IV antibiotics.', notes: 'IV cannulation performed for antibiotic administration.', description: 'IV cannulation for antibiotic therapy.' },
      { diagnosis: 'Post-operative fluid maintenance.', notes: 'Difficult IV access successfully secured in an elderly patient for post-operative fluids.', description: 'IV cannulation in a patient with difficult access.' },
      { diagnosis: 'Post-traumatic anaemia requiring transfusion.', notes: 'IV cannula placed for blood transfusion.', description: 'IV cannulation for blood transfusion.' },
      { diagnosis: 'Post-minor-surgery analgesia.', notes: 'Peripheral line inserted for analgesic administration following minor surgery.', description: 'IV cannulation for analgesia.' },
      { diagnosis: 'Pre-operative fluid administration for appendicectomy.', notes: 'IV cannulation carried out for pre-operative fluid administration.', description: 'IV cannulation pre-appendicectomy.' },
      { diagnosis: 'Anxious patient requiring IV access.', notes: 'IV access secured using a calm, reassuring technique in an anxious patient.', description: 'IV cannulation with a nervous patient.' },
      { diagnosis: 'Contrast-enhanced CT scan required.', notes: 'IV cannula placed for contrast administration prior to a CT scan.', description: 'IV cannulation for contrast imaging.' },
      { diagnosis: 'Post-cholecystectomy maintenance fluids.', notes: 'IV line inserted for maintenance fluids during recovery.', description: 'IV cannulation for maintenance fluids.' },
      { diagnosis: 'Pre-operative fluid line for laparotomy.', notes: 'IV cannula secured pre-operatively for fluid administration during laparotomy.', description: 'IV cannulation pre-laparotomy.' },
      { diagnosis: 'Sepsis requiring urgent fluid resuscitation.', notes: 'Peripheral IV line secured promptly for fluid resuscitation and antibiotic administration.', description: 'IV cannulation in a septic patient.' },
      { diagnosis: 'Pre-transfusion sampling.', notes: 'IV cannula inserted for blood grouping/cross-matching sample collection and subsequent transfusion access.', description: 'IV cannulation for blood sampling and transfusion access.' },
      { diagnosis: 'Moderate burns requiring fluid resuscitation.', notes: 'Peripheral IV line secured for fluid resuscitation in a patient with moderate burns.', description: 'IV cannulation in a burns patient.' },
      { diagnosis: 'Post-operative nausea and vomiting requiring antiemetics.', notes: 'IV cannula placed for antiemetic and fluid administration.', description: 'IV cannulation for antiemetic therapy.' },
      { diagnosis: 'Difficult venous access due to obesity.', notes: 'IV cannulation achieved successfully after careful vein selection with ultrasound assistance.', description: 'IV cannulation in a patient with difficult venous access.' },
      { diagnosis: 'Pre-operative preparation for elective cholecystectomy.', notes: 'Peripheral line secured in the pre-operative holding area before theatre transfer.', description: 'IV cannulation pre-cholecystectomy.' },
      { diagnosis: 'Pre-operative antibiotic prophylaxis required.', notes: 'IV cannula placed to administer prophylactic antibiotics before incision.', description: 'IV cannulation for antibiotic prophylaxis.' },
      { diagnosis: 'Fragile veins in an elderly patient.', notes: 'IV cannulation performed gently using a small-gauge cannula to avoid venous rupture.', description: 'IV cannulation in an elderly patient.' },
      { diagnosis: 'Procedural sedation required for wound debridement.', notes: 'IV line secured for administration of sedation and analgesia during the procedure.', description: 'IV cannulation for procedural sedation.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Introduction and removal of Procedural drains',
    requestedName: 'Introduction and removal of Procedural drains',
    count: 3,
    ageRange: [25, 75],
    scenarios: [
      { diagnosis: 'Post-laparotomy drain placement.', notes: 'Abdominal drain introduced correctly at the end of laparotomy and secured; drain removed once output criteria were met.', description: 'Drain insertion and removal after laparotomy.' },
      { diagnosis: 'Post-abscess-drainage corrugated drain.', notes: 'Corrugated drain introduced into the abscess cavity and removed after adequate drainage was confirmed.', description: 'Drain insertion and removal after abscess drainage.' },
      { diagnosis: 'Post-cholecystectomy drain management.', notes: 'Drain placed near the gallbladder bed post-operatively and removed after confirming minimal output.', description: 'Drain insertion and removal after cholecystectomy.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Positioning of the patient',
    requestedName: 'Positioning of the patient',
    count: 10,
    ageRange: [18, 78],
    scenarios: [
      { diagnosis: 'Appendicectomy.', notes: 'Patient positioned supine with appropriate padding before the appendicectomy.', description: 'Patient positioning for appendicectomy.' },
      { diagnosis: 'Laparoscopic cholecystectomy.', notes: 'Patient positioned supine with slight reverse Trendelenburg and left tilt for optimal exposure.', description: 'Patient positioning for cholecystectomy.' },
      { diagnosis: 'Inguinal hernia repair.', notes: 'Patient positioned supine with the operative side slightly elevated for the hernia repair.', description: 'Patient positioning for hernia repair.' },
      { diagnosis: 'Perianal abscess drainage.', notes: 'Patient positioned in lithotomy for adequate perianal exposure.', description: 'Patient positioning for a perianal procedure.' },
      { diagnosis: 'Pilonidal sinus excision.', notes: 'Patient positioned prone with buttocks taped apart for adequate exposure of the pilonidal area.', description: 'Patient positioning for pilonidal sinus surgery.' },
      { diagnosis: 'Central venous catheterization.', notes: 'Patient positioned supine in Trendelenburg position for internal jugular line insertion.', description: 'Patient positioning for central line insertion.' },
      { diagnosis: 'Urinary catheterization.', notes: 'Patient positioned supine with appropriate draping for safe urinary catheter insertion.', description: 'Patient positioning for urinary catheterization.' },
      { diagnosis: 'Excision of a scalp lesion.', notes: 'Patient positioned appropriately with the head stabilised for safe excision of the scalp lesion.', description: 'Patient positioning for scalp lesion excision.' },
      { diagnosis: 'Wound debridement of the foot.', notes: 'Patient positioned comfortably with the limb elevated and supported for wound debridement.', description: 'Patient positioning for limb wound debridement.' },
      { diagnosis: 'Chest tube insertion.', notes: 'Patient positioned supine with the arm abducted for safe chest tube insertion.', description: 'Patient positioning for chest tube insertion.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Safe tying of knots (hand/instrumental/on the surface and at depth) ',
    requestedName: 'Safe tying of knots (hand/instrumental/on the surface and at depth)',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Appendicectomy stump ligation.', notes: 'Appendicular stump securely ligated using safe instrument-tying technique.', description: 'Knot tying during appendicectomy.' },
      { diagnosis: 'Hernia sac ligation.', notes: 'Hernial sac ligated at its neck using a secure surgeon\'s knot.', description: 'Knot tying during hernia repair.' },
      { diagnosis: 'Vessel ligation during dissection.', notes: 'Bleeding vessel securely ligated using a reliable hand-tied knot.', description: 'Knot tying for vessel ligation.' },
      { diagnosis: 'Skin suturing after laparotomy.', notes: 'Interrupted skin sutures tied securely at the surface using instrument-tying technique.', description: 'Knot tying during skin closure.' },
      { diagnosis: 'Deep fascial closure after laparotomy.', notes: 'Fascial layer closed with secure, deeply-placed knots to prevent dehiscence.', description: 'Knot tying during fascial closure.' },
      { diagnosis: 'Ligation of the pedicle during cyst excision.', notes: 'Cyst pedicle securely ligated with a hand-tied knot before excision.', description: 'Knot tying during cyst excision.' },
      { diagnosis: 'Drain fixation suture.', notes: 'Drain secured to the skin with a well-tied anchoring suture.', description: 'Knot tying for drain fixation.' },
      { diagnosis: 'Perforator ligation during varicose vein surgery assist.', notes: 'Perforator vessel ligated securely using a standard surgical knot.', description: 'Knot tying during a vascular procedure.' },
      { diagnosis: 'Subcuticular suture closure.', notes: 'Subcuticular suture tied securely at both ends to ensure a cosmetic, tension-free closure.', description: 'Knot tying for subcuticular closure.' },
      { diagnosis: 'Mesh fixation during hernioplasty.', notes: 'Mesh secured in place using multiple secure interrupted knots.', description: 'Knot tying during mesh fixation.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Securing bleeding vessels',
    requestedName: 'Securing bleeding vessels',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Bleeding during appendicectomy.', notes: 'Bleeding mesoappendiceal vessel identified and secured with ligation.', description: 'Vessel securing during appendicectomy.' },
      { diagnosis: 'Bleeding during hernia repair.', notes: 'Small bleeding vessel in the hernia sac controlled with diathermy and ligation.', description: 'Vessel securing during hernia repair.' },
      { diagnosis: 'Bleeding during abscess drainage.', notes: 'Minor bleeding point in the abscess cavity controlled with pressure and diathermy.', description: 'Haemostasis during abscess drainage.' },
      { diagnosis: 'Bleeding during cyst excision.', notes: 'Bleeding vessel at the cyst bed secured with diathermy.', description: 'Haemostasis during cyst excision.' },
      { diagnosis: 'Bleeding during wound debridement.', notes: 'Bleeding points in the debrided wound bed controlled with direct pressure and diathermy.', description: 'Haemostasis during wound debridement.' },
      { diagnosis: 'Bleeding during pilonidal sinus excision.', notes: 'Bleeding vessel in the sinus tract secured with ligation and diathermy.', description: 'Haemostasis during pilonidal sinus excision.' },
      { diagnosis: 'Bleeding during central line insertion.', notes: 'Minor bleeding at the insertion site controlled with local pressure.', description: 'Haemostasis during central line insertion.' },
      { diagnosis: 'Bleeding during skin biopsy.', notes: 'Bleeding at the biopsy site controlled with diathermy and a pressure dressing.', description: 'Haemostasis during skin biopsy.' },
      { diagnosis: 'Bleeding during drain removal.', notes: 'Minor bleeding at the drain site controlled with a pressure dressing.', description: 'Haemostasis after drain removal.' },
      { diagnosis: 'Bleeding during suture removal.', notes: 'Minor ooze at a suture site controlled with local pressure.', description: 'Haemostasis after suture removal.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Skin incision and closure',
    requestedName: 'Skin incision and closure',
    count: 10,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Appendicectomy.', notes: 'Gridiron incision made and, at the end of the procedure, layered closure of the abdominal wall performed.', description: 'Skin incision and closure for appendicectomy.' },
      { diagnosis: 'Laparotomy.', notes: 'Midline incision made for laparotomy and mass closure of the abdominal wall performed at the end of surgery.', description: 'Skin incision and closure for laparotomy.' },
      { diagnosis: 'Inguinal hernia repair.', notes: 'Inguinal incision made along Langer\'s lines and layered wound closure performed after hernioplasty.', description: 'Skin incision and closure for hernia repair.' },
      { diagnosis: 'Cyst excision.', notes: 'Elliptical incision made around the cyst and skin closed with interrupted sutures.', description: 'Skin incision and closure for cyst excision.' },
      { diagnosis: 'Abscess drainage.', notes: 'Cruciate incision made over the abscess and the wound left open for drainage as per standard practice.', description: 'Skin incision for abscess drainage.' },
      { diagnosis: 'Pilonidal sinus excision.', notes: 'Elliptical incision made around the sinus tract and the wound closed in layers.', description: 'Skin incision and closure for pilonidal sinus excision.' },
      { diagnosis: 'Lymph node biopsy.', notes: 'Small incision made over the lymph node and skin closed with interrupted sutures after excision.', description: 'Skin incision and closure for lymph node biopsy.' },
      { diagnosis: 'Lipoma excision.', notes: 'Incision made directly over the lipoma and skin closed with subcuticular sutures.', description: 'Skin incision and closure for lipoma excision.' },
      { diagnosis: 'Central line insertion.', notes: 'Small skin nick made at the insertion site prior to catheter placement.', description: 'Skin incision for central line insertion.' },
      { diagnosis: 'Chest tube insertion.', notes: 'Skin incision made at the marked intercostal space and secured with a purse-string suture after tube placement.', description: 'Skin incision and closure for chest tube insertion.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Surgical Ritual (Effective and safe hand washing, donning and doffing)',
    requestedName: 'Surgical Ritual (Effective and safe hand washing, donning and doffing)',
    count: 5,
    ageRange: [18, 75],
    scenarios: [
      { diagnosis: 'Pre-operative scrub for appendicectomy.', notes: 'Surgical hand wash performed following standard protocol, followed by correct gowning and gloving before the procedure.', description: 'Surgical hand hygiene and gowning for appendicectomy.' },
      { diagnosis: 'Pre-operative scrub for hernia repair.', notes: 'Standard surgical scrub technique performed and sterile gown/gloves donned correctly before hernia repair.', description: 'Surgical hand hygiene and gowning for hernia repair.' },
      { diagnosis: 'Pre-operative scrub for laparotomy.', notes: 'Thorough surgical hand antisepsis performed and aseptic gowning/gloving carried out before laparotomy.', description: 'Surgical hand hygiene and gowning for laparotomy.' },
      { diagnosis: 'Post-operative doffing after cholecystectomy.', notes: 'Gown and gloves removed in the correct sequence to avoid contamination after completing the cholecystectomy.', description: 'Correct doffing technique after surgery.' },
      { diagnosis: 'Pre-operative scrub for abscess drainage.', notes: 'Surgical hand wash and sterile gowning performed correctly prior to abscess drainage.', description: 'Surgical hand hygiene and gowning for abscess drainage.' },
    ],
  },
  {
    skillType: 'Procedural skill',
    competencyItemMatch: 'Urinary bladder catheterization',
    requestedName: 'Urinary bladder catheterization',
    count: 5,
    ageRange: [40, 85],
    scenarios: [
      { diagnosis: 'Acute urinary retention post-herniorrhaphy.', notes: 'Foley catheter inserted under aseptic technique; residual urine drained and documented.', description: 'Urinary catheterization for post-operative retention.' },
      { diagnosis: 'Pre-operative catheterization for planned laparotomy.', notes: 'Indwelling catheter placed for intra-operative urine output monitoring.', description: 'Pre-operative urinary catheterization.' },
      { diagnosis: 'Critically ill post-operative patient requiring output monitoring.', notes: 'Catheter inserted for accurate hourly urine output monitoring.', description: 'Urinary catheterization for output monitoring.' },
      { diagnosis: 'Acute urinary retention secondary to prostatic enlargement.', notes: 'Per-urethral catheterization performed successfully after initial difficulty; adequate drainage achieved.', description: 'Catheterization for BPH-related retention.' },
      { diagnosis: 'Bladder decompression prior to pelvic surgery.', notes: 'Catheter placed pre-operatively to ensure bladder decompression and reduce injury risk during surgery.', description: 'Pre-operative catheterization for pelvic surgery.' },
    ],
  },
];

// All 17 Procedural Skill items now have an explicit user-specified count -
// none remain unmatched/ambiguous for this dataset.
const UNMATCHED_PROCEDURAL_ITEMS: string[] = [];

// ---------------------------------------------------------------------
// Fictional Bangladeshi patient name pool (style matches the user's
// examples). Combined programmatically to guarantee enough unique names
// with no repeats across the whole 70-row dataset.
// ---------------------------------------------------------------------
const MALE_FIRST = [
  'Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul',
  'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur',
  'Faridul', 'Md. Ekram', 'Shamsul', 'Md. Nazrul',
];
const FEMALE_FIRST = [
  'Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima',
  'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
];

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildUniqueNamePool(count: number): string[] {
  const names = new Set<string>();
  const firsts = shuffle([...MALE_FIRST, ...FEMALE_FIRST], 42);
  const surnames = shuffle(SURNAMES, 99);
  let i = 0;
  while (names.size < count) {
    const first = firsts[i % firsts.length];
    const surname = surnames[Math.floor(i / firsts.length) % surnames.length];
    names.add(`${first} ${surname}`);
    i++;
    if (i > count * 5) break; // safety valve
  }
  return [...names];
}

function buildUniqueRegNos(count: number, seed: number): string[] {
  const seen = new Set<string>();
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const result: string[] = [];
  while (result.length < count) {
    const part1 = 1000 + Math.floor(rand() * 9000); // 1000-9999
    const part2 = Math.floor(rand() * 100); // 0-99
    const regNo = `${part1}/${part2.toString().padStart(2, '0')}`;
    if (!seen.has(regNo)) {
      seen.add(regNo);
      result.push(regNo);
    }
  }
  return result;
}

function buildAssignmentDates(count: number, seed: number): string[] {
  const start = new Date('2026-01-01T00:00:00Z');
  const end = new Date('2026-06-30T00:00:00Z');
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.floor(rand() * (rangeDays + 1));
    const d = new Date(start.getTime() + offset * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Picks a DOB such that the completed age on assignmentDate is exactly targetAge, and verifies it programmatically. */
function computeVerifiedDob(assignmentDate: string, targetAge: number, seed: number): { dob: string; verifiedAge: number } {
  const assign = new Date(assignmentDate + 'T00:00:00Z');
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const birthYear = assign.getUTCFullYear() - targetAge;
  // Pick a birth month/day guaranteed to be ON OR BEFORE the assignment's
  // month/day, so the birthday has already occurred this year (otherwise
  // the completed age on assignmentDate would be targetAge - 1).
  const assignMonth = assign.getUTCMonth(); // 0-11
  const assignDay = assign.getUTCDate();
  let birthMonth: number;
  let birthDay: number;
  if (assignMonth === 0 && assignDay === 1) {
    birthMonth = 0;
    birthDay = 1;
  } else {
    birthMonth = Math.floor(rand() * (assignMonth + 1));
    const maxDay = birthMonth === assignMonth ? assignDay : 28;
    birthDay = 1 + Math.floor(rand() * maxDay);
  }
  const dob = new Date(Date.UTC(birthYear, birthMonth, birthDay));
  const dobStr = dob.toISOString().slice(0, 10);

  const verifiedAge = calculateAge(dobStr, assignmentDate);
  return { dob: dobStr, verifiedAge };
}

function calculateAge(dobStr: string, assignmentDateStr: string): number {
  const dob = new Date(dobStr + 'T00:00:00Z');
  const assign = new Date(assignmentDateStr + 'T00:00:00Z');
  let age = assign.getUTCFullYear() - dob.getUTCFullYear();
  const hadBirthday = assign.getUTCMonth() > dob.getUTCMonth() || (assign.getUTCMonth() === dob.getUTCMonth() && assign.getUTCDate() >= dob.getUTCDate());
  if (!hadBirthday) age--;
  return age;
}

interface GeneratedRow {
  externalRowId: string;
  skillType: string;
  competencyItem: string;
  patientName: string;
  patientRegNo: string;
  dateOfAssignment: string;
  dateOfBirth: string;
  age: number;
  diagnosis: string;
  briefProceduralNotes: string;
  briefDescription: string;
}

function generateRows(namePool: string[], regNoPool: string[]): { rows: GeneratedRow[]; totalCount: number } {
  const rows: GeneratedRow[] = [];
  let globalIndex = 0;
  for (const skill of SKILLS) {
    const dates = buildAssignmentDates(skill.count, 1000 + globalIndex);
    for (let i = 0; i < skill.count; i++) {
      const scenario = skill.scenarios[i];
      const targetAge = skill.ageRange[0] + Math.floor(((skill.ageRange[1] - skill.ageRange[0]) * ((i + 1) / (skill.count + 1))));
      const { dob, verifiedAge } = computeVerifiedDob(dates[i], targetAge, 5000 + globalIndex);
      if (verifiedAge !== targetAge) {
        // Per the explicit instruction: regenerate rather than save a
        // mismatched row. Retry with an adjusted seed until it matches.
        let fixed = computeVerifiedDob(dates[i], targetAge, 6000 + globalIndex);
        let attempts = 0;
        while (fixed.verifiedAge !== targetAge && attempts < 20) {
          fixed = computeVerifiedDob(dates[i], targetAge, 7000 + globalIndex + attempts);
          attempts++;
        }
        if (fixed.verifiedAge !== targetAge) {
          throw new Error(`Could not generate a matching DOB/Age pair for row ${globalIndex} (target age ${targetAge}, date ${dates[i]}).`);
        }
        rows.push(buildRow(globalIndex, skill, scenario, namePool, regNoPool, dates[i], fixed.dob, fixed.verifiedAge));
      } else {
        rows.push(buildRow(globalIndex, skill, scenario, namePool, regNoPool, dates[i], dob, verifiedAge));
      }
      globalIndex++;
    }
  }
  return { rows, totalCount: globalIndex };
}

function buildRow(
  globalIndex: number,
  skill: SkillSpec,
  scenario: Scenario,
  namePool: string[],
  regNoPool: string[],
  dateOfAssignment: string,
  dateOfBirth: string,
  age: number
): GeneratedRow {
  return {
    externalRowId: `BSS-${(globalIndex + 1).toString().padStart(3, '0')}`,
    skillType: skill.skillType,
    competencyItem: skill.competencyItemMatch,
    patientName: namePool[globalIndex],
    patientRegNo: regNoPool[globalIndex],
    dateOfAssignment,
    dateOfBirth,
    age,
    diagnosis: scenario.diagnosis,
    briefProceduralNotes: scenario.notes,
    briefDescription: scenario.description,
  };
}

async function createDatasetWorkbook(): Promise<void> {
  fs.mkdirSync(DATASET_DIR, { recursive: true });
  fs.copyFileSync(REAL_XLSX_PATH, DATASET_XLSX_PATH);
}

async function writeRowsIntoDataset(rows: GeneratedRow[], leaves: LeafForValidation[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(DATASET_XLSX_PATH);
  const ws = wb.getWorksheet('DataEntry');
  if (!ws) throw new Error('DataEntry sheet not found in dataset workbook.');

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell) => headers.push(String(cell.value ?? '').trim()));
  const idx = (name: string) => {
    const i = headers.indexOf(name);
    if (i === -1) throw new Error(`DataEntry header "${name}" not found. Headers: ${headers.join(', ')}`);
    return i;
  };
  const col = {
    externalRowId: idx('ExternalRowId'),
    action: idx('Action'),
    combinationKey: idx('CombinationKey'),
    form: idx('Form'),
    caseType: idx('CaseType'),
    skillType: idx('SkillType'),
    dateOfAssignment: idx('Date of Assignment (YYYY-MM-DD)'),
    nameOfPatient: idx('Name of the Patient'),
    patientRegNo: idx('Patient Reg No'),
    dateOfBirth: idx('Date of Birth (YYYY-MM-DD)'),
    age: idx('Age'),
    competencyItems: idx('CompetencyItemsChecked (semicolon-separated)'),
    extraFieldsJson: idx('ExtraFieldsJSON'),
  };

  while (ws.rowCount > 1) {
    ws.spliceRows(2, 1);
  }

  for (const r of rows) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${r.skillType}`)!;
    const briefProceduralNotesField = leaf.fields.find((f) => f.column_name === 'Brief Procedural Notes');
    const extraFields: Record<string, string> = {
      'Diagnosis/Problems': r.diagnosis,
      'Brief Description': r.briefDescription,
    };
    // "Brief Procedural Notes" is required=1 under Procedural skill but
    // required=0 (and still present as a field) under Communication and
    // Writing Skill - included either way since we have genuine content for
    // it, but only if the field actually exists for this leaf.
    if (briefProceduralNotesField) {
      extraFields['Brief Procedural Notes'] = r.briefProceduralNotes;
    }

    const values: any[] = new Array(headers.length).fill(null);
    values[col.externalRowId] = r.externalRowId;
    values[col.action] = 'SAVE_DRAFT';
    values[col.combinationKey] = leaf.leafId;
    values[col.form] = FORM_LABEL;
    values[col.caseType] = CASE_TYPE_LABEL;
    values[col.skillType] = r.skillType;
    values[col.dateOfAssignment] = r.dateOfAssignment;
    values[col.nameOfPatient] = r.patientName;
    values[col.patientRegNo] = r.patientRegNo;
    values[col.dateOfBirth] = r.dateOfBirth;
    values[col.age] = String(r.age);
    values[col.competencyItems] = r.competencyItem;
    values[col.extraFieldsJson] = JSON.stringify(extraFields);
    ws.addRow(values);
  }

  await wb.xlsx.writeFile(DATASET_XLSX_PATH);
}

async function main() {
  logger.info('Generating Basic Surgical Skill synthetic test dataset (dry-run only, no live portal action).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);

  const formMapPath = path.join(OUTPUT_DIR, 'form-map.json');
  const formMap = JSON.parse(fs.readFileSync(formMapPath, 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  // Verify every requested competency item genuinely exists in the mapped
  // data before generating anything for it - never fabricate a match.
  const unmatchedRequested: { skillType: string; requestedName: string }[] = [];
  for (const skill of SKILLS) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${skill.skillType}`);
    const exists = leaf?.competencyGroup.some((c) => c.particulars.trim() === skill.competencyItemMatch.trim());
    if (!exists) unmatchedRequested.push({ skillType: skill.skillType, requestedName: skill.requestedName });
  }
  if (unmatchedRequested.length > 0) {
    logger.error(`Some requested skills could not be matched to the mapped workbook: ${JSON.stringify(unmatchedRequested)}`);
    process.exit(1);
  }

  const totalRowsPlanned = SKILLS.reduce((sum, s) => sum + s.count, 0);
  const namePool = buildUniqueNamePool(totalRowsPlanned);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 777);
  if (namePool.length < totalRowsPlanned) {
    throw new Error(`Name pool only produced ${namePool.length} unique names, need ${totalRowsPlanned}.`);
  }

  const { rows } = generateRows(namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows across ${SKILLS.length} skills.`);

  // Programmatic DOB/Age verification pass (belt-and-braces re-check of
  // every row before it is saved to the workbook, per the explicit rule).
  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) {
      ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored age=${r.age}, recomputed age=${recomputed}`);
    }
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} row(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows.');

  // Uniqueness checks (names, reg numbers).
  const nameSet = new Set(rows.map((r) => r.patientName));
  const regNoSet = new Set(rows.map((r) => r.patientRegNo));
  if (nameSet.size !== rows.length) throw new Error(`Duplicate patient names detected: ${rows.length - nameSet.size} collision(s).`);
  if (regNoSet.size !== rows.length) throw new Error(`Duplicate registration numbers detected: ${rows.length - regNoSet.size} collision(s).`);
  logger.info('Uniqueness verification passed: all patient names and registration numbers are unique.');

  await createDatasetWorkbook();
  logger.info(`Created dataset workbook (structural copy of the real mapping workbook): ${DATASET_XLSX_PATH}`);

  await writeRowsIntoDataset(rows, leaves);
  logger.info(`Wrote ${rows.length} rows into the dataset workbook's DataEntry sheet.`);

  // ---- Dry-run validation using the existing, unmodified validateRow logic ----
  const readRows: DataEntryRow[] = await readDataEntryRows(DATASET_XLSX_PATH);
  const draftRows = readRows.filter((r) => r.action === 'SAVE_DRAFT');
  const validationResults = draftRows.map((row) => ({ row, result: validateRow(row, leaves) }));
  const validCount = validationResults.filter((v) => v.result.valid).length;
  const invalidCount = validationResults.length - validCount;

  logger.info(`DRY RUN: ${draftRows.length} row(s), ${validCount} valid, ${invalidCount} invalid.`);
  for (const { row, result } of validationResults) {
    if (!result.valid) logger.error(`Row ${row.excelRow} (${row.externalRowId}) INVALID: ${result.errors.join(' | ')}`);
  }

  // ---- Per-skill row-count summary ----
  const perSkillCounts: Record<string, number> = {};
  for (const r of rows) perSkillCounts[`${r.skillType} > ${r.competencyItem}`] = (perSkillCounts[`${r.skillType} > ${r.competencyItem}`] ?? 0) + 1;

  const rowCountSummary = {
    generatedAt: new Date().toISOString(),
    totalRows: rows.length,
    perSkill: SKILLS.map((s) => ({
      skillType: s.skillType,
      competencyItem: s.competencyItemMatch,
      requestedCount: s.count,
      actualGenerated: perSkillCounts[`${s.skillType} > ${s.competencyItemMatch}`] ?? 0,
      matches: (perSkillCounts[`${s.skillType} > ${s.competencyItemMatch}`] ?? 0) === s.count,
    })),
  };
  fs.writeFileSync(path.join(DATASET_DIR, 'row-count-summary.json'), JSON.stringify(rowCountSummary, null, 2), 'utf-8');

  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    datasetWorkbook: DATASET_XLSX_PATH,
    totalRows: draftRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    rows: validationResults.map(({ row, result }) => ({ externalRowId: row.externalRowId, valid: result.valid, errors: result.errors })),
  };
  fs.writeFileSync(path.join(DATASET_DIR, 'dry-run-validation-report.json'), JSON.stringify(dryRunReport, null, 2), 'utf-8');

  const validationErrorReport = {
    generatedAt: new Date().toISOString(),
    totalErrors: validationResults.reduce((sum, v) => sum + v.result.errors.length, 0),
    errorsByRow: validationResults.filter((v) => !v.result.valid).map((v) => ({ externalRowId: v.row.externalRowId, errors: v.result.errors })),
  };
  fs.writeFileSync(path.join(DATASET_DIR, 'validation-error-report.json'), JSON.stringify(validationErrorReport, null, 2), 'utf-8');

  const realWorkbookStatAfter = fs.statSync(REAL_XLSX_PATH);
  const originalWorkbookUnchanged =
    realWorkbookStatBefore.size === realWorkbookStatAfter.size && realWorkbookStatBefore.mtimeMs === realWorkbookStatAfter.mtimeMs;

  const communicationTotal = SKILLS.filter((s) => s.skillType === 'Communication and Writing Skill').reduce((sum, s) => sum + s.count, 0);
  const proceduralTotal = SKILLS.filter((s) => s.skillType === 'Procedural skill').reduce((sum, s) => sum + s.count, 0);

  const generationSummary = {
    generatedAt: new Date().toISOString(),
    datasetFolder: DATASET_DIR,
    datasetWorkbook: DATASET_XLSX_PATH,
    sourceCombinationRoot: `${FORM_LABEL} > ${CASE_TYPE_LABEL}`,
    totals: {
      communicationAndWritingSkill: communicationTotal,
      proceduralSkill: proceduralTotal,
      grandTotal: communicationTotal + proceduralTotal,
    },
    skillsGenerated: SKILLS.map((s) => ({ skillType: s.skillType, competencyItem: s.competencyItemMatch, requestedCount: s.count })),
    unmatchedOrAmbiguousSkills: UNMATCHED_PROCEDURAL_ITEMS.map((name) => ({
      skillType: 'Procedural skill',
      competencyItem: name,
      reason: 'Exists in the mapped workbook, but no row count was specified in the request - no rows generated for this item (per "do not guess" instruction).',
    })),
    resolvedDiscrepancies: [
      {
        topic: 'Itemized list vs stated rollup totals',
        note: 'Two earlier stated grand totals (169, then 179) did not match the sum of the itemized per-skill counts given at the same time. The itemized per-skill counts were used as authoritative throughout; the user subsequently confirmed the correct totals as Communication=42, Procedural=132, Grand total=174, matching this generator\'s computed totals exactly.',
      },
      {
        topic: 'Intravenous cannulation count vs portal internal quota',
        requestedAndUsedCount: 20,
        portalInternalTarget: 20,
        note: 'The live portal\'s own log_entry_target.min_value for this item is 20. The user\'s final instruction confirmed using the portal\'s quota (20) for this item, so requested count and portal quota now agree - no discrepancy remains.',
      },
    ],
    liveActionsTaken: 'NONE - no login, no browser session, no draft created, no Save as Draft, no Final Submit.',
    originalWorkbookUnchanged,
  };
  fs.writeFileSync(path.join(DATASET_DIR, 'generation-summary.json'), JSON.stringify(generationSummary, null, 2), 'utf-8');

  fs.writeFileSync(path.join(DATASET_DIR, 'generated-rows-raw.json'), JSON.stringify(rows, null, 2), 'utf-8');

  logger.info(`Wrote all report files to ${DATASET_DIR}`);
  logger.info('STOPPED after dry-run validation, as instructed. No login, no browser, no draft was created.');
}

main().catch((err) => {
  logger.error(`generate-basic-surgical-skill-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
