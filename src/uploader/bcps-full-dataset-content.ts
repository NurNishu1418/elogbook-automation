/**
 * Freshly-authored clinical content templates for the complete 19-specialty
 * TEST_ONLY dataset. Skill names/allowed-levels/PDF-minimum-counts are
 * drawn directly from the authoritative BCPS PDFs (F:\2026\touhid\Type Of
 * Case), cross-verified against output/form-map.json this same session -
 * NOT from old generated examples. Clinical wording here is newly authored
 * for this task (not copy-pasted from prior specialty datasets), though it
 * necessarily reflects the same real-world disease-to-procedure
 * relationships documented throughout this project.
 */

export interface InterpTemplate {
  indication: string;
  interpretation: string;
  description: string;
}
export interface ProcTemplate {
  diagnosis: string;
  notes: string;
  description: string;
}
export interface CommTemplate {
  diagnosis: string;
  notes: string;
  description: string;
}

export interface SkillEntry<T> {
  min: number;
  levels?: string[];
  templates: T[]; // cycled if min > templates.length
}

export interface SpecialtyContent {
  caseType: string;
  interpretative?: Record<string, SkillEntry<InterpTemplate>>;
  procedural?: Record<string, SkillEntry<ProcTemplate>>;
  communication?: Record<string, SkillEntry<CommTemplate>>;
}

export const CONTENT: SpecialtyContent[] = [
  {
    caseType: 'Vascular Surgery',
    interpretative: {
      'Angiogram/CT angiogram': { min: 3, templates: [
        { indication: 'Suspected peripheral arterial occlusion of the right lower limb.', interpretation: 'CT angiogram shows a discrete occlusion of the superficial femoral artery with distal reformation via collaterals.', description: 'CT angiogram for suspected peripheral arterial occlusion.' },
        { indication: 'Peripheral arterial disease evaluation prior to revascularization.', interpretation: 'Angiogram shows multi-segment atherosclerotic narrowing of the femoro-popliteal segment with a patent distal run-off.', description: 'Angiogram for peripheral arterial disease evaluation.' },
        { indication: 'Suspected infrarenal abdominal aortic aneurysm.', interpretation: 'CT angiogram shows a fusiform infrarenal aortic dilatation with mural thrombus.', description: 'CT angiogram for suspected abdominal aortic aneurysm.' },
      ]},
      'Color Doppler / Duplex imaging /MRA / MRV / DSA': { min: 5, templates: [
        { indication: 'Suspected deep vein thrombosis of the left lower limb.', interpretation: 'Colour Doppler shows a non-compressible thrombus within the left femoral vein with absent flow augmentation.', description: 'Duplex study for suspected deep vein thrombosis.' },
        { indication: 'Lower-limb arterial insufficiency assessment.', interpretation: 'Duplex imaging shows monophasic waveform conversion across the popliteal segment, consistent with proximal arterial insufficiency.', description: 'Duplex study for lower-limb arterial insufficiency.' },
        { indication: 'Symptomatic carotid artery stenosis evaluation.', interpretation: 'Carotid duplex/MRA shows a high-grade stenosis at the internal carotid artery origin with turbulent flow.', description: 'Duplex/MRA for carotid artery stenosis evaluation.' },
        { indication: 'Chronic venous insufficiency with varicose veins.', interpretation: 'Colour Doppler shows reflux exceeding 1 second at the sapheno-femoral junction with incompetent long saphenous vein.', description: 'Duplex study for varicose vein evaluation.' },
        { indication: 'Pre-operative vessel mapping before arteriovenous fistula creation.', interpretation: 'Doppler mapping shows an adequate-calibre cephalic vein and patent radial artery suitable for fistula formation.', description: 'Doppler vessel mapping before AV fistula creation.' },
      ]},
    },
    procedural: {
      'Arterial thrombo-embolectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Acute limb ischemia of the right lower limb due to arterial embolism.', notes: 'Arterial thrombo-embolectomy performed via a femoral arteriotomy using a Fogarty balloon catheter with restoration of distal pulses.', description: 'Arterial thrombo-embolectomy for acute limb ischemia.' },
      ]},
      'Carotid end arterectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Symptomatic high-grade carotid artery stenosis.', notes: 'Carotid endarterectomy performed with removal of the atheromatous plaque and patch closure of the arteriotomy.', description: 'Carotid endarterectomy for symptomatic carotid stenosis.' },
      ]},
      'Ligation and excision of hemangioma and aneurysm': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Popliteal artery aneurysm.', notes: 'Ligation and excision of the popliteal artery aneurysm performed with restoration of continuity by an interposition graft.', description: 'Ligation and excision of popliteal artery aneurysm.' },
      ]},
      'Use of vascular grafts': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Occlusive peripheral vascular disease of the lower limb requiring arterial reconstruction.', notes: 'Femoro-popliteal bypass performed using a prosthetic vascular graft with confirmation of good distal flow.', description: 'Use of vascular graft for arterial reconstruction.' },
      ]},
      'Vascular repair': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Traumatic vascular injury of the upper limb following a road traffic accident.', notes: 'Vascular repair performed with primary end-to-end anastomosis of the injured artery and confirmation of distal perfusion.', description: 'Vascular repair for traumatic vascular injury.' },
      ]},
    },
  },
  {
    caseType: 'Minimally Invasive Surgery – Laparoscopic procedures',
    interpretative: {
      'Plain X-ray Abdomen': { min: 3, templates: [
        { indication: 'Suspected bowel obstruction prior to planned laparoscopic assessment.', interpretation: 'Plain X-ray abdomen shows dilated small bowel loops with air-fluid levels.', description: 'Plain X-ray abdomen for suspected bowel obstruction.' },
        { indication: 'Post-laparoscopic surgery review for suspected ileus.', interpretation: 'Plain X-ray abdomen shows non-specific bowel gas pattern without free air.', description: 'Plain X-ray abdomen for post-operative review.' },
        { indication: 'Suspected perforation prior to laparoscopic exploration.', interpretation: 'Erect film shows free sub-diaphragmatic air consistent with perforation.', description: 'Plain X-ray abdomen for suspected perforation.' },
      ]},
      'USG /CT abdomen': { min: 3, templates: [
        { indication: 'Suspected acute cholecystitis prior to laparoscopic cholecystectomy.', interpretation: 'USG abdomen shows a distended gallbladder with wall thickening and multiple calculi.', description: 'USG abdomen for suspected acute cholecystitis.' },
        { indication: 'Suspected appendicitis being considered for laparoscopic appendicectomy.', interpretation: 'CT abdomen shows a dilated, non-compressible appendix with peri-appendiceal fat stranding.', description: 'CT abdomen for suspected appendicitis.' },
        { indication: 'Symptomatic ventral hernia being planned for laparoscopic repair.', interpretation: 'CT abdomen shows an anterior abdominal wall fascial defect with fat herniation.', description: 'CT abdomen for symptomatic ventral hernia planning.' },
      ]},
    },
    procedural: {
      'Closed and open techniques for port creation and closure': { min: 5, levels: ['2','3'], templates: [
        { diagnosis: 'Symptomatic cholelithiasis planned for laparoscopic cholecystectomy.', notes: 'Pneumoperitoneum established and ports created using the closed Veress needle technique, with secure fascial closure at the end of the procedure.', description: 'Port creation and closure for laparoscopic cholecystectomy.' },
      ]},
      'Diagnostic laparoscopy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Chronic pelvic pain of uncertain surgical cause.', notes: 'Diagnostic laparoscopy performed with systematic inspection of the peritoneal cavity and pelvic organs.', description: 'Diagnostic laparoscopy for chronic pelvic pain.' },
      ]},
      'Laparoscopic appendicectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Acute appendicitis.', notes: 'Laparoscopic appendicectomy performed with mesoappendix division and endoloop ligation of the appendiceal base.', description: 'Laparoscopic appendicectomy for acute appendicitis.' },
      ]},
      'Laparoscopic cholecystectomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Symptomatic gallstone disease.', notes: 'Laparoscopic cholecystectomy performed with critical-view-of-safety dissection, clipping and division of the cystic duct and artery.', description: 'Laparoscopic cholecystectomy for symptomatic gallstones.' },
      ]},
      'Laparoscopic control of bleeding': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Intra-operative bleeding from the gallbladder bed during laparoscopic cholecystectomy.', notes: 'Bleeding point identified laparoscopically and controlled with targeted diathermy and pressure.', description: 'Laparoscopic control of bleeding during cholecystectomy.' },
      ]},
      'Laparoscopic hernioplasty (TAPP & TEP)': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Symptomatic inguinal hernia.', notes: 'Laparoscopic TEP hernioplasty performed with reduction of the hernial sac and mesh placement over the myopectineal orifice.', description: 'Laparoscopic TEP repair of inguinal hernia.' },
      ]},
      'Laparoscopic suturing and knotting': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Iatrogenic bowel serosal injury identified during laparoscopic surgery.', notes: 'Laparoscopic intracorporeal suturing and knot-tying performed to repair the serosal defect.', description: 'Laparoscopic suturing and knotting for serosal repair.' },
      ]},
    },
  },
  {
    caseType: 'Orthopaedic Surgery',
    interpretative: {
      'CT-scan': { min: 3, templates: [
        { indication: 'Complex intra-articular fracture requiring detailed pre-operative planning.', interpretation: 'CT scan shows a comminuted intra-articular fracture with displaced fragments.', description: 'CT scan for pre-operative fracture planning.' },
        { indication: 'Suspected occult fracture not seen on plain film.', interpretation: 'CT scan confirms a non-displaced fracture line not visible on plain radiographs.', description: 'CT scan for suspected occult fracture.' },
        { indication: 'Suspected spinal fracture following trauma.', interpretation: 'CT scan shows a compression fracture of the vertebral body without canal compromise.', description: 'CT scan for suspected spinal fracture.' },
      ]},
      'Histopathological report analysis': { min: 3, templates: [
        { indication: 'Bone lesion sampled during curettage requiring histological confirmation.', interpretation: 'Histopathology confirms a benign giant cell lesion of bone.', description: 'Histopathological analysis of a bone lesion.' },
        { indication: 'Soft tissue mass excised during orthopaedic surgery.', interpretation: 'Histopathology confirms a benign lipomatous soft tissue tumour.', description: 'Histopathological analysis of a soft tissue mass.' },
        { indication: 'Synovial tissue sampled during joint surgery.', interpretation: 'Histopathology shows chronic synovitis consistent with the clinical picture.', description: 'Histopathological analysis of synovial tissue.' },
      ]},
      'Local X-ray': { min: 5, templates: [
        { indication: 'Suspected fracture of the distal radius following a fall.', interpretation: 'Local X-ray shows a displaced distal radius fracture.', description: 'Local X-ray for suspected wrist fracture.' },
        { indication: 'Suspected ankle fracture following an inversion injury.', interpretation: 'Local X-ray shows a lateral malleolar fracture.', description: 'Local X-ray for suspected ankle fracture.' },
        { indication: 'Suspected femoral shaft fracture following trauma.', interpretation: 'Local X-ray confirms a transverse mid-shaft femoral fracture.', description: 'Local X-ray for suspected femoral fracture.' },
        { indication: 'Post-reduction check of a dislocated shoulder.', interpretation: 'Local X-ray confirms satisfactory reduction of the glenohumeral joint.', description: 'Local X-ray for post-reduction check.' },
        { indication: 'Follow-up of a healing tibial fracture.', interpretation: 'Local X-ray shows progressive callus formation at the fracture site.', description: 'Local X-ray for fracture healing follow-up.' },
      ]},
      'MRI': { min: 3, templates: [
        { indication: 'Suspected meniscal tear of the knee.', interpretation: 'MRI shows a horizontal tear of the medial meniscus.', description: 'MRI for suspected meniscal injury.' },
        { indication: 'Suspected rotator cuff tear of the shoulder.', interpretation: 'MRI shows a full-thickness supraspinatus tear.', description: 'MRI for suspected rotator cuff tear.' },
        { indication: 'Suspected avascular necrosis of the femoral head.', interpretation: 'MRI shows early avascular necrosis changes of the femoral head.', description: 'MRI for suspected avascular necrosis.' },
      ]},
      'Radionuclide scan': { min: 1, templates: [
        { indication: 'Suspected chronic osteomyelitis of the tibia.', interpretation: 'Bone scan shows increased tracer uptake at the site of suspected infection.', description: 'Radionuclide bone scan for suspected osteomyelitis.' },
      ]},
    },
    procedural: {
      'Amputation': { min: 2, levels: ['1','2','3'], templates: [
        { diagnosis: 'Gangrenous diabetic foot with non-salvageable tissue.', notes: 'Below-knee amputation performed with fashioning of myocutaneous flaps and secure haemostasis.', description: 'Below-knee amputation for gangrenous diabetic foot.' },
        { diagnosis: 'Severely mangled lower limb following trauma, unsalvageable.', notes: 'Above-knee amputation performed with ligation of major vessels and myodesis.', description: 'Above-knee amputation for mangled limb trauma.' },
      ]},
      'Application of splint/cast': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Undisplaced distal radius fracture managed conservatively.', notes: 'Below-elbow cast applied after satisfactory positioning, with padding over bony prominences.', description: 'Cast application for undisplaced wrist fracture.' },
      ]},
      'Arthroscopic examination': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Suspected meniscal tear of the knee.', notes: 'Diagnostic knee arthroscopy performed with systematic examination confirming a medial meniscal tear.', description: 'Arthroscopic examination for suspected meniscal tear.' },
      ]},
      'Curettage & bone grafting': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Benign bone cyst of the proximal tibia.', notes: 'Curettage of the cystic cavity performed followed by bone grafting to fill the defect.', description: 'Curettage and bone grafting for benign bone cyst.' },
      ]},
      'External fixation': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Open tibial fracture requiring damage-control stabilization.', notes: 'External fixator applied across the fracture with pins placed under image guidance for stable alignment.', description: 'External fixation for open tibial fracture.' },
      ]},
      'ORIF': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Displaced ankle fracture requiring surgical fixation.', notes: 'Open reduction and internal fixation performed with anatomical plate and screw fixation of the fracture.', description: 'ORIF of displaced ankle fracture.' },
      ]},
      'Reduction immobilisation of fractures and dislocations': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Anterior shoulder dislocation.', notes: 'Closed reduction of the shoulder performed under sedation followed by immobilisation in a sling.', description: 'Reduction and immobilisation of shoulder dislocation.' },
      ]},
      'Tendon repair': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Lacerated flexor tendon of the hand following a sharp injury.', notes: 'Primary tendon repair performed using core sutures and epitendinous reinforcement.', description: 'Repair of lacerated flexor tendon.' },
      ]},
    },
  },
  {
    caseType: 'Skin and Subcutaneous Tissue',
    interpretative: {
      'Histopathological analysis': { min: 3, templates: [
        { indication: 'Excised skin lesion of uncertain nature requiring histological diagnosis.', interpretation: 'Histopathology confirms a benign epidermal cyst with no atypia.', description: 'Histopathological analysis of an excised skin lesion.' },
      ]},
      'Wound swab for C/S': { min: 3, templates: [
        { indication: 'Infected chronic wound with purulent discharge.', interpretation: 'Wound swab culture grows Staphylococcus aureus sensitive to the empirical antibiotic.', description: 'Wound swab culture and sensitivity for infected wound.' },
      ]},
    },
    procedural: {
      'Drainage of superficial abscess': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Superficial soft tissue abscess of the back.', notes: 'Abscess incised and drained with breaking of loculi and thorough irrigation of the cavity.', description: 'Incision and drainage of superficial abscess.' },
      ]},
      'Excision biopsy of SCC / BCC / Melanoma': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Suspicious pigmented skin lesion concerning for malignancy.', notes: 'Excision biopsy performed with adequate margins and specimen sent for histopathological confirmation.', description: 'Excision biopsy of a suspicious skin lesion.' },
      ]},
      'Excision of carbuncle': { min: 1, levels: ['3','4'], templates: [
        { diagnosis: 'Carbuncle of the nape of the neck.', notes: 'Cruciate excision of the carbuncle performed with debridement of necrotic tissue and dressing of the wound.', description: 'Excision of carbuncle.' },
      ]},
      'Fasciotomy': { min: 1, levels: ['3','4'], templates: [
        { diagnosis: 'Compartment syndrome of the leg following trauma.', notes: 'Emergency fasciotomy performed with decompression of all affected compartments.', description: 'Fasciotomy for compartment syndrome.' },
      ]},
      'Flap closure': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Large soft tissue defect following excision of a skin lesion.', notes: 'Local flap raised and closure achieved with tension-free approximation.', description: 'Flap closure of a soft tissue defect.' },
      ]},
      'Lymph node biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Persistently enlarged cervical lymph node of uncertain cause.', notes: 'Excision biopsy of the lymph node performed and specimen sent for histopathology.', description: 'Lymph node biopsy.' },
      ]},
      'Management of foreign bodies': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Retained foreign body in the subcutaneous tissue of the foot.', notes: 'Foreign body localized and removed through a small incision with wound irrigation.', description: 'Removal of subcutaneous foreign body.' },
      ]},
      'Nail avulsion / Wedge resection': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Ingrown toenail with recurrent infection.', notes: 'Partial nail avulsion with wedge resection of the nail bed performed under digital block.', description: 'Nail avulsion for ingrown toenail.' },
      ]},
      'Skin grafting (partial thickness and full thickness)': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Chronic non-healing wound of the leg with a healthy granulating bed.', notes: 'Split-thickness skin graft harvested and applied to the wound with secure dressing.', description: 'Skin grafting of a chronic wound.' },
      ]},
      'Wound debridement': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Necrotic diabetic foot wound.', notes: 'Surgical debridement performed with removal of all non-viable tissue until healthy bleeding margins were reached.', description: 'Wound debridement of a diabetic foot ulcer.' },
      ]},
    },
  },
  {
    caseType: 'Disorders of the Breast',
    interpretative: {
      'Cytological analysis of nipple discharge': { min: 1, templates: [
        { indication: 'Spontaneous unilateral nipple discharge.', interpretation: 'Cytology of the nipple discharge shows benign ductal epithelial cells, no malignant cells identified.', description: 'Cytological analysis of nipple discharge.' },
      ]},
      'FNAC of breast lump': { min: 3, templates: [
        { indication: 'Palpable breast lump requiring cytological evaluation.', interpretation: 'FNAC shows features consistent with a fibroadenoma.', description: 'FNAC of a breast lump.' },
      ]},
      'Histopathological report analysis': { min: 3, templates: [
        { indication: 'Breast lump excised requiring definitive histological diagnosis.', interpretation: 'Histopathology confirms a benign fibroadenoma with clear margins.', description: 'Histopathological analysis of an excised breast lump.' },
      ]},
      'Hormone study': { min: 5, templates: [
        { indication: 'Confirmed breast carcinoma requiring receptor status for treatment planning.', interpretation: 'Hormone receptor study shows estrogen and progesterone receptor positivity.', description: 'Hormone study for breast carcinoma.' },
      ]},
      'Immunohistochemistry': { min: 3, templates: [
        { indication: 'Breast carcinoma specimen requiring HER2 status.', interpretation: 'Immunohistochemistry shows HER2 negativity with strong ER positivity.', description: 'Immunohistochemistry of a breast carcinoma specimen.' },
      ]},
      'MRI / CT scan / Bone scan in locally advanced or metastatic breast cancer': { min: 3, templates: [
        { indication: 'Locally advanced breast cancer requiring staging.', interpretation: 'CT scan shows no evidence of distant metastatic disease.', description: 'Staging imaging for locally advanced breast cancer.' },
      ]},
      'Mammogram/tomosynthesis': { min: 3, templates: [
        { indication: 'Screening evaluation of a palpable breast lump.', interpretation: 'Mammogram shows a well-circumscribed benign-appearing mass, BI-RADS 3.', description: 'Mammogram for a palpable breast lump.' },
      ]},
      'Receptor study': { min: 3, templates: [
        { indication: 'Confirmed breast carcinoma requiring hormone receptor profiling.', interpretation: 'Receptor study confirms ER/PR positivity, HER2 negative.', description: 'Receptor study of breast carcinoma.' },
      ]},
      'USG of breasts': { min: 3, templates: [
        { indication: 'Palpable breast lump in a young patient.', interpretation: 'USG shows a well-defined hypoechoic solid mass consistent with a fibroadenoma.', description: 'USG of the breast for a palpable lump.' },
      ]},
    },
    procedural: {
      'Aspiration of breast abscess': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Lactational breast abscess.', notes: 'Ultrasound-guided needle aspiration of the abscess performed with evacuation of purulent material.', description: 'Aspiration of a lactational breast abscess.' },
      ]},
      'Breast conserving surgery': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Early-stage breast carcinoma suitable for conservation.', notes: 'Wide local excision performed with oncoplastic closure achieving clear margins.', description: 'Breast conserving surgery for early breast carcinoma.' },
      ]},
      'Breast reconstruction': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Post-mastectomy defect requiring reconstruction.', notes: 'Immediate breast reconstruction performed using a latissimus dorsi flap.', description: 'Breast reconstruction following mastectomy.' },
      ]},
      'Core-cut biopsy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Suspicious breast lump requiring tissue diagnosis.', notes: 'Core-cut biopsy performed under local anaesthesia with adequate tissue obtained.', description: 'Core-cut biopsy of a breast lump.' },
      ]},
      'Drainage of breast abscess': { min: 3, levels: ['2','3','4'], templates: [
        { diagnosis: 'Lactational breast abscess unresponsive to aspiration.', notes: 'Incision and drainage of the breast abscess performed with breaking of loculi and drain placement.', description: 'Drainage of a breast abscess.' },
      ]},
      'Enucleation/excision of fibroadenoma': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Symptomatic breast fibroadenoma.', notes: 'Enucleation of the fibroadenoma performed through a circumareolar incision.', description: 'Excision of a breast fibroadenoma.' },
      ]},
      'FNAC of a breast lump': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Palpable breast lump requiring cytological evaluation.', notes: 'FNAC performed with adequate cellular yield obtained for cytological assessment.', description: 'FNAC of a breast lump.' },
      ]},
      'Image guided biopsy / Wire guided biopsy / hydromarker': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Non-palpable mammographic abnormality requiring localization.', notes: 'Wire-guided localization performed followed by excision biopsy of the marked area.', description: 'Image-guided biopsy of a non-palpable lesion.' },
      ]},
      'Incision biopsy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Large locally advanced breast mass requiring tissue diagnosis.', notes: 'Incision biopsy performed with representative tissue obtained for histopathology.', description: 'Incision biopsy of a breast mass.' },
      ]},
      'Mastectomy of male breast': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Gynaecomastia causing significant symptoms.', notes: 'Subcutaneous mastectomy performed with removal of the breast tissue through a peri-areolar incision.', description: 'Mastectomy for male gynaecomastia.' },
      ]},
      'Nipple reconstruction': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Absent nipple-areola complex following mastectomy and reconstruction.', notes: 'Nipple reconstruction performed using a local skin flap technique.', description: 'Nipple reconstruction following mastectomy.' },
      ]},
      'Sentinel lymphnode biopsy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Early breast carcinoma with clinically negative axilla.', notes: 'Sentinel lymph node biopsy performed using dye/isotope mapping with node retrieval for histopathology.', description: 'Sentinel lymph node biopsy for breast carcinoma.' },
      ]},
      'Simple mastectomy with or without axillary dissection': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Locally advanced breast carcinoma not suitable for conservation.', notes: 'Simple mastectomy performed with axillary dissection for nodal staging.', description: 'Simple mastectomy with axillary dissection.' },
      ]},
      'Wide excision / lumpectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Early breast carcinoma suitable for breast-conserving surgery.', notes: 'Wide local excision performed with clear margins confirmed on specimen orientation.', description: 'Wide excision of an early breast carcinoma.' },
      ]},
    },
  },
  {
    caseType: 'Neurosurgery',
    interpretative: {
      'CT/MRI /MRA of brain': { min: 3, templates: [
        { indication: 'Head injury with suspected intracranial haemorrhage.', interpretation: 'CT brain shows an acute extradural haematoma with mass effect.', description: 'CT brain for head injury evaluation.' },
      ]},
      'Nerve conduction study': { min: 1, templates: [
        { indication: 'Suspected peripheral nerve injury following trauma.', interpretation: 'Nerve conduction study shows reduced conduction velocity across the injured segment.', description: 'Nerve conduction study for suspected nerve injury.' },
      ]},
      'X-ray skull': { min: 3, templates: [
        { indication: 'Head injury requiring assessment for skull fracture.', interpretation: 'X-ray skull shows a linear non-depressed fracture of the parietal bone.', description: 'X-ray skull for head injury.' },
      ]},
    },
    procedural: {
      'Burr hole': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Chronic subdural haematoma causing raised intracranial pressure.', notes: 'Burr hole evacuation of the chronic subdural haematoma performed with drain placement.', description: 'Burr hole evacuation for chronic subdural haematoma.' },
      ]},
      'Craniotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Acute extradural haematoma with mass effect.', notes: 'Emergency craniotomy performed with evacuation of the extradural haematoma and haemostasis.', description: 'Craniotomy for acute extradural haematoma.' },
      ]},
      'Repair of meningocoele': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Congenital lumbosacral meningocoele in a neonate.', notes: 'Surgical repair of the meningocoele performed with dural closure and layered wound closure.', description: 'Repair of lumbosacral meningocoele.' },
      ]},
      'Repair of peripheral nerves': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Lacerated peripheral nerve following a sharp injury.', notes: 'Primary epineural repair of the transected nerve performed under magnification.', description: 'Repair of a lacerated peripheral nerve.' },
      ]},
    },
  },
  {
    caseType: 'Gastrointestinal & HepatoBiliary System and Pancreas',
    interpretative: {
      'Biochemical investigations': { min: 5, templates: [
        { indication: 'Suspected acute pancreatitis.', interpretation: 'Serum amylase markedly elevated, 3x upper limit, consistent with acute pancreatitis.', description: 'Biochemical investigation for suspected pancreatitis.' },
      ]},
      'CT scan, ERCP, MRCP': { min: 3, templates: [
        { indication: 'Suspected common bile duct stone with obstructive jaundice.', interpretation: 'MRCP shows a dilated common bile duct with a filling defect at the distal end.', description: 'MRCP for suspected common bile duct stone.' },
      ]},
      'Contrast X-rays (Barium swallow, Barium meal and follow through, Barium enema)': { min: 5, templates: [
        { indication: 'Dysphagia requiring evaluation of the oesophagus.', interpretation: 'Barium swallow shows a smooth tapering narrowing at the lower oesophagus.', description: 'Barium swallow for dysphagia evaluation.' },
      ]},
      'Histopathological analysis': { min: 5, templates: [
        { indication: 'Colonic polyp removed at colonoscopy requiring histological diagnosis.', interpretation: 'Histopathology confirms a tubular adenoma with low-grade dysplasia.', description: 'Histopathological analysis of a colonic polyp.' },
      ]},
      'Immunohistochemistry': { min: 3, templates: [
        { indication: 'Gastrointestinal stromal tumour requiring confirmatory markers.', interpretation: 'Immunohistochemistry shows CD117 (c-KIT) positivity confirming GIST.', description: 'Immunohistochemistry of a GI stromal tumour.' },
      ]},
      'Lower gastrointestinal endoscopy': { min: 1, templates: [
        { indication: 'Rectal bleeding requiring colonic evaluation.', interpretation: 'Colonoscopy shows a sigmoid polyp which was biopsied.', description: 'Lower GI endoscopy for rectal bleeding.' },
      ]},
      'Plain X-ray abdomen': { min: 5, templates: [
        { indication: 'Suspected intestinal obstruction.', interpretation: 'Plain X-ray abdomen shows dilated small bowel loops with multiple air-fluid levels.', description: 'Plain X-ray abdomen for suspected obstruction.' },
      ]},
      'Tumor marker': { min: 5, templates: [
        { indication: 'Suspected colorectal malignancy requiring baseline marker.', interpretation: 'CEA is elevated above the normal reference range.', description: 'Tumour marker assessment for suspected colorectal cancer.' },
      ]},
      'USG of whole abdomen/ HBS': { min: 3, templates: [
        { indication: 'Right upper quadrant pain suspicious for gallstone disease.', interpretation: 'USG shows a contracted gallbladder with multiple calculi and wall thickening.', description: 'USG abdomen for suspected gallstone disease.' },
      ]},
      'Upper gastrointestinal endoscopy': { min: 1, templates: [
        { indication: 'Epigastric pain with suspected peptic ulcer disease.', interpretation: 'Upper GI endoscopy shows a duodenal ulcer with a clean base.', description: 'Upper GI endoscopy for suspected peptic ulcer.' },
      ]},
    },
    procedural: {
      'Abdominal paracentesis': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Tense ascites causing respiratory compromise.', notes: 'Abdominal paracentesis performed under aseptic technique with controlled drainage of ascitic fluid.', description: 'Abdominal paracentesis for tense ascites.' },
      ]},
      'Abdominal rectopexy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Complete rectal prolapse.', notes: 'Abdominal rectopexy performed with mobilisation and fixation of the rectum to the sacral promontory.', description: 'Abdominal rectopexy for rectal prolapse.' },
      ]},
      'Abdominoperineal resection': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Low rectal carcinoma involving the anal sphincter complex.', notes: 'Abdominoperineal resection performed with total mesorectal excision and end colostomy formation.', description: 'Abdominoperineal resection for low rectal carcinoma.' },
      ]},
      'Adhesionolysis': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Adhesive small bowel obstruction from previous surgery.', notes: 'Adhesionolysis performed with careful separation of bowel loops and restoration of continuity.', description: 'Adhesionolysis for adhesive obstruction.' },
      ]},
      'Appendicectomy (Open and laparoscopic)': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Acute appendicitis.', notes: 'Open appendicectomy performed via a gridiron incision with ligation of the mesoappendix and appendiceal stump.', description: 'Appendicectomy for acute appendicitis.' },
      ]},
      'Choledocholithotomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Common bile duct stone causing obstructive jaundice.', notes: 'Choledocholithotomy performed with extraction of the stone and T-tube drainage.', description: 'Choledocholithotomy for CBD stone.' },
      ]},
      'Colonoscopy': { min: 3, levels: ['2','3','4'], templates: [
        { diagnosis: 'Change in bowel habit requiring colonic evaluation.', notes: 'Colonoscopy performed to the caecum with biopsy of a suspicious lesion.', description: 'Colonoscopy for change in bowel habit.' },
      ]},
      'Distal pancreatectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Tumour of the distal pancreas.', notes: 'Distal pancreatectomy with splenectomy performed with secure closure of the pancreatic stump.', description: 'Distal pancreatectomy for pancreatic tumour.' },
      ]},
      'Drainage of anorectal abscesses': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Perianal abscess.', notes: 'Incision and drainage of the perianal abscess performed with breaking of loculi.', description: 'Drainage of a perianal abscess.' },
      ]},
      'Fistulotomy/Fistulectomy/Seton insertion': { min: 3, levels: ['1','2','3'], templates: [
        { diagnosis: 'Low anal fistula following previous perianal abscess.', notes: 'Fistulotomy performed after probing the fistula tract with laying open of the low tract.', description: 'Fistulotomy for a low anal fistula.' },
      ]},
      'Gastrectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Gastric carcinoma of the antrum.', notes: 'Subtotal gastrectomy performed with Billroth II reconstruction and lymph node dissection.', description: 'Gastrectomy for gastric carcinoma.' },
      ]},
      'Gastric bypass': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Morbid obesity with metabolic syndrome.', notes: 'Laparoscopic Roux-en-Y gastric bypass performed with construction of the gastric pouch and anastomoses.', description: 'Gastric bypass for morbid obesity.' },
      ]},
      'Hepatic resection': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Solitary liver metastasis suitable for resection.', notes: 'Segmental hepatic resection performed with control of the hepatic pedicle and secure haemostasis.', description: 'Hepatic resection for liver metastasis.' },
      ]},
      'Insertion of nasogastric tube': { min: 3, levels: ['4'], templates: [
        { diagnosis: 'Acute intestinal obstruction requiring gastric decompression.', notes: 'Nasogastric tube inserted with position confirmed by aspiration and auscultation.', description: 'Nasogastric tube insertion for bowel obstruction.' },
      ]},
      'Laparoscopic cholecystectomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Symptomatic cholelithiasis.', notes: 'Laparoscopic cholecystectomy performed with critical-view-of-safety dissection and clipping of the cystic structures.', description: 'Laparoscopic cholecystectomy for gallstones.' },
      ]},
      'Laparoscopy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Acute abdomen of uncertain cause requiring diagnostic evaluation.', notes: 'Diagnostic laparoscopy performed with systematic inspection of the abdominal cavity.', description: 'Diagnostic laparoscopy for acute abdomen.' },
      ]},
      'Laparotomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Perforated peptic ulcer with peritonitis.', notes: 'Emergency laparotomy performed with identification and closure of the perforation with an omental patch.', description: 'Laparotomy for perforated peptic ulcer.' },
      ]},
      'Lateral internal sphincterotomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Chronic anal fissure resistant to medical therapy.', notes: 'Lateral internal sphincterotomy performed with partial division of the internal sphincter.', description: 'Sphincterotomy for chronic anal fissure.' },
      ]},
      'Open cholecystectomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Complicated cholelithiasis with dense adhesions precluding laparoscopy.', notes: 'Open cholecystectomy performed via a subcostal incision with careful dissection of Calot\'s triangle.', description: 'Open cholecystectomy for complicated gallstones.' },
      ]},
      'Open hemorrhoidectomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Symptomatic third-degree haemorrhoids.', notes: 'Open (Milligan-Morgan) haemorrhoidectomy performed with excision of the haemorrhoidal cushions.', description: 'Open haemorrhoidectomy for third-degree haemorrhoids.' },
      ]},
      'Pancreatoduodenectomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Periampullary carcinoma.', notes: 'Whipple\'s pancreatoduodenectomy performed with reconstruction by pancreaticojejunostomy, hepaticojejunostomy and gastrojejunostomy.', description: 'Pancreatoduodenectomy for periampullary carcinoma.' },
      ]},
      'Pancreatojejunostomy (LPJ)': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Chronic pancreatitis with a dilated main pancreatic duct.', notes: 'Lateral pancreaticojejunostomy performed to decompress the dilated pancreatic duct.', description: 'Lateral pancreaticojejunostomy for chronic pancreatitis.' },
      ]},
      'Proctosigmoidoscopy': { min: 3, levels: ['2','3','4'], templates: [
        { diagnosis: 'Rectal bleeding requiring lower rectal and sigmoid evaluation.', notes: 'Proctosigmoidoscopy performed with visualization of the rectal mucosa and biopsy of a suspicious area.', description: 'Proctosigmoidoscopy for rectal bleeding.' },
      ]},
      'Repair of perforation of hollow viscera': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Perforated duodenal ulcer.', notes: 'Perforation identified and closed primarily with an omental patch reinforcement.', description: 'Repair of perforated duodenal ulcer.' },
      ]},
      'Resection anastomosis of bowel': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Obstructing sigmoid colon carcinoma.', notes: 'Segmental resection of the sigmoid colon performed with primary colo-colonic anastomosis.', description: 'Resection and anastomosis for sigmoid carcinoma.' },
      ]},
      'Splenectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Traumatic splenic rupture with haemodynamic instability.', notes: 'Emergency splenectomy performed with ligation of the splenic pedicle and haemostasis.', description: 'Splenectomy for traumatic splenic rupture.' },
      ]},
      'Stapled hemorrhoidopexy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Symptomatic circumferential prolapsing haemorrhoids.', notes: 'Stapled haemorrhoidopexy performed with circular resection of the prolapsing mucosa.', description: 'Stapled haemorrhoidopexy.' },
      ]},
      'Stoma closure (ileostomy & colostomy)': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Defunctioning loop ileostomy planned for reversal.', notes: 'Stoma closure performed with mobilisation of the loop and hand-sewn anastomosis.', description: 'Closure of a defunctioning ileostomy.' },
      ]},
      'Stoma creation (ileostomy & colostomy)': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Obstructing rectal carcinoma requiring proximal diversion.', notes: 'Defunctioning loop colostomy fashioned and matured at the skin level.', description: 'Stoma creation for obstructing rectal carcinoma.' },
      ]},
      'Triple bypass': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Unresectable periampullary carcinoma causing biliary and gastric outlet obstruction.', notes: 'Triple bypass performed with hepaticojejunostomy, gastrojejunostomy and jejunojejunostomy.', description: 'Triple bypass for unresectable periampullary carcinoma.' },
      ]},
      'Upper gastrointestinal endoscopy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Dyspepsia requiring upper GI evaluation.', notes: 'Upper GI endoscopy performed with systematic examination and biopsy of the gastric antrum.', description: 'Upper GI endoscopy for dyspepsia.' },
      ]},
    },
  },
  {
    caseType: 'Endocrine Surgery (Thyroid, Parathyroid, Adrenal Glands)',
    interpretative: {
      'Biochemical investigations': { min: 3, templates: [
        { indication: 'Suspected primary hyperparathyroidism.', interpretation: 'Serum calcium and parathyroid hormone are both elevated, consistent with primary hyperparathyroidism.', description: 'Biochemical investigation for suspected hyperparathyroidism.' },
      ]},
      'CT abdomen/ MRI': { min: 3, templates: [
        { indication: 'Suspected adrenal mass on prior imaging.', interpretation: 'CT abdomen shows a well-defined adrenal mass with imaging features suggestive of an adenoma.', description: 'CT abdomen for suspected adrenal mass.' },
      ]},
      'CT/MRI /MRA of brain': { min: 3, templates: [
        { indication: 'Suspected pituitary adenoma with hormonal symptoms.', interpretation: 'MRI brain shows a pituitary microadenoma.', description: 'MRI brain for suspected pituitary adenoma.' },
      ]},
      'Histopathological report analysis': { min: 3, templates: [
        { indication: 'Thyroid nodule excised requiring histological diagnosis.', interpretation: 'Histopathology confirms a benign follicular adenoma of the thyroid.', description: 'Histopathological analysis of a thyroid nodule.' },
      ]},
      'Radionuclide studies of thyroid & parathyroid': { min: 3, templates: [
        { indication: 'Suspected toxic thyroid nodule.', interpretation: 'Thyroid scan shows a solitary hot nodule with suppressed surrounding tissue uptake.', description: 'Radionuclide thyroid scan for suspected toxic nodule.' },
      ]},
      'USG of Thyroid and abdominal organs related to endocrine system': { min: 3, templates: [
        { indication: 'Palpable thyroid nodule requiring sonographic characterization.', interpretation: 'USG shows a solid hypoechoic thyroid nodule with regular margins.', description: 'USG of the thyroid for a palpable nodule.' },
      ]},
    },
    procedural: {
      'Adrenalectomy (Laparoscopic and open)': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Functioning adrenal adenoma causing Cushing\'s syndrome.', notes: 'Laparoscopic adrenalectomy performed with careful dissection of the adrenal vein and gland removal.', description: 'Laparoscopic adrenalectomy for functioning adenoma.' },
      ]},
      'Hemithyroidectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Solitary toxic thyroid nodule confined to one lobe.', notes: 'Hemithyroidectomy performed with identification and preservation of the recurrent laryngeal nerve and parathyroid glands.', description: 'Hemithyroidectomy for a solitary thyroid nodule.' },
      ]},
      'Isthmusectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Isolated thyroid isthmus nodule.', notes: 'Isthmusectomy performed with excision of the isthmus and margin of adjacent tissue.', description: 'Isthmusectomy for an isthmic thyroid nodule.' },
      ]},
      'Neck dissection': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Papillary thyroid carcinoma with cervical nodal metastasis.', notes: 'Selective neck dissection performed with clearance of the involved nodal levels.', description: 'Neck dissection for metastatic thyroid carcinoma.' },
      ]},
      'Parathyroidectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Primary hyperparathyroidism due to a parathyroid adenoma.', notes: 'Parathyroidectomy performed with excision of the localized adenoma and intra-operative confirmation of PTH drop.', description: 'Parathyroidectomy for primary hyperparathyroidism.' },
      ]},
      'Total thyroidectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Multinodular goitre with compressive symptoms.', notes: 'Total thyroidectomy performed with bilateral identification and preservation of the recurrent laryngeal nerves and parathyroid glands.', description: 'Total thyroidectomy for multinodular goitre.' },
      ]},
    },
  },
  {
    caseType: 'Paediatric Surgery',
    interpretative: {
      'Contrast X-rays': { min: 3, templates: [
        { indication: 'Suspected tracheo-oesophageal fistula in a neonate.', interpretation: 'Contrast study shows contrast pooling in a blind-ending oesophageal pouch.', description: 'Contrast X-ray for suspected tracheo-oesophageal fistula.' },
      ]},
      'Histopathology': { min: 3, templates: [
        { indication: 'Excised hernial sac in a child requiring histological confirmation.', interpretation: 'Histopathology confirms a patent processus vaginalis sac with no abnormal tissue.', description: 'Histopathological analysis of a hernial sac.' },
      ]},
      'Invertogram': { min: 3, templates: [
        { indication: 'Suspected anorectal malformation in a neonate.', interpretation: 'Invertogram shows the rectal gas shadow at a low level relative to the pubococcygeal line.', description: 'Invertogram for suspected anorectal malformation.' },
      ]},
      'Plain X-ray Abdomen': { min: 3, templates: [
        { indication: 'Suspected intestinal obstruction in an infant.', interpretation: 'Plain X-ray abdomen shows dilated bowel loops with paucity of distal gas.', description: 'Plain X-ray abdomen for suspected obstruction.' },
      ]},
      'Plain X-ray KUB': { min: 3, templates: [
        { indication: 'Suspected urinary tract calculus in a child.', interpretation: 'Plain X-ray KUB shows a radio-opaque shadow in the region of the right ureter.', description: 'Plain X-ray KUB for suspected urinary calculus.' },
      ]},
      'USG': { min: 3, templates: [
        { indication: 'Palpable abdominal mass in a child.', interpretation: 'USG shows a well-defined intra-abdominal mass suggestive of a renal origin.', description: 'USG for a palpable abdominal mass.' },
      ]},
      'Urine analysis': { min: 3, templates: [
        { indication: 'Suspected urinary tract infection in a child.', interpretation: 'Urine analysis shows pyuria with a positive nitrite test.', description: 'Urine analysis for suspected UTI.' },
      ]},
      'X-ray chest P/A': { min: 3, templates: [
        { indication: 'Suspected congenital diaphragmatic hernia in a neonate.', interpretation: 'X-ray chest shows bowel loops within the left hemithorax with mediastinal shift.', description: 'X-ray chest for suspected diaphragmatic hernia.' },
      ]},
    },
    procedural: {
      'Central venous line insertion': { min: 2, levels: ['1','2','3'], templates: [
        { diagnosis: 'Critically ill neonate requiring reliable venous access.', notes: 'Central venous line inserted via the femoral route under aseptic technique with position confirmed radiologically.', description: 'Central venous line insertion in a critically ill neonate.' },
      ]},
      'Chordee correction in hypospadias': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Hypospadias with ventral chordee.', notes: 'Chordee correction performed with degloving and release of fibrous tissue causing ventral curvature.', description: 'Chordee correction in hypospadias.' },
      ]},
      'Circumcision': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Phimosis causing recurrent balanitis.', notes: 'Circumcision performed with excision of the redundant prepuce and haemostatic closure.', description: 'Circumcision for phimosis.' },
      ]},
      'Cutback procedure for ectopic stenosed anus': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Ectopic stenosed anus in an infant.', notes: 'Cutback anoplasty performed to enlarge the stenosed ectopic anal opening.', description: 'Cutback procedure for ectopic stenosed anus.' },
      ]},
      'Drainage of abscess': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Perianal abscess in a child.', notes: 'Incision and drainage of the abscess performed under general anaesthesia.', description: 'Drainage of a perianal abscess in a child.' },
      ]},
      'Herniotomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Reducible inguinal hernia in a child.', notes: 'Herniotomy performed with high ligation of the hernial sac at the deep ring.', description: 'Herniotomy for inguinal hernia.' },
      ]},
      'Hydrocelectomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Communicating hydrocele in a child.', notes: 'Hydrocelectomy performed with ligation of the patent processus vaginalis.', description: 'Hydrocelectomy for communicating hydrocele.' },
      ]},
      'Intraosseous infusion': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Critically ill child with failed peripheral venous access.', notes: 'Intraosseous needle inserted into the proximal tibia with confirmed marrow aspirate before infusion.', description: 'Intraosseous infusion in a critically ill child.' },
      ]},
      'Lymph node biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Persistently enlarged cervical lymph node in a child.', notes: 'Excision biopsy of the lymph node performed and specimen sent for histopathology.', description: 'Lymph node biopsy in a child.' },
      ]},
      'Orchidopexy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Undescended testis.', notes: 'Orchidopexy performed with mobilisation of the spermatic cord and fixation of the testis in the scrotum.', description: 'Orchidopexy for undescended testis.' },
      ]},
      'Pyloromyotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Infantile hypertrophic pyloric stenosis.', notes: 'Ramstedt pyloromyotomy performed with splitting of the hypertrophied pyloric muscle down to the submucosa.', description: 'Pyloromyotomy for hypertrophic pyloric stenosis.' },
      ]},
      'Suprapubic catheterization': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Acute urinary retention with failed urethral catheterization.', notes: 'Suprapubic catheter inserted under aseptic technique with confirmed urine drainage.', description: 'Suprapubic catheterization for urinary retention.' },
      ]},
      'Temporary colostomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'High anorectal malformation in a neonate.', notes: 'Defunctioning divided colostomy fashioned as a staged procedure prior to definitive repair.', description: 'Temporary colostomy for anorectal malformation.' },
      ]},
      'Urethroplasty': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Hypospadias requiring urethral reconstruction.', notes: 'Tubularized incised plate urethroplasty performed to reconstruct the neourethra.', description: 'Urethroplasty for hypospadias.' },
      ]},
    },
  },
  {
    caseType: 'Anaesthesia & Procedural critical care',
    interpretative: {
      'ABG analysis': { min: 3, templates: [
        { indication: 'Respiratory distress in a post-operative patient.', interpretation: 'ABG shows compensated respiratory acidosis with adequate oxygenation.', description: 'ABG analysis for post-operative respiratory distress.' },
      ]},
      'Monitor reading': { min: 3, templates: [
        { indication: 'Intra-operative haemodynamic monitoring during major surgery.', interpretation: 'Monitor readings show stable haemodynamics throughout the procedure with no significant desaturation.', description: 'Intra-operative monitor reading review.' },
      ]},
    },
    procedural: {
      'Central venous catheterization': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Major surgical patient requiring central venous access for monitoring.', notes: 'Central venous catheter inserted via the internal jugular route with position confirmed on chest X-ray.', description: 'Central venous catheterization for major surgery.' },
      ]},
      'Cricothyroidotomy / Cricothyroidostomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Failed airway with inability to intubate or ventilate.', notes: 'Emergency cricothyroidotomy performed to secure the airway.', description: 'Cricothyroidotomy for failed airway.' },
      ]},
      'Endotracheal intubation': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Patient requiring general anaesthesia for elective surgery.', notes: 'Endotracheal intubation performed with direct laryngoscopy and confirmed tube placement.', description: 'Endotracheal intubation for elective surgery.' },
      ]},
      'General anaesthesia': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Patient scheduled for major elective abdominal surgery.', notes: 'General anaesthesia induced and maintained with standard monitoring throughout the procedure.', description: 'General anaesthesia for major abdominal surgery.' },
      ]},
      'Infiltration of local anaesthetics and regional nerve block': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Patient undergoing a limb procedure suitable for regional anaesthesia.', notes: 'Regional nerve block performed with local anaesthetic infiltration under aseptic technique.', description: 'Regional nerve block for a limb procedure.' },
      ]},
      'Infusion/ syringe pump of fluids, nutrients and medications': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Critically ill patient requiring titrated vasoactive support.', notes: 'Syringe pump set up for controlled infusion of vasoactive medication with continuous monitoring.', description: 'Syringe pump infusion for critical care support.' },
      ]},
      'Insertion of laryngeal mask airway': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Patient undergoing a short elective procedure under general anaesthesia.', notes: 'Laryngeal mask airway inserted with confirmed adequate ventilation.', description: 'LMA insertion for a short elective procedure.' },
      ]},
      'Regional anaesthesia': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Patient undergoing lower limb surgery suitable for spinal anaesthesia.', notes: 'Spinal anaesthesia administered with confirmed adequate sensory block prior to surgery.', description: 'Spinal anaesthesia for lower limb surgery.' },
      ]},
      'Tracheostomy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Prolonged mechanical ventilation requiring a definitive airway.', notes: 'Surgical tracheostomy performed with a tube secured and position confirmed.', description: 'Tracheostomy for prolonged ventilation.' },
      ]},
    },
  },
  {
    caseType: 'Plastic Surgery',
    interpretative: {
      'Nutritional status': { min: 5, templates: [
        { indication: 'Burns patient requiring nutritional assessment.', interpretation: 'Nutritional assessment shows a hypermetabolic state consistent with major burn injury.', description: 'Nutritional status assessment in a burns patient.' },
      ]},
      'Serum electrolytes': { min: 5, templates: [
        { indication: 'Major burns patient at risk of electrolyte derangement.', interpretation: 'Serum electrolytes show mild hyponatraemia consistent with fluid shifts of major burns.', description: 'Serum electrolyte assessment in a burns patient.' },
      ]},
    },
    procedural: {
      'Burn dressing': { min: 5, levels: ['3','4'], templates: [
        { diagnosis: 'Partial thickness burn of the forearm.', notes: 'Burn wound cleaned and dressed with appropriate topical agents and non-adherent dressing.', description: 'Burn dressing for partial thickness burn.' },
      ]},
      'Escharotomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Circumferential full-thickness burn of the limb with vascular compromise.', notes: 'Escharotomy performed along the marked lines with release of the constricting eschar.', description: 'Escharotomy for circumferential burn.' },
      ]},
      'Fasciotomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Compartment syndrome following a crush injury.', notes: 'Fasciotomy performed with decompression of the affected compartments.', description: 'Fasciotomy for compartment syndrome.' },
      ]},
      'Flap reconstruction': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Soft tissue defect following trauma requiring coverage.', notes: 'Local flap reconstruction performed with tension-free closure of the defect.', description: 'Flap reconstruction of a traumatic soft tissue defect.' },
      ]},
      'Release of burn contractures': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Post-burn contracture of the elbow limiting range of motion.', notes: 'Contracture release performed with Z-plasty and skin grafting to the resulting defect.', description: 'Release of a post-burn contracture.' },
      ]},
      'Skin grafting': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Deep partial thickness burn with a healthy granulating bed.', notes: 'Split-thickness skin graft harvested and applied to the burn wound with secure dressing.', description: 'Skin grafting for a burn wound.' },
      ]},
    },
  },
  {
    caseType: 'Parasites of Surgical Importance',
    interpretative: {
      'CBC': { min: 3, templates: [
        { indication: 'Suspected hydatid disease with eosinophilia.', interpretation: 'CBC shows eosinophilia consistent with parasitic infestation.', description: 'CBC for suspected hydatid disease.' },
      ]},
      'Imaging (USG/CT-scan/MRCP/X-ray abdomen/X-ray chest)': { min: 3, templates: [
        { indication: 'Suspected hepatic hydatid cyst.', interpretation: 'USG shows a well-defined cystic lesion in the liver with daughter cysts, consistent with a hydatid cyst.', description: 'Imaging for suspected hepatic hydatid cyst.' },
      ]},
      'Peripheral blood film': { min: 3, templates: [
        { indication: 'Suspected parasitic infestation with eosinophilia.', interpretation: 'Peripheral blood film shows increased eosinophils without atypical cells.', description: 'Peripheral blood film for suspected parasitic infestation.' },
      ]},
      'Serological tests': { min: 3, templates: [
        { indication: 'Suspected hydatid disease requiring serological confirmation.', interpretation: 'Serological test for echinococcus is positive, supporting the diagnosis of hydatid disease.', description: 'Serological test for suspected hydatid disease.' },
      ]},
    },
    procedural: {
      'Endocystectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Hepatic hydatid cyst.', notes: 'Endocystectomy performed with careful evacuation of the cyst contents and removal of the germinal layer after scolicidal protection.', description: 'Endocystectomy for hepatic hydatid cyst.' },
      ]},
      'Endoscopic retrieval of CBD worms': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Biliary ascariasis causing obstructive jaundice.', notes: 'Endoscopic retrieval of the worm from the common bile duct performed at ERCP.', description: 'Endoscopic retrieval of CBD worms for biliary ascariasis.' },
      ]},
      'PAIR': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Uncomplicated hepatic hydatid cyst suitable for minimally invasive treatment.', notes: 'PAIR (puncture, aspiration, injection, re-aspiration) performed under image guidance with scolicidal agent instillation.', description: 'PAIR procedure for hepatic hydatid cyst.' },
      ]},
      'Pericystectomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Hepatic hydatid cyst with a thick pericyst.', notes: 'Pericystectomy performed with complete excision of the cyst wall and pericyst after scolicidal protection.', description: 'Pericystectomy for hepatic hydatid cyst.' },
      ]},
    },
  },
  {
    caseType: 'Urology',
    interpretative: {
      'CT scan/MRI/angiogram': { min: 3, templates: [
        { indication: 'Suspected renal cell carcinoma.', interpretation: 'CT scan shows an enhancing solid renal mass consistent with renal cell carcinoma.', description: 'CT scan for suspected renal carcinoma.' },
      ]},
      'CT-urogram': { min: 3, templates: [
        { indication: 'Suspected upper urinary tract stone disease.', interpretation: 'CT urogram shows a calculus at the right ureterovesical junction with mild proximal hydronephrosis.', description: 'CT urogram for suspected ureteric stone.' },
      ]},
      'DMSA/DTPA scan': { min: 1, templates: [
        { indication: 'Suspected differential renal function impairment.', interpretation: 'DTPA scan shows reduced differential function of the affected kidney.', description: 'DTPA scan for differential renal function.' },
      ]},
      'IVU': { min: 3, templates: [
        { indication: 'Suspected urinary tract stone disease.', interpretation: 'IVU shows delayed excretion on the affected side with a filling defect in the ureter.', description: 'IVU for suspected urinary stone.' },
      ]},
      'Renal biopsy report interpretation': { min: 1, templates: [
        { indication: 'Renal mass biopsy requiring histological interpretation.', interpretation: 'Renal biopsy report confirms clear cell renal cell carcinoma.', description: 'Renal biopsy report interpretation.' },
      ]},
      'Renal function test': { min: 5, templates: [
        { indication: 'Obstructive uropathy requiring baseline renal function.', interpretation: 'Renal function test shows mildly elevated serum creatinine consistent with obstructive nephropathy.', description: 'Renal function test for obstructive uropathy.' },
      ]},
      'USG of genitourinary system': { min: 5, templates: [
        { indication: 'Suspected benign prostatic hyperplasia with urinary symptoms.', interpretation: 'USG shows an enlarged prostate with post-void residual urine.', description: 'USG of the genitourinary system for BPH.' },
      ]},
      'Urine C/S': { min: 3, templates: [
        { indication: 'Recurrent urinary tract infection.', interpretation: 'Urine culture grows E. coli sensitive to the prescribed antibiotic.', description: 'Urine culture and sensitivity for recurrent UTI.' },
      ]},
      'Urine routine and microscopical examination': { min: 5, templates: [
        { indication: 'Suspected urinary tract infection.', interpretation: 'Urine microscopy shows pus cells and bacteria consistent with infection.', description: 'Urine routine examination for suspected UTI.' },
      ]},
      'Uroflowmetry': { min: 3, templates: [
        { indication: 'Lower urinary tract symptoms suggestive of bladder outlet obstruction.', interpretation: 'Uroflowmetry shows a reduced peak flow rate consistent with outlet obstruction.', description: 'Uroflowmetry for suspected outlet obstruction.' },
      ]},
      'X-ray KUB': { min: 5, templates: [
        { indication: 'Suspected renal or ureteric calculus.', interpretation: 'X-ray KUB shows a radio-opaque calculus in the region of the right kidney.', description: 'X-ray KUB for suspected renal calculus.' },
      ]},
    },
    procedural: {
      'Amputation of penis': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Locally advanced penile carcinoma.', notes: 'Partial penectomy performed with adequate surgical margins confirmed on specimen inspection.', description: 'Partial amputation of penis for penile carcinoma.' },
      ]},
      'Circumcision': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Phimosis with recurrent balanoposthitis.', notes: 'Circumcision performed with excision of the redundant prepuce and haemostatic closure.', description: 'Circumcision for phimosis.' },
      ]},
      'Cystolithtomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Large bladder calculus not amenable to endoscopic treatment.', notes: 'Open cystolithotomy performed with removal of the bladder stone and layered closure.', description: 'Cystolithotomy for a large bladder stone.' },
      ]},
      'Cystourethroscopy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Suspected bladder tumour requiring endoscopic evaluation.', notes: 'Cystourethroscopy performed with visualization of a papillary lesion on the bladder wall.', description: 'Cystourethroscopy for suspected bladder tumour.' },
      ]},
      'Meatoplasty': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Meatal stenosis causing a deflected urinary stream.', notes: 'Meatoplasty performed with widening of the stenosed urethral meatus.', description: 'Meatoplasty for meatal stenosis.' },
      ]},
      'Optical internal urethrotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Urethral stricture causing voiding difficulty.', notes: 'Optical internal urethrotomy performed with incision of the stricture under direct vision.', description: 'Optical internal urethrotomy for urethral stricture.' },
      ]},
      'Orchidectomy': { min: 2, levels: ['1','2','3'], templates: [
        { diagnosis: 'Testicular tumour confirmed on imaging.', notes: 'Radical inguinal orchidectomy performed with high ligation of the spermatic cord.', description: 'Radical orchidectomy for testicular tumour.' },
      ]},
      'Orchidopexy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Undescended testis in an adolescent.', notes: 'Orchidopexy performed with mobilisation of the spermatic cord and fixation of the testis in the scrotum.', description: 'Orchidopexy for undescended testis.' },
      ]},
      'PCNL': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Large renal staghorn calculus.', notes: 'Percutaneous nephrolithotomy performed with tract creation and fragmentation and clearance of the stone.', description: 'PCNL for a large renal calculus.' },
      ]},
      'Pyelolithotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Renal pelvic calculus not suitable for endoscopic treatment.', notes: 'Open pyelolithotomy performed with extraction of the pelvic calculus and closure of the pyelotomy.', description: 'Pyelolithotomy for a renal pelvic calculus.' },
      ]},
      'Pyeloplasty': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Pelvi-ureteric junction obstruction.', notes: 'Anderson-Hynes dismembered pyeloplasty performed with excision of the stenosed segment and tension-free anastomosis.', description: 'Pyeloplasty for PUJ obstruction.' },
      ]},
      'Repair of bladder injury': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Traumatic intraperitoneal bladder rupture.', notes: 'Bladder injury repaired in two layers with confirmation of a watertight closure.', description: 'Repair of traumatic bladder injury.' },
      ]},
      'Repair of ureteric injury': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Iatrogenic ureteric injury identified intra-operatively.', notes: 'Ureteric injury repaired with primary uretero-ureteric anastomosis over a stent.', description: 'Repair of ureteric injury.' },
      ]},
      'Suprapubiccystostomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Acute urinary retention with failed urethral catheterization.', notes: 'Suprapubic cystostomy performed under aseptic technique with confirmed urine drainage.', description: 'Suprapubic cystostomy for urinary retention.' },
      ]},
      'URS': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Mid-ureteric calculus causing renal colic.', notes: 'Ureteroscopy performed with laser fragmentation and clearance of the ureteric calculus.', description: 'URS for a mid-ureteric calculus.' },
      ]},
      'Ureterolithotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Large impacted ureteric calculus not amenable to endoscopic treatment.', notes: 'Open ureterolithotomy performed with extraction of the calculus and ureteric repair.', description: 'Ureterolithotomy for an impacted ureteric calculus.' },
      ]},
      'Ureteroscopy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Suspected upper tract urothelial lesion.', notes: 'Diagnostic ureteroscopy performed with visualization and biopsy of the suspicious area.', description: 'Diagnostic ureteroscopy for upper tract lesion.' },
      ]},
      'Urethral catheterization': { min: 5, levels: ['3','4'], templates: [
        { diagnosis: 'Acute urinary retention.', notes: 'Urethral catheter inserted under aseptic technique with confirmed free drainage of urine.', description: 'Urethral catheterization for acute urinary retention.' },
      ]},
    },
  },
  {
    caseType: 'Thoracic and Cardiovascular Surgery',
    interpretative: {
      'Blood gas analysis': { min: 3, templates: [
        { indication: 'Respiratory distress in a patient with suspected pneumothorax.', interpretation: 'ABG shows hypoxaemia with a mild respiratory acidosis.', description: 'Blood gas analysis for respiratory distress.' },
      ]},
      'Wound swab for C/S': { min: 3, templates: [
        { indication: 'Infected sternotomy wound following cardiac surgery.', interpretation: 'Wound swab culture grows Staphylococcus epidermidis sensitive to the prescribed antibiotic.', description: 'Wound swab culture for infected sternotomy wound.' },
      ]},
      'X-ray chest P/A': { min: 3, templates: [
        { indication: 'Suspected pleural effusion.', interpretation: 'X-ray chest shows blunting of the right costophrenic angle consistent with pleural effusion.', description: 'X-ray chest for suspected pleural effusion.' },
      ]},
    },
    procedural: {
      'Chest tube drain insertion': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Traumatic pneumothorax.', notes: 'Chest tube inserted in the safe triangle under aseptic technique with confirmed lung re-expansion.', description: 'Chest tube insertion for traumatic pneumothorax.' },
      ]},
      'Pericardiocentesis': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Cardiac tamponade following pericardial effusion.', notes: 'Pericardiocentesis performed under image guidance with drainage of the pericardial effusion.', description: 'Pericardiocentesis for cardiac tamponade.' },
      ]},
      'Thoracoscopy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Undiagnosed pleural effusion requiring tissue diagnosis.', notes: 'Diagnostic thoracoscopy performed with pleural biopsy of the suspicious area.', description: 'Thoracoscopy for undiagnosed pleural effusion.' },
      ]},
      'Thoracotomy': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Penetrating chest trauma with ongoing haemorrhage.', notes: 'Emergency thoracotomy performed with identification and control of the bleeding source.', description: 'Thoracotomy for penetrating chest trauma.' },
      ]},
    },
  },
  {
    caseType: 'Surgical Oncology',
    interpretative: {
      'Histopathology/ cytology/immunohistochemistry/ Tumor markers': { min: 10, templates: [
        { indication: 'Suspicious mass requiring definitive tissue diagnosis.', interpretation: 'Histopathology confirms a malignant tumour with the reported histological subtype.', description: 'Histopathological diagnosis of a suspicious mass.' },
      ]},
      'Local X-ray': { min: 5, templates: [
        { indication: 'Suspected bony metastasis in a known malignancy.', interpretation: 'Local X-ray shows a lytic lesion consistent with metastatic deposit.', description: 'Local X-ray for suspected bony metastasis.' },
      ]},
      'MRI / CT scan / Bone scan': { min: 5, templates: [
        { indication: 'Staging evaluation of a confirmed malignancy.', interpretation: 'CT scan shows no definite evidence of distant metastatic disease.', description: 'Staging CT scan for confirmed malignancy.' },
      ]},
    },
    procedural: {
      'Core-cut biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Suspicious soft tissue mass requiring tissue diagnosis.', notes: 'Core-cut biopsy performed under aseptic technique with adequate tissue obtained.', description: 'Core-cut biopsy of a suspicious mass.' },
      ]},
      'Excision biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Small suspicious lesion suitable for complete excision.', notes: 'Excision biopsy performed with clear margins and specimen sent for histopathology.', description: 'Excision biopsy of a suspicious lesion.' },
      ]},
      'FNAC': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Palpable mass requiring cytological evaluation.', notes: 'FNAC performed with adequate cellular yield obtained for cytological assessment.', description: 'FNAC of a palpable mass.' },
      ]},
      'Incision biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Large unresectable mass requiring tissue diagnosis.', notes: 'Incision biopsy performed with representative tissue obtained for histopathology.', description: 'Incision biopsy of a large mass.' },
      ]},
      'Sentinel lymph node biopsy': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Early-stage malignancy with clinically negative regional nodes.', notes: 'Sentinel lymph node biopsy performed using dye/isotope mapping with node retrieval for histopathology.', description: 'Sentinel lymph node biopsy.' },
      ]},
    },
  },
  {
    caseType: 'Accident & Emergency / Casualty',
    interpretative: {
      'Contrast X-rays': { min: 3, templates: [
        { indication: 'Suspected urethral injury following pelvic trauma.', interpretation: 'Retrograde urethrogram shows extravasation of contrast at the site of injury.', description: 'Contrast X-ray for suspected urethral injury.' },
      ]},
      'Local X-ray of injured limbs': { min: 3, templates: [
        { indication: 'Suspected fracture following limb trauma.', interpretation: 'Local X-ray shows a displaced fracture of the injured limb.', description: 'Local X-ray of an injured limb.' },
      ]},
      'Plain X-ray Abdomen': { min: 3, templates: [
        { indication: 'Blunt abdominal trauma with suspected perforation.', interpretation: 'Plain X-ray abdomen shows free sub-diaphragmatic air consistent with perforation.', description: 'Plain X-ray abdomen for blunt trauma.' },
      ]},
      'USG / CT scan / MRI': { min: 3, templates: [
        { indication: 'Blunt abdominal trauma requiring evaluation for solid organ injury.', interpretation: 'FAST/CT scan shows a splenic laceration with a small amount of free fluid.', description: 'CT scan for blunt abdominal trauma.' },
      ]},
      'X-ray chest A/P': { min: 3, templates: [
        { indication: 'Chest trauma with suspected pneumothorax.', interpretation: 'X-ray chest shows a moderate pneumothorax on the affected side.', description: 'X-ray chest for chest trauma.' },
      ]},
      'X-ray pelvis': { min: 3, templates: [
        { indication: 'Suspected pelvic fracture following a road traffic accident.', interpretation: 'X-ray pelvis shows a fracture of the superior and inferior pubic rami.', description: 'X-ray pelvis for suspected pelvic fracture.' },
      ]},
    },
    procedural: {
      'Airway management (Basic and advanced)': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Polytrauma patient with a compromised airway.', notes: 'Airway secured with basic manoeuvres followed by advanced airway management as required.', description: 'Airway management for a polytrauma patient.' },
      ]},
      'Application of cervical collar': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Suspected cervical spine injury following trauma.', notes: 'Rigid cervical collar applied with in-line manual stabilization maintained throughout.', description: 'Cervical collar application for suspected spinal injury.' },
      ]},
      'Application of tourniquet': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Life-threatening limb haemorrhage from a traumatic wound.', notes: 'Tourniquet applied proximal to the bleeding site with confirmed cessation of haemorrhage.', description: 'Tourniquet application for limb haemorrhage.' },
      ]},
      'Application of traction splint': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Closed femoral shaft fracture following trauma.', notes: 'Traction splint applied with appropriate countertraction to stabilize the fracture.', description: 'Traction splint application for femoral fracture.' },
      ]},
      'Central venous catheterization': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Haemodynamically unstable trauma patient requiring central access.', notes: 'Central venous catheter inserted via the femoral route under emergency conditions.', description: 'Central venous catheterization in a trauma patient.' },
      ]},
      'Chest tube insertion': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Traumatic pneumothorax.', notes: 'Chest tube inserted in the safe triangle with confirmed lung re-expansion.', description: 'Chest tube insertion for traumatic pneumothorax.' },
      ]},
      'Laparoscopy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Suspected intra-abdominal injury in a haemodynamically stable trauma patient.', notes: 'Diagnostic laparoscopy performed with systematic inspection for intra-abdominal injury.', description: 'Diagnostic laparoscopy for trauma.' },
      ]},
      'Laparotomy': { min: 3, levels: ['1','2'], templates: [
        { diagnosis: 'Haemodynamically unstable patient with suspected intra-abdominal haemorrhage.', notes: 'Emergency laparotomy performed with identification and control of the source of haemorrhage.', description: 'Emergency laparotomy for trauma.' },
      ]},
      'Pericardiocentesis': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Traumatic cardiac tamponade.', notes: 'Emergency pericardiocentesis performed with drainage of the pericardial blood.', description: 'Pericardiocentesis for traumatic tamponade.' },
      ]},
      'Stoma creation (Colostomy and ileostomy)': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Traumatic colonic injury requiring diversion.', notes: 'Defunctioning colostomy fashioned as part of damage control surgery.', description: 'Stoma creation for traumatic colonic injury.' },
      ]},
      'Tracheostomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Severe maxillofacial trauma with airway compromise.', notes: 'Emergency tracheostomy performed to secure a definitive airway.', description: 'Tracheostomy for maxillofacial trauma.' },
      ]},
      'Wound debridement': { min: 3, levels: ['2','3'], templates: [
        { diagnosis: 'Contaminated traumatic wound.', notes: 'Surgical debridement performed with removal of all non-viable and contaminated tissue.', description: 'Wound debridement for a contaminated traumatic wound.' },
      ]},
      'Wound packing': { min: 3, levels: ['3','4'], templates: [
        { diagnosis: 'Deep traumatic wound with active bleeding.', notes: 'Wound packed with haemostatic gauze and firm pressure dressing applied.', description: 'Wound packing for a deep bleeding wound.' },
      ]},
    },
  },
  {
    caseType: 'Abdominal Wall',
    interpretative: {
      'USG / CT scan / MRI of abdominal wall': { min: 3, templates: [
        { indication: 'Painful swelling at a previous lower-midline laparotomy scar; ultrasound performed to assess for suspected incisional hernia.', interpretation: 'Ultrasound demonstrated a fascial defect at the site of the previous scar with herniation of preperitoneal fat, confirming an incisional hernia.', description: 'Ultrasound of the abdominal wall for suspected incisional hernia.' },
        { indication: 'Recurrent abdominal-wall bulge at a previous mesh hernioplasty site; CT scan performed to assess for recurrence.', interpretation: 'CT scan showed a recurrent fascial defect immediately adjacent to the previous mesh, with a small bowel loop within the hernial sac.', description: 'CT scan of the abdominal wall for suspected recurrent hernia.' },
        { indication: 'Large ventral hernia with clinically apparent loss of abdominal domain; MRI performed for preoperative planning prior to a planned component separation repair.', interpretation: 'MRI delineated a wide musculofascial defect with significant loss of domain, supporting the plan for component separation.', description: 'MRI of the abdominal wall for preoperative evaluation before planned component separation repair.' },
      ]},
    },
    procedural: {
      'Component separation techniques': { min: 1, levels: ['1'], templates: [
        { diagnosis: 'Large complex incisional hernia with a wide fascial defect and loss of abdominal domain.', notes: 'Component separation performed to mobilize the abdominal-wall musculofascial layers bilaterally, achieving tension-free approximation of the wide midline defect.', description: 'Component separation technique performed for a large complex incisional hernia with loss of domain.' },
      ]},
      'IPOM/ IPOM plus': { min: 2, levels: ['2'], templates: [
        { diagnosis: 'Symptomatic incisional hernia following a previous appendicectomy.', notes: 'Laparoscopic IPOM plus repair performed with adhesiolysis, defect closure, and intraperitoneal mesh placement with adequate overlap and secure fixation.', description: 'IPOM plus repair performed for symptomatic incisional hernia after previous appendicectomy.' },
        { diagnosis: 'Symptomatic ventral hernia with a moderate-sized fascial defect.', notes: 'Abdominal-wall defect assessed laparoscopically, hernial contents reduced, and intraperitoneal mesh positioned with adequate overlap and fixation.', description: 'IPOM repair performed for symptomatic ventral hernia.' },
      ]},
      'Open and laparoscopic repair of incisional hernia': { min: 1, levels: ['1'], templates: [
        { diagnosis: 'Symptomatic incisional hernia at a previous lower-midline laparotomy scar.', notes: 'Hernial sac contents reduced and the incisional fascial defect repaired by the open technique with mesh reinforcement.', description: 'Open repair of symptomatic incisional hernia.' },
      ]},
      'Open and laparoscopic repair of inguinal hernia': { min: 3, levels: ['5'], templates: [
        { diagnosis: 'Symptomatic right inguinal hernia.', notes: 'Open inguinal hernia repair performed with reduction of the hernial sac and reinforcement of the posterior inguinal wall by mesh hernioplasty.', description: 'Open repair of symptomatic right inguinal hernia.' },
        { diagnosis: 'Symptomatic left inguinal hernia.', notes: 'Laparoscopic (TEP) inguinal hernia repair performed with reduction of the hernial sac and mesh placement over the myopectineal orifice.', description: 'Laparoscopic repair of symptomatic left inguinal hernia.' },
        { diagnosis: 'Symptomatic bilateral inguinal hernia.', notes: 'Bilateral inguinal hernia repair performed with reduction of both hernial sacs and bilateral mesh hernioplasty.', description: 'Repair of symptomatic bilateral inguinal hernia.' },
      ]},
      'Open and laparoscopic repair of paraumbilical hernia': { min: 2, levels: ['2'], templates: [
        { diagnosis: 'Symptomatic paraumbilical hernia.', notes: 'Paraumbilical hernia sac dissected, contents reduced, and the fascial defect repaired with mesh reinforcement.', description: 'Open repair of symptomatic paraumbilical hernia.' },
        { diagnosis: 'Symptomatic paraumbilical hernia with a moderate fascial defect.', notes: 'Hernial contents reduced and the paraumbilical fascial defect closed with onlay mesh reinforcement.', description: 'Repair of symptomatic paraumbilical hernia with mesh reinforcement.' },
      ]},
      'Open and laparoscopic repair of recurrent hernia': { min: 1, levels: ['1'], templates: [
        { diagnosis: 'Recurrent ventral hernia after a previous mesh repair.', notes: 'Recurrent fascial defect identified adjacent to the previous mesh; hernial contents reduced and the defect repaired with wide mesh overlap.', description: 'Repair of recurrent ventral hernia after previous mesh repair.' },
      ]},
      'Open and laparoscopic repair of umbilical hernia': { min: 1, levels: ['1'], templates: [
        { diagnosis: 'Symptomatic umbilical hernia.', notes: 'Umbilical hernia sac dissected, contents reduced, and the fascial defect repaired with mesh reinforcement.', description: 'Open repair of symptomatic umbilical hernia.' },
      ]},
    },
  },
  {
    caseType: 'Basic Surgical Skill',
    procedural: {
      'Ability to use Surgical instruments and energy devices': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Acute appendicitis.', notes: 'Used monopolar diathermy for haemostasis during open appendicectomy under supervision.', description: 'Instrument/energy device use during appendicectomy.' },
        { diagnosis: 'Inguinal hernia.', notes: 'Demonstrated safe handling of bipolar forceps during hernia repair dissection.', description: 'Instrument use during hernia repair.' },
      ]},
      'Accurate and safe administration of local anaesthetic agent': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Excision of a sebaceous cyst.', notes: 'Local anaesthetic (lignocaine 2%) infiltrated safely around the lesion prior to excision, with aspiration performed before injection to avoid intravascular administration.', description: 'Local anaesthesia for cyst excision.' },
        { diagnosis: 'Incision and drainage of an abscess.', notes: 'Field block with local anaesthetic administered safely before incision and drainage, with attention to maximum safe dose.', description: 'Local anaesthesia for abscess drainage.' },
      ]},
      'Application and removal of skin staples/stitches': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Post-laparotomy wound closure.', notes: 'Skin staples applied evenly along the laparotomy incision under aseptic technique.', description: 'Skin staple application after laparotomy.' },
        { diagnosis: 'Suture removal after appendicectomy.', notes: 'Sutures removed from a well-healed appendicectomy wound after confirming adequate healing.', description: 'Suture removal after appendicectomy.' },
      ]},
      'Biopsy techniques (Core-cut biopsy, excision biopsy, incision biopsy)': { min: 5, levels: ['2','3'], templates: [
        { diagnosis: 'Palpable breast lump.', notes: 'Core-cut biopsy performed under local anaesthesia with an adequate tissue sample obtained for histopathology.', description: 'Core-cut biopsy of a breast lump.' },
        { diagnosis: 'Suspicious skin lesion.', notes: 'Excision biopsy performed with clear margins and the specimen sent for histopathological analysis.', description: 'Excision biopsy of a skin lesion.' },
      ]},
      'Central venous catheterization': { min: 3, levels: ['1','2','3'], templates: [
        { diagnosis: 'Septic shock requiring central venous access for vasopressor support.', notes: 'Right internal jugular central line inserted under ultrasound guidance; position confirmed on chest X-ray.', description: 'Central venous catheterization for septic shock.' },
        { diagnosis: 'Poor peripheral venous access requiring central access for treatment.', notes: 'Subclavian central venous catheter placed using standard landmark technique; no immediate complications.', description: 'Central line insertion for venous access.' },
      ]},
      'Drainage of superficial abscesses including Hilton’s method': { min: 3, levels: ['2','3','4'], templates: [
        { diagnosis: 'Superficial gluteal abscess.', notes: 'Abscess drained using Hilton\'s method with blunt dissection following the initial stab incision, avoiding injury to underlying structures.', description: 'Abscess drainage using Hilton\'s method.' },
        { diagnosis: 'Axillary abscess.', notes: 'Incision made over the point of maximum fluctuance and the cavity opened by blunt dissection per Hilton\'s method.', description: 'Drainage of an axillary abscess.' },
      ]},
      'Excision biopsy of benign lesions (lipoma, cyst, skin lesions etc.)': { min: 3, levels: ['2','3','4'], templates: [
        { diagnosis: 'Lipoma of the back.', notes: 'Lipoma excised in toto with the capsule intact and sent for histopathological confirmation.', description: 'Excision of a lipoma.' },
        { diagnosis: 'Sebaceous cyst of the scalp.', notes: 'Sebaceous cyst excised completely along with its wall to prevent recurrence.', description: 'Excision of a sebaceous cyst.' },
      ]},
      'Exposure, antiseptic washand draping': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Pre-operative preparation for appendicectomy.', notes: 'Operative site exposed, cleaned with antiseptic solution, and draped in a sterile fashion before incision.', description: 'Exposure and draping for appendicectomy.' },
        { diagnosis: 'Pre-operative preparation for hernia repair.', notes: 'Skin prepared with antiseptic wash and sterile draping performed prior to hernia repair.', description: 'Exposure and draping for hernia repair.' },
      ]},
      'Handling a Procedural specimen': { min: 5, levels: ['3','4'], templates: [
        { diagnosis: 'Appendicectomy specimen.', notes: 'Excised appendix handled appropriately, labelled correctly, and sent in formalin to histopathology.', description: 'Handling of an appendicectomy specimen.' },
        { diagnosis: 'Excision biopsy specimen.', notes: 'Excised tissue specimen orientated, labelled, and preserved correctly for histopathological examination.', description: 'Handling of a biopsy specimen.' },
      ]},
      'Intravenous cannulation': { min: 10, levels: ['4'], templates: [
        { diagnosis: 'Acute gastroenteritis with dehydration.', notes: 'IV cannula inserted for fluid resuscitation in a dehydrated patient.', description: 'IV cannulation for fluid resuscitation.' },
        { diagnosis: 'Pre-operative preparation for elective hernia repair.', notes: 'Peripheral IV line secured pre-operatively for elective hernia repair.', description: 'IV cannulation pre-operatively.' },
      ]},
      'Introduction and removal of Procedural drains': { min: 3, levels: ['1','2','3'], templates: [
        { diagnosis: 'Post-laparotomy drain placement.', notes: 'Abdominal drain introduced correctly at the end of laparotomy and secured; drain removed once output criteria were met.', description: 'Drain insertion and removal after laparotomy.' },
        { diagnosis: 'Post-abscess-drainage corrugated drain.', notes: 'Corrugated drain introduced into the abscess cavity and removed after adequate drainage was confirmed.', description: 'Drain insertion and removal after abscess drainage.' },
      ]},
      'Positioning of the patient': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Appendicectomy.', notes: 'Patient positioned supine with appropriate padding before the appendicectomy.', description: 'Patient positioning for appendicectomy.' },
        { diagnosis: 'Laparoscopic cholecystectomy.', notes: 'Patient positioned supine with slight reverse Trendelenburg and left tilt for optimal exposure.', description: 'Patient positioning for cholecystectomy.' },
      ]},
      'Safe tying of knots (hand/instrumental/on the surface and at depth)': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Appendicectomy stump ligation.', notes: 'Appendicular stump securely ligated using safe instrument-tying technique.', description: 'Knot tying during appendicectomy.' },
        { diagnosis: 'Hernia sac ligation.', notes: 'Hernial sac ligated at its neck using a secure surgeon\'s knot.', description: 'Knot tying during hernia repair.' },
      ]},
      'Securing bleeding vessels': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Bleeding during appendicectomy.', notes: 'Bleeding mesoappendiceal vessel identified and secured with ligation.', description: 'Vessel securing during appendicectomy.' },
        { diagnosis: 'Bleeding during hernia repair.', notes: 'Small bleeding vessel in the hernia sac controlled with diathermy and ligation.', description: 'Vessel securing during hernia repair.' },
      ]},
      'Skin incision and closure': { min: 10, levels: ['2','3'], templates: [
        { diagnosis: 'Appendicectomy.', notes: 'Gridiron incision made and, at the end of the procedure, layered closure of the abdominal wall performed.', description: 'Skin incision and closure for appendicectomy.' },
        { diagnosis: 'Laparotomy.', notes: 'Midline incision made for laparotomy and mass closure of the abdominal wall performed at the end of surgery.', description: 'Skin incision and closure for laparotomy.' },
      ]},
      'Surgical Ritual (Effective and safe hand washing, donning and doffing)': { min: 5, levels: ['3','4'], templates: [
        { diagnosis: 'Pre-operative scrub for appendicectomy.', notes: 'Surgical hand wash performed following standard protocol, followed by correct gowning and gloving before the procedure.', description: 'Surgical hand hygiene and gowning for appendicectomy.' },
        { diagnosis: 'Pre-operative scrub for hernia repair.', notes: 'Standard surgical scrub technique performed and sterile gown/gloves donned correctly before hernia repair.', description: 'Surgical hand hygiene and gowning for hernia repair.' },
      ]},
      'Urinary bladder catheterization': { min: 5, levels: ['3','4'], templates: [
        { diagnosis: 'Acute urinary retention post-herniorrhaphy.', notes: 'Foley catheter inserted under aseptic technique; residual urine drained and documented.', description: 'Urinary catheterization for post-operative retention.' },
        { diagnosis: 'Pre-operative catheterization for planned laparotomy.', notes: 'Indwelling catheter placed for intra-operative urine output monitoring.', description: 'Pre-operative urinary catheterization.' },
      ]},
    },
    communication: {
      'Death Certificate': { min: 3, templates: [
        { diagnosis: 'Acute myocardial infarction with cardiogenic shock.', notes: 'Death certificate issued after confirming irreversible cardiac arrest; time of death recorded and family counselled.', description: 'Death certificate completed for a case of fatal myocardial infarction.' },
        { diagnosis: 'Severe traumatic brain injury following a road traffic accident.', notes: 'Death certificate prepared following brain-stem death confirmation by the attending team; cause and manner of death documented.', description: 'Death certificate issued for a fatal head injury case.' },
      ]},
      'Discharge certificate': { min: 3, templates: [
        { diagnosis: 'Recovered right inguinal hernia repair.', notes: 'Discharge certificate issued confirming fitness to resume light duties after uneventful hernia repair recovery.', description: 'Discharge certificate for post-herniorrhaphy recovery.' },
        { diagnosis: 'Healed appendicectomy wound.', notes: 'Discharge certificate provided certifying satisfactory wound healing and readiness for discharge.', description: 'Discharge certificate after appendicectomy.' },
      ]},
      'Discharge summary': { min: 3, templates: [
        { diagnosis: 'Laparoscopic cholecystectomy for symptomatic cholelithiasis.', notes: 'Discharge summary prepared detailing the operative course, post-operative recovery, and follow-up advice.', description: 'Discharge summary after laparoscopic cholecystectomy.' },
        { diagnosis: 'Incision and drainage of a perianal abscess.', notes: 'Discharge summary documented outlining the procedure, wound care instructions, and review schedule.', description: 'Discharge summary following perianal abscess drainage.' },
      ]},
      'Documentation of injuries and disabilities': { min: 5, templates: [
        { diagnosis: 'Multiple soft tissue injuries following an assault.', notes: 'Injuries documented in detail with measurements, and disability assessment recorded for medico-legal purposes.', description: 'Injury documentation for an alleged assault case.' },
        { diagnosis: 'Degloving injury of the left hand from a machinery accident.', notes: 'Extent of injury and resulting functional disability carefully documented for a medico-legal certificate.', description: 'Documentation of an industrial hand injury.' },
      ]},
      'Obtaining informed written consent': { min: 5, templates: [
        { diagnosis: 'Planned open appendicectomy.', notes: 'Procedure, risks, benefits and alternatives explained in the patient’s own language; written informed consent obtained and witnessed.', description: 'Informed consent for appendicectomy.' },
        { diagnosis: 'Planned laparoscopic cholecystectomy.', notes: 'Risks including bile duct injury and conversion to open surgery discussed; signed consent form completed.', description: 'Informed consent for cholecystectomy.' },
      ]},
      'Operation note': { min: 5, templates: [
        { diagnosis: 'Acute appendicitis.', notes: 'Operation note recorded detailing the open appendicectomy steps, findings of an inflamed appendix, and closure technique.', description: 'Operation note for appendicectomy.' },
        { diagnosis: 'Strangulated inguinal hernia.', notes: 'Operative findings, bowel viability assessment, and hernioplasty steps documented in detail.', description: 'Operation note for hernia repair.' },
      ]},
      'Post-operative order': { min: 5, templates: [
        { diagnosis: 'Post-appendicectomy care.', notes: 'Post-operative orders written including analgesia, IV fluids, diet advancement plan, and wound care instructions.', description: 'Post-operative orders after appendicectomy.' },
        { diagnosis: 'Post-cholecystectomy care.', notes: 'Orders documented for pain control, early mobilisation, and monitoring for bile leak or fever.', description: 'Post-operative orders after cholecystectomy.' },
      ]},
      'Preoperative order': { min: 5, templates: [
        { diagnosis: 'Pre-operative preparation for elective cholecystectomy.', notes: 'Pre-operative orders written including fasting instructions, consent verification, and pre-anaesthetic check-up.', description: 'Preoperative orders for cholecystectomy.' },
        { diagnosis: 'Pre-operative preparation for hernia repair.', notes: 'Orders documented for skin preparation, prophylactic antibiotics, and fasting status confirmation.', description: 'Preoperative orders for hernioplasty.' },
      ]},
      'Referral note': { min: 3, templates: [
        { diagnosis: 'Suspected deep vein thrombosis.', notes: 'Referral note written summarising clinical findings, relevant investigations, and reason for specialist review.', description: 'Referral note to vascular surgery.' },
        { diagnosis: 'Incidental mass found on imaging.', notes: 'Referral letter prepared outlining the findings and urgency of oncological evaluation.', description: 'Referral note to oncology department.' },
      ]},
      'Requisition for investigations (Laboratory, Biochemical, Imaging, Histopathological analysis and immunohistochemitry)': { min: 5, templates: [
        { diagnosis: 'Suspected cholelithiasis.', notes: 'Investigation request form completed with relevant clinical details for radiology correlation.', description: 'Requisition for abdominal ultrasound.' },
        { diagnosis: 'Blunt abdominal trauma.', notes: 'Urgent imaging requisition completed with a clinical summary for prompt reporting.', description: 'Requisition for CT scan of the abdomen.' },
      ]},
    },
  },
  {
    caseType: 'Procedural Nutrition',
    interpretative: {
      'Laboratory and biochemical analysis of nutritional status': { min: 5, templates: [
        { indication: 'Malnourished surgical patient requiring nutritional assessment.', interpretation: 'Biochemical analysis shows low serum albumin and prealbumin consistent with malnutrition.', description: 'Biochemical analysis of nutritional status.' },
      ]},
    },
    procedural: {
      'Administration of nasogastric / nasojejunal feeding': { min: 3, levels: ['4'], templates: [
        { diagnosis: 'Upper GI obstruction requiring enteral support.', notes: 'Enteral feeding tube positioned, placement confirmed, and feeding initiated according to plan.', description: 'Administration of nasogastric / nasojejunal feeding for upper GI obstruction requiring enteral support.' },
      ]},
      'Construction of feeding gastrostomy / Jejunostomy': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Malnutrition in a surgical patient unable to tolerate oral intake long-term.', notes: 'Feeding gastrostomy constructed and secured with confirmation of luminal patency and absence of leak.', description: 'Construction of feeding gastrostomy for malnutrition in a surgical patient.' },
      ]},
      'PEG tube insertion / replacement': { min: 1, levels: ['1','2'], templates: [
        { diagnosis: 'Dysphagia requiring long-term enteral feeding access.', notes: 'PEG tube inserted endoscopically under aseptic technique with confirmed correct position.', description: 'PEG tube insertion for long-term enteral feeding.' },
      ]},
      'Venous cannulation for central and peripheral parenteral feeding': { min: 1, levels: ['2','3'], templates: [
        { diagnosis: 'Malnutrition in a surgical patient requiring parenteral nutritional support.', notes: 'Venous access established under aseptic technique for planned parenteral nutritional support.', description: 'Venous cannulation for parenteral feeding for malnutrition in a surgical patient.' },
      ]},
    },
  },
];
