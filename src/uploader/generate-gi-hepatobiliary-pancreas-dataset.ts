/**
 * Synthetic test-dataset generator for Gastrointestinal & HepatoBiliary
 * System and Pancreas (Interpretative Skill + Procedural skill), using the
 * PORTAL-AUTHORITATIVE quota (200 rows total: 69 Interpretative + 131
 * Procedural), per explicit user decision overriding the source-document
 * count (113) for this dataset. Both totals are preserved in the reports.
 *
 * Does NOT modify src/mapper, src/excel, or any existing file under
 * src/uploader - only imports and reuses existing exported functions
 * (readDataEntryRows, validateRow) against a brand-new workbook, copied
 * structurally from the real output/BCPS_Logbook_Full_Mapping.xlsx (never
 * modified). Dry-run only - no login, no browser, no draft created.
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

const SPECIALTY_DIR = path.join(PROJECT_ROOT, 'generated-data', 'Gastrointestinal-HepatoBiliary-Pancreas');
const DATE_RANGE_LABEL = '01-01-2026_to_30-06-2026';
const DATE_RANGE_DIR = path.join(SPECIALTY_DIR, DATE_RANGE_LABEL);
const GENERATED_DIR = path.join(DATE_RANGE_DIR, 'generated');
const REPORTS_DIR = path.join(DATE_RANGE_DIR, 'reports');
const CONFIG_PATH = path.join(SPECIALTY_DIR, 'specialty-config', 'gastrointestinal-hepatobiliary-pancreas.json');

const DATASET_XLSX_PATH = path.join(GENERATED_DIR, 'BCPS_Logbook_Gastrointestinal_HepatoBiliary_Pancreas_01-01-2026_to_30-06-2026.xlsx');

const FORM_LABEL = 'Procedural and Interpretative Skills';
const CASE_TYPE_LABEL = 'Gastrointestinal & HepatoBiliary System and Pancreas';

interface Scenario {
  diagnosis: string; // Diagnosis/Problems (Procedural) or Indication/Investigation/Findings/Diagnosis (Interpretative)
  notes: string; // Brief Procedural Notes (Procedural) or Interpretations (Interpretative)
  description: string; // Brief Description (both)
}

// ---------------------------------------------------------------------
// Clinical content banks - concise, FCPS-logbook style (short procedure/
// finding-oriented phrases), styled after the real BCPS Core Surgical
// Training logbook (reviewed for STYLE ONLY - no real patient names, reg
// numbers, dates, ages, or patient-identifiable diagnoses were copied).
// ---------------------------------------------------------------------
const INTERPRETATIVE_SCENARIOS: Record<string, Scenario[]> = {
  'Biochemical investigations': [
    { diagnosis: 'Deranged LFTs; suspected obstructive jaundice.', notes: 'Elevated bilirubin and alkaline phosphatase.', description: 'Biochemical work-up for obstructive jaundice.' },
    { diagnosis: 'Suspected acute pancreatitis.', notes: 'Serum amylase markedly elevated, 3x upper limit.', description: 'Biochemical investigation for pancreatitis.' },
    { diagnosis: 'Chronic liver disease work-up.', notes: 'Low albumin, raised INR, consistent with cirrhosis.', description: 'LFT panel for chronic liver disease.' },
    { diagnosis: 'Suspected pancreatitis, lipase requested.', notes: 'Serum lipase markedly elevated.', description: 'Biochemical work-up for pancreatitis.' },
    { diagnosis: 'Pre-operative work-up for cholecystectomy.', notes: 'Liver function tests within normal limits.', description: 'Pre-operative biochemical screening.' },
    { diagnosis: 'Pre-operative renal function assessment.', notes: 'Urea and creatinine within normal range.', description: 'Renal function pre-operative work-up.' },
    { diagnosis: 'Obstructive jaundice, biochemical evaluation.', notes: 'Raised conjugated bilirubin, elevated GGT.', description: 'LFT panel in obstructive jaundice.' },
    { diagnosis: 'Biochemical work-up for ascites.', notes: 'Low serum albumin, SAAG greater than 1.1.', description: 'Biochemical evaluation of ascites.' },
    { diagnosis: 'Electrolyte assessment in intestinal obstruction.', notes: 'Hypokalemia with mild dehydration noted.', description: 'Electrolyte panel in obstruction.' },
    { diagnosis: 'Hepatic mass, biochemical evaluation.', notes: 'Mildly deranged ALT and AST.', description: 'LFT panel for hepatic mass work-up.' },
  ],
  'CT scan, ERCP, MRCP': [
    { diagnosis: 'Suspected pancreatic head mass.', notes: 'CT abdomen shows hypodense mass in pancreatic head.', description: 'CT scan for pancreatic mass.' },
    { diagnosis: 'Suspected CBD stone.', notes: 'MRCP shows filling defect in distal CBD.', description: 'MRCP for suspected CBD stone.' },
    { diagnosis: 'Obstructive jaundice due to CBD stone.', notes: 'ERCP done, CBD stone extracted, stent placed.', description: 'ERCP for obstructive jaundice.' },
    { diagnosis: 'Suspected liver abscess.', notes: 'CT scan shows well-defined hypodense hepatic lesion.', description: 'CT scan for liver abscess.' },
    { diagnosis: 'Suspected biliary stricture.', notes: 'MRCP shows smooth stricture at CBD-CHD junction.', description: 'MRCP for biliary stricture.' },
  ],
  'Contrast X-rays (Barium swallow, Barium meal and follow through, Barium enema)': [
    { diagnosis: 'Dysphagia, evaluated with barium swallow.', notes: 'Smooth tapering stricture noted in lower esophagus.', description: 'Barium swallow for dysphagia.' },
    { diagnosis: 'Gastric outlet obstruction.', notes: 'Barium meal shows delayed gastric emptying, dilated stomach.', description: 'Barium meal for gastric outlet obstruction.' },
    { diagnosis: 'Altered bowel habit, barium enema done.', notes: 'Apple-core lesion noted in sigmoid colon.', description: 'Barium enema for altered bowel habit.' },
    { diagnosis: 'Suspected achalasia.', notes: 'Barium swallow shows bird-beak narrowing at cardia.', description: 'Barium swallow for achalasia.' },
    { diagnosis: 'Suspected Crohn\'s disease.', notes: 'Barium follow-through shows string sign in terminal ileum.', description: 'Barium follow-through for Crohn\'s disease.' },
    { diagnosis: 'Diverticular disease, barium enema done.', notes: 'Multiple diverticula noted in sigmoid colon.', description: 'Barium enema for diverticular disease.' },
    { diagnosis: 'Post-esophageal surgery assessment.', notes: 'Barium swallow shows no leak, free flow of contrast.', description: 'Post-operative barium swallow study.' },
    { diagnosis: 'Suspected duodenal ulcer.', notes: 'Barium meal shows niche in duodenal cap.', description: 'Barium meal for peptic ulcer disease.' },
    { diagnosis: 'Suspected colonic stricture.', notes: 'Barium enema shows long segment narrowing in descending colon.', description: 'Barium enema for colonic stricture.' },
    { diagnosis: 'Malabsorption syndrome work-up.', notes: 'Barium follow-through shows dilated small bowel loops.', description: 'Barium follow-through for malabsorption.' },
  ],
  'Histopathological analysis': [
    { diagnosis: 'Acute appendicitis, specimen sent.', notes: 'Histopathology confirms acute suppurative appendicitis.', description: 'Histopathology of appendix specimen.' },
    { diagnosis: 'Chronic calculus cholecystitis.', notes: 'Histopathology shows chronic cholecystitis with cholelithiasis.', description: 'Histopathology of gallbladder specimen.' },
    { diagnosis: 'Colonic polyp, biopsy sent.', notes: 'Histopathology shows tubulovillous adenoma with low-grade dysplasia.', description: 'Histopathology of colonic polyp.' },
    { diagnosis: 'Suspected rectal carcinoma.', notes: 'Histopathology confirms moderately differentiated adenocarcinoma.', description: 'Histopathology of rectal biopsy.' },
    { diagnosis: 'Hemorrhoidectomy specimen sent.', notes: 'Histopathology shows dilated vascular channels, no dysplasia.', description: 'Histopathology of hemorrhoidectomy specimen.' },
    { diagnosis: 'Chronic liver disease, biopsy done.', notes: 'Histopathology shows chronic hepatitis with mild fibrosis.', description: 'Histopathology of liver biopsy.' },
    { diagnosis: 'Pancreatic mass, specimen sent.', notes: 'Histopathology confirms ductal adenocarcinoma of pancreas.', description: 'Histopathology of pancreatic specimen.' },
    { diagnosis: 'Chronic gastritis, biopsy sent.', notes: 'Histopathology shows chronic gastritis, H. pylori positive.', description: 'Histopathology of gastric biopsy.' },
    { diagnosis: 'Anal fistula tract excised.', notes: 'Histopathology shows chronic inflammation, no malignancy.', description: 'Histopathology of fistula tract.' },
    { diagnosis: 'Resected bowel segment for carcinoma.', notes: 'Histopathology confirms adenocarcinoma with clear margins.', description: 'Histopathology of resected bowel.' },
  ],
  'Immunohistochemistry': [
    { diagnosis: 'Colorectal carcinoma, IHC for staging.', notes: 'CK20 positive, CDX2 positive.', description: 'IHC panel for colorectal carcinoma.' },
    { diagnosis: 'Suspected GIST, IHC requested.', notes: 'CD117 (c-KIT) positive, confirming GIST.', description: 'IHC for GIST characterization.' },
    { diagnosis: 'Hepatocellular carcinoma, IHC done.', notes: 'HepPar-1 positive.', description: 'IHC for hepatocellular carcinoma.' },
    { diagnosis: 'Suspected neuroendocrine tumor.', notes: 'Chromogranin and synaptophysin both positive.', description: 'IHC for neuroendocrine tumor.' },
    { diagnosis: 'Suspected cholangiocarcinoma.', notes: 'CK7 positive, CK20 negative.', description: 'IHC for cholangiocarcinoma confirmation.' },
  ],
  'Lower gastrointestinal endoscopy': [
    { diagnosis: 'Lower GI bleeding, colonoscopy done.', notes: 'Bleeding internal hemorrhoids identified.', description: 'Colonoscopy for lower GI bleeding.' },
    { diagnosis: 'Altered bowel habit, colonoscopy done.', notes: 'Sigmoid colon mass identified and biopsied.', description: 'Colonoscopy for altered bowel habit.' },
  ],
  'Plain X-ray abdomen': [
    { diagnosis: 'Suspected hollow viscus perforation.', notes: 'Erect abdomen X-ray shows free gas under right diaphragm.', description: 'Erect X-ray for suspected perforation.' },
    { diagnosis: 'Suspected intestinal obstruction.', notes: 'Plain X-ray shows multiple air-fluid levels.', description: 'Plain X-ray for intestinal obstruction.' },
    { diagnosis: 'Right renal colic.', notes: 'X-ray abdomen shows radio-opaque shadow in right ureter.', description: 'X-ray abdomen for renal colic.' },
    { diagnosis: 'Gross ascites.', notes: 'Plain film shows ground-glass appearance, centralized bowel loops.', description: 'X-ray abdomen for ascites.' },
    { diagnosis: 'Post-laparotomy assessment.', notes: 'X-ray shows no free gas, normal bowel gas pattern.', description: 'Post-operative X-ray abdomen.' },
    { diagnosis: 'Suspected ingested foreign body.', notes: 'Plain film shows radio-opaque foreign body in pelvis.', description: 'X-ray for suspected foreign body.' },
    { diagnosis: 'Suspected sigmoid volvulus.', notes: 'X-ray shows coffee-bean sign, dilated sigmoid loop.', description: 'X-ray abdomen for sigmoid volvulus.' },
    { diagnosis: 'Suspected gallstone ileus.', notes: 'Plain film shows dilated small bowel with ectopic biliary gas.', description: 'X-ray abdomen for gallstone ileus.' },
    { diagnosis: 'Chronic pancreatitis assessment.', notes: 'X-ray shows pancreatic calcifications.', description: 'X-ray abdomen for chronic pancreatitis.' },
    { diagnosis: 'Pre-operative assessment.', notes: 'Plain film shows unremarkable bowel gas pattern.', description: 'Pre-operative X-ray abdomen.' },
  ],
  'Tumor marker': [
    { diagnosis: 'Colorectal carcinoma follow-up.', notes: 'CEA elevated at 45 ng/mL.', description: 'CEA for colorectal carcinoma follow-up.' },
    { diagnosis: 'Suspected pancreatic malignancy.', notes: 'CA 19-9 markedly raised.', description: 'CA 19-9 for pancreatic mass.' },
    { diagnosis: 'Hepatic mass evaluation.', notes: 'AFP raised, suggestive of hepatocellular carcinoma.', description: 'AFP for hepatic mass evaluation.' },
    { diagnosis: 'Suspected cholangiocarcinoma.', notes: 'CA 19-9 moderately elevated.', description: 'CA 19-9 for cholangiocarcinoma work-up.' },
    { diagnosis: 'Pre-colectomy baseline.', notes: 'CEA within normal limits.', description: 'Baseline CEA pre-colectomy.' },
    { diagnosis: 'Cirrhosis surveillance.', notes: 'AFP mildly raised.', description: 'AFP for cirrhosis surveillance.' },
    { diagnosis: 'Post-Whipple follow-up.', notes: 'CA 19-9 declining trend, good response.', description: 'CA 19-9 follow-up post-pancreatoduodenectomy.' },
    { diagnosis: 'GI malignancy work-up panel.', notes: 'Both CEA and CA 19-9 raised.', description: 'Tumor marker panel for GI malignancy.' },
    { diagnosis: 'Rectal carcinoma staging.', notes: 'CEA elevated at 18 ng/mL.', description: 'CEA for rectal carcinoma staging.' },
    { diagnosis: 'Hepatocellular carcinoma screening.', notes: 'AFP normal, no suspicion of HCC.', description: 'AFP screening for HCC.' },
  ],
  'USG of whole abdomen/ HBS': [
    { diagnosis: 'Symptomatic cholelithiasis.', notes: 'USG shows multiple gallstones, thickened GB wall.', description: 'USG for cholelithiasis.' },
    { diagnosis: 'Obstructive jaundice.', notes: 'USG HBS shows dilated CBD, 12mm, with stone.', description: 'USG HBS for obstructive jaundice.' },
    { diagnosis: 'Suspected ascites.', notes: 'USG shows moderate free fluid in all quadrants.', description: 'USG abdomen for ascites.' },
    { diagnosis: 'Suspected appendicular lump.', notes: 'USG shows ill-defined mass in right iliac fossa.', description: 'USG for appendicular lump.' },
    { diagnosis: 'Suspected hepatomegaly.', notes: 'USG shows enlarged liver with coarse echotexture.', description: 'USG whole abdomen for hepatomegaly.' },
  ],
  'Upper gastrointestinal endoscopy': [
    { diagnosis: 'Dyspepsia, endoscopy done.', notes: 'Antral gastritis noted, no ulcer identified.', description: 'Upper GI endoscopy for dyspepsia.' },
    { diagnosis: 'Hematemesis, endoscopy done.', notes: 'Bleeding duodenal ulcer identified and clipped.', description: 'Upper GI endoscopy for hematemesis.' },
  ],
};

const PROCEDURAL_SCENARIOS: Record<string, Scenario[]> = {
  'Abdominal paracentesis': [
    { diagnosis: 'Tense ascites.', notes: 'Paracentesis done, 3L fluid drained, sent for analysis.', description: 'Abdominal paracentesis for tense ascites.' },
    { diagnosis: 'Malignant ascites.', notes: 'Diagnostic and therapeutic paracentesis performed under aseptic technique.', description: 'Paracentesis for malignant ascites.' },
    { diagnosis: 'Ascites with respiratory distress.', notes: 'Large volume paracentesis done with albumin cover.', description: 'Paracentesis for symptomatic ascites.' },
    { diagnosis: 'Cirrhotic ascites.', notes: 'Paracentesis performed, fluid sent for SAAG analysis.', description: 'Paracentesis in decompensated cirrhosis.' },
    { diagnosis: 'Recurrent ascites.', notes: 'Repeat paracentesis done for symptomatic relief.', description: 'Paracentesis for recurrent ascites.' },
  ],
  'Abdominal rectopexy': [
    { diagnosis: 'Complete rectal prolapse.', notes: 'Abdominal rectopexy performed, rectum mobilized and fixed to sacral promontory.', description: 'Rectopexy for rectal prolapse.' },
    { diagnosis: 'Recurrent rectal prolapse.', notes: 'Laparoscopic-assisted rectopexy done with mesh fixation.', description: 'Rectopexy for recurrent prolapse.' },
  ],
  'Abdominoperineal resection': [
    { diagnosis: 'Low rectal carcinoma.', notes: 'APR performed with permanent colostomy formation.', description: 'APR for low rectal carcinoma.' },
    { diagnosis: 'Anal canal carcinoma.', notes: 'Abdominoperineal resection with wide perineal excision done.', description: 'APR for anal canal carcinoma.' },
  ],
  Adhesionolysis: [
    { diagnosis: 'Adhesive intestinal obstruction.', notes: 'Extensive adhesionolysis performed, bowel viability confirmed.', description: 'Adhesionolysis for adhesive obstruction.' },
    { diagnosis: 'Recurrent adhesive obstruction.', notes: 'Careful adhesionolysis done avoiding enterotomy.', description: 'Adhesionolysis for recurrent obstruction.' },
  ],
  'Appendicectomy (Open and laparoscopic)': [
    { diagnosis: 'Acute appendicitis.', notes: 'Open appendicectomy done, inflamed appendix removed.', description: 'Appendicectomy for acute appendicitis.' },
    { diagnosis: 'Recurrent appendicitis.', notes: 'Laparoscopic appendicectomy performed uneventfully.', description: 'Lap appendicectomy for recurrent appendicitis.' },
    { diagnosis: 'Perforated appendicitis.', notes: 'Open appendicectomy with peritoneal lavage done.', description: 'Appendicectomy for perforated appendicitis.' },
    { diagnosis: 'Appendicular lump.', notes: 'Interval laparoscopic appendicectomy performed.', description: 'Appendicectomy for appendicular lump.' },
    { diagnosis: 'Acute appendicitis in pregnancy.', notes: 'Laparoscopic appendicectomy done with careful port placement.', description: 'Lap appendicectomy in pregnancy.' },
  ],
  Choledocholithotomy: [
    { diagnosis: 'Choledocholithiasis.', notes: 'CBD explored, stone extracted, T-tube drain placed.', description: 'Choledocholithotomy for CBD stone.' },
    { diagnosis: 'Obstructive jaundice due to CBD stone.', notes: 'Open choledocholithotomy with T-tube drainage done.', description: 'Choledocholithotomy for obstructive jaundice.' },
    { diagnosis: 'Recurrent CBD stones.', notes: 'CBD re-explored, multiple stones retrieved.', description: 'Choledocholithotomy for recurrent stones.' },
    { diagnosis: 'Cholangitis due to CBD stone.', notes: 'Emergency choledocholithotomy with T-tube placement.', description: 'Choledocholithotomy for cholangitis.' },
    { diagnosis: 'Large CBD stone.', notes: 'Choledochotomy done, large stone milked out.', description: 'Choledocholithotomy for large CBD stone.' },
  ],
  Colonoscopy: [
    { diagnosis: 'Lower GI bleeding.', notes: 'Colonoscopy done, bleeding diverticulum identified and clipped.', description: 'Colonoscopy for LGIB.' },
    { diagnosis: 'Altered bowel habit.', notes: 'Full colonoscopy performed, sigmoid polyp removed.', description: 'Colonoscopy for altered bowel habit.' },
    { diagnosis: 'Suspected colorectal lesion.', notes: 'Colonoscopy done, mass biopsied at splenic flexure.', description: 'Colonoscopy for suspected malignancy.' },
    { diagnosis: 'Chronic diarrhea.', notes: 'Colonoscopy with biopsies taken for colitis work-up.', description: 'Colonoscopy for chronic diarrhea.' },
    { diagnosis: 'Screening for colorectal cancer.', notes: 'Surveillance colonoscopy done, no abnormality detected.', description: 'Screening colonoscopy.' },
  ],
  'Distal pancreatectomy': [
    { diagnosis: 'Pancreatic tail mass.', notes: 'Distal pancreatectomy with splenectomy performed.', description: 'Distal pancreatectomy for tail mass.' },
    { diagnosis: 'Chronic pancreatitis with pseudocyst.', notes: 'Distal pancreatectomy done, spleen preserved.', description: 'Distal pancreatectomy for pseudocyst.' },
  ],
  'Drainage of anorectal abscesses': [
    { diagnosis: 'Perianal abscess.', notes: 'Incision and drainage done under regional anesthesia.', description: 'Drainage of perianal abscess.' },
    { diagnosis: 'Ischiorectal abscess.', notes: 'Wide incision and drainage of ischiorectal abscess performed.', description: 'Drainage of ischiorectal abscess.' },
    { diagnosis: 'Intersphincteric abscess.', notes: 'Drainage done with careful sphincter preservation.', description: 'Drainage of intersphincteric abscess.' },
    { diagnosis: 'Recurrent anorectal abscess.', notes: 'Re-drainage done, fistula tract identified.', description: 'Drainage of recurrent abscess.' },
    { diagnosis: 'Horseshoe abscess.', notes: 'Wide drainage with counter-incisions performed.', description: 'Drainage of horseshoe abscess.' },
  ],
  'Fistulotomy/Fistulectomy/Seton insertion': [
    { diagnosis: 'Fistula-in-ano, low type.', notes: 'Fistulotomy done, tract laid open.', description: 'Fistulotomy for low anal fistula.' },
    { diagnosis: 'Fistula-in-ano, high type.', notes: 'Loose seton inserted for staged management.', description: 'Seton insertion for high fistula.' },
    { diagnosis: 'Recurrent fistula-in-ano.', notes: 'Fistulectomy performed with complete tract excision.', description: 'Fistulectomy for recurrent fistula.' },
    { diagnosis: 'Complex anal fistula.', notes: 'Cutting seton placed for gradual division.', description: 'Seton insertion for complex fistula.' },
    { diagnosis: 'Trans-sphincteric fistula.', notes: 'Fistulotomy with sphincter-sparing technique done.', description: 'Fistulotomy for trans-sphincteric fistula.' },
  ],
  Gastrectomy: [
    { diagnosis: 'Carcinoma stomach.', notes: 'Subtotal gastrectomy with D2 lymphadenectomy performed.', description: 'Gastrectomy for gastric carcinoma.' },
    { diagnosis: 'Perforated gastric ulcer with malignancy suspicion.', notes: 'Partial gastrectomy done with frozen section.', description: 'Gastrectomy for perforated gastric ulcer.' },
  ],
  'Gastric bypass': [
    { diagnosis: 'Morbid obesity.', notes: 'Roux-en-Y gastric bypass performed laparoscopically.', description: 'Gastric bypass for morbid obesity.' },
    { diagnosis: 'Obesity with type 2 diabetes.', notes: 'Laparoscopic gastric bypass done for metabolic control.', description: 'Gastric bypass for metabolic syndrome.' },
    { diagnosis: 'Failed gastric banding.', notes: 'Conversion to gastric bypass performed.', description: 'Revisional gastric bypass.' },
    { diagnosis: 'Severe obesity with comorbidities.', notes: 'Gastric bypass done with careful anastomosis check.', description: 'Gastric bypass for severe obesity.' },
    { diagnosis: 'Obesity with GERD.', notes: 'Roux-en-Y bypass performed to address reflux and weight.', description: 'Gastric bypass for obesity with GERD.' },
  ],
  'Hepatic resection': [
    { diagnosis: 'Hepatocellular carcinoma.', notes: 'Right hepatectomy performed with intraoperative USG guidance.', description: 'Hepatic resection for HCC.' },
    { diagnosis: 'Solitary liver metastasis.', notes: 'Segmental liver resection done for metastatic lesion.', description: 'Hepatic resection for liver metastasis.' },
  ],
  'Insertion of nasogastric tube': [
    { diagnosis: 'Intestinal obstruction.', notes: 'NG tube inserted for gastric decompression, bilious aspirate noted.', description: 'NG tube insertion for obstruction.' },
    { diagnosis: 'Post-laparotomy ileus.', notes: 'NG tube placed for decompression, position confirmed.', description: 'NG tube for post-op ileus.' },
    { diagnosis: 'Acute pancreatitis.', notes: 'NG tube inserted for feeding and decompression.', description: 'NG tube insertion in pancreatitis.' },
    { diagnosis: 'Upper GI bleeding.', notes: 'NG tube placed to assess ongoing bleeding.', description: 'NG tube for UGI bleed assessment.' },
    { diagnosis: 'Perforation peritonitis.', notes: 'NG tube inserted pre-operatively for decompression.', description: 'NG tube insertion in peritonitis.' },
  ],
  'Laparoscopic cholecystectomy': [
    { diagnosis: 'Symptomatic cholelithiasis.', notes: 'Laparoscopic cholecystectomy done, four-port technique.', description: 'Lap cholecystectomy for cholelithiasis.' },
    { diagnosis: 'Chronic calculus cholecystitis.', notes: 'Laparoscopic cholecystectomy performed uneventfully.', description: 'Lap cholecystectomy for chronic cholecystitis.' },
    { diagnosis: 'Acute cholecystitis.', notes: 'Early laparoscopic cholecystectomy done.', description: 'Lap cholecystectomy for acute cholecystitis.' },
    { diagnosis: 'Gallbladder polyp.', notes: 'Laparoscopic cholecystectomy done for polyp greater than 1cm.', description: 'Lap cholecystectomy for GB polyp.' },
    { diagnosis: 'Biliary colic.', notes: 'Elective laparoscopic cholecystectomy performed.', description: 'Lap cholecystectomy for biliary colic.' },
  ],
  Laparoscopy: [
    { diagnosis: 'Chronic abdominal pain, diagnostic laparoscopy.', notes: 'Laparoscopy done, no significant pathology found.', description: 'Diagnostic laparoscopy.' },
    { diagnosis: 'Suspected ovarian cyst torsion.', notes: 'Laparoscopy done in consultation with gynecology.', description: 'Laparoscopy for suspected torsion.' },
    { diagnosis: 'Infertility work-up.', notes: 'Laparoscopy performed, adhesions noted and released.', description: 'Diagnostic laparoscopy for infertility.' },
    { diagnosis: 'Suspected appendicular pathology.', notes: 'Diagnostic laparoscopy converted to appendicectomy.', description: 'Laparoscopy for suspected appendicitis.' },
    { diagnosis: 'Chronic pelvic pain.', notes: 'Laparoscopy done, mild pelvic adhesions found.', description: 'Laparoscopy for chronic pelvic pain.' },
  ],
  Laparotomy: [
    { diagnosis: 'Perforation peritonitis.', notes: 'Exploratory laparotomy done, perforation identified and repaired.', description: 'Laparotomy for perforation peritonitis.' },
    { diagnosis: 'Intestinal obstruction.', notes: 'Laparotomy performed, obstructing band divided.', description: 'Laparotomy for intestinal obstruction.' },
    { diagnosis: 'Blunt abdominal trauma.', notes: 'Emergency laparotomy done for hemoperitoneum.', description: 'Laparotomy for abdominal trauma.' },
    { diagnosis: 'Mesenteric ischemia.', notes: 'Laparotomy done, non-viable bowel resected.', description: 'Laparotomy for mesenteric ischemia.' },
    { diagnosis: 'Hollow viscus perforation.', notes: 'Laparotomy with primary repair of perforation done.', description: 'Laparotomy for hollow viscus perforation.' },
  ],
  'Lateral internal sphincterotomy': [
    { diagnosis: 'Chronic anal fissure.', notes: 'Lateral internal sphincterotomy performed.', description: 'Sphincterotomy for chronic fissure.' },
    { diagnosis: 'Anal fissure with sentinel pile.', notes: 'Sphincterotomy done with sentinel pile excision.', description: 'Sphincterotomy for fissure with pile.' },
    { diagnosis: 'Recurrent anal fissure.', notes: 'Repeat lateral sphincterotomy performed.', description: 'Sphincterotomy for recurrent fissure.' },
    { diagnosis: 'Anal fissure resistant to medical therapy.', notes: 'Lateral internal sphincterotomy done under local anesthesia.', description: 'Sphincterotomy for refractory fissure.' },
    { diagnosis: 'Posterior anal fissure.', notes: 'Sphincterotomy performed with fissurectomy.', description: 'Sphincterotomy for posterior fissure.' },
  ],
  'Open cholecystectomy': [
    { diagnosis: 'Acute cholecystitis with dense adhesions.', notes: 'Open cholecystectomy done after difficult dissection.', description: 'Open cholecystectomy for acute cholecystitis.' },
    { diagnosis: 'Empyema gallbladder.', notes: 'Open cholecystectomy performed, pus drained.', description: 'Open cholecystectomy for empyema GB.' },
    { diagnosis: 'Gangrenous cholecystitis.', notes: 'Open cholecystectomy done with drain placement.', description: 'Open cholecystectomy for gangrenous GB.' },
    { diagnosis: 'Chronic calculus cholecystitis, converted procedure.', notes: 'Conversion to open cholecystectomy done for safety.', description: 'Converted open cholecystectomy.' },
    { diagnosis: 'Mirizzi syndrome.', notes: 'Open cholecystectomy performed with careful CBD dissection.', description: 'Open cholecystectomy for Mirizzi syndrome.' },
  ],
  'Open hemorrhoidectomy': [
    { diagnosis: 'Third degree hemorrhoids.', notes: 'Milligan-Morgan hemorrhoidectomy performed.', description: 'Hemorrhoidectomy for 3rd degree piles.' },
    { diagnosis: 'Fourth degree prolapsed hemorrhoids.', notes: 'Open hemorrhoidectomy done for irreducible piles.', description: 'Hemorrhoidectomy for 4th degree piles.' },
    { diagnosis: 'Bleeding internal hemorrhoids.', notes: 'Hemorrhoidectomy performed with ligation of pedicles.', description: 'Hemorrhoidectomy for bleeding piles.' },
    { diagnosis: 'Mixed hemorrhoids.', notes: 'Open hemorrhoidectomy done for combined internal-external piles.', description: 'Hemorrhoidectomy for mixed piles.' },
    { diagnosis: 'Thrombosed external hemorrhoids.', notes: 'Hemorrhoidectomy performed after acute thrombosis settled.', description: 'Hemorrhoidectomy for thrombosed piles.' },
  ],
  Pancreatoduodenectomy: [
    { diagnosis: 'Periampullary carcinoma.', notes: "Whipple's procedure performed with pancreaticojejunostomy.", description: 'Pancreatoduodenectomy for periampullary carcinoma.' },
    { diagnosis: 'Carcinoma head of pancreas.', notes: 'Pancreatoduodenectomy done with portal vein assessment.', description: "Whipple's for pancreatic head carcinoma." },
    { diagnosis: 'Distal CBD cholangiocarcinoma.', notes: "Whipple's procedure performed with wide resection.", description: 'Pancreatoduodenectomy for cholangiocarcinoma.' },
    { diagnosis: 'Ampullary tumor.', notes: 'Pancreatoduodenectomy done with negative margins confirmed.', description: "Whipple's for ampullary tumor." },
    { diagnosis: 'Chronic pancreatitis with head mass.', notes: 'Pancreatoduodenectomy performed for uncertain malignancy.', description: 'Pancreatoduodenectomy for pancreatic head mass.' },
  ],
  'Pancreatojejunostomy (LPJ)': [
    { diagnosis: 'Chronic pancreatitis with dilated duct.', notes: "Lateral pancreaticojejunostomy performed (Puestow procedure).", description: 'LPJ for chronic pancreatitis.' },
    { diagnosis: 'Painful chronic pancreatitis.', notes: 'LPJ done for ductal decompression.', description: 'LPJ for painful chronic pancreatitis.' },
  ],
  Proctosigmoidoscopy: [
    { diagnosis: 'Bright red rectal bleeding.', notes: 'Proctosigmoidoscopy done, bleeding internal piles seen.', description: 'Proctosigmoidoscopy for rectal bleeding.' },
    { diagnosis: 'Suspected rectal growth.', notes: 'Rigid sigmoidoscopy performed, growth biopsied.', description: 'Proctosigmoidoscopy for rectal growth.' },
    { diagnosis: 'Chronic constipation.', notes: 'Proctosigmoidoscopy done, no mucosal lesion found.', description: 'Proctosigmoidoscopy for constipation.' },
    { diagnosis: 'Fistula-in-ano assessment.', notes: 'Proctoscopy done to assess internal opening.', description: 'Proctosigmoidoscopy for fistula assessment.' },
    { diagnosis: 'Post-hemorrhoidectomy follow-up.', notes: 'Proctosigmoidoscopy done, healed surgical site confirmed.', description: 'Follow-up proctosigmoidoscopy.' },
  ],
  'Repair of perforation of hollow viscera': [
    { diagnosis: 'Perforated duodenal ulcer.', notes: "Graham's omental patch repair performed.", description: 'Repair of perforated duodenal ulcer.' },
    { diagnosis: 'Typhoid ileal perforation.', notes: 'Primary closure of ileal perforation done.', description: 'Repair of typhoid perforation.' },
    { diagnosis: 'Perforated sigmoid diverticulitis.', notes: 'Perforation repaired with proximal diversion.', description: 'Repair of sigmoid perforation.' },
    { diagnosis: 'Traumatic bowel perforation.', notes: 'Primary repair of perforation done post-trauma.', description: 'Repair of traumatic perforation.' },
    { diagnosis: 'Perforated gastric ulcer.', notes: 'Omental patch repair of gastric perforation performed.', description: 'Repair of perforated gastric ulcer.' },
  ],
  'Resection anastomosis of bowel': [
    { diagnosis: 'Carcinoma sigmoid colon.', notes: 'Sigmoid colectomy with resection anastomosis done.', description: 'Resection anastomosis for sigmoid carcinoma.' },
    { diagnosis: 'Ileal stricture.', notes: 'Segmental resection with end-to-end anastomosis performed.', description: 'Resection anastomosis for ileal stricture.' },
    { diagnosis: 'Gangrenous bowel loop.', notes: 'Resection of non-viable bowel with anastomosis done.', description: 'Resection anastomosis for gangrenous bowel.' },
    { diagnosis: 'Carcinoma cecum.', notes: 'Right hemicolectomy with ileocolic anastomosis performed.', description: 'Resection anastomosis for cecal carcinoma.' },
    { diagnosis: 'Volvulus with gangrene.', notes: 'Resection of gangrenous segment with anastomosis done.', description: 'Resection anastomosis for volvulus.' },
  ],
  Splenectomy: [
    { diagnosis: 'Splenic injury, grade IV.', notes: 'Emergency splenectomy performed for hemostasis.', description: 'Splenectomy for traumatic splenic injury.' },
    { diagnosis: 'Hypersplenism.', notes: 'Elective splenectomy done for hypersplenism.', description: 'Splenectomy for hypersplenism.' },
  ],
  'Stapled hemorrhoidopexy': [
    { diagnosis: 'Grade III prolapsing hemorrhoids.', notes: 'Stapled hemorrhoidopexy (MIPH) performed.', description: 'Stapled hemorrhoidopexy for grade III piles.' },
    { diagnosis: 'Circumferential hemorrhoidal prolapse.', notes: 'PPH procedure done with circular stapler.', description: 'Stapled hemorrhoidopexy for circumferential piles.' },
    { diagnosis: 'Recurrent hemorrhoids after banding.', notes: 'Stapled hemorrhoidopexy performed as definitive treatment.', description: 'Stapled hemorrhoidopexy for recurrent piles.' },
    { diagnosis: 'Grade IV hemorrhoids, reducible.', notes: 'Stapled hemorrhoidopexy done with good hemostasis.', description: 'Stapled hemorrhoidopexy for grade IV piles.' },
    { diagnosis: 'Mucosal prolapse with hemorrhoids.', notes: 'MIPH performed addressing both prolapse and piles.', description: 'Stapled hemorrhoidopexy for mucosal prolapse.' },
  ],
  'Stoma closure (ileostomy & colostomy)': [
    { diagnosis: 'Loop ileostomy closure.', notes: 'Ileostomy closed with hand-sewn anastomosis.', description: 'Closure of loop ileostomy.' },
    { diagnosis: "Colostomy closure post-Hartmann's.", notes: 'Colostomy reversed with colorectal anastomosis.', description: "Closure of Hartmann's colostomy." },
    { diagnosis: 'Loop colostomy closure.', notes: 'Loop colostomy closed after confirming distal patency.', description: 'Closure of loop colostomy.' },
    { diagnosis: 'Ileostomy closure after resection.', notes: 'Stoma closed with side-to-side anastomosis.', description: 'Closure of ileostomy.' },
    { diagnosis: 'End colostomy closure.', notes: 'Colostomy closure performed with mobilization of stoma.', description: 'Closure of end colostomy.' },
  ],
  'Stoma creation (ileostomy & colostomy)': [
    { diagnosis: 'Rectal carcinoma requiring diversion.', notes: 'Defunctioning loop ileostomy created.', description: 'Ileostomy creation for diversion.' },
    { diagnosis: 'Perforated sigmoid diverticulitis.', notes: "Hartmann's procedure with end colostomy performed.", description: "Colostomy creation, Hartmann's procedure." },
    { diagnosis: 'Obstructed rectal carcinoma.', notes: 'Loop colostomy fashioned for decompression.', description: 'Colostomy creation for obstruction.' },
    { diagnosis: 'Anastomotic leak requiring diversion.', notes: 'Defunctioning ileostomy created proximal to leak.', description: 'Ileostomy creation for anastomotic leak.' },
    { diagnosis: 'Low rectal anastomosis protection.', notes: 'Covering loop ileostomy fashioned.', description: 'Ileostomy creation to protect anastomosis.' },
  ],
  'Triple bypass': [
    { diagnosis: 'Unresectable periampullary carcinoma.', notes: 'Triple bypass performed - gastrojejunostomy, hepaticojejunostomy, jejunojejunostomy.', description: 'Triple bypass for periampullary carcinoma.' },
    { diagnosis: 'Locally advanced pancreatic carcinoma.', notes: 'Palliative triple bypass done for gastric and biliary obstruction.', description: 'Triple bypass for pancreatic carcinoma.' },
    { diagnosis: 'Unresectable cholangiocarcinoma with duodenal obstruction.', notes: 'Triple bypass performed for combined obstruction.', description: 'Triple bypass for cholangiocarcinoma.' },
    { diagnosis: 'Metastatic pancreatic head mass.', notes: 'Palliative triple bypass done for symptom relief.', description: 'Triple bypass for metastatic pancreatic mass.' },
    { diagnosis: 'Advanced periampullary tumor, unfit for resection.', notes: 'Triple bypass performed as palliative procedure.', description: 'Palliative triple bypass.' },
  ],
  'Upper gastrointestinal endoscopy': [
    { diagnosis: 'Upper GI bleeding, hemodynamically stable.', notes: 'Endoscopic hemostasis achieved with adrenaline injection.', description: 'Therapeutic UGI endoscopy for bleeding.' },
    { diagnosis: 'Variceal bleeding.', notes: 'Endoscopic band ligation of esophageal varices performed.', description: 'UGI endoscopy with band ligation.' },
    { diagnosis: 'Foreign body ingestion.', notes: 'Endoscopic removal of foreign body done.', description: 'UGI endoscopy for foreign body removal.' },
    { diagnosis: 'Esophageal stricture.', notes: 'Endoscopic dilatation of esophageal stricture performed.', description: 'UGI endoscopy with dilatation.' },
    { diagnosis: 'Bleeding gastric ulcer.', notes: 'Endoscopic clipping of bleeding vessel done.', description: 'Therapeutic UGI endoscopy for gastric ulcer.' },
  ],
};

// ---------------------------------------------------------------------
// Fictional Bangladeshi patient name pool - same approach as the Basic
// Surgical Skill generator, disjoint seed so names don't collide across
// specialties.
// ---------------------------------------------------------------------
const MALE_FIRST = [
  'Md. Kamal', 'Abdul', 'Mohammad Arif', 'Md. Zahirul', 'Tanvir', 'Md. Nurul', 'Shahidul', 'Md. Rafiqul',
  'Golam', 'Md. Aminul', 'Habibur', 'Md. Shafiqul', 'Anisur', 'Md. Jahangir', 'Rezaul', 'Md. Mahbubur',
  'Faridul', 'Md. Ekram', 'Shamsul', 'Md. Nazrul', 'Md. Delwar', 'Aminul', 'Md. Moshiur', 'Kamruzzaman',
];
const FEMALE_FIRST = [
  'Rahima', 'Nasrin', 'Farzana', 'Salma', 'Sharmin', 'Rokeya', 'Shirin', 'Nasima', 'Marufa', 'Taslima',
  'Rehana', 'Shahnaz', 'Fatema', 'Rubina', 'Momena', 'Shahana', 'Rashida', 'Parveen', 'Halima', 'Aleya',
  'Kohinoor', 'Mahmuda', 'Ferdousi', 'Jesmin',
];
const SURNAMES = [
  'Hossain', 'Begum', 'Karim', 'Akter', 'Hasan', 'Yasmin', 'Islam', 'Khatun', 'Ahmed', 'Sultana',
  'Rahman', 'Chowdhury', 'Alam', 'Miah', 'Uddin', 'Khan', 'Talukder', 'Sarkar', 'Molla', 'Bhuiyan',
  'Sheikh', 'Mridha', 'Pramanik', 'Biswas',
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

function buildUniqueNamePool(count: number, seed: number): string[] {
  const names = new Set<string>();
  const firsts = shuffle([...MALE_FIRST, ...FEMALE_FIRST], seed);
  const surnames = shuffle(SURNAMES, seed + 57);
  let i = 0;
  while (names.size < count) {
    const first = firsts[i % firsts.length];
    const surname = surnames[Math.floor(i / firsts.length) % surnames.length];
    names.add(`${first} ${surname}`);
    i++;
    if (i > count * 6) break;
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
    const part1 = 1000 + Math.floor(rand() * 9000);
    const part2 = Math.floor(rand() * 100);
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

function computeVerifiedDob(assignmentDate: string, targetAge: number, seed: number): { dob: string; verifiedAge: number } {
  const assign = new Date(assignmentDate + 'T00:00:00Z');
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const birthYear = assign.getUTCFullYear() - targetAge;
  const assignMonth = assign.getUTCMonth();
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

interface SkillLevelCount {
  level: string | null;
  count: number;
}
interface SkillDef {
  name: string;
  levels: SkillLevelCount[];
}
interface Config {
  skills: { 'Interpretative Skill': SkillDef[]; 'Procedural skill': SkillDef[] };
}

interface GeneratedRow {
  externalRowId: string;
  skillType: 'Interpretative Skill' | 'Procedural skill';
  competencyItem: string;
  competenceLevel: string | null;
  patientName: string;
  patientRegNo: string;
  dateOfAssignment: string;
  dateOfBirth: string;
  age: number;
  diagnosis: string;
  notes: string; // Interpretations (Interpretative) / Brief Procedural Notes (Procedural)
  description: string;
}

function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function generateRows(config: Config, namePool: string[], regNoPool: string[]): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  let globalIndex = 0;

  const process = (skillType: 'Interpretative Skill' | 'Procedural skill', scenarios: Record<string, Scenario[]>) => {
    for (const skill of config.skills[skillType]) {
      const bank = scenarios[skill.name];
      if (!bank) throw new Error(`No clinical content scenarios authored for "${skill.name}" (${skillType}). Refusing to fabricate generic content.`);
      let scenarioCursor = 0;
      for (const levelDef of skill.levels) {
        const dates = buildAssignmentDates(levelDef.count, 2000 + globalIndex);
        for (let i = 0; i < levelDef.count; i++) {
          if (scenarioCursor >= bank.length) throw new Error(`Not enough authored scenarios for "${skill.name}" - need ${skill.levels.reduce((s, l) => s + l.count, 0)}, have ${bank.length}.`);
          const scenario = bank[scenarioCursor];
          scenarioCursor++;
          const targetAge = 18 + Math.floor(((80 - 18) * ((globalIndex % 23) / 23)));
          const { dob, verifiedAge } = computeVerifiedDob(dates[i], targetAge, 6000 + globalIndex);
          let finalDob = dob;
          let finalAge = verifiedAge;
          if (verifiedAge !== targetAge) {
            let fixed = computeVerifiedDob(dates[i], targetAge, 7000 + globalIndex);
            let attempts = 0;
            while (fixed.verifiedAge !== targetAge && attempts < 20) {
              fixed = computeVerifiedDob(dates[i], targetAge, 8000 + globalIndex + attempts);
              attempts++;
            }
            if (fixed.verifiedAge !== targetAge) {
              throw new Error(`Could not generate a matching DOB/Age pair for row ${globalIndex} (target age ${targetAge}, date ${dates[i]}).`);
            }
            finalDob = fixed.dob;
            finalAge = fixed.verifiedAge;
          }

          rows.push({
            externalRowId: `GHP-${(globalIndex + 1).toString().padStart(3, '0')}`,
            skillType,
            competencyItem: skill.name,
            competenceLevel: levelDef.level,
            patientName: namePool[globalIndex],
            patientRegNo: regNoPool[globalIndex],
            dateOfAssignment: dates[i],
            dateOfBirth: finalDob,
            age: finalAge,
            diagnosis: scenario.diagnosis,
            notes: scenario.notes,
            description: scenario.description,
          });
          globalIndex++;
        }
      }
    }
  };

  process('Interpretative Skill', INTERPRETATIVE_SCENARIOS);
  process('Procedural skill', PROCEDURAL_SCENARIOS);

  return rows;
}

async function createDatasetWorkbook(): Promise<void> {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  if (fs.existsSync(DATASET_XLSX_PATH)) {
    throw new Error(`Refusing to overwrite existing workbook: ${DATASET_XLSX_PATH}. Inspect it first or use a new date-range folder.`);
  }
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
    let extraFields: Record<string, string>;
    let competencyChecked = '';

    if (r.skillType === 'Interpretative Skill') {
      // Interpretative Skill leaf fields: Indication/Investigation/Findings/Diagnosis (required),
      // Interpretations (required), Brief Description (optional). No competency checklist on this leaf.
      extraFields = {
        'Indication/Investigation/Findings/Diagnosis': r.diagnosis,
        Interpretations: r.notes,
        'Brief Description': r.description,
      };
    } else {
      // Procedural skill leaf fields: Diagnosis/Problems (optional), Brief Procedural Notes (required),
      // Brief Description (optional), plus the competency checklist.
      extraFields = {
        'Diagnosis/Problems': r.diagnosis,
        'Brief Procedural Notes': r.notes,
        'Brief Description': r.description,
      };
      competencyChecked = r.competencyItem;
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
    values[col.competencyItems] = competencyChecked;
    values[col.extraFieldsJson] = JSON.stringify(extraFields);
    ws.addRow(values);
  }

  await wb.xlsx.writeFile(DATASET_XLSX_PATH);
}

async function main() {
  logger.info('Generating Gastrointestinal & HepatoBiliary System and Pancreas dataset (PORTAL-AUTHORITATIVE quota, dry-run only).');

  const realWorkbookStatBefore = fs.statSync(REAL_XLSX_PATH);
  const basicSurgicalDir = path.join(PROJECT_ROOT, 'generated-data', 'Basic-Surgical-Skill');
  const basicSurgicalFilesBefore = fs.readdirSync(basicSurgicalDir).sort();

  const config = loadConfig();
  const formMap = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'form-map.json'), 'utf-8'));
  const leaves: LeafForValidation[] = formMap.leaves.map((l: any) => ({
    leafId: l.leafId,
    pathLabels: l.pathLabels,
    fields: l.fields ?? [],
    competencyGroup: l.competencyGroup ?? [],
  }));

  // Verify every configured skill genuinely exists in the mapped data before generating anything for it.
  const unmatched: { skillType: string; name: string }[] = [];
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    const leaf = leaves.find((l) => l.pathLabels.join(' > ') === `${FORM_LABEL} > ${CASE_TYPE_LABEL} > ${skillType}`);
    for (const skill of config.skills[skillType]) {
      const exists = leaf?.competencyGroup.some((c) => c.particulars.trim() === skill.name.trim());
      if (!exists) unmatched.push({ skillType, name: skill.name });
    }
  }
  if (unmatched.length > 0) {
    logger.error(`Unmatched skills - refusing to guess: ${JSON.stringify(unmatched)}`);
    process.exit(1);
  }
  logger.info('All 41 configured skills matched exactly to the mapped portal data.');

  const totalRowsPlanned =
    config.skills['Interpretative Skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0) +
    config.skills['Procedural skill'].reduce((s, sk) => s + sk.levels.reduce((a, l) => a + l.count, 0), 0);
  logger.info(`Total rows planned (portal-authoritative quota): ${totalRowsPlanned}`);

  const namePool = buildUniqueNamePool(totalRowsPlanned, 4242);
  const regNoPool = buildUniqueRegNos(totalRowsPlanned, 8181);
  if (namePool.length < totalRowsPlanned) throw new Error(`Name pool only produced ${namePool.length} unique names, need ${totalRowsPlanned}.`);

  const rows = generateRows(config, namePool, regNoPool);
  logger.info(`Generated ${rows.length} rows.`);

  const ageErrors: string[] = [];
  for (const r of rows) {
    const recomputed = calculateAge(r.dateOfBirth, r.dateOfAssignment);
    if (recomputed !== r.age) ageErrors.push(`${r.externalRowId}: DOB=${r.dateOfBirth}, AssignDate=${r.dateOfAssignment}, stored=${r.age}, recomputed=${recomputed}`);
  }
  if (ageErrors.length > 0) {
    logger.error(`DOB/Age verification FAILED for ${ageErrors.length} row(s):`);
    ageErrors.forEach((e) => logger.error(`  ${e}`));
    process.exit(1);
  }
  logger.info('DOB/Age verification passed for all rows.');

  const nameSet = new Set(rows.map((r) => r.patientName));
  const regNoSet = new Set(rows.map((r) => r.patientRegNo));
  const rowIdSet = new Set(rows.map((r) => r.externalRowId));
  if (nameSet.size !== rows.length) throw new Error(`Duplicate patient names detected: ${rows.length - nameSet.size} collision(s).`);
  if (regNoSet.size !== rows.length) throw new Error(`Duplicate registration numbers detected: ${rows.length - regNoSet.size} collision(s).`);
  if (rowIdSet.size !== rows.length) throw new Error(`Duplicate ExternalRowIds detected: ${rows.length - rowIdSet.size} collision(s).`);
  for (const r of rows) {
    const d = new Date(r.dateOfAssignment + 'T00:00:00Z');
    if (d < new Date('2026-01-01T00:00:00Z') || d > new Date('2026-06-30T00:00:00Z')) throw new Error(`Row ${r.externalRowId} has an out-of-range assignment date: ${r.dateOfAssignment}`);
  }
  logger.info('Uniqueness (names, reg numbers, ExternalRowIds) and date-range verification passed for all rows.');

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

  // ---- Reports ----
  const perSkillCounts: Record<string, { requested: number; actual: number }> = {};
  for (const skillType of ['Interpretative Skill', 'Procedural skill'] as const) {
    for (const skill of config.skills[skillType]) {
      const requested = skill.levels.reduce((s, l) => s + l.count, 0);
      const actual = rows.filter((r) => r.skillType === skillType && r.competencyItem === skill.name).length;
      perSkillCounts[`${skillType} > ${skill.name}`] = { requested, actual };
    }
  }
  const perLevelCounts: { skillType: string; skill: string; level: string | null; requested: number; actual: number }[] = [];
  for (const skill of config.skills['Procedural skill']) {
    for (const levelDef of skill.levels) {
      const actual = rows.filter((r) => r.skillType === 'Procedural skill' && r.competencyItem === skill.name && r.competenceLevel === levelDef.level).length;
      perLevelCounts.push({ skillType: 'Procedural skill', skill: skill.name, level: levelDef.level, requested: levelDef.count, actual });
    }
  }

  const interpTotal = rows.filter((r) => r.skillType === 'Interpretative Skill').length;
  const procTotal = rows.filter((r) => r.skillType === 'Procedural skill').length;

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'row-count-summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalRows: rows.length,
        interpretativeTotal: interpTotal,
        proceduralTotal: procTotal,
        perSkill: perSkillCounts,
        perCompetenceLevel: perLevelCounts,
      },
      null,
      2
    ),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'quota-comparison-report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        decision: 'PORTAL_AUTHORITATIVE - explicit user override for this dataset',
        sourceDocumentTotal: { interpretative: 36, procedural: 77, grandTotal: 113 },
        portalAuthoritativeTotal: { interpretative: 69, procedural: 131, grandTotal: 200 },
        usedForGeneration: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
        verificationMethod: "Portal's own server-computed total_min_target field from GET /api/auth/elogbook-management/v1/logbook-entry-report-by-from/{formId} (read-only, 2026-09-09)",
        note: 'Source-document counts are preserved here for the record and were NOT used for this dataset\'s row generation, per explicit user instruction.',
      },
      null,
      2
    ),
    'utf-8'
  );

  const dryRunReport = {
    generatedAt: new Date().toISOString(),
    datasetWorkbook: DATASET_XLSX_PATH,
    totalRows: draftRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    rows: validationResults.map(({ row, result }) => ({ externalRowId: row.externalRowId, valid: result.valid, errors: result.errors })),
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'dry-run-validation-report.json'), JSON.stringify(dryRunReport, null, 2), 'utf-8');

  const validationErrorReport = {
    generatedAt: new Date().toISOString(),
    totalErrors: validationResults.reduce((sum, v) => sum + v.result.errors.length, 0),
    errorsByRow: validationResults.filter((v) => !v.result.valid).map((v) => ({ externalRowId: v.row.externalRowId, errors: v.result.errors })),
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'validation-error-report.json'), JSON.stringify(validationErrorReport, null, 2), 'utf-8');

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'mapping-match-report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), totalSkillsRequested: 41, totalSkillsMatched: 41, unmatchedSkills: unmatched }, null, 2),
    'utf-8'
  );

  const realWorkbookStatAfter = fs.statSync(REAL_XLSX_PATH);
  const originalWorkbookUnchanged = realWorkbookStatBefore.size === realWorkbookStatAfter.size && realWorkbookStatBefore.mtimeMs === realWorkbookStatAfter.mtimeMs;
  const basicSurgicalFilesAfter = fs.readdirSync(basicSurgicalDir).sort();
  const basicSurgicalUnchanged = JSON.stringify(basicSurgicalFilesBefore) === JSON.stringify(basicSurgicalFilesAfter);

  const generationSummary = {
    generatedAt: new Date().toISOString(),
    specialty: 'Gastrointestinal & HepatoBiliary System and Pancreas',
    dateRange: { label: DATE_RANGE_LABEL, from: '2026-01-01', to: '2026-06-30' },
    datasetWorkbook: DATASET_XLSX_PATH,
    quotaDecision: {
      sourceDocumentTotal: 113,
      portalAuthoritativeTotal: 200,
      used: 'portalAuthoritative',
      reason: "User explicitly instructed to use the live portal's server-computed total_min_target (69 Interpretative + 131 Procedural = 200) for this dataset, overriding the source-document total of 113. Both totals are preserved in quota-comparison-report.json.",
    },
    totals: { interpretative: interpTotal, procedural: procTotal, grandTotal: rows.length },
    skillsGenerated: Object.entries(perSkillCounts).map(([k, v]) => ({ skill: k, requested: v.requested, actual: v.actual, matches: v.requested === v.actual })),
    unmatchedSkills: unmatched,
    liveActionsTaken: 'NONE - no login, no browser session, no draft created, no Save as Draft, no Final Submit.',
    originalMappingWorkbookUnchanged: originalWorkbookUnchanged,
    basicSurgicalSkillDatasetUnchanged: basicSurgicalUnchanged,
    reviewStatus: 'PENDING MANUAL REVIEW',
    uploadStatus: 'NOT UPLOADED',
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'generation-summary.json'), JSON.stringify(generationSummary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(REPORTS_DIR, 'generated-rows-raw.json'), JSON.stringify(rows, null, 2), 'utf-8');

  logger.info(`Wrote all report files to ${REPORTS_DIR}`);
  logger.info(`originalMappingWorkbookUnchanged=${originalWorkbookUnchanged}, basicSurgicalSkillDatasetUnchanged=${basicSurgicalUnchanged}`);
  logger.info('STOPPED after dry-run validation, as instructed. No login, no browser, no draft was created.');
}

main().catch((err) => {
  logger.error(`generate-gi-hepatobiliary-pancreas-dataset crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
