import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

// ─── Name pools ───
const FIRST = [
  'Rahima','Nasrin','Farzana','Salma','Sharmin','Rokeya','Jannatul','Nusrat','Fatema','Ayesha',
  'Rashida','Mariam','Sumaiya','Taslima','Rehana','Shahnaz','Dilara','Farida','Hasina','Razia',
  'Amina','Kulsum','Nazneen','Parveen','Tania','Rina','Jharna','Bithi','Shilpi','Shamima',
  'Khadija','Halima','Zahra','Lubna','Maliha','Tanzina','Sabina','Rumana','Munira','Nazia',
  'Jesmin','Shapla','Shefali','Moushumi','Kakoli','Soma','Ruma','Shiuli','Monira','Selina',
  'Josna','Shanta','Bilkis','Asma','Rabeya','Jahanara','Kamrun','Nurjahan','Suraya','Anwara',
  'Majeda','Saleha','Feroza','Momtaz','Ruksana','Zohra','Nazma','Kohinoor','Morsheda','Chameli',
  'Dolly','Tuli','Lipi','Shoma','Sathi','Jhilik','Nurun','Meher','Tahmina','Mahmuda',
  'Rawshan','Jabin','Farjana','Tasnim','Lamia','Nabila','Sadia','Afroza','Laila','Sajeda',
  'Anjuman','Asiya','Hafsa','Zannat','Suraiya','Mahfuza','Shahida','Sakina','Masuda','Hamida',
  'Nilufa','Nilufar','Pervin','Latifa','Romana','Arifa','Afrin','Ismat','Wahida','Nasima',
  'Shahin','Sayma','Naima','Tamanna','Rupa','Mina','Luna','Ratna','Rekha','Mili',
  'Mithila','Shraboni','Barsha','Bristy','Ruhi','Nandini','Swarna','Jhuma','Maisha','Raisa',
  'Faiza','Saima','Umme','Safina','Tasfia','Laboni','Mukta','Shirin','Mehrin','Fahima',
  'Rubina','Rownak','Kaniz','Konika','Dalia','Shapna','Hosne','Masuma','Bina','Dina',
];
const LAST = [
  'Begum','Akter','Khatun','Sultana','Jahan','Ferdous','Yasmin','Ara','Nahar','Banu',
  'Nessa','Parvin','Akhter','Khanam','Naznin','Moni','Bibi','Siddiqua','Parveen','Fatima',
  'Noor','Afroz','Rani','Sarkar','Sikder','Mondal','Talukder','Hawlader','Ferdousi','Nazneen',
  'Laizu','Pervin','Nisa','Rumi','Shathi','Lata','Ranu','Taposhi','Chanda','Aktar',
  'Khatoon','Devi','Bala','Mala','Jheel',
];

// ─── Complexity-based level mapping ───
type Complexity = 'Basic' | 'Intermediate' | 'Advanced';
const COMPLEXITY: Record<string, Complexity> = {
  // Gyn Basic
  'Cervical Biopsy taking':'Basic','Cervical polypectomy and D & C':'Basic','D & C, E & C':'Basic',
  'Endometrial Sampling':'Basic','Examination Under Anesthesia':'Basic','MVA':'Basic',
  'Suction Evacuation':'Basic','Taking High Vaginal Swab /Endo-Cervical':'Basic','VIA':'Basic','Colposcopy':'Basic',
  // Gyn Intermediate
  'Cystoscopy':'Intermediate','Debridement and secondary suture of SSI':'Intermediate',
  'Excision of Vaginal Cyst':'Intermediate','Excision of urcthral caruncle':'Intermediate',
  'Hysteroscopy':'Intermediate','Incision, drainage & marsupialization':'Intermediate',
  'L E E P':'Intermediate','Minilap (BLTL)':'Intermediate','Excison of scar Endometriosis':'Intermediate',
  'Vault prolapse repair':'Intermediate',
  // Gyn Advanced
  'Adenomyomectomy':'Advanced','Adhesiolysis /Fulgaration of endometriotic foci':'Advanced',
  'Hysterectomy':'Advanced','Laparoscopy':'Advanced','Myomectomy':'Advanced',
  'Ovarian cystectomy':'Advanced','PFR (Pelvic floor Repair)':'Advanced',
  'Radical Surgeries':'Advanced','Recanalization':'Advanced','Salpingo-oophorectomy':'Advanced',
  // Obs Basic
  'Delivery':'Basic','Episiotomy and repair':'Basic','New born care':'Basic','Management of SSI':'Basic',
  // Obs Intermediate
  'Amniocentesis':'Intermediate','Cervical Cerclage':'Intermediate',
  'Cervical laceration - Detection and repair':'Intermediate','Manual removal of placenta':'Intermediate',
  'OASIS - Detection and repair':'Intermediate','Vulval hematoma - Identification and Management':'Intermediate',
  // Obs Advanced
  'CVS (Chorionic Villous Sampling)':'Advanced','Cord Prolapse management':'Advanced',
  'Destructive Surgery':'Advanced','Peripartum Hysterectomy':'Advanced',
  'Repair of Ruptured Uterus':'Advanced','Uterine inversion management':'Advanced',
};
function levelForComplexity(c: Complexity): string {
  const r = Math.random();
  if (c === 'Basic') return r < 0.70 ? '1' : '2';
  if (c === 'Intermediate') return r < 0.40 ? '2' : r < 0.90 ? '3' : '4';
  return r < 0.10 ? '2' : r < 0.50 ? '3' : '4'; // Advanced
}

// ─── Competency-specific clinical data ───
interface ClinicalData { diagnosis: string[]; notes: string[]; desc: string[] }

const GYN_PROC: Record<string, ClinicalData> = {
  'Adenomyomectomy': {
    diagnosis: [
      'Patient presented with progressively worsening menorrhagia and severe dysmenorrhea over the past one year. Pelvic ultrasonography revealed a bulky uterus with heterogeneous myometrial echotexture suggestive of adenomyosis. Diagnosis was symptomatic uterine adenomyosis with secondary anemia.',
      'Patient complained of chronic pelvic pain and heavy prolonged menstrual bleeding not responding to medical management. MRI pelvis confirmed focal adenomyosis involving the posterior wall of the uterus. Diagnosis was focal adenomyosis with failed medical therapy.',
      'Patient presented with cyclical pelvic pain, dysmenorrhea, and prolonged heavy menstrual bleeding causing significant impact on quality of life. Transvaginal ultrasonography showed diffuse myometrial heterogeneity with sub-endometrial cysts consistent with adenomyosis. Diagnosis was diffuse adenomyosis with menorrhagia and dysmenorrhea.',
    ],
    notes: [
      'After adequate pre-operative preparation and administration of general anesthesia, laparotomy was performed through a Pfannenstiel incision. The uterus was found to be bulky and the adenomyotic area was identified by palpation and visual inspection. Wedge excision of the adenomyotic tissue was carefully performed preserving the endometrial cavity. The myometrial defect was repaired in two layers using interrupted Vicryl sutures and hemostasis was confirmed. The specimen was sent for histopathological examination and the abdomen was closed in layers after ensuring complete hemostasis.',
      'Under general anesthesia, the abdomen was opened through a lower midline incision. The uterus was delivered and the focal adenomyotic mass in the posterior wall was identified. Careful excision of the adenomyotic tissue was carried out using a combination of sharp and electrocautery dissection. The uterine wall was reconstructed in multiple layers ensuring good tissue approximation. Hemostasis was achieved at each step and the operative field was inspected for any residual bleeding before abdominal closure.',
      'Patient was positioned in supine position and general anesthesia was administered. Pfannenstiel incision was made and the peritoneal cavity was entered. The uterus was exteriorized revealing a diffusely enlarged myometrium. The adenomyotic tissue was systematically excised using electrocautery while preserving the endometrial lining. The myometrial defect was closed in three layers with continuous locking sutures and interrupted mattress sutures for reinforcement. Hemostasis was confirmed and the specimen was labeled and sent for histopathological examination.',
    ],
    desc: [
      'Adenomyomectomy was completed successfully with adequate excision of adenomyotic tissue. The patient tolerated the procedure well and was shifted to the post-operative ward in stable condition.',
      'The adenomyomectomy procedure was performed without any intraoperative complications. Hemostasis was secured and the patient was transferred to recovery in stable hemodynamic condition.',
      'Excision of adenomyotic tissue was accomplished with preservation of the uterine cavity. The patient remained hemodynamically stable throughout and was shifted to the post-operative recovery area.',
    ],
  },
  'Adhesiolysis /Fulgaration of endometriotic foci': {
    diagnosis: [
      'Patient presented with chronic pelvic pain, dysmenorrhea, and dyspareunia for the past two years with progressive worsening. Diagnostic laparoscopy revealed dense pelvic adhesions involving bilateral adnexa and cul-de-sac with scattered endometriotic deposits. Diagnosis was pelvic endometriosis with extensive adhesion formation.',
      'Patient complained of subfertility of four years duration with associated chronic lower abdominal pain. Transvaginal ultrasonography showed features suggestive of endometrioma and clinical examination revealed fixed retroverted uterus. Diagnosis was endometriosis stage III with pelvic adhesions causing tubo-ovarian distortion.',
      'Patient presented with worsening cyclical pelvic pain and heavy irregular menstrual bleeding not responding to hormonal therapy. Clinical evaluation and imaging suggested pelvic endometriosis. Laparoscopy confirmed dense adhesions between uterus, bowel, and both adnexa with multiple endometriotic foci on peritoneal surfaces.',
    ],
    notes: [
      'Under general anesthesia, diagnostic and operative laparoscopy was performed using a three-port technique. Dense adhesions were noted between the uterus and anterior abdominal wall, bilateral tubes, ovaries, and bowel. Systematic adhesiolysis was carried out using a combination of sharp dissection and bipolar electrocautery with careful identification of the ureters at each step. Endometriotic implants on the peritoneal surfaces and uterosacral ligaments were fulgurated using bipolar cautery. Thorough inspection of the pelvis was performed to ensure complete treatment and adequate hemostasis was confirmed before port closure.',
      'Laparoscopy was performed under general anesthesia. Pneumoperitoneum was created using Veress needle technique and three ports were placed. Extensive pelvic adhesions were observed distorting the normal anatomy with bilateral tubes adherent to the ovaries. Adhesiolysis was performed using a combination of aqua-dissection, blunt dissection, and sharp scissors. Multiple endometriotic foci were identified on the pouch of Douglas, bladder peritoneum, and bilateral ovarian surfaces and were systematically fulgurated using bipolar diathermy. Both ureters were visualized and found to be safe and complete hemostasis was achieved.',
      'Under general anesthesia, laparoscopic access was established and pneumoperitoneum was achieved. On inspection, dense vascular adhesions were found between the posterior surface of the uterus and the rectosigmoid colon. Careful adhesiolysis was performed using harmonic scalpel maintaining safe distance from the bowel serosa. Endometriotic nodules were fulgurated and superficial peritoneal implants were excised and sent for histopathological examination. The tubes were found to be patent on chromopertubation after adhesiolysis and hemostasis was confirmed at the end of the procedure.',
    ],
    desc: [
      'Adhesiolysis and fulguration of endometriotic foci was completed successfully with restoration of normal pelvic anatomy. The patient tolerated the procedure well and was shifted to the recovery area in stable condition.',
      'Laparoscopic adhesiolysis and fulguration of endometriotic implants was accomplished without complications. Bilateral tubal patency was confirmed and the patient recovered well from anesthesia.',
      'The procedure was completed with thorough adhesiolysis and systematic fulguration of all visible endometriotic deposits. The patient maintained hemodynamic stability throughout and was transferred to the post-operative ward.',
    ],
  },
  'Cervical Biopsy taking': {
    diagnosis: [
      'Patient presented for evaluation of an abnormal cervical appearance detected during routine screening examination. Speculum examination revealed a suspicious growth on the anterior lip of the cervix with irregular surface and contact bleeding. Diagnosis was suspicious cervical lesion requiring histopathological evaluation.',
      'Patient was referred for colposcopy following an abnormal Pap smear result showing high-grade squamous intraepithelial lesion. Visual inspection of the cervix revealed an acetowhite area with abnormal vascular pattern at the transformation zone. Diagnosis was cervical dysplasia for directed biopsy.',
      'Patient complained of post-coital bleeding and irregular vaginal discharge for the past three months. On speculum examination, a friable, exophytic growth was observed on the posterior lip of the cervix measuring approximately 2 cm. Diagnosis was cervical growth for biopsy to rule out malignancy.',
    ],
    notes: [
      'Patient was placed in lithotomy position and the cervix was visualized using a Cusco speculum. The suspicious area on the anterior lip was identified and 5% acetic acid was applied for better delineation of the lesion. Punch biopsy was taken from the most suspicious area using a cervical biopsy forceps under direct visualization. Hemostasis was achieved by application of Monsel solution to the biopsy site. The specimen was labeled and placed in formalin for histopathological examination.',
      'Colposcopy-directed biopsy was performed with the patient in dorsal lithotomy position. The cervix was visualized and 5% acetic acid was applied followed by Lugol iodine solution. Acetowhite areas with mosaic pattern were identified at the squamocolumnar junction. Multiple punch biopsies were taken from the most abnormal appearing areas and an endocervical curettage was also performed. Bleeding was controlled with silver nitrate application and all specimens were sent separately for histopathological examination.',
      'Under adequate light and with the patient in lithotomy position, the cervix was exposed using a bivalve speculum. The growth on the posterior lip was carefully inspected and its margins delineated after application of acetic acid. A generous punch biopsy was taken from the edge of the growth including normal tissue margin. Hemostasis was secured using Monsel paste applied with a cotton-tipped applicator. The specimen was fixed in 10% formalin and sent for urgent histopathological examination.',
    ],
    desc: [
      'Cervical biopsy was taken successfully from the suspicious area and sent for histopathological examination. The patient was advised to avoid intercourse for two weeks and to report any heavy bleeding.',
      'Colposcopy-directed cervical biopsy was completed without complications. Hemostasis was secured and the patient was discharged with instructions for follow-up with biopsy results.',
      'Cervical biopsy was performed successfully and the specimen was sent for histopathological evaluation. The patient tolerated the procedure well and was in stable condition at discharge.',
    ],
  },
  'Cervical polypectomy and D & C': {
    diagnosis: [
      'Patient presented with irregular intermenstrual bleeding and post-coital spotting for the past four months. Speculum examination revealed a pedunculated polyp arising from the cervical canal measuring approximately 1.5 cm. Diagnosis was endocervical polyp with abnormal uterine bleeding.',
      'Patient complained of heavy menstrual bleeding with passage of clots and a sensation of something protruding from the vagina. On examination, a large cervical polyp was found protruding through the external os with associated contact bleeding. Diagnosis was cervical polyp with menorrhagia requiring polypectomy and endometrial evaluation.',
      'Patient presented for evaluation of persistent vaginal discharge and spotting between periods. Clinical examination identified a small cervical polyp at the external os and ultrasound showed slightly thickened endometrium. Diagnosis was cervical polyp with endometrial thickening requiring polypectomy and diagnostic curettage.',
    ],
    notes: [
      'Patient was placed in lithotomy position and the cervix was visualized with a speculum. The cervical polyp was identified at the external os and grasped with polyp forceps. The polyp was gently twisted at its base until detached and removed intact. Following polypectomy, cervical dilatation was performed using Hegar dilators up to size 8 and systematic curettage of the uterine cavity was carried out using a sharp curette. Adequate endometrial tissue was obtained and both the polyp and endometrial curetting were sent separately for histopathological examination.',
      'Under intravenous sedation, the cervix was exposed and the large pedunculated polyp was identified. The polyp base was clamped with ring forceps and the polyp was avulsed by twisting and gentle traction. The base of the polyp was cauterized for hemostasis. Cervical dilatation was then performed and systematic D&C was carried out to obtain endometrial tissue for histopathological evaluation. The uterine cavity was confirmed empty and hemostasis was achieved. Both specimens were labeled and sent for histopathology.',
      'Patient was positioned and draped in lithotomy position. The cervical polyp was grasped and removed by torsion at its base. Following polypectomy, the cervix was dilated with graduated Hegar dilators and a systematic endometrial curettage was performed using a sharp curette. Tissue obtained was adequate for histopathological evaluation. No uterine perforation was noted and the procedure was completed without complications. Hemostasis was confirmed and all specimens were preserved in formalin and sent for HPE.',
    ],
    desc: [
      'Cervical polypectomy and D&C were completed successfully with adequate tissue obtained for histopathological examination. The patient tolerated the procedure well and was discharged in stable condition.',
      'Polypectomy with diagnostic curettage was performed without any intraoperative complications. The specimens were sent for histopathology and the patient recovered uneventfully.',
      'The cervical polyp was removed and endometrial curettage was accomplished successfully. Hemostasis was secured and the patient was shifted to the recovery area in stable condition.',
    ],
  },
  'Colposcopy': {
    diagnosis: [
      'Patient was referred for colposcopic evaluation following an abnormal Pap smear result showing atypical squamous cells of undetermined significance. Previous VIA screening was positive with an acetowhite area noted on the cervix. Diagnosis was abnormal cervical cytology requiring colposcopic assessment.',
      'Patient presented for follow-up colposcopy after a previous LSIL result on cervical cytology. She had a history of HPV positivity and persistent abnormal Pap smear results. Diagnosis was persistent low-grade cervical intraepithelial lesion for colposcopic evaluation and directed biopsy if indicated.',
      'Patient was referred from a cervical cancer screening program with a VIA-positive result. She had no prior history of cervical abnormality and was asymptomatic. Diagnosis was VIA-positive cervical screening requiring confirmatory colposcopy for further evaluation.',
    ],
    notes: [
      'The patient was placed in lithotomy position and the cervix was visualized using a bivalve speculum. Colposcopy was performed using a video colposcope with adequate magnification. Five percent acetic acid was applied to the cervix and the transformation zone was fully visualized. The squamocolumnar junction was identified and the acetowhite changes, if any, were mapped and documented. Lugol iodine was applied and any iodine-negative areas were noted. Colposcopic impression was recorded and directed biopsy was taken from the most suspicious area. The findings were documented with colpophotographs.',
      'Colposcopic examination was performed under adequate lighting with the patient in dorsal lithotomy position. After gentle insertion of the speculum, the cervix was exposed and any discharge was removed with a dry swab. Acetic acid was applied and the transformation zone was assessed systematically. The squamocolumnar junction was fully visible and the colposcopy was deemed satisfactory. Green filter was applied to assess vascular patterns. The colposcopic findings were classified according to the IFCPC nomenclature and documented. No obvious high-grade lesion was identified and the cervix appeared normal after both acetic acid and Lugol iodine application.',
      'With the patient in lithotomy position, colposcopy was performed after adequate cervical visualization. Five percent acetic acid was applied to the ectocervix and the transformation zone was carefully inspected at varying magnifications. An acetowhite area with fine mosaic pattern was noted at the anterior lip extending to the twelve o-clock position. Lugol iodine staining confirmed a non-staining area corresponding to the acetowhite lesion. Directed punch biopsy was taken from the most abnormal area and endocervical curettage was also performed. Hemostasis was achieved with Monsel paste and all specimens were sent for histopathological examination.',
    ],
    desc: [
      'Colposcopic examination was completed satisfactorily with full visualization of the transformation zone and squamocolumnar junction. The findings were documented and the patient was advised regarding follow-up with biopsy results.',
      'Colposcopy was performed successfully and the findings were recorded according to standard nomenclature. The patient tolerated the procedure well and was discharged with follow-up instructions.',
      'The colposcopic evaluation was completed with directed biopsy taken from the identified abnormal area. Hemostasis was secured and the patient was in stable condition at the end of the procedure.',
    ],
  },
  'Cystoscopy': {
    diagnosis: [
      'Patient presented with recurrent lower urinary tract symptoms including frequency, urgency, and dysuria not responding to multiple courses of antibiotics. Urine culture was sterile on repeated testing despite persistent symptoms. Diagnosis was chronic lower urinary tract symptoms requiring cystoscopic evaluation to rule out bladder pathology.',
      'Patient complained of persistent urinary leakage through the vagina following a previous cesarean section performed two months ago. Clinical examination revealed pooling of fluid in the posterior fornix and a positive dye test. Diagnosis was suspected vesicovaginal fistula requiring cystoscopic evaluation for confirmation and localization.',
      'Patient presented with hematuria and recurrent urinary tract infections over the past six months. Ultrasonography of the kidneys, ureters, and bladder was unremarkable. Diagnosis was recurrent hematuria requiring cystoscopic evaluation to identify the source of bleeding.',
    ],
    notes: [
      'Under local anesthesia and aseptic conditions, rigid cystoscopy was performed using a 17 French cystoscope. The urethra was visualized and found to be normal in caliber and mucosa. The bladder was distended with normal saline and systematic inspection of the bladder mucosa was carried out. The trigone, bladder dome, and lateral walls were examined. Both ureteric orifices were identified and bilateral ureteric jets were seen. No mass, mucosal lesion, stone, or fistula tract was identified. The bladder capacity was adequate and the procedure was completed without complications.',
      'Cystoscopy was performed under local anesthesia with the patient in lithotomy position. The rigid cystoscope was introduced gently through the urethra into the bladder. The bladder was distended with sterile saline and a systematic clockwise inspection of the entire bladder wall was carried out. The trigone and both ureteric orifices were carefully examined. A small fistulous opening was identified on the posterior bladder wall approximately 2 cm above the trigone. The location and size of the fistula were documented for surgical planning. The procedure was completed without any complications.',
      'Under local anesthesia, the cystoscope was introduced per urethra and the bladder was filled with normal saline for adequate distension. The urethra appeared normal throughout its length. Systematic inspection of the bladder was performed examining the dome, anterior wall, posterior wall, lateral walls, and trigone area. Both ureteric orifices were visualized with clear bilateral ureteric jets. The bladder mucosa appeared healthy with no evidence of inflammation, tumor, or calculus. The procedure was tolerated well and the findings were documented.',
    ],
    desc: [
      'Cystoscopic examination was completed successfully with thorough inspection of the bladder and urethra. The findings were documented and the patient was discharged in stable condition.',
      'Cystoscopy was performed without complications and the fistula was identified and localized for surgical planning. The patient tolerated the procedure well and was shifted for post-procedure observation.',
      'The cystoscopic evaluation was completed with normal findings and no bladder pathology was identified. The patient recovered well and was discharged with the detailed examination report.',
    ],
  },
  'D & C, E & C': {
    diagnosis: [
      'Patient presented with heavy vaginal bleeding and passage of products of conception following an incomplete miscarriage at eight weeks of gestation. Ultrasonography confirmed retained products of conception with significant intrauterine echoes. Diagnosis was incomplete abortion requiring surgical evacuation.',
      'Patient complained of prolonged heavy menstrual bleeding for the past three cycles with associated fatigue and dizziness. Transvaginal ultrasonography showed endometrial thickness of 18 mm with heterogeneous echotexture. Diagnosis was abnormal uterine bleeding with thickened endometrium requiring diagnostic dilatation and curettage.',
      'Patient presented with missed abortion at ten weeks of gestation diagnosed on routine ultrasonography showing absent fetal cardiac activity. She had mild spotting and lower abdominal cramping. Diagnosis was missed abortion at ten weeks requiring evacuation of retained products of conception.',
    ],
    notes: [
      'Under general anesthesia, the patient was placed in lithotomy position and the cervix was visualized with a speculum. The anterior lip of the cervix was grasped with a vulsellum forceps. The cervical canal was dilated using graduated Hegar dilators up to size 10. Systematic curettage of the uterine cavity was performed using sharp and blunt curettes. Products of conception were evacuated and the uterine cavity was confirmed empty by a gritty sensation. Hemostasis was confirmed and the tissue obtained was sent for histopathological examination. The estimated blood loss was minimal.',
      'Patient was positioned in lithotomy and draped. Under intravenous sedation, the cervix was dilated with Hegar dilators. Systematic curettage was performed using a sharp curette covering all walls of the uterine cavity. Adequate endometrial tissue was obtained for histopathological evaluation. The uterine cavity was re-explored to confirm complete evacuation. No perforation was detected and hemostasis was confirmed with minimal bleeding. The specimen was preserved in formalin and labeled for HPE.',
      'Under general anesthesia, the cervix was grasped with vulsellum and progressively dilated with Hegar dilators. The retained products of conception were evacuated using a combination of ovum forceps for larger fragments and sharp curette for systematic curettage. The uterine cavity was thoroughly explored until a gritty sensation was felt confirming complete evacuation. Oxytocin infusion was started to promote uterine contraction. All tissue obtained was inspected for completeness and sent for histopathological examination. Hemostasis was achieved and the procedure was completed without complication.',
    ],
    desc: [
      'Dilatation and curettage was completed successfully with complete evacuation of uterine contents. The patient was hemodynamically stable and shifted to the post-procedure observation area.',
      'Diagnostic D&C was performed without complications and adequate tissue was obtained for histopathological examination. The patient recovered well from anesthesia and was discharged with follow-up instructions.',
      'Evacuation and curettage was accomplished successfully with complete removal of retained products confirmed. The patient tolerated the procedure well and was transferred to recovery in stable condition.',
    ],
  },
  'Debridement and secondary suture of SSI': {
    diagnosis: [
      'Patient developed purulent discharge and wound gaping at the surgical site on post-operative day seven following an abdominal hysterectomy. Wound examination revealed necrotic tissue with surrounding erythema and induration. Diagnosis was surgical site infection with wound dehiscence requiring debridement and secondary closure.',
      'Patient presented with increasing pain, swelling, and serosanguinous discharge from the Pfannenstiel incision site on post-operative day five following cesarean section. Wound culture grew Staphylococcus aureus. Diagnosis was deep surgical site infection with early wound dehiscence.',
      'Patient was referred with a gaping surgical wound following a previous laparotomy performed ten days ago. The wound edges were inflamed with undermining and unhealthy granulation tissue. Diagnosis was post-operative wound infection with partial wound dehiscence requiring debridement and secondary repair.',
    ],
    notes: [
      'Under local anesthesia, the wound was opened completely and all purulent material was drained. Thorough debridement of necrotic and devitalized tissue was performed using sharp dissection. The wound was irrigated extensively with warm normal saline and hydrogen peroxide solution. Wound edges were freshened until healthy bleeding tissue was visible. Secondary closure was performed using interrupted tension sutures with a drain placed in the subcutaneous space. The wound was dressed with sterile gauze and the patient was started on appropriate antibiotics based on culture sensitivity.',
      'The infected surgical wound was explored under local anesthesia. Wound edges were retracted and pockets of pus were identified and drained. All necrotic slough and unhealthy tissue were debrided systematically using sharp curette and scissors. The wound bed was irrigated with copious normal saline followed by betadine solution. Once a clean wound bed was achieved with healthy granulation tissue, secondary suturing was performed in layers using interrupted non-absorbable sutures. A corrugated drain was placed and the wound was dressed appropriately.',
      'Patient was taken to the operation theater for wound management. Under adequate analgesia, the wound was opened and thoroughly explored. Necrotic tissue was excised and the wound was debrided until fresh bleeding edges were obtained. The wound cavity was irrigated with normal saline containing metronidazole. The rectus sheath integrity was assessed and found to be intact. Secondary closure was done using deep tension sutures of nylon including the rectus sheath and skin. Subcutaneous drain was placed and the wound was covered with sterile dressing. Antibiotics were adjusted based on culture and sensitivity report.',
    ],
    desc: [
      'Wound debridement and secondary suturing were completed successfully with placement of a drain. The patient was started on culture-directed antibiotics and wound healing was progressing satisfactorily.',
      'Debridement of the infected surgical site and secondary closure were accomplished without complications. The patient was hemodynamically stable and wound care instructions were given for continued management.',
      'Secondary repair of the surgical wound was performed after thorough debridement and irrigation. The wound was closed with tension sutures and the patient was transferred to the ward in stable condition for continued wound care.',
    ],
  },
  'Endometrial Sampling': {
    diagnosis: [
      'Patient presented with post-menopausal bleeding of two months duration after five years of menopause. Transvaginal ultrasonography showed endometrial thickness of 10 mm with regular margins. Diagnosis was post-menopausal bleeding with thickened endometrium requiring endometrial sampling to rule out endometrial pathology.',
      'Patient complained of irregular heavy menstrual bleeding with intermenstrual spotting for the past six months not responding to hormonal therapy. Ultrasound showed endometrial thickness of 14 mm with heterogeneous echotexture. Diagnosis was abnormal uterine bleeding with endometrial thickening for diagnostic endometrial biopsy.',
      'Patient was a 52-year-old woman presenting with recurrent episodes of scanty post-menopausal bleeding over the past three months. Clinical examination was unremarkable and cervical cytology was normal. Diagnosis was recurrent post-menopausal bleeding requiring endometrial sampling for histopathological evaluation.',
    ],
    notes: [
      'The patient was placed in lithotomy position and the cervix was visualized using a Cusco speculum. The anterior lip was stabilized with a vulsellum forceps. A Pipelle endometrial sampling device was introduced through the cervical os into the uterine cavity. The inner piston was withdrawn to create negative pressure and the device was rotated and moved in and out to collect tissue from all walls of the endometrial cavity. Adequate tissue was obtained as confirmed by visual inspection of the specimen. The sample was placed in formalin and labeled for histopathological examination.',
      'Under aseptic conditions and with the patient in dorsal lithotomy position, speculum examination was performed. The cervical os was identified and a Karman cannula was inserted into the uterine cavity. Gentle suction was applied and the cannula was rotated to sample all surfaces of the endometrial cavity. A satisfactory amount of tissue was aspirated which was sufficient for histopathological analysis. The cervical os was inspected for bleeding which was minimal and the specimen was fixed in formalin for laboratory examination.',
      'Endometrial sampling was performed as an office procedure with the patient in lithotomy position. After speculum insertion and cervical visualization, a Pipelle device was introduced through the cervical canal into the uterine cavity. Negative pressure was created by withdrawing the piston and the device was moved systematically to collect representative tissue samples from the endometrial lining. The procedure was completed with minimal patient discomfort. The specimen obtained was adequate and was sent for histopathological examination to evaluate for endometrial hyperplasia or malignancy.',
    ],
    desc: [
      'Endometrial sampling was performed successfully with adequate tissue obtained for histopathological examination. The patient tolerated the procedure well with minimal discomfort and was advised to follow up for the biopsy results.',
      'The endometrial biopsy was completed without complications and a satisfactory tissue sample was collected. The patient was discharged in stable condition with instructions to return for histopathology results.',
      'Office endometrial sampling was accomplished successfully and the specimen was sent for pathological evaluation. The patient experienced minimal discomfort and was advised regarding expected findings on follow-up.',
    ],
  },
  'Examination Under Anesthesia': {
    diagnosis: [
      'Patient presented with a large pelvic mass detected on ultrasonography with clinical suspicion of ovarian malignancy. Adequate clinical assessment was not possible due to patient guarding and obesity. Diagnosis was pelvic mass for examination under anesthesia for staging and operative planning.',
      'Patient complained of persistent vaginal bleeding with a cervical growth identified on outpatient examination. Adequate assessment of parametrial involvement and staging was limited due to patient discomfort. Diagnosis was cervical carcinoma requiring examination under anesthesia for FIGO staging.',
      'Patient was referred with recurrent post-menopausal bleeding and a suspicion of endometrial pathology. Previous office examination was inconclusive due to cervical stenosis preventing endometrial access. Diagnosis was post-menopausal bleeding with cervical stenosis requiring examination under anesthesia for comprehensive evaluation.',
    ],
    notes: [
      'Under general anesthesia, the patient was placed in lithotomy position. Thorough bimanual pelvic examination was performed assessing uterine size, mobility, and position. Adnexal examination was done bilaterally noting the presence of a large right adnexal mass approximately 10 cm in size, firm in consistency, and partially mobile. Per rectal examination was performed to assess the pouch of Douglas and parametrial involvement. Speculum examination was carried out to visualize the cervix and vaginal fornices. All findings were meticulously documented for operative planning and staging purposes.',
      'Examination under anesthesia was performed under general anesthesia with the patient in dorsal lithotomy position. Speculum examination was done first revealing a friable cervical growth involving both lips of the cervix. Bimanual examination was performed assessing uterine size and mobility with assessment of parametrial status on both sides. Per rectal examination was carried out to evaluate for posterior extension and rectal mucosal involvement. The clinical staging was determined according to FIGO staging system and all findings were documented for multidisciplinary team discussion.',
      'Under adequate general anesthesia, comprehensive pelvic examination was performed. Speculum examination revealed cervical stenosis which was gently dilated. The uterine cavity was sounded and endometrial sampling was performed. Bimanual examination revealed a normal-sized uterus with no adnexal pathology. Per rectal examination confirmed no abnormal findings in the pouch of Douglas. All examination findings were documented in detail and the patient was allowed to recover from anesthesia.',
    ],
    desc: [
      'Examination under anesthesia was completed with thorough assessment of the pelvic organs and the findings were documented for surgical planning. The patient recovered well from anesthesia and was transferred to the ward.',
      'EUA was performed successfully allowing comprehensive staging assessment of the cervical carcinoma. The clinical stage was determined and the patient was shifted to recovery in stable condition for further management planning.',
      'The examination under anesthesia was accomplished with adequate evaluation and endometrial sampling obtained. The patient tolerated the procedure well and was discharged with a plan for follow-up based on findings.',
    ],
  },
  'Excision of Vaginal Cyst': {
    diagnosis: [
      'Patient presented with a painless swelling in the anterior vaginal wall noticed for the past six months which had gradually increased in size. On examination, a well-defined, non-tender, cystic swelling measuring approximately 3 cm was palpable in the anterolateral vaginal wall. Diagnosis was anterior vaginal wall cyst consistent with Gartner duct cyst.',
      'Patient complained of discomfort during intercourse and a sensation of a lump in the vagina. On vaginal examination, a smooth, fluctuant swelling was identified on the posterolateral vaginal wall measuring approximately 4 cm. Diagnosis was vaginal wall inclusion cyst for surgical excision.',
      'Patient was referred with a recurrent vaginal swelling following previous incomplete drainage. Examination revealed a well-circumscribed, tense cystic swelling in the lateral vaginal wall with surrounding fibrosis from the previous surgery. Diagnosis was recurrent vaginal wall cyst requiring complete excision.',
    ],
    notes: [
      'Under spinal anesthesia with the patient in lithotomy position, the vaginal cyst was identified and an elliptical incision was made over the most prominent part of the cyst. The vaginal mucosa was dissected off the cyst wall using a combination of sharp and blunt dissection. The cyst was carefully separated from the surrounding tissue maintaining the integrity of the cyst wall to prevent spillage. The cyst was removed in toto and the cavity was inspected for hemostasis. The vaginal wall was closed in layers using continuous absorbable sutures and hemostasis was confirmed. The specimen was sent for histopathological examination.',
      'With the patient in lithotomy position under regional anesthesia, the vaginal cyst was palpated and the overlying mucosa was incised longitudinally. Careful dissection was performed to separate the cyst wall from the surrounding vaginal and paravaginal tissues. The cyst was excised completely with the wall intact. The dead space was obliterated with interrupted absorbable sutures and the vaginal mucosa was closed with continuous locking sutures. Hemostasis was confirmed and a vaginal pack was placed. The intact cyst was sent for histopathological examination.',
      'Under spinal anesthesia, the recurrent vaginal cyst was identified and marked. An incision was made over the cyst taking into account the fibrosis from the previous surgery. Meticulous dissection was carried out to separate the cyst from the adherent surrounding tissue using sharp scissors. The cyst was excised completely without rupture. The excision bed was inspected and all bleeding points were coagulated with bipolar cautery. The vaginal wall was approximated in layers with absorbable sutures. The specimen was labeled and sent for histopathological examination.',
    ],
    desc: [
      'Excision of the vaginal cyst was completed successfully with intact removal of the cyst wall. The patient tolerated the procedure well and was shifted to the recovery area in stable condition.',
      'The vaginal cyst was excised in toto without complications and sent for histopathological evaluation. Hemostasis was secured and the patient recovered uneventfully from anesthesia.',
      'Complete excision of the recurrent vaginal cyst was accomplished despite surrounding fibrosis from the previous surgery. The patient was in stable condition and was transferred to the post-operative ward.',
    ],
  },
  'Excision of urcthral caruncle': {
    diagnosis: [
      'Patient presented with a small reddish mass at the urethral meatus causing discomfort and occasional spotting on undergarments. On examination, a pedunculated fleshy growth was seen at the posterior margin of the urethral meatus measuring approximately 1 cm. Diagnosis was urethral caruncle for surgical excision.',
      'Patient complained of pain and burning sensation at the urethral opening with intermittent spotting for the past three months. Clinical examination revealed a tender, vascular mass protruding from the urethral meatus. Diagnosis was symptomatic urethral caruncle with bleeding requiring excision.',
      'Patient presented with a growth at the urethral meatus associated with dysuria and post-void dribbling. Examination showed a well-defined, lobulated caruncle at the posterior lip of the urethral meatus with surrounding mucosal erythema. Diagnosis was urethral caruncle for excision and histopathological evaluation.',
    ],
    notes: [
      'Under local anesthesia with the patient in lithotomy position, the urethral caruncle was identified at the posterior margin of the urethral meatus. The base of the caruncle was infiltrated with local anesthetic containing adrenaline. The caruncle was grasped with Allis forceps and excised at its base using electrocautery. Hemostasis was achieved with bipolar cautery applied to the base. The urethral mucosal edge was approximated to the surrounding mucosal tissue using fine absorbable interrupted sutures. A Foley catheter was inserted for 24 hours to prevent urethral edema. The specimen was sent for histopathological examination.',
      'With the patient in lithotomy position and under local anesthesia, the urethral caruncle was visualized. The caruncle was grasped with fine forceps and circumscribed at its base with a small margin of normal tissue. Excision was performed using sharp scissors and bleeding was controlled with pressure and bipolar electrocautery. The urethral mucosal edges were sutured to the vaginal mucosal edges with fine interrupted absorbable sutures to prevent stenosis. A 14 French Foley catheter was placed and the area was dressed. The excised tissue was sent for histopathological examination.',
      'Excision of the urethral caruncle was performed under local anesthesia. The caruncle was identified and its base was marked. After infiltration with lidocaine and adrenaline solution, the caruncle was clamped at its base and excised. The mucosal edges were carefully approximated with interrupted 4-0 Vicryl sutures to maintain the urethral lumen patency. Hemostasis was confirmed and a Foley catheter was inserted. The specimen was placed in formalin for histopathological examination to rule out any malignant change.',
    ],
    desc: [
      'Urethral caruncle excision was completed successfully with adequate hemostasis and urethral mucosal repair. The patient was in stable condition and was advised regarding catheter care and follow-up.',
      'The caruncle was excised and sent for histopathological examination to exclude malignancy. The patient tolerated the procedure well and was discharged with a Foley catheter for 24 hours.',
      'Excision of the urethral caruncle was accomplished without complications and the urethral meatus was reconstructed with fine sutures. The patient was transferred to recovery in stable condition.',
    ],
  },
  'Excison of scar Endometriosis': {
    diagnosis: [
      'Patient presented with cyclical pain and a palpable lump at the previous cesarean section scar site that worsened during menstruation. Clinical examination revealed a firm, tender nodule measuring 3 cm in the subcutaneous tissue near the Pfannenstiel scar. Diagnosis was scar endometriosis at the cesarean section incision site.',
      'Patient complained of increasing pain at the lower abdominal surgical scar coinciding with her menstrual periods for the past one year. Ultrasonography of the abdominal wall showed a hypoechoic nodule in the rectus sheath at the scar site measuring 2.5 cm. Diagnosis was abdominal wall endometriosis involving the previous surgical scar.',
      'Patient presented with a progressively enlarging painful lump at the previous hysterotomy scar with cyclical exacerbation during menses. MRI confirmed a soft tissue mass within the rectus muscle at the scar site consistent with endometriotic deposit. Diagnosis was scar endometriosis requiring wide local excision.',
    ],
    notes: [
      'Under general anesthesia, the previous scar was marked and a wide elliptical incision was planned around the palpable nodule with at least 1 cm margin of healthy tissue. The skin and subcutaneous tissue were dissected down to the endometriotic nodule. The mass was found to be adherent to the rectus sheath and required en bloc excision including a portion of the anterior rectus sheath. The resulting fascial defect was repaired with non-absorbable sutures. Hemostasis was achieved and the wound was closed in layers. The specimen was sent for histopathological confirmation.',
      'The endometriotic nodule was marked preoperatively and the operation was performed under regional anesthesia. An elliptical incision was made around the nodule and dissection was carried through the subcutaneous tissue to the rectus sheath. The nodule was dissected free from the surrounding fibrotic tissue with a margin of healthy tissue. The anterior rectus sheath defect was repaired primarily using prolene sutures. A subcutaneous drain was placed and the wound was closed in layers. The excised specimen was labeled and sent for histopathological examination.',
      'Under general anesthesia, wide local excision of the scar endometriotic mass was performed. The previous scar was excised along with the underlying subcutaneous tissue and a portion of the rectus muscle containing the endometriotic deposit. Care was taken to achieve clear margins of at least 1 cm around the palpable mass. The rectus sheath and muscle defect were repaired with interrupted non-absorbable sutures. Hemostasis was meticulously achieved and the wound was closed over a drain. The specimen was sent for histopathological examination to confirm complete excision.',
    ],
    desc: [
      'Wide local excision of the scar endometriosis was completed successfully with clear margins and rectus sheath repair. The patient was in stable condition and shifted to the post-operative ward.',
      'Scar endometriosis excision was accomplished with adequate margins and fascial defect repair. The patient tolerated the procedure well and was advised regarding wound care and follow-up for histopathology results.',
      'The scar endometriotic nodule was excised in toto with reconstruction of the abdominal wall defect. The patient recovered well from anesthesia and was transferred to the ward in stable condition.',
    ],
  },
  'Hysterectomy': {
    diagnosis: [
      'Patient presented with heavy menstrual bleeding and chronic pelvic pain not responding to medical management for the past two years. Ultrasonography revealed multiple uterine fibroids, the largest measuring 8 cm intramural with secondary anemia. Diagnosis was symptomatic uterine leiomyoma with failed medical therapy requiring hysterectomy.',
      'Patient complained of dysfunctional uterine bleeding with multiple failed hormonal therapy attempts over the past three years. Endometrial biopsy showed simple hyperplasia without atypia with persistent bleeding. Diagnosis was refractory abnormal uterine bleeding with completed family planning opting for definitive surgical management.',
      'Patient presented with second-degree uterovaginal prolapse with associated stress urinary incontinence and recurrent urinary tract infections. She had completed her family and conservative measures including pessary use had failed. Diagnosis was uterovaginal prolapse with stress incontinence requiring vaginal hysterectomy with pelvic floor repair.',
    ],
    notes: [
      'Under general anesthesia, the abdomen was opened through a Pfannenstiel incision. The uterus was found to be enlarged with multiple fibroids. Bilateral round ligaments were clamped, cut, and ligated. The bladder was reflected down and bilateral uterine arteries were secured. The ureters were identified and preserved throughout the procedure. The vaginal vault was entered and the uterus was removed along with the cervix. Vault closure was performed with continuous locking sutures incorporating the uterosacral ligaments for vault support. Hemostasis was meticulously confirmed and the abdomen was closed in layers after ensuring correct instrument and swab count.',
      'Total abdominal hysterectomy with bilateral salpingectomy was performed under general anesthesia. The abdomen was opened through a lower midline incision due to the large fibroid size. Systematic devascularization of the uterus was performed with division of round, ovarian, and uterine pedicles bilaterally. Both ureters were identified at the level of the uterine artery and at the pelvic brim and were found to be safe. The specimen was removed and the vaginal vault was closed. Bilateral salpingectomy was performed as an opportunistic risk reduction measure. Abdomen was irrigated, hemostasis confirmed, and closed in layers.',
      'Under general anesthesia, total abdominal hysterectomy with bilateral salpingo-oophorectomy was performed through a Pfannenstiel incision. Dense adhesions were encountered between the uterus and omentum which were carefully lysed. The infundibulopelvic ligaments were clamped, cut, and ligated bilaterally. The remainder of the hysterectomy proceeded in standard fashion with identification of ureters at each step. The vaginal vault was closed and suspended to the uterosacral ligaments. A pelvic drain was placed due to the extent of adhesiolysis. Hemostasis was confirmed and the abdomen was closed in standard layers.',
    ],
    desc: [
      'Total abdominal hysterectomy was completed successfully without intraoperative complications. The patient was hemodynamically stable and was shifted to the post-operative intensive care unit for monitoring.',
      'Hysterectomy with bilateral salpingectomy was performed without complications and the ureters were confirmed safe. The patient recovered well from anesthesia and was transferred to the post-operative ward.',
      'TAH with BSO was accomplished with careful adhesiolysis and the specimen was sent for histopathological examination. The patient was stable and was shifted to recovery with a pelvic drain in situ.',
    ],
  },
  'Hysteroscopy': {
    diagnosis: [
      'Patient presented with recurrent abnormal uterine bleeding despite hormonal therapy with suspicion of an intrauterine pathology on ultrasonography. Transvaginal scan showed a possible submucous fibroid or endometrial polyp. Diagnosis was abnormal uterine bleeding with suspected intracavitary pathology requiring hysteroscopic evaluation.',
      'Patient was referred for evaluation of recurrent failed in vitro fertilization cycles with suspicion of uterine cavity abnormality on hysterosalpingography. HSG showed a possible uterine septum or filling defect. Diagnosis was suspected uterine septum or intracavitary lesion for diagnostic and possibly operative hysteroscopy.',
      'Patient complained of heavy menstrual bleeding with clots and passage of fleshy tissue for the past four months. Ultrasonography revealed an endometrial polyp measuring 2 cm in the uterine cavity. Diagnosis was endometrial polyp causing abnormal uterine bleeding requiring hysteroscopic polypectomy.',
    ],
    notes: [
      'Under general anesthesia with the patient in lithotomy position, the cervix was dilated and a rigid hysteroscope was introduced into the uterine cavity. Normal saline was used as the distension medium. Systematic inspection of the uterine cavity was performed visualizing the anterior wall, posterior wall, bilateral lateral walls, fundus, and both tubal ostia. A submucous fibroid type 0 measuring approximately 1.5 cm was identified on the posterior wall. Hysteroscopic myomectomy was performed using a resectoscope with bipolar loop electrode. The fibroid was resected completely and chips were evacuated. The cavity was re-inspected confirming complete removal and no thermal injury to surrounding endometrium.',
      'Diagnostic hysteroscopy was performed under general anesthesia. The hysteroscope was introduced after gentle cervical dilatation using normal saline for uterine distension. The uterine cavity was systematically inspected in a clockwise manner. Both tubal ostia were visualized and appeared patent. The endometrium appeared normal in thickness and vascularity. A small intrauterine septum was noted extending from the fundus approximately 1 cm into the cavity. The septum was divided using hysteroscopic scissors under direct visualization until a normal-shaped cavity was achieved. Post-resection inspection confirmed adequate septal division with both tubal ostia visible in the same field.',
      'Under general anesthesia, operative hysteroscopy was performed for polypectomy. The cervix was dilated and a continuous flow hysteroscope was inserted with normal saline distension. The endometrial polyp was visualized arising from the fundal region measuring approximately 2 cm with a broad base. The polyp was resected at its base using a bipolar resection loop and the base was coagulated to prevent recurrence. The polyp fragments were retrieved and sent for histopathological examination. Final inspection of the cavity confirmed complete removal with no residual polyp tissue. Fluid deficit was monitored throughout and found to be within acceptable limits.',
    ],
    desc: [
      'Hysteroscopic myomectomy was completed successfully with complete removal of the submucous fibroid. The patient tolerated the procedure well and was discharged with advice for follow-up.',
      'Diagnostic and operative hysteroscopy with septum division was accomplished without complications. The uterine cavity was restored to normal configuration and the patient recovered well.',
      'Hysteroscopic polypectomy was performed successfully and the specimen was sent for histopathological examination. The patient was hemodynamically stable and was shifted to recovery.',
    ],
  },
  'Incision, drainage & marsupialization': {
    diagnosis: [
      'Patient presented with acute onset painful swelling in the left labial region for the past three days with progressive worsening and difficulty in walking and sitting. Examination revealed a tense, fluctuant, tender swelling in the left Bartholin gland region measuring approximately 5 cm with surrounding erythema. Diagnosis was left Bartholin gland abscess.',
      'Patient complained of recurrent painful swelling at the right labia that had been treated with antibiotics twice previously but recurred within two months. On examination, a well-defined, tender, cystic swelling was palpable at the right Bartholin gland area. Diagnosis was recurrent right Bartholin gland cyst with superimposed infection for definitive marsupialization.',
      'Patient presented with severe vulvar pain and inability to sit comfortably for the past two days. Clinical examination revealed a large, warm, fluctuant swelling in the posterior aspect of the left labia majora consistent with an infected Bartholin gland. Diagnosis was left Bartholin gland abscess requiring incision, drainage, and marsupialization.',
    ],
    notes: [
      'Under local anesthesia with the patient in lithotomy position, the Bartholin abscess was identified and a stab incision was made on the mucosal surface of the labia minora at the site of maximum fluctuance. A large amount of purulent material was drained and the cavity was irrigated thoroughly with normal saline. The abscess wall was everted and sutured to the mucosal surface using interrupted absorbable sutures to create a marsupialized opening for continued drainage. A pus swab was sent for culture and sensitivity. The cavity was packed lightly with iodoform gauze and the procedure was completed.',
      'Incision and drainage of the Bartholin abscess was performed under local anesthesia. A vertical incision approximately 2 cm in length was made on the inner mucosal surface of the labium. Thick purulent material was evacuated and the cavity was thoroughly irrigated with dilute betadine and normal saline. The edges of the cyst wall were sutured to the adjacent vaginal mucosa with interrupted Vicryl sutures to marsupialization the cavity and prevent re-accumulation. A Word catheter was considered but marsupialization was preferred due to recurrent nature. A wound swab was sent for culture and the patient was started on broad-spectrum antibiotics.',
      'Under local anesthesia, the left Bartholin abscess was incised at the mucosal surface. Upon incision, approximately 15 ml of thick pus was drained. The cavity was irrigated with warm normal saline and all loculations were broken down digitally. Marsupialization was performed by suturing the inner wall of the abscess cavity to the adjacent vestibular mucosa using interrupted 3-0 Vicryl sutures creating a permanent opening. Hemostasis was confirmed and the marsupialized opening was left open for continued drainage. Culture swab was sent and appropriate antibiotics were prescribed.',
    ],
    desc: [
      'Incision, drainage, and marsupialization of the Bartholin abscess was completed successfully. The patient was relieved of pain and was discharged with antibiotics and instructions for sitz baths and follow-up.',
      'The Bartholin abscess was drained and marsupialized to prevent recurrence. The patient tolerated the procedure well and was advised regarding wound care and completion of antibiotic course.',
      'Drainage and marsupialization of the Bartholin gland abscess was accomplished effectively. The patient was in stable condition, pain was significantly reduced, and she was discharged with follow-up instructions.',
    ],
  },
  'L E E P': {
    diagnosis: [
      'Patient was referred for treatment following a confirmed diagnosis of CIN II on colposcopy-directed biopsy. Colposcopic assessment showed a large acetowhite area involving two quadrants of the cervix with well-defined margins. Diagnosis was high-grade cervical intraepithelial neoplasia (CIN II) suitable for excisional treatment with LEEP.',
      'Patient had a confirmed diagnosis of CIN III on cervical biopsy with a satisfactory colposcopy showing the entire lesion and transformation zone. Previous cytology had shown HSIL on two consecutive Pap smears. Diagnosis was high-grade squamous intraepithelial lesion (CIN III) requiring LEEP excision of the transformation zone.',
      'Patient presented for definitive management of persistent high-grade cervical dysplasia diagnosed on repeated colposcopy-directed biopsies over the past year. The transformation zone was fully visible with a well-defined acetowhite lesion. Diagnosis was persistent CIN II for LEEP cone excision.',
    ],
    notes: [
      'Under local anesthesia with paracervical block, the patient was placed in lithotomy position and the cervix was visualized using a speculum. Colposcopy was performed to delineate the lesion boundaries. The transformation zone was marked and Lugol iodine was applied to define the margins. An appropriate-sized loop electrode was selected and the transformation zone was excised in a single pass under continuous electrocautery. The specimen was oriented and placed in formalin for histopathological examination with margin assessment. Hemostasis was achieved by applying the ball electrode to the excision base. Monsel paste was applied to the raw surface and the procedure was completed without complications.',
      'LEEP was performed under local anesthesia with colposcopic guidance. After paracervical block with lignocaine and adrenaline, acetic acid was applied to visualize the lesion margins. A 20 mm loop electrode was used to excise the transformation zone in a single sweep from left to right at a depth of approximately 7 mm. A second deeper pass was taken from the endocervical canal using a smaller loop electrode to ensure adequate excision of the endocervical margin. Both specimens were properly oriented and sent for histopathological examination. Hemostasis was secured using the ball electrode followed by application of Monsel solution.',
      'Under local anesthesia, LEEP excision of the cervical transformation zone was performed. The lesion was delineated with acetic acid and Lugol iodine application under colposcopic visualization. The appropriate loop size was selected to encompass the entire lesion with a clear margin. The loop was applied to the cervix and the specimen was excised with a combination of cutting and coagulation current. The excision bed was carefully inspected and additional cautery was applied to any bleeding points. The specimen was marked for orientation and sent for histopathological examination. Monsel paste was applied to the cauterized area. The patient tolerated the procedure well with minimal discomfort.',
    ],
    desc: [
      'LEEP excision of the cervical transformation zone was completed successfully and the specimen was sent for histopathological margin assessment. The patient was advised to avoid intercourse and heavy lifting for four weeks.',
      'The LEEP procedure was performed without complications with adequate excision of the identified lesion. Hemostasis was secured and the patient was discharged with follow-up instructions for review of histopathology.',
      'LEEP cone biopsy was accomplished with complete excision of the transformation zone and the specimen was oriented for margin evaluation. The patient was in stable condition and was given instructions for post-procedure care.',
    ],
  },
  'Laparoscopy': {
    diagnosis: [
      'Patient presented with primary subfertility of three years duration. Hysterosalpingography suggested bilateral tubal block and pelvic ultrasonography showed a left ovarian cyst. Diagnosis was primary infertility with bilateral tubal factor and left ovarian cyst requiring diagnostic and possibly therapeutic laparoscopy.',
      'Patient complained of chronic pelvic pain of two years duration with worsening during menstruation and associated deep dyspareunia. Clinical and ultrasonographic evaluation did not reveal a definitive cause. Diagnosis was chronic pelvic pain of unknown etiology requiring diagnostic laparoscopy for evaluation and directed treatment.',
      'Patient presented with suspected ectopic pregnancy based on positive pregnancy test, rising beta-hCG levels, and absence of intrauterine gestational sac on transvaginal ultrasonography. A right adnexal mass was visualized on ultrasound with free fluid in the pouch of Douglas. Diagnosis was right tubal ectopic pregnancy for laparoscopic management.',
    ],
    notes: [
      'Under general anesthesia, pneumoperitoneum was created using a Veress needle at the umbilicus and a 10 mm trocar was inserted. Two additional 5 mm ports were placed in the bilateral iliac fossa under direct visualization. Systematic inspection of the pelvis was performed. The uterus was normal in size and shape. Both ovaries were visualized and a left ovarian cyst approximately 4 cm was noted. Bilateral chromopertubation was performed which revealed bilateral tubal patency contrary to the HSG findings. The left ovarian cyst was aspirated and the cyst wall was inspected. The pelvic peritoneum was examined for endometriotic deposits and the procedure was concluded with hemostasis confirmation and desufflation.',
      'Diagnostic laparoscopy was performed under general anesthesia using a three-port technique. On initial inspection, multiple endometriotic deposits were noted on the peritoneal surface of the pouch of Douglas and both uterosacral ligaments. Bilateral ovaries showed chocolate cyst formation with the left ovary more extensively involved. Adhesions between the left tube and ovary were lysed. Endometriotic implants were fulgurated using bipolar diathermy. Chromopertubation confirmed bilateral tubal patency. The peritoneal washings were taken and the procedure was completed. All ports were removed under vision and the pneumoperitoneum was released.',
      'Under general anesthesia, laparoscopic salpingectomy was performed for right tubal ectopic pregnancy. Pneumoperitoneum was established and three ports were placed. On inspection, a right tubal ectopic pregnancy was confirmed with a distended ampullary segment measuring approximately 3 cm and approximately 100 ml of hemoperitoneum. The right fallopian tube was identified and the mesosalpinx was coagulated and divided using bipolar cautery and scissors. The tube containing the ectopic was excised and retrieved in an endobag. Hemostasis was confirmed at the tubal stump and peritoneal lavage was performed. The left tube and ovary appeared normal.',
    ],
    desc: [
      'Diagnostic and therapeutic laparoscopy was completed with assessment of tubal patency and management of the ovarian cyst. The patient tolerated the procedure well and was shifted to recovery.',
      'Laparoscopic evaluation confirmed pelvic endometriosis and adhesions were treated with adhesiolysis and fulguration. The patient recovered well from anesthesia and was transferred to the ward.',
      'Laparoscopic salpingectomy for right tubal ectopic pregnancy was completed successfully with adequate hemostasis. The patient was hemodynamically stable and was monitored in the post-operative care unit.',
    ],
  },
  'MVA': {
    diagnosis: [
      'Patient presented with vaginal bleeding following a positive pregnancy test at approximately seven weeks of gestation. Ultrasonography showed an irregular gestational sac with no fetal cardiac activity consistent with missed miscarriage. Diagnosis was missed abortion at seven weeks of gestation for manual vacuum aspiration.',
      'Patient presented to the emergency department with heavy vaginal bleeding and passage of fleshy tissue following a period of amenorrhea of nine weeks. On examination, the cervical os was open with products of conception visible. Diagnosis was incomplete abortion at nine weeks requiring evacuation by manual vacuum aspiration.',
      'Patient had a confirmed diagnosis of anembryonic pregnancy on two serial ultrasonography examinations one week apart showing an empty gestational sac measuring 25 mm with no fetal pole. She opted for surgical management. Diagnosis was blighted ovum at eight weeks for manual vacuum aspiration.',
    ],
    notes: [
      'Under paracervical block with lignocaine, the patient was placed in lithotomy position and the cervix was visualized with a speculum. The anterior lip was stabilized with a tenaculum. The cervical canal was dilated if necessary using graduated dilators. An appropriately sized MVA cannula was inserted through the cervix into the uterine cavity. Negative pressure was created by withdrawing the syringe plunger and the cannula was rotated and moved in and out to aspirate the products of conception. The procedure was continued until a gritty sensation was felt and no more tissue was aspirated. The aspirated tissue was inspected in a strainer to confirm the presence of products of conception. Uterine contraction was confirmed and hemostasis was achieved.',
      'Manual vacuum aspiration was performed under intravenous sedation. The cervix was grasped with a vulsellum and dilated with Hegar dilators to accommodate the appropriate cannula size. The MVA syringe was connected to the cannula and introduced into the uterine cavity. Suction was established and systematic aspiration was performed with rotation of the cannula. Products of conception were successfully aspirated and the tissue was inspected to confirm completeness. The uterine cavity was re-explored with the cannula confirming empty cavity. Oxytocin was administered and the procedure was completed with minimal blood loss.',
      'Under paracervical block, the cervix was dilated and an MVA cannula of appropriate size was inserted into the uterine cavity. Negative pressure was applied using the syringe and the cannula was gently rotated to aspirate the retained products. The aspirated material was examined macroscopically to confirm the presence of chorionic villi and gestational tissue. Complete evacuation was confirmed by the cessation of tissue aspiration and a gritty sensation on gentle re-exploration. The patient was given intramuscular oxytocin and observed for post-procedure bleeding. The tissue was sent for histopathological examination.',
    ],
    desc: [
      'Manual vacuum aspiration was completed successfully with complete evacuation of the uterine contents confirmed by tissue inspection. The patient was stable and was observed for two hours before discharge.',
      'MVA was performed without complications and products of conception were successfully aspirated. The patient was hemodynamically stable and was discharged with advice regarding follow-up and contraception counseling.',
      'The manual vacuum aspiration procedure was accomplished with confirmed complete evacuation. The patient tolerated the procedure well and was shifted to the observation area in stable condition.',
    ],
  },
  'Minilap (BLTL)': {
    diagnosis: [
      'Patient was a multipara with three living children requesting permanent method of family planning. She was counseled regarding available options and chose bilateral tubal ligation. Diagnosis was voluntary request for permanent sterilization with completed family.',
      'Patient presented for interval sterilization six weeks after her last normal vaginal delivery. She had three living children and had completed her desired family size after thorough counseling. Diagnosis was multipara requesting bilateral tubal ligation as a permanent contraceptive method.',
      'Patient opted for permanent sterilization following counseling about reversibility and alternative contraceptive methods. She had four living children and was certain about not wanting further pregnancies. Diagnosis was completed family requesting minilaparotomy bilateral tubal ligation.',
    ],
    notes: [
      'Under spinal anesthesia, a suprapubic transverse skin incision of approximately 3 cm was made. The subcutaneous tissue and rectus sheath were divided. The peritoneal cavity was entered and the right fallopian tube was identified and delivered using a hook. The isthmic portion of the tube was grasped with Babcock forceps and a loop was formed. Modified Pomeroy technique was applied with ligation of the loop using chromic catgut and excision of the knuckle. The same procedure was repeated on the left side. Both tube segments were sent for histopathological confirmation. Hemostasis was confirmed at the mesosalpinx and the wound was closed in layers.',
      'Minilaparotomy was performed under local anesthesia with sedation. A 2.5 cm suprapubic incision was made and the peritoneal cavity was entered. The uterus was manipulated using a uterine elevator inserted through the cervix to bring each tube into the operative field. The right tube was identified, confirmed by its fimbrial end, and a loop of the isthmic segment was delivered. Modified Pomeroy ligation was performed. The left tube was similarly identified and ligated. Both excised segments were inspected to confirm they were fallopian tube tissue and were sent for histopathology. The peritoneum, rectus sheath, and skin were closed in layers.',
      'Under spinal anesthesia, bilateral tubal ligation was performed through a minilaparotomy approach. A small infraumbilical incision was made and the peritoneum was opened. The right fallopian tube was identified by tracing the round ligament to the cornua and following the tube to its fimbrial end. The tube was delivered and the modified Pomeroy technique was applied with ligation and excision of a loop of the isthmic segment. The same procedure was repeated on the left side. Both tube segments were confirmed as tubal tissue. The mesosalpinx was inspected for hemostasis and the wound was closed in anatomical layers with skin closure using subcuticular sutures.',
    ],
    desc: [
      'Bilateral tubal ligation was completed successfully through a minilaparotomy approach with both tube segments sent for histopathological confirmation. The patient recovered well and was advised regarding wound care.',
      'Minilap BLTL was performed without intraoperative complications using the modified Pomeroy technique. The patient was stable and was discharged with instructions for follow-up.',
      'The bilateral tubal ligation procedure was accomplished through minilaparotomy with confirmed identification and ligation of both tubes. The patient tolerated the procedure well and was shifted to recovery.',
    ],
  },
  'Myomectomy': {
    diagnosis: [
      'Patient presented with heavy menstrual bleeding and pelvic discomfort with a desire to preserve fertility. Ultrasonography revealed multiple uterine fibroids with the largest measuring 7 cm in the intramural location. Diagnosis was symptomatic uterine leiomyoma in a woman desiring future fertility requiring myomectomy.',
      'Patient complained of progressive abdominal distension and menorrhagia causing severe anemia. Pelvic examination revealed a firm, irregular uterine mass corresponding to 20 weeks size. Diagnosis was large symptomatic uterine fibroid with secondary iron deficiency anemia for abdominal myomectomy.',
      'Patient presented with secondary infertility of two years duration with multiple intramural fibroids distorting the uterine cavity on MRI. The largest fibroid was 5 cm with submucosal component. Diagnosis was uterine fibroids causing cavity distortion and likely contributing to infertility requiring myomectomy.',
    ],
    notes: [
      'After adequate pre-operative preparation including correction of anemia and administration of general anesthesia, the abdomen was opened through a midline vertical incision. The uterus was delivered and found to contain multiple fibroids. Injection of dilute vasopressin was given into the myometrium around the largest fibroid to reduce blood loss. A longitudinal uterine incision was made over the most prominent fibroid and the pseudocapsule was identified. The fibroid was enucleated using a combination of sharp and blunt dissection. Multiple additional fibroids were identified and removed through the same and additional incisions. The uterine defects were repaired in multiple layers using interrupted and continuous absorbable sutures. Hemostasis was meticulously achieved at each layer and an anti-adhesion barrier was placed over the uterine incision sites.',
      'Under general anesthesia, abdominal myomectomy was performed through a Pfannenstiel incision. The uterus was found to be enlarged to 18 weeks size with a dominant subserosal-intramural fibroid on the fundus. Vasopressin solution was injected at the incision site and a transverse incision was made over the fibroid. The fibroid was dissected from its pseudocapsule using myoma screws for traction. The fibroid weighing approximately 800 grams was enucleated intact. Three additional smaller fibroids were identified by palpation and removed. The myometrial bed was carefully inspected and all bleeding vessels were coagulated. The uterine wall was closed in three layers with continuous locking sutures. Specimen was weighed and sent for histopathological examination.',
      'Laparoscopic-assisted myomectomy was performed under general anesthesia. Pneumoperitoneum was established and ports were placed. A large intramural fibroid measuring approximately 6 cm was identified on the anterior wall of the uterus. Vasopressin was injected laparoscopically around the fibroid. The myometrium was incised with monopolar hook and the fibroid was enucleated from its pseudocapsule using a combination of traction and blunt dissection. The myometrial defect was closed laparoscopically in two layers using barbed suture. The fibroid was morcellated and removed in an endobag. Hemostasis was confirmed and the pelvic cavity was irrigated. Adhesion barrier was applied over the uterine incision.',
    ],
    desc: [
      'Myomectomy was completed successfully with removal of multiple fibroids and layered repair of the uterine wall. The patient was hemodynamically stable and was shifted to the post-operative ward for monitoring.',
      'Abdominal myomectomy was performed without significant complications and the large fibroid was removed intact. Hemostasis was secured and the patient recovered well from anesthesia.',
      'Laparoscopic-assisted myomectomy was accomplished with adequate fibroid removal and uterine repair. The patient was in stable condition and was transferred to the recovery area.',
    ],
  },
  'Ovarian cystectomy': {
    diagnosis: [
      'Patient presented with dull aching lower abdominal pain and a palpable adnexal mass detected on routine examination. Ultrasonography revealed a well-defined cystic mass measuring 8 cm arising from the right ovary with features suggestive of a dermoid cyst. Diagnosis was right ovarian dermoid cyst for cystectomy with ovarian conservation.',
      'Patient complained of progressively worsening pelvic pain and dysmenorrhea with a history of known endometriosis. Transvaginal ultrasonography showed a left ovarian endometrioma measuring 6 cm with typical ground-glass echogenicity. Diagnosis was left ovarian endometriotic cyst (chocolate cyst) for cystectomy.',
      'Patient was incidentally found to have a right ovarian cyst on ultrasonography performed for unrelated symptoms. The cyst measured 7 cm with thin walls, clear fluid content, and no solid component on Doppler evaluation. Tumor markers were within normal limits. Diagnosis was benign-appearing right ovarian cyst for elective cystectomy.',
    ],
    notes: [
      'Under general anesthesia, the abdomen was opened through a Pfannenstiel incision. The right ovary was found to contain a cyst measuring approximately 8 cm with a smooth surface and yellowish appearance suggestive of a dermoid. The cyst was carefully dissected from the normal ovarian cortex using a combination of sharp dissection and hydro-dissection to identify the cleavage plane. The cyst was removed intact without spillage and the remaining ovarian tissue was inspected for viability. The ovarian cortex was reconstructed using interrupted absorbable sutures and hemostasis was achieved with bipolar cautery applied to bleeding points. The specimen was placed in an endobag and sent for histopathological examination.',
      'Laparoscopic cystectomy was performed under general anesthesia using a three-port technique. The left ovarian endometrioma was identified and the ovarian cortex was incised over the cyst. The endometriotic cyst wall was carefully dissected from the normal ovarian tissue using traction and counter-traction technique. The chocolate-colored fluid content was aspirated during the dissection. The cyst wall was completely stripped from the ovarian cortex and hemostasis was achieved using bipolar cautery. The ovarian edges were approximated with intracorporeal sutures to preserve ovarian volume. The cyst wall was retrieved through the 10 mm port in an endobag and sent for histopathological examination.',
      'Under general anesthesia, the abdomen was opened and the right ovarian cyst was visualized. An incision was made on the anti-mesenteric surface of the ovary and the plane between the cyst wall and the normal ovarian cortex was identified. The cyst was carefully enucleated using blunt and sharp dissection while preserving the maximum amount of normal ovarian tissue. The cyst was removed intact and the cyst fluid appeared clear and serous. The remaining ovarian tissue was shaped and sutured with fine absorbable sutures. Hemostasis was confirmed using bipolar diathermy. The specimen was sent for histopathological examination and the abdomen was closed in layers.',
    ],
    desc: [
      'Ovarian cystectomy was completed successfully with intact removal of the dermoid cyst and reconstruction of the ovary. The patient was stable and was shifted to the post-operative ward.',
      'Laparoscopic cystectomy of the left ovarian endometrioma was performed with ovarian preservation and reconstruction. The patient recovered well from anesthesia and was transferred to recovery.',
      'The ovarian cyst was enucleated intact with preservation of normal ovarian tissue and reconstruction. The patient tolerated the procedure well and was in stable condition post-operatively.',
    ],
  },
  'PFR (Pelvic floor Repair)': {
    diagnosis: [
      'Patient presented with a sensation of something coming down through the vagina with associated urinary frequency and incomplete bladder emptying. On examination, there was a second-degree cystocele with a moderate rectocele and deficient perineal body. Diagnosis was pelvic organ prolapse with cystocele and rectocele requiring pelvic floor repair.',
      'Patient complained of a vaginal mass that had been progressively increasing over the past two years with difficulty in maintaining personal hygiene and discomfort during daily activities. Examination revealed procidentia with associated cystocele and rectocele with a patulous introitus. Diagnosis was complete uterovaginal prolapse with cystocele and rectocele for vaginal hysterectomy with pelvic floor repair.',
      'Patient presented with stress urinary incontinence and a feeling of heaviness in the pelvis with visible vaginal bulge on straining. Pelvic examination showed a moderate cystocele with urethral hypermobility and a first-degree rectocele. Diagnosis was anterior vaginal wall prolapse with stress incontinence requiring anterior colporrhaphy with pelvic floor reconstruction.',
    ],
    notes: [
      'Under spinal anesthesia with the patient in lithotomy position, anterior colporrhaphy was performed first. A midline incision was made on the anterior vaginal wall and the vaginal mucosa was dissected off the underlying pubocervical fascia bilaterally. The attenuated fascia was plicated in the midline using interrupted delayed-absorbable sutures to support the bladder base. Excess vaginal mucosa was trimmed and the anterior vaginal wall was closed with continuous locking sutures. Subsequently, posterior colpoperineorrhaphy was performed. The posterior vaginal wall was incised and the rectovaginal fascia was plicated to reduce the rectocele. The perineal body was reconstructed by approximating the superficial transverse perineal muscles and bulbocavernosus muscles. The perineal skin was closed and hemostasis was confirmed.',
      'Under spinal anesthesia, pelvic floor repair was performed following vaginal hysterectomy. Site-specific anterior repair was done by identifying and repairing the fascial defects in the pubocervical fascia rather than midline plication. The paravaginal defects were repaired by reattaching the fascia to the arcus tendineus using delayed-absorbable sutures. Posterior repair was performed with plication of the rectovaginal septum and reconstruction of the perineal body with layered closure of the levator ani muscles in the midline. The vaginal vault was suspended to the uterosacral ligaments for apical support. Excess vaginal mucosa was excised and the vaginal walls were closed. A vaginal pack was inserted.',
      'Anterior and posterior colporrhaphy with perineorrhaphy was performed under spinal anesthesia. The anterior vaginal wall was opened in the midline and the bladder was dissected off the vaginal epithelium. Pubocervical fascia was plicated using interrupted sutures from the bladder neck to the vault. Posterior repair was then performed with exposure of the rectovaginal fascia and midline plication. Levator myorrhaphy was done with two interrupted sutures to reduce the genital hiatus. The perineal body was built up by approximating the perineal muscles. All excess vaginal mucosa was trimmed, wound edges were approximated, and hemostasis was meticulously achieved. A vaginal pack and Foley catheter were placed.',
    ],
    desc: [
      'Pelvic floor repair with anterior and posterior colporrhaphy and perineorrhaphy was completed successfully. The patient was hemodynamically stable and was shifted to the post-operative ward with a vaginal pack and catheter.',
      'Vaginal hysterectomy with comprehensive pelvic floor repair including vault suspension was accomplished without complications. The patient recovered well from anesthesia and was transferred to the ward.',
      'Anterior and posterior pelvic floor repair with perineal body reconstruction was performed successfully. The patient was in stable condition and was advised regarding post-operative care and pelvic floor exercises.',
    ],
  },
  'Radical Surgeries': {
    diagnosis: [
      'Patient was diagnosed with cervical squamous cell carcinoma FIGO stage IB1 following punch biopsy and staging workup. MRI pelvis confirmed a cervical tumor measuring 3 cm with no parametrial involvement or lymph node enlargement. Diagnosis was early-stage cervical carcinoma IB1 suitable for radical hysterectomy with pelvic lymphadenectomy.',
      'Patient presented with post-menopausal bleeding and was found to have endometrial adenocarcinoma on endometrial biopsy. MRI and CT staging showed disease confined to the uterus with no myometrial invasion beyond 50% and no evidence of distant metastasis. Diagnosis was endometrial carcinoma FIGO stage IA for comprehensive surgical staging.',
      'Patient was diagnosed with epithelial ovarian carcinoma following surgery for a presumed benign ovarian mass. Histopathology revealed high-grade serous carcinoma and re-staging CT showed peritoneal deposits with ascites. Diagnosis was ovarian carcinoma stage IIIC for primary debulking surgery.',
    ],
    notes: [
      'Under general anesthesia, the abdomen was opened through a lower midline incision. Peritoneal washings were taken for cytology. Systematic exploration of the abdomen and pelvis was performed. Radical hysterectomy (Wertheim) was done with bilateral pelvic lymphadenectomy. The ureters were dissected from their tunnels through the cardinal ligaments and preserved. The parametria were excised widely and the vaginal cuff was taken with at least 2 cm margin from the gross tumor. Both ovaries were preserved given the patient\'s age. Bilateral obturator, internal iliac, external iliac, and common iliac lymph nodes were systematically dissected. Hemostasis was meticulously achieved and a pelvic drain was placed. The specimen was oriented and sent for histopathological examination.',
      'Under general anesthesia, a midline vertical incision was made and peritoneal washings were obtained. Comprehensive surgical staging was performed for endometrial carcinoma. Total extrafascial hysterectomy with bilateral salpingo-oophorectomy was done. Systematic bilateral pelvic lymphadenectomy was performed including obturator, internal and external iliac node groups. Para-aortic lymph node sampling was carried out up to the level of the inferior mesenteric artery. Omental biopsy was taken. All specimens were labeled separately and sent for histopathological examination. Hemostasis was confirmed and a pelvic drain was placed.',
      'Under general anesthesia, the abdomen was opened through a midline vertical incision extended above the umbilicus. Approximately 2 liters of ascitic fluid was drained and sent for cytology. Total abdominal hysterectomy with bilateral salpingo-oophorectomy was performed. Bilateral pelvic and para-aortic lymphadenectomy was done. Total omentectomy was performed as the omentum was found to be extensively infiltrated with tumor. Peritoneal stripping was done from the pelvic sidewalls and diaphragmatic surface. Appendectomy was performed as part of the debulking procedure. Optimal cytoreduction was achieved with no visible residual disease greater than 1 cm. Multiple drains were placed and the abdomen was closed.',
    ],
    desc: [
      'Radical hysterectomy with bilateral pelvic lymphadenectomy was completed with adequate resection margins and ureters preserved bilaterally. The patient was hemodynamically stable and was shifted to the intensive care unit for post-operative monitoring.',
      'Comprehensive surgical staging for endometrial carcinoma was completed without complications and all specimens were sent for final histopathological staging. The patient recovered well and was transferred to the post-operative ward.',
      'Primary debulking surgery was accomplished with optimal cytoreduction and no macroscopic residual disease. The patient was transferred to the ICU for post-operative care and was being planned for adjuvant chemotherapy.',
    ],
  },
  'Recanalization': {
    diagnosis: [
      'Patient presented with desire for fertility restoration following bilateral tubal ligation performed five years ago. She had remarried and wished to conceive. Pre-operative hysterosalpingography confirmed bilateral tubal occlusion at the isthmic segment. Diagnosis was post-tubal ligation infertility with bilateral tubal block for microsurgical tubal reanastomosis.',
      'Patient requested reversal of previous bilateral tubal ligation performed after her third child. She had lost a child and wanted to attempt natural conception. Evaluation confirmed bilateral isthmic tubal occlusion with adequate proximal and distal tubal segments. Diagnosis was bilateral tubal occlusion following previous BLTL requesting tubal recanalization.',
      'Patient desired fertility after a previous bilateral tubal ligation done eight years ago. She was counseled about success rates and alternative options including IVF. Pre-operative evaluation with HSG and ultrasound confirmed blocked tubes with adequate residual tubal length bilaterally. Diagnosis was previous bilateral tubal sterilization requesting microsurgical reversal.',
    ],
    notes: [
      'Under general anesthesia, the abdomen was opened through a Pfannenstiel incision. Both fallopian tubes were identified and the previous ligation sites were located. The occluded segments were excised and the proximal and distal tubal lumens were identified. Using microsurgical technique with magnification loupes, the proximal and distal segments were approximated using 6-0 and 7-0 Vicryl sutures in two layers - the muscularis and serosa. The mesosalpinx was repaired. Chromopertubation was performed which confirmed bilateral tubal patency with free spillage of dye from both fimbrial ends. Anti-adhesion agents were applied and the abdomen was closed in layers.',
      'Microsurgical tubal reanastomosis was performed through a minilaparotomy incision under general anesthesia. The previous ligation sites were identified on both tubes. Excision of the scarred tubal segments was performed and the fresh tubal ends were prepared. The tubal lumen was identified on both proximal and distal ends using methylene blue. End-to-end anastomosis was performed bilaterally using interrupted microsurgical sutures in two layers. The mucosal layer was approximated with 8-0 nylon and the seromuscularis with 6-0 Vicryl sutures. Patency was confirmed by chromopertubation showing bilateral free dye spillage.',
      'Under general anesthesia, bilateral tubal recanalization was performed. The fallopian tubes were carefully assessed and the ligated segments were excised. The proximal stump was confirmed to be patent by passing a fine probe. The distal segment patency was confirmed by gentle flushing. Microsurgical anastomosis was performed using operating microscope magnification. The muscularis was approximated with interrupted 7-0 Vicryl sutures followed by serosal repair with 6-0 Vicryl. Chromopertubation demonstrated bilateral patency. Anti-adhesion barrier was placed around both anastomotic sites and the abdomen was closed in layers with meticulous hemostasis.',
    ],
    desc: [
      'Bilateral microsurgical tubal reanastomosis was completed successfully with confirmed bilateral tubal patency on chromopertubation. The patient was stable and was advised regarding recovery and follow-up for fertility assessment.',
      'Tubal recanalization was accomplished with patency confirmed bilaterally using dye test. The patient tolerated the procedure well and was shifted to the post-operative ward with optimistic prognosis for natural conception.',
      'Microsurgical tubal reversal was performed successfully with bilateral patency demonstrated intraoperatively. The patient was in stable condition and was counseled regarding expected timeline for attempting conception.',
    ],
  },
  'Salpingo-oophorectomy': {
    diagnosis: [
      'Patient presented with acute onset severe lower abdominal pain and vomiting. Ultrasonography revealed an enlarged right ovary with absent blood flow on Doppler consistent with ovarian torsion. Diagnosis was right ovarian torsion with a 6 cm ovarian cyst requiring emergency salpingo-oophorectomy.',
      'Patient complained of progressive lower abdominal pain and fullness with irregular menstrual bleeding. Ultrasonography showed a complex left adnexal mass measuring 10 cm with mixed solid and cystic components. Tumor markers were mildly elevated. Diagnosis was suspicious left adnexal mass for surgical excision by salpingo-oophorectomy.',
      'Patient presented with right lower quadrant pain and vaginal spotting at six weeks of amenorrhea. Serum beta-hCG was elevated at 5000 IU/L with no intrauterine gestational sac on ultrasonography. A right adnexal mass with surrounding free fluid was visualized. Diagnosis was right tubal ectopic pregnancy with significant hemoperitoneum requiring salpingo-oophorectomy.',
    ],
    notes: [
      'Under general anesthesia, emergency laparotomy was performed through a midline incision. The right ovary was found to be enlarged, edematous, and torted on its pedicle with the tube. De-torsion was attempted but the ovary appeared non-viable with a dusky black color. The decision was made for right salpingo-oophorectomy. The infundibulopelvic ligament was clamped, cut, and double-ligated with Vicryl sutures. The tubo-ovarian pedicle and utero-ovarian ligament were similarly secured. The specimen was removed and the pedicle was inspected for hemostasis. The left ovary and tube appeared normal. The abdomen was irrigated and closed in layers.',
      'Under general anesthesia, the abdomen was opened through a Pfannenstiel incision. A large left adnexal mass was identified. The left infundibulopelvic ligament was identified with the ureter visualized and preserved. The IP ligament was clamped with two clamps, divided, and double-ligated. The tubo-ovarian ligament and mesosalpinx were similarly clamped, divided, and ligated. The specimen was removed intact and placed in a specimen bag for histopathological examination. The pedicles were inspected and hemostasis was confirmed. The right adnexa appeared normal. Peritoneal washings were taken for cytology and the abdomen was closed in layers.',
      'Laparoscopic salpingo-oophorectomy was performed under general anesthesia for ruptured ectopic pregnancy. On entry, approximately 500 ml of hemoperitoneum was noted and suctioned. The right tube was identified with an ectopic mass at the ampullary segment with active bleeding from the fimbrial end. The right mesosalpinx was coagulated and divided using bipolar cautery and scissors. The infundibulopelvic ligament was similarly secured with bipolar cautery and divided. The specimen was placed in an endobag and retrieved through the umbilical port. The pelvis was irrigated and hemostasis was confirmed. The left tube and ovary were normal. Ports were removed under vision.',
    ],
    desc: [
      'Emergency right salpingo-oophorectomy was completed for ovarian torsion with a non-viable ovary. The patient was hemodynamically stable and was shifted to the ward for post-operative monitoring.',
      'Left salpingo-oophorectomy was performed for a suspicious adnexal mass with the specimen sent for histopathological examination. The patient recovered well and was transferred to recovery.',
      'Laparoscopic right salpingo-oophorectomy was accomplished for ruptured ectopic pregnancy with adequate hemostasis. The patient was hemodynamically stable after fluid resuscitation and was shifted to recovery.',
    ],
  },
  'Suction Evacuation': {
    diagnosis: [
      'Patient presented with vaginal bleeding and passage of grape-like vesicles at twelve weeks of gestation. Ultrasonography revealed a classic snowstorm appearance within the uterine cavity with no identifiable fetal parts. Serum beta-hCG was markedly elevated. Diagnosis was complete hydatidiform mole for suction evacuation.',
      'Patient was referred with first trimester vaginal bleeding and a uterus larger than dates. Ultrasonography showed mixed echogenic material filling the uterine cavity with multiple small cystic spaces and no fetal pole. Diagnosis was molar pregnancy (hydatidiform mole) requiring urgent suction evacuation.',
      'Patient presented with hyperemesis and vaginal spotting at ten weeks of gestation. Clinical examination revealed a uterus corresponding to 16 weeks size with absent fetal heart sounds. Ultrasonography confirmed a complete molar pregnancy. Diagnosis was gestational trophoblastic disease requiring suction evacuation and subsequent hCG monitoring.',
    ],
    notes: [
      'Under general anesthesia, the patient was placed in lithotomy position and the cervix was visualized. The cervical os was already partially dilated. An oxytocin infusion was started prior to evacuation to promote uterine contraction and reduce the risk of perforation. The largest appropriate suction cannula was introduced and electric suction was applied. Molar tissue was systematically aspirated from the uterine cavity. As the uterus contracted and decreased in size, progressively smaller cannulae were used. Gentle sharp curettage was performed at the end to ensure complete evacuation. The tissue obtained was sent for histopathological examination. Blood was typed and cross-matched and anti-D immunoglobulin was administered. Baseline chest X-ray and serum beta-hCG levels were documented.',
      'Suction evacuation of molar pregnancy was performed under general anesthesia with oxytocin infusion running. The cervix was dilated with Hegar dilators and a 12 mm suction cannula was inserted into the uterine cavity. Electric suction was applied and a large volume of vesicular molar tissue was aspirated. The uterus was noted to contract progressively during the procedure. A second pass with a smaller cannula was performed followed by gentle curettage to ensure completeness. The evacuated tissue was inspected and confirmed to show characteristic grape-like vesicles. All tissue was sent for histopathological examination. The patient was counseled regarding the need for serial beta-hCG monitoring and reliable contraception for one year.',
      'Under general anesthesia with oxytocin infusion and blood products available, suction evacuation was performed. The cervix was dilated and the largest appropriate suction cannula was introduced. Steady suction was applied while gently rotating the cannula within the uterine cavity. Large amounts of molar tissue were aspirated and the uterine size was observed to decrease. Complete evacuation was confirmed by the cessation of tissue aspiration and a gritty sensation on gentle re-exploration. Intraoperative ultrasound was used to confirm an empty uterine cavity. The evacuated tissue was examined and sent for histopathological evaluation. Serum beta-hCG was sent and a plan for serial monitoring was documented.',
    ],
    desc: [
      'Suction evacuation of the complete hydatidiform mole was performed successfully with complete evacuation confirmed. The patient was hemodynamically stable and a plan for serial beta-hCG monitoring was initiated.',
      'Evacuation of the molar pregnancy was completed without complications and all tissue was sent for histopathology. The patient was counseled about follow-up monitoring and was discharged in stable condition.',
      'Suction evacuation was accomplished with confirmation of complete removal of molar tissue. The patient was stable and was registered for long-term beta-hCG surveillance as per GTD follow-up protocol.',
    ],
  },
  'Taking High Vaginal Swab /Endo-Cervical': {
    diagnosis: [
      'Patient presented with copious yellowish-green vaginal discharge with foul odor and associated vulvar pruritus for the past two weeks. On speculum examination, purulent discharge was noted pooling in the posterior fornix with cervical erythema. Diagnosis was suspected vaginitis and cervicitis requiring high vaginal and endocervical swabs for microbiological evaluation.',
      'Patient complained of recurrent vaginal discharge and lower abdominal pain with dyspareunia for the past three months despite multiple courses of empirical antibiotics. Clinical examination showed mucopurulent endocervical discharge. Diagnosis was recurrent cervicitis and suspected pelvic inflammatory disease requiring targeted microbiological investigation.',
      'Patient presented with offensive vaginal discharge, post-coital bleeding, and lower abdominal discomfort. On examination, the cervix appeared inflamed with contact bleeding and a greenish discharge from the endocervical canal. Diagnosis was endocervicitis with suspected sexually transmitted infection requiring high vaginal and endocervical swab for culture and sensitivity.',
    ],
    notes: [
      'The patient was placed in dorsal lithotomy position and a sterile Cusco speculum was gently inserted. The vaginal walls were inspected for any lesion or abnormality. The character, color, and consistency of the discharge were noted. A sterile cotton swab was used to collect a high vaginal swab specimen from the posterior fornix. A second swab was introduced into the endocervical canal, rotated gently for 15 seconds to collect endocervical secretions, and withdrawn without touching the vaginal walls. Both specimens were placed in appropriate transport media and labeled for microscopy, culture, and sensitivity testing. The pH of the vaginal discharge was tested and a wet mount preparation was made for immediate microscopic examination.',
      'Speculum examination was performed under aseptic conditions. Excess discharge was gently cleaned with a dry swab. A sterile high vaginal swab was taken from the posterior fornix and placed in Stuart transport medium. An endocervical swab was then collected by inserting a sterile swab into the cervical os, rotating it for adequate sampling, and withdrawing it carefully. An additional swab was taken for Chlamydia testing using nucleic acid amplification test kit. All specimens were labeled appropriately with patient details and sent to the microbiology laboratory for Gram stain, culture and sensitivity, and STI screening.',
      'With the patient in lithotomy position, a warm speculum was inserted and the cervix was visualized. The discharge pattern was documented. Using sterile technique, the posterior fornix discharge was sampled with a cotton-tipped swab and placed in transport medium. A second swab was carefully inserted through the external cervical os into the endocervical canal for endocervical specimen collection. The swab was rotated gently and withdrawn without contamination from vaginal flora. Both specimens were labeled and dispatched to the microbiology laboratory for comprehensive microbiological analysis including aerobic culture, anaerobic culture, and sensitivity testing. A KOH preparation was also made for immediate fungal screening.',
    ],
    desc: [
      'High vaginal and endocervical swabs were collected successfully and sent for microbiological evaluation. The patient was started on empirical treatment and advised to return for follow-up with culture results.',
      'Specimen collection was completed without difficulty and swabs were sent for comprehensive microbiological analysis. The patient was counseled about treatment and partner notification pending culture results.',
      'HVS and endocervical swab collection was performed under aseptic conditions and specimens were dispatched for analysis. The patient was advised regarding expected results timeline and was prescribed empirical treatment.',
    ],
  },
  'VIA': {
    diagnosis: [
      'Patient attended the cervical cancer screening clinic as part of a community screening program. She had no prior history of cervical screening and no specific symptoms. Diagnosis was asymptomatic woman of reproductive age presenting for routine cervical cancer screening by visual inspection with acetic acid.',
      'Patient presented for cervical cancer screening as recommended after her last delivery. She had a history of multiple sexual partners and early onset of sexual activity. Diagnosis was high-risk patient for cervical cancer requiring screening by VIA method.',
      'Patient was referred from the outpatient department for cervical cancer screening after presenting with post-coital spotting. She had not undergone any previous cervical screening test. Diagnosis was symptomatic woman requiring cervical screening with VIA to evaluate for cervical pre-cancer.',
    ],
    notes: [
      'The patient was counseled about the VIA screening procedure and verbal consent was obtained. She was placed in lithotomy position and a sterile Cusco speculum was inserted. The cervix was visualized under adequate light and any discharge was gently removed with a dry swab. Five percent freshly prepared acetic acid solution was applied to the cervix using a cotton swab. After waiting for one minute, the cervix was inspected for the presence of acetowhite changes particularly at the transformation zone and squamocolumnar junction. The findings were documented according to standard VIA reporting criteria and the result was communicated to the patient.',
      'VIA screening was performed as part of the routine cervical cancer screening program. The patient was positioned and the cervix was exposed using a bivalve speculum. The transformation zone was identified and 5% acetic acid was applied liberally to the ectocervix. After allowing adequate time for the reaction, the cervix was carefully examined under a bright light source. The squamocolumnar junction was fully visible and the examination was deemed satisfactory. Any acetowhite changes, their location, size, and proximity to the os were documented. The cervix was then inspected with Lugol iodine for additional assessment and the results were recorded.',
      'Cervical screening by VIA method was performed with the patient in dorsal lithotomy position. After speculum insertion and cervical visualization, 5% acetic acid was applied to the cervix using a large cotton swab. The cervix was observed for one full minute under adequate lighting to assess for acetowhite changes. The entire transformation zone was visible and the squamocolumnar junction was identified. The findings were classified as VIA positive or negative based on the presence and characteristics of any acetowhite lesion. The result was documented on the screening form and the patient was counseled about the findings and recommended follow-up.',
    ],
    desc: [
      'VIA screening was completed satisfactorily with full visualization of the transformation zone and the result was documented and communicated to the patient. Follow-up was advised as per the screening protocol.',
      'Cervical cancer screening by VIA method was performed successfully and the findings were recorded. The patient was counseled about the results and appropriate follow-up was recommended.',
      'The VIA screening examination was accomplished with adequate cervical visualization and the results were classified and documented. The patient was informed of the findings and given instructions for further management if needed.',
    ],
  },
  'Vault prolapse repair': {
    diagnosis: [
      'Patient presented with a vaginal mass protruding through the introitus five years after a vaginal hysterectomy. She complained of difficulty in sitting, walking, and maintaining personal hygiene. Examination revealed complete vaginal vault prolapse with associated enterocele and cystocele. Diagnosis was post-hysterectomy vaginal vault prolapse for surgical correction.',
      'Patient complained of a progressive vaginal bulge and pelvic heaviness three years following total abdominal hysterectomy. On examination, the vaginal vault was descended to the introitus with an associated posterior wall enterocele. Diagnosis was vaginal vault prolapse with enterocele requiring vault suspension procedure.',
      'Patient was referred with recurrent prolapse symptoms following a previous anterior and posterior repair done two years ago. Examination revealed descent of the vaginal vault with associated cystocele recurrence. Diagnosis was vaginal vault prolapse with recurrent anterior compartment prolapse for definitive vault suspension surgery.',
    ],
    notes: [
      'Under spinal anesthesia with the patient in lithotomy position, vaginal vault prolapse repair was performed by sacrospinous fixation. The posterior vaginal wall was incised in the midline and the rectovaginal space was dissected to expose the right sacrospinous ligament. The ligament was identified by palpation and two permanent sutures were placed through the ligament approximately 2 cm medial to the ischial spine using a dedicated suture-capturing device. The sutures were then passed through the vaginal vault apex. The enterocele sac was identified, opened, and the peritoneum was closed with a purse-string suture. The vault was then elevated by tying the sacrospinous sutures, suspending the vaginal apex to the right sacrospinous ligament. Concurrent posterior repair and perineorrhaphy were performed. Hemostasis was confirmed and a vaginal pack was placed.',
      'Vault prolapse repair was performed under general anesthesia using the abdominal approach with sacrocolpopexy. The abdomen was opened through a midline incision and the vaginal vault was identified. The peritoneum overlying the sacral promontory was incised and the presacral space was developed. A lightweight polypropylene mesh was fashioned and sutured to the anterior and posterior vaginal walls using non-absorbable sutures. The mesh was then attached to the anterior longitudinal ligament at the sacral promontory under appropriate tension to elevate the vault. The peritoneum was closed over the mesh to prevent bowel contact. The enterocele was repaired and the abdomen was closed in layers with meticulous hemostasis.',
      'Under spinal anesthesia, vaginal vault repair was performed by modified McCall culdoplasty with concurrent anterior and posterior colporrhaphy. The posterior vaginal wall was opened and the enterocele sac was dissected and excised. The uterosacral ligaments were identified bilaterally and multiple delayed-absorbable sutures were placed incorporating the uterosacral ligaments and posterior peritoneum in a sequential fashion. When these sutures were tied, the vault was elevated and the cul-de-sac was obliterated. Anterior colporrhaphy was performed with pubocervical fascial plication. Posterior repair with perineorrhaphy completed the reconstruction. Hemostasis was confirmed and a vaginal pack with Foley catheter was placed.',
    ],
    desc: [
      'Vaginal vault prolapse repair by sacrospinous fixation was completed successfully with good vault elevation and correction of the associated defects. The patient was stable and was shifted to the ward with a vaginal pack.',
      'Abdominal sacrocolpopexy was accomplished with adequate vault suspension using mesh and repair of the enterocele. The patient tolerated the procedure well and was transferred to the post-operative ward.',
      'Vault prolapse repair with McCall culdoplasty and comprehensive pelvic floor reconstruction was performed successfully. The patient was in stable condition and was advised regarding post-operative pelvic floor exercises and follow-up.',
    ],
  },
};

const OBS_PROC: Record<string, ClinicalData> = {
  'Amniocentesis': {
    diagnosis: [
      'Patient was a 38-year-old primigravida at 16 weeks of gestation referred for prenatal diagnosis due to advanced maternal age. Triple test showed increased risk for Down syndrome with a risk ratio of 1:150. Diagnosis was high-risk pregnancy for chromosomal anomaly requiring amniocentesis for karyotyping.',
      'Patient was referred from the antenatal clinic at 17 weeks of gestation following detection of abnormal first trimester combined screening with increased nuchal translucency and low PAPP-A levels. Previous pregnancy had resulted in a child with trisomy 21. Diagnosis was high-risk pregnancy with abnormal aneuploidy screening requiring diagnostic amniocentesis.',
      'Patient presented at 16 weeks of gestation with anxiety regarding fetal chromosomal status due to advanced maternal age of 40 years and a family history of genetic disorders. Non-invasive prenatal testing showed high risk for trisomy 18. Diagnosis was abnormal NIPT requiring confirmatory amniocentesis for definitive karyotype analysis.',
    ],
    notes: [
      'After obtaining informed consent and counseling regarding procedure-related risks, the patient was positioned supine with a slight left lateral tilt. Ultrasound was performed to confirm fetal viability, gestational age, placental location, and the optimal pocket of amniotic fluid for needle insertion. Under continuous real-time ultrasound guidance and strict aseptic conditions, a 22-gauge spinal needle was introduced transabdominally into the selected amniotic fluid pocket avoiding the placenta. Approximately 20 ml of clear amniotic fluid was aspirated and distributed into appropriate collection tubes. The needle was withdrawn and fetal heart rate was confirmed normal post-procedure.',
      'The patient was counseled about the procedure including the risk of miscarriage and infection. Ultrasound mapping was performed to identify the placental location and the largest pocket of amniotic fluid. Under aseptic technique with continuous ultrasound visualization, a 22-gauge needle was inserted transabdominally into the amniotic cavity. The first 2 ml of fluid was discarded to reduce maternal cell contamination. A total of 18 ml of clear amniotic fluid was collected and sent for cytogenetic analysis and alpha-fetoprotein estimation. Fetal cardiac activity was confirmed on ultrasound after the procedure and the patient was observed for 30 minutes.',
      'Amniocentesis was performed at 16 weeks under ultrasound guidance with the patient in supine position. After antiseptic preparation of the abdominal skin, a suitable fluid pocket was identified avoiding the placenta and umbilical cord insertion. Under real-time ultrasound guidance, a spinal needle was introduced into the amniotic cavity. Clear amniotic fluid was aspirated without any blood contamination and approximately 20 ml was collected for karyotyping and biochemical analysis. The needle was removed and post-procedure ultrasound confirmed normal fetal heart rate and no evidence of bleeding or leakage. Anti-D immunoglobulin was administered as the patient was Rh-negative.',
    ],
    desc: [
      'Amniocentesis was performed successfully under ultrasound guidance and adequate amniotic fluid was obtained for chromosomal analysis. The patient was observed for 30 minutes and discharged with instructions to report any leakage, bleeding, or cramping.',
      'The amniocentesis procedure was completed without complications and the specimen was sent for karyotyping. Post-procedure fetal heart rate was normal and the patient was advised rest for 24 hours.',
      'Amniocentesis was accomplished safely with clear amniotic fluid obtained for genetic analysis. The patient was hemodynamically stable and was discharged with follow-up planned for results in two to three weeks.',
    ],
  },
  'CVS (Chorionic Villous Sampling)': {
    diagnosis: [
      'Patient was referred at 11 weeks of gestation for early prenatal diagnosis following detection of increased nuchal translucency on first trimester scan. She had a previous child with beta-thalassemia major and both parents were carriers. Diagnosis was high-risk pregnancy for beta-thalassemia requiring chorionic villous sampling for early genetic diagnosis.',
      'Patient presented at 12 weeks of gestation with abnormal first trimester screening showing high risk for trisomy 13. She was anxious and desired early definitive diagnosis rather than waiting for amniocentesis. Diagnosis was abnormal first trimester screening with high aneuploidy risk requiring CVS for early chromosomal analysis.',
      'Patient at 11 weeks of gestation was referred for prenatal genetic testing due to a known family history of cystic fibrosis. Both parents were confirmed carriers on genetic testing. Diagnosis was pregnancy at risk for cystic fibrosis requiring CVS for early molecular genetic diagnosis.',
    ],
    notes: [
      'After thorough counseling about the procedure, risks, and alternatives, informed consent was obtained. The patient was positioned supine and a detailed ultrasound was performed to confirm gestational age, fetal viability, and placental location. Under continuous real-time ultrasound guidance and strict aseptic conditions, a transabdominal approach was chosen based on the anterior placental position. A 20-gauge spinal needle was introduced through the abdominal wall into the placental tissue. Chorionic villi were aspirated using a syringe with negative pressure and adequate tissue was obtained as confirmed by visual inspection under magnification. The specimen was immediately placed in transport medium and sent for genetic analysis. Post-procedure ultrasound confirmed fetal cardiac activity.',
      'CVS was performed at 12 weeks of gestation under ultrasound guidance. The placenta was located on the posterior wall and a transcervical approach was selected. After antiseptic preparation, a flexible CVS catheter was introduced through the cervix under continuous ultrasound visualization and guided into the chorionic tissue. Multiple passes were made to obtain an adequate tissue sample. The tissue was examined under a dissecting microscope to confirm the presence of chorionic villi and separate any decidual contamination. The specimen was sent for both direct preparation and long-term culture for chromosomal analysis. Fetal heart activity was confirmed and the patient was observed for any cramping or bleeding.',
      'Transabdominal CVS was performed at 11 weeks of gestation using ultrasound guidance throughout. The needle was directed into the placental tissue under real-time imaging and chorionic villi were aspirated with a 20 ml syringe. The first attempt yielded sufficient tissue which was inspected and confirmed as adequate chorionic villous material. The specimen was divided for cytogenetic analysis and molecular DNA testing for the specific genetic mutation. Post-procedure scan showed normal fetal cardiac activity and no retroplacental collection. Anti-D immunoglobulin was administered to the Rh-negative patient. The patient was advised regarding expected results timeline and potential need for follow-up amniocentesis for confirmation.',
    ],
    desc: [
      'Chorionic villous sampling was completed successfully with adequate tissue obtained for genetic analysis. The fetus showed normal cardiac activity post-procedure and the patient was discharged with instructions for follow-up.',
      'CVS was performed without complications and sufficient chorionic villi were collected for chromosomal and molecular genetic testing. The patient was observed and discharged in stable condition.',
      'The CVS procedure was accomplished with satisfactory tissue sample obtained for prenatal diagnosis. The patient tolerated the procedure well and was advised to return for results and follow-up scan.',
    ],
  },
  'Cervical Cerclage': {
    diagnosis: [
      'Patient was a 28-year-old multigravida at 14 weeks of gestation with a history of two previous mid-trimester losses at 18 and 20 weeks respectively attributed to cervical incompetence. Current transvaginal ultrasound showed a short cervix measuring 20 mm with funneling. Diagnosis was cervical incompetence with short cervix on surveillance requiring history-indicated cervical cerclage.',
      'Patient presented at 16 weeks of gestation with vaginal pressure and mucoid discharge. She had a history of one previous mid-trimester loss and a cone biopsy for CIN III. Transvaginal cervical length measurement showed progressive shortening to 18 mm over two weeks. Diagnosis was cervical shortening with high-risk obstetric history for ultrasound-indicated cervical cerclage.',
      'Patient at 13 weeks of gestation was referred for prophylactic cerclage based on a history of three consecutive mid-trimester losses with confirmed cervical incompetence. Previous successful pregnancy was achieved with cerclage in situ. Diagnosis was recurrent cervical incompetence with history of successful cerclage requiring elective cerclage placement.',
    ],
    notes: [
      'Under spinal anesthesia with the patient in lithotomy position, the bladder was catheterized. The cervix was visualized using a speculum and found to be closed with no bulging membranes. The anterior and posterior lips of the cervix were grasped with sponge-holding forceps. McDonald cerclage was performed using a Mersilene tape on a round-bodied needle. The suture was placed as high as possible near the level of the internal os using four bites through the cervical stroma at the 12, 3, 6, and 9 o\'clock positions. The purse-string suture was tied anteriorly with sufficient tightness to admit a number 8 Hegar dilator. Membrane integrity was confirmed and fetal heart activity was checked by ultrasound post-procedure.',
      'Cervical cerclage was performed under spinal anesthesia at 14 weeks of gestation. The cervix was exposed with an Auvard speculum and stabilized with ring forceps. A Shirodkar technique was employed with a transverse incision made in the anterior vaginal mucosa at the cervicovaginal junction. The bladder was reflected upward and a Mersilene tape was passed submucosally around the cervix at the level of the internal os using a right-angle forceps. The tape was tied posteriorly with appropriate tension and the vaginal mucosa was closed with absorbable sutures. Fetal viability was confirmed on ultrasound and tocolysis was not required as there were no contractions. The patient was observed for 24 hours.',
      'Under spinal anesthesia, McDonald cerclage was placed at 13 weeks of gestation. The cervix was visualized and found to be 2 cm long with a closed os. A braided non-absorbable suture was used and placed as a purse-string around the cervix starting anteriorly with four bites through the cervical stroma at approximately the level of the internal os. Care was taken to stay superficial to avoid the cervical canal and the membranes. The suture was tied anteriorly with a secure knot leaving long tails for future identification at the time of removal. Post-procedure ultrasound confirmed fetal viability and intact membranes. The patient was prescribed progesterone supplementation and advised regarding activity restriction.',
    ],
    desc: [
      'McDonald cervical cerclage was placed successfully at the level of the internal os with intact membranes confirmed. The patient was advised regarding activity restriction and planned for cerclage removal at 37 weeks.',
      'Shirodkar cerclage was performed without complications and the cervix was adequately reinforced. The patient was stable and was discharged with instructions for regular follow-up cervical length monitoring.',
      'Cervical cerclage was accomplished safely with confirmed fetal viability post-procedure. The patient was counseled about warning signs and scheduled for regular antenatal surveillance.',
    ],
  },
  'Cervical laceration - Detection and repair': {
    diagnosis: [
      'Patient developed persistent bright red vaginal bleeding immediately following a precipitous vaginal delivery despite a well-contracted uterus. Examination under adequate analgesia revealed a cervical laceration at the 3 o\'clock position extending to the vaginal fornix. Diagnosis was post-partum hemorrhage due to cervical laceration requiring surgical repair.',
      'Patient had heavy bleeding after an instrumental vacuum delivery with the uterus well contracted and no retained products on manual exploration. Systematic cervical inspection revealed a deep laceration at the 9 o\'clock position with active arterial bleeding. Diagnosis was cervical laceration with secondary post-partum hemorrhage.',
      'Patient presented with continuous post-delivery vaginal bleeding not responding to uterine massage and uterotonics. The uterus was firm and well contracted. Careful cervical examination using ring forceps revealed bilateral cervical lacerations with the left side extending towards the lower uterine segment. Diagnosis was multiple cervical lacerations causing traumatic post-partum hemorrhage.',
    ],
    notes: [
      'With the patient in lithotomy position and under adequate analgesia, the cervix was systematically inspected using two ring forceps applied sequentially around the entire circumference. A deep cervical laceration was identified at the 3 o\'clock position extending approximately 3 cm into the vaginal fornix with active bleeding from the apex. The apex of the laceration was identified and the first suture was placed above the apex to ensure complete hemostasis. Continuous locking sutures were applied using absorbable polyglactin suture material working from the apex towards the external os. The repair was completed with adequate hemostasis confirmed. The cervix was re-inspected to ensure no additional lacerations were missed.',
      'Systematic cervical examination was performed under regional anesthesia. Using two sponge forceps, the cervix was grasped and inspected systematically starting from the 12 o\'clock position. A laceration was identified at the 9 o\'clock position with active arterial spurting. The apex was identified with some difficulty due to the depth of the tear extending near the vaginal vault. A hemostatic clamp was applied to the bleeding vessel and the repair was started from above the apex with a figure-of-eight suture to secure the bleeder. Continuous locking sutures were placed down to the external os. Hemostasis was confirmed and the opposite lip was inspected to rule out additional injury. Post-repair blood loss was estimated and intravenous fluids were continued.',
      'Under adequate lighting and analgesia, the cervix was inspected using ring forceps applied sequentially to each quadrant. Bilateral cervical lacerations were found with the left laceration being deeper and extending towards the lower uterine segment. The right laceration was smaller at approximately 1.5 cm. Both lacerations were repaired starting from the apex using continuous locking absorbable sutures. The deeper left-sided laceration required careful identification of the apex to ensure the suture was placed above the highest point of the tear. Both repairs were completed with satisfactory hemostasis. Final inspection confirmed no further bleeding and the cervix was well approximated.',
    ],
    desc: [
      'Cervical laceration was detected and repaired successfully with hemostasis achieved. The patient was closely monitored for further bleeding and was hemodynamically stable post-repair.',
      'The cervical laceration repair was completed with adequate hemostasis and the bleeding was controlled. The patient\'s vital signs were stable and she was monitored in the labor ward for continued observation.',
      'Bilateral cervical laceration repair was accomplished with hemostasis secured. The patient was transferred to the post-delivery observation area in stable condition with plan for serial hemoglobin monitoring.',
    ],
  },
  'Cord Prolapse management': {
    diagnosis: [
      'Patient at 38 weeks of gestation with spontaneous rupture of membranes was found to have umbilical cord prolapse on vaginal examination with the cord pulsating ahead of the presenting part. Fetal heart rate showed variable decelerations on cardiotocography. Diagnosis was overt umbilical cord prolapse with fetal distress requiring emergency management.',
      'Patient was in active labor at 36 weeks with a high presenting part when artificial rupture of membranes was performed. Immediately after ARM, a loop of umbilical cord was felt ahead of the vertex with cord pulsation present. Diagnosis was iatrogenic cord prolapse following ARM with viable fetus requiring emergency delivery.',
      'Patient presented to the emergency department at 39 weeks with sudden gush of fluid and something protruding from the vagina. On examination, the umbilical cord was found protruding through the cervix with palpable cord pulsation. The cervix was 7 cm dilated. Diagnosis was overt cord prolapse with viable fetus requiring immediate emergency intervention.',
    ],
    notes: [
      'Cord prolapse was identified on vaginal examination. The presenting part was immediately elevated manually by an examiner\'s hand in the vagina to relieve cord compression. The patient was placed in the Trendelenburg position with knee-chest positioning. The bladder was filled with 500 ml of normal saline through a Foley catheter to further elevate the presenting part. Emergency cesarean section was called and the patient was rapidly transferred to the operating theater. Throughout transportation, manual elevation of the presenting part was maintained continuously. Emergency lower segment cesarean section was performed under general anesthesia and a live baby was delivered with APGAR scores of 7 and 9 at one and five minutes respectively.',
      'Upon recognition of cord prolapse, immediate manual elevation of the fetal presenting part was performed to relieve pressure on the cord. The cord was checked for pulsation which was present. The patient was positioned in steep Trendelenburg and the team was mobilized for emergency cesarean delivery. The cord was gently handled to minimize vasospasm and wrapped in a warm saline-soaked gauze. Continuous fetal heart rate monitoring showed recovery of the deceleration pattern with manual elevation. Emergency LSCS was performed and the baby was delivered in good condition. The interval from cord prolapse detection to delivery was approximately 15 minutes.',
      'Cord prolapse was diagnosed immediately and the presenting part was elevated digitally to decompress the cord. The knee-chest position was given and the bladder was filled to further elevate the presenting part. The neonatal team was alerted simultaneously. Since the cervix was 7 cm dilated and the cord was not compressed with good pulsation felt, rapid preparation for emergency cesarean section was undertaken. The patient was taken to the theater with manual elevation maintained continuously. Emergency cesarean section was performed under spinal anesthesia and a live baby was delivered with good APGAR scores. The cord was examined post-delivery and found to be healthy with no evidence of compression injury.',
    ],
    desc: [
      'Cord prolapse was managed emergently with manual elevation and immediate cesarean delivery resulting in a live birth with good neonatal outcome. The mother was stable post-operatively.',
      'Emergency management of cord prolapse was accomplished with successful delivery of a viable neonate by cesarean section. Both mother and baby were in stable condition.',
      'Cord prolapse was managed promptly with delivery achieved within 15 minutes of diagnosis. The neonate had good APGAR scores and the mother recovered well from the emergency surgery.',
    ],
  },
  'Delivery': {
    diagnosis: [
      'Patient was a 25-year-old primigravida at 39 weeks of gestation admitted in spontaneous labor with regular uterine contractions and cervical dilatation of 4 cm. Fetal heart rate was reassuring on admission cardiotocography. Diagnosis was term pregnancy in active labor for normal vaginal delivery.',
      'Patient presented at 40 weeks of gestation with spontaneous onset of labor. She was a second gravida with a previous uncomplicated normal delivery. On admission, the cervix was 5 cm dilated with intact membranes and the vertex was at station -1. Diagnosis was term pregnancy in active labor with favorable progress for normal vaginal delivery.',
      'Patient was admitted for induction of labor at 41 weeks of gestation for post-dates pregnancy. Following prostaglandin induction, she progressed into active labor with satisfactory cervical dilatation. Diagnosis was post-dates pregnancy with induced labor progressing satisfactorily for vaginal delivery.',
    ],
    notes: [
      'Labor progress was monitored using partograph with regular assessment of cervical dilatation, fetal descent, and fetal heart rate. The active phase progressed normally with adequate uterine contractions. At full cervical dilatation, the patient was encouraged to bear down with contractions. The vertex advanced in the occipito-anterior position and the perineum was assessed for adequacy. A right mediolateral episiotomy was given at crowning. The baby was delivered by Ritgen maneuver with controlled delivery of the head followed by restitution and delivery of the shoulders and trunk. Immediate cord clamping and cutting was done. Active management of the third stage was performed with intramuscular oxytocin, controlled cord traction, and uterine massage. The placenta was delivered complete with membranes intact.',
      'The patient was monitored in labor with partograph documentation and continuous fetal heart rate assessment. Labor progressed normally through the active phase. During the second stage, the patient was supported in a semi-recumbent position and encouraged to push with each contraction. The perineum was supported and the baby was delivered in the left occipito-anterior position without the need for episiotomy. The baby cried immediately after delivery and was placed on the mother\'s abdomen for skin-to-skin contact. Delayed cord clamping was performed. Active management of the third stage was carried out with oxytocin administration and controlled cord traction. The placenta and membranes were expelled complete and the uterus was well contracted.',
      'Following induction, labor was monitored with regular cervical assessments and partograph documentation. Fetal heart rate remained reassuring throughout. At full dilatation, the patient was guided through the second stage with maternal pushing efforts. An episiotomy was performed due to a rigid perineum and the baby was delivered in good condition with immediate cry. The cord was clamped and cut and the baby was handed to the attendant. Active management of the third stage was performed with oxytocin injection, controlled cord traction delivered the placenta complete with membranes. The episiotomy was repaired in anatomical layers. Post-delivery assessment confirmed a well-contracted uterus with minimal blood loss.',
    ],
    desc: [
      'Normal vaginal delivery was conducted successfully with delivery of a healthy neonate. Active management of the third stage was done and the mother was in stable condition with a well-contracted uterus.',
      'Vaginal delivery was completed uneventfully with immediate skin-to-skin contact and early initiation of breastfeeding. Both mother and baby were stable post-delivery.',
      'Induced labor resulted in successful vaginal delivery with a healthy neonate. Episiotomy was repaired and the mother was transferred to the post-natal ward in stable condition.',
    ],
  },
  'Destructive Surgery': {
    diagnosis: [
      'Patient was admitted with prolonged obstructed labor at term with confirmed intrauterine fetal death. The cervix was fully dilated but the deeply impacted head could not be delivered due to severe cephalopelvic disproportion. Diagnosis was obstructed labor with intrauterine fetal death requiring craniotomy for safe delivery.',
      'Patient was referred from a peripheral facility with neglected obstructed labor and a dead fetus confirmed by absent fetal heart sounds and Spalding sign on X-ray. The head was deeply impacted in the pelvis with caput extending to the vulva and severe molding. Diagnosis was neglected obstructed labor with IUD for destructive delivery to prevent maternal morbidity.',
      'Patient presented with prolonged second stage of labor with a hydrocephalic fetus diagnosed antenatally as having a lethal anomaly incompatible with life. Vaginal delivery was not possible due to the enlarged fetal head. Diagnosis was hydrocephalic dead fetus requiring cephalocentesis and destructive delivery.',
    ],
    notes: [
      'Under general anesthesia with the patient in lithotomy position, the deeply impacted fetal head was assessed. A scalp incision was made and craniotomy was performed using a perforator introduced through the sagittal suture. The skull was perforated and the brain matter was aspirated using suction. The skull bones were collapsed using Willett forceps to reduce the head circumference. Traction was applied using craniotomy forceps and the collapsed head was gradually delivered. The body was delivered following the head. The uterine cavity was explored manually to confirm completeness and rule out uterine rupture. The lower genital tract was inspected for lacerations and the cervix was systematically examined.',
      'The destructive operation was performed under general anesthesia after confirming intrauterine death and obtaining informed consent from the family. The cervix was fully dilated and the head was deeply engaged. Craniotomy was performed by perforating the skull at the most accessible suture. Brain matter was evacuated and the skull was compressed to reduce its diameter. Cephalotripsy forceps were applied and steady traction was used to deliver the fetal remains. Following delivery, the uterus was explored to ensure integrity of the uterine wall and to confirm no retained products. The birth canal was examined for trauma and prophylactic antibiotics were administered.',
      'Under general anesthesia, cephalocentesis was first performed by needle aspiration of the cerebrospinal fluid from the enlarged fetal head to decompress the hydrocephalus. Following adequate decompression, the head was delivered vaginally with gentle traction. The body followed delivery of the head. The uterine cavity was explored manually and found to be intact with no evidence of rupture. The cervix and vaginal canal were inspected systematically for any lacerations. The patient received prophylactic antibiotics and oxytocin infusion was maintained for uterine contraction. Psychological support was provided to the family.',
    ],
    desc: [
      'Craniotomy was performed successfully with safe delivery of the dead fetus and no maternal injury detected on thorough exploration. The patient was hemodynamically stable and was monitored closely in the post-delivery period.',
      'Destructive delivery was accomplished without uterine rupture or genital tract injury. The patient was stable and was managed with antibiotics, fluids, and close observation in the high-dependency unit.',
      'Destructive surgery was completed with cephalocentesis and delivery of the hydrocephalic fetus. The uterine cavity and birth canal were confirmed intact and the patient was transferred to the ward for post-operative care and counseling.',
    ],
  },
  'Episiotomy and repair': {
    diagnosis: [
      'Patient was a primigravida in the second stage of labor with a rigid perineum and the fetal head distending the perineum with signs of perineal thinning and impending tear. Fetal heart rate tracing was reassuring. Diagnosis was rigid perineum in a primigravida requiring mediolateral episiotomy to facilitate safe delivery.',
      'Patient was undergoing instrumental vacuum-assisted delivery for prolonged second stage of labor. Assessment of the perineum indicated insufficient room for safe instrumental delivery without perineal trauma. Diagnosis was anticipated perineal tear during instrumental delivery requiring episiotomy.',
      'Patient was a primigravida at full dilatation with the fetal head at station +2 and the perineum showing signs of imminent uncontrolled tearing with blanching. The estimated fetal weight was 3.8 kg on recent ultrasound. Diagnosis was tight perineum with macrosomic fetus at risk of third-degree tear requiring prophylactic episiotomy.',
    ],
    notes: [
      'During the second stage of labor, as the fetal head was crowning and the perineum was maximally stretched, a right mediolateral episiotomy was performed at a 60-degree angle from the midline using sharp scissors following infiltration with 10 ml of 1% lignocaine. The baby was delivered in good condition. After delivery of the placenta and confirmation of a well-contracted uterus, the episiotomy was repaired in anatomical layers. The vaginal mucosa was closed with continuous absorbable sutures starting from above the apex. The deep perineal muscles including the bulbocavernosus and transverse perineal muscles were approximated with interrupted sutures. The perineal skin was closed with subcuticular sutures. Hemostasis was confirmed and a per rectal examination was performed to ensure no suture had penetrated the rectal mucosa.',
      'A right mediolateral episiotomy was given prior to vacuum application to provide adequate space for the instrument. Following successful instrumental delivery, the episiotomy was inspected under adequate light. The episiotomy was repaired systematically starting with identification of the apex of the vaginal mucosal incision. Continuous locking sutures were placed in the vaginal mucosa using absorbable sutures. The perineal muscles were then repaired in layers with interrupted polyglactin sutures ensuring anatomical approximation. The skin was closed with mattress sutures. A rectal examination confirmed no through-and-through sutures. The repaired wound was inspected and hemostasis was satisfactory.',
      'During the active second stage, as the perineum was thinning with the advancing fetal head, local anesthesia was infiltrated along the planned episiotomy line. A right mediolateral episiotomy was made with scissors at the height of a contraction. The baby was delivered safely and the episiotomy was repaired after completion of the third stage. Repair commenced from above the apex of the vaginal wound using continuous absorbable polyglactin sutures for the mucosal layer. The transverse perineal muscles and bulbospongiosus were approximated with interrupted sutures to restore the perineal body anatomy. The perineal skin was closed with subcuticular sutures for better cosmetic outcome. Hemostasis was confirmed and rectal examination ruled out inadvertent suture placement.',
    ],
    desc: [
      'Episiotomy was performed and repaired in anatomical layers with satisfactory hemostasis and no rectal involvement confirmed. The patient was comfortable and advised regarding perineal wound care.',
      'The episiotomy repair was completed with anatomical muscle layer approximation and subcuticular skin closure. The patient was stable and was transferred to the post-natal ward with perineal care instructions.',
      'Episiotomy and layered repair were accomplished successfully with adequate hemostasis. The patient was in good condition and was counseled about wound care and expected healing timeline.',
    ],
  },
  'Management of SSI': {
    diagnosis: [
      'Patient developed increasing pain, redness, and purulent discharge from the lower segment cesarean section wound on post-operative day six. Wound examination showed partial dehiscence with necrotic tissue and surrounding induration. Wound culture grew Escherichia coli. Diagnosis was deep surgical site infection following LSCS with partial wound dehiscence.',
      'Patient presented with fever, wound gaping, and serosanguinous discharge from the cesarean section incision site on post-operative day eight. The wound edges were inflamed with areas of tissue necrosis. Diagnosis was post-LSCS surgical site infection with wound breakdown requiring wound management and secondary closure.',
      'Patient was referred with an open surgical wound following cesarean section performed two weeks ago at another facility. The wound had been opened for infection and was healing by secondary intention with unhealthy granulation tissue. Diagnosis was post-cesarean wound infection with delayed healing requiring wound debridement and secondary repair.',
    ],
    notes: [
      'Under local anesthesia, the wound was opened further to expose the full extent of infection. All purulent material was drained and a wound swab was taken for repeat culture and sensitivity. Thorough debridement was performed removing all necrotic and devitalized tissue using sharp curette and scissors until healthy bleeding tissue was visible at the wound margins and base. The wound was irrigated extensively with warm normal saline followed by dilute hydrogen peroxide. The rectus sheath was inspected and found to be intact. Daily wound dressing with normal saline and betadine-soaked gauze was planned. Antibiotics were adjusted based on the culture sensitivity report and the patient was monitored for signs of systemic infection.',
      'The infected LSCS wound was explored and all sutures were removed. Wound edges were separated and the entire wound was opened to assess the extent of infection. Pockets of pus were drained and all necrotic slough was debrided. The wound bed was irrigated with copious warm normal saline until the return was clear. Once healthy granulation tissue was established over five days of daily wound care, secondary closure was performed. The wound was closed with deep tension sutures of nylon incorporating the rectus sheath and interrupted skin sutures. A corrugated drain was placed in the subcutaneous space. Antibiotics were continued based on culture and sensitivity results.',
      'Wound management was performed under local anesthesia. The open wound was assessed and found to have areas of unhealthy granulation tissue with fibrinous exudate. Sharp debridement was carried out to remove the unhealthy tissue and refresh the wound edges. The wound bed was treated with normal saline irrigation and negative pressure wound therapy was applied to promote granulation tissue formation. After one week of VAC therapy, the wound bed showed healthy granulation tissue with reduction in wound size. Secondary closure was then performed with interrupted tension sutures. The wound was dressed with sterile gauze and the patient was continued on oral antibiotics.',
    ],
    desc: [
      'Management of the surgical site infection was completed with thorough debridement and wound care initiated. The patient was stable with improving wound condition and was being managed with culture-directed antibiotics.',
      'SSI was managed successfully with wound debridement and subsequent secondary closure after establishment of healthy granulation tissue. The patient was recovering well and was advised regarding wound care and follow-up.',
      'Wound management including debridement and negative pressure therapy was accomplished with successful secondary closure. The patient was in stable condition with a well-healing wound at the time of discharge.',
    ],
  },
  'Manual removal of placenta': {
    diagnosis: [
      'Patient had a normal vaginal delivery but the placenta failed to deliver after 30 minutes of active management of the third stage despite controlled cord traction and uterotonic administration. There was no significant bleeding but the placenta was retained. Diagnosis was retained placenta not responding to conservative measures requiring manual removal.',
      'Patient delivered vaginally but had ongoing moderate post-partum hemorrhage with the placenta still retained after 45 minutes. Controlled cord traction was unsuccessful and the cord snapped during an attempt. Diagnosis was retained placenta with secondary post-partum hemorrhage requiring urgent manual removal.',
      'Patient had a vaginal delivery with delivery of a partial placenta with a missing cotyledon on inspection. Ongoing bleeding continued despite oxytocin infusion. Ultrasonography confirmed retained placental tissue in the uterine cavity. Diagnosis was partial placental retention with post-partum hemorrhage requiring manual exploration and removal.',
    ],
    notes: [
      'Under general anesthesia with the patient in lithotomy position, adequate analgesia and relaxation were confirmed. One hand was introduced through the vagina into the uterine cavity while the other hand stabilized the uterine fundus abdominally. The placenta was found adherent to the posterior wall of the uterus. A cleavage plane was identified between the placenta and the uterine wall and the placenta was systematically separated using the ulnar border of the hand in a sweeping motion. The entire placenta was removed and inspected for completeness with all cotyledons and membranes accounted for. The uterine cavity was re-explored to confirm it was empty. Oxytocin infusion was running and the uterus contracted well after removal. Prophylactic antibiotics were administered.',
      'Manual removal of placenta was performed urgently under intravenous sedation due to ongoing hemorrhage. The hand was introduced into the uterine cavity and the retained placenta was found firmly adherent to the left lateral wall. Gentle but systematic separation was performed by developing the cleavage plane and sweeping the placenta off the uterine wall. The placenta was delivered complete. The uterine cavity was explored for any remaining fragments and found to be empty. Bimanual compression was applied and the uterus responded well to oxytocin. The estimated blood loss was 800 ml and intravenous fluids were administered. Blood was cross-matched for possible transfusion.',
      'Under general anesthesia, manual exploration of the uterus was performed. The retained cotyledon was identified adherent to the fundal area of the uterus. It was carefully separated from the uterine wall and removed. The entire uterine cavity was systematically explored to confirm complete evacuation. The placenta was reassembled and confirmed complete with the previously missing cotyledon now accounted for. Oxytocin infusion was maintained and the uterus contracted firmly. Intravenous antibiotics were given prophylactically. The patient was monitored closely for further bleeding and hemoglobin was checked post-procedure.',
    ],
    desc: [
      'Manual removal of the retained placenta was performed successfully with complete removal confirmed and good uterine contraction achieved. The patient was hemodynamically stable and was closely monitored post-procedure.',
      'MROP was accomplished with complete placental removal and adequate uterine contraction. The patient received fluid resuscitation and was stable with plan for hemoglobin monitoring.',
      'Manual exploration and removal of the retained placental cotyledon was completed with confirmation of empty uterine cavity. The patient was in stable condition and was transferred to the observation area.',
    ],
  },
  'New born care': {
    diagnosis: [
      'Newborn baby was delivered by normal vaginal delivery at 39 weeks of gestation with a birth weight of 3.2 kg. The baby did not cry immediately after delivery and was floppy with poor respiratory effort. Diagnosis was birth asphyxia requiring immediate neonatal resuscitation and newborn care.',
      'A healthy term neonate was delivered by elective cesarean section at 38 weeks of gestation weighing 3.5 kg. The baby cried immediately with good tone and color. Diagnosis was term newborn requiring routine immediate newborn assessment and essential newborn care.',
      'Newborn delivered at 36 weeks of gestation by emergency cesarean section for fetal distress with meconium-stained amniotic fluid. Birth weight was 2.4 kg. The baby had initial respiratory effort but was grunting with intercostal retractions. Diagnosis was late preterm newborn with respiratory distress requiring assessment and stabilization.',
    ],
    notes: [
      'The newborn was received on a pre-warmed radiant warmer. The airway was cleared by gentle suctioning of the mouth followed by the nose. The baby was dried thoroughly with a warm towel and stimulated by rubbing the back and flicking the soles. Initial assessment showed no respiratory effort and heart rate below 100 beats per minute. Positive pressure ventilation was initiated using a self-inflating bag and mask with room air. After 30 seconds of effective ventilation, the baby showed improvement with spontaneous respiratory effort and heart rate above 100. APGAR score was assessed at 1 minute (5) and 5 minutes (8). The cord was clamped and cut and the baby was placed on the mother for skin-to-skin contact. Vitamin K was administered intramuscularly and eye prophylaxis was applied.',
      'The baby was received on the mother\'s abdomen for immediate skin-to-skin contact. The airway was assessed and found to be clear. The baby was dried and stimulated while on the mother. APGAR scores were 9 at 1 minute and 10 at 5 minutes. Delayed cord clamping was performed at 3 minutes. A thorough newborn examination was conducted checking for any congenital anomalies. Weight, length, and head circumference were recorded. Vitamin K 1 mg was administered intramuscularly. Early initiation of breastfeeding was facilitated within 30 minutes of birth. The baby was kept warm and vital signs were monitored.',
      'The baby was received at the radiant warmer and the airway was suctioned with particular attention to clearing meconium from the oropharynx. The baby was dried and stimulated. Initial assessment showed grunting respirations with mild subcostal retractions. APGAR scores were 6 at 1 minute and 8 at 5 minutes. Continuous pulse oximetry was applied and supplemental oxygen was provided to maintain saturation above 95%. The baby was assessed for respiratory distress using the Silverman-Anderson score. Vitamin K was administered and the baby was kept warm under the radiant warmer. Blood glucose was monitored and found to be normal. The neonatal team was consulted for further management of the respiratory symptoms.',
    ],
    desc: [
      'Neonatal resuscitation was performed successfully with improvement in the baby\'s condition after positive pressure ventilation. The baby was stabilized and early breastfeeding was initiated after skin-to-skin contact.',
      'Routine newborn care was completed with a healthy term neonate showing excellent APGAR scores and successful early breastfeeding. Both mother and baby were doing well.',
      'The preterm neonate was assessed and stabilized with supplemental oxygen for initial respiratory distress. The baby was monitored closely and the neonatal team was involved for continued care.',
    ],
  },
  'OASIS - Detection and repair': {
    diagnosis: [
      'Patient had a vaginal delivery complicated by a suspected severe perineal tear. Systematic perineal assessment revealed disruption of the external anal sphincter muscle with the internal anal sphincter visible and intact. Diagnosis was third-degree perineal tear (3a - less than 50% of EAS torn) requiring repair under anesthesia.',
      'Patient delivered a 4.1 kg baby vaginally with episiotomy. Post-delivery examination revealed an extensive perineal tear extending through the perineal body with complete disruption of both the external and internal anal sphincters and intact rectal mucosa. Diagnosis was third-degree perineal tear (3c - both IAS and EAS completely torn) requiring surgical repair.',
      'Following a difficult vacuum-assisted delivery, perineal examination revealed a full-thickness tear involving the anal sphincter complex and the rectal mucosa with visible rectal lumen. Diagnosis was fourth-degree perineal tear (OASIS) requiring immediate surgical repair under anesthesia.',
    ],
    notes: [
      'Under regional anesthesia with the patient in lithotomy position, thorough assessment of the perineal injury was performed. The torn ends of the external anal sphincter were identified and found to be partially disrupted. The internal anal sphincter was intact. The vaginal mucosa was repaired first using continuous absorbable sutures starting from the apex. The torn external anal sphincter muscle ends were identified, grasped with Allis clamps, and repaired using an overlap technique with polyglactin 3-0 mattress sutures. The perineal muscles were then repaired in layers and the perineal skin was closed with subcuticular sutures. A rectal examination was performed confirming a smooth intact anal canal. Broad-spectrum antibiotics were administered and stool softeners were prescribed.',
      'Under spinal anesthesia, systematic assessment confirmed complete disruption of both the external and internal anal sphincters. The repair was commenced with identification and repair of the internal anal sphincter using interrupted 3-0 polyglactin sutures in an end-to-end fashion. The external anal sphincter ends were then identified and an overlapping repair technique was employed using 3-0 polyglactin mattress sutures placed without excessive tension. The vaginal mucosa was repaired with continuous sutures and the perineal body was reconstructed with anatomical layer closure. Post-repair per rectal examination confirmed a good sphincter repair with no palpable defect. The patient was catheterized and started on prophylactic antibiotics and laxatives.',
      'Under regional anesthesia, the fourth-degree tear was carefully assessed. The rectal mucosa was repaired first using interrupted 3-0 polyglactin sutures with the knots tied within the rectal lumen to minimize suture exposure. The internal anal sphincter was identified and repaired separately with interrupted sutures. The external anal sphincter was repaired using the overlapping technique with mattress sutures of 3-0 polyglactin. A fresh set of instruments was used for the perineal phase of the repair. The vaginal mucosa was closed with continuous sutures, the perineal muscles were repaired in layers, and the skin was closed with subcuticular sutures. Per rectal examination confirmed adequate repair with no defect palpable. A Foley catheter was inserted and the patient was commenced on antibiotics and stool softeners.',
    ],
    desc: [
      'Third-degree perineal tear was detected and repaired under anesthesia with sphincter overlap technique. The patient was prescribed antibiotics and laxatives and was referred for post-natal pelvic floor physiotherapy follow-up.',
      'OASIS repair was completed with internal and external sphincter reconstruction confirmed by post-repair rectal examination. The patient was stable and was counseled about wound care, laxative use, and long-term follow-up.',
      'Fourth-degree perineal tear was repaired systematically with rectal mucosal, sphincter, and perineal reconstruction. The patient was transferred to the ward with a catheter in situ and was scheduled for follow-up in the perineal clinic.',
    ],
  },
  'Peripartum Hysterectomy': {
    diagnosis: [
      'Patient developed massive post-partum hemorrhage following cesarean section for placenta previa with estimated blood loss exceeding 2500 ml. All conservative measures including uterine compression sutures, uterine artery ligation, and uterotonics failed to control the bleeding. Diagnosis was intractable post-partum hemorrhage not responding to conservative management requiring emergency peripartum hysterectomy as a life-saving measure.',
      'Patient had a cesarean delivery complicated by placenta accreta with the placenta found to be abnormally adherent to the anterior uterine wall overlying the previous cesarean scar. Attempted manual removal resulted in uncontrollable hemorrhage. Diagnosis was placenta accreta with life-threatening hemorrhage requiring emergency peripartum hysterectomy.',
      'Patient developed severe uterine atony after vaginal delivery of twins with massive post-partum hemorrhage not responding to multiple uterotonics including oxytocin, ergometrine, carboprost, and misoprostol. Bimanual compression and uterine tamponade balloon failed to achieve hemostasis. Diagnosis was refractory atonic post-partum hemorrhage requiring emergency peripartum hysterectomy.',
    ],
    notes: [
      'The decision for emergency peripartum hysterectomy was made after failure of all conservative measures. Under general anesthesia, the abdomen was already open from the cesarean section. Massive transfusion protocol was activated and blood products were being administered. The uterine arteries were ligated bilaterally. As bleeding continued, subtotal hysterectomy was performed by clamping, cutting, and ligating the uterine pedicles bilaterally. The uterus was amputated above the level of the cervix. The cervical stump was closed with interrupted sutures and hemostasis was meticulously achieved at all pedicle sites. Both ureters were identified and confirmed intact. Pelvic drains were placed bilaterally. The estimated total blood loss was approximately 3500 ml and the patient received 6 units of packed red cells and 4 units of fresh frozen plasma.',
      'Emergency peripartum hysterectomy was performed for placenta accreta with uncontrollable hemorrhage. The placenta was left in situ and the decision was made for total hysterectomy. The infundibulopelvic ligaments were preserved and the uterine pedicles were systematically secured bilaterally working downward. The uterine arteries were double-ligated. The bladder was carefully dissected off the lower uterine segment which was densely adherent due to the accreta. Total hysterectomy was completed with removal of the cervix and the specimen. All pedicles were inspected for hemostasis. The bladder integrity was confirmed and bilateral ureteric peristalsis was observed. Drains were placed and the abdomen was closed. The patient was transferred to the intensive care unit.',
      'As all medical and surgical conservative measures failed, emergency peripartum hysterectomy was performed through the existing midline incision extended if needed. The uterus was mobilized by systematic clamping and ligation of round ligaments, tubo-ovarian pedicles (preserving both ovaries), and uterine vessels bilaterally. Both ureters were visualized at the level of the uterine artery and protected. The bladder was reflected and the vaginal vault was entered. The uterus and cervix were removed. The vaginal vault was closed with continuous locking sutures and vault hemostasis was confirmed. Pelvic drains were placed. Throughout the procedure, the anesthesia team managed the massive transfusion with blood products and vasopressors as needed. The patient was stabilized and transferred to the ICU.',
    ],
    desc: [
      'Emergency peripartum hysterectomy was performed as a life-saving procedure for intractable post-partum hemorrhage. The patient was stabilized with massive blood transfusion and was transferred to the intensive care unit for continued monitoring.',
      'Peripartum hysterectomy for placenta accreta was completed with preservation of both ovaries and confirmation of ureteral integrity. The patient was hemodynamically stabilized and transferred to ICU care.',
      'Emergency hysterectomy was accomplished as a last resort for refractory atonic PPH with achievement of hemostasis. The patient received massive transfusion and was in stable but critical condition in the ICU.',
    ],
  },
  'Repair of Ruptured Uterus': {
    diagnosis: [
      'Patient was admitted with sudden onset severe abdominal pain and vaginal bleeding at 38 weeks of gestation with a history of previous cesarean section. On examination, uterine contractions had ceased, fetal parts were easily palpable, and fetal heart sounds were absent. Diagnosis was uterine rupture at the previous cesarean scar site with intrauterine fetal death requiring emergency laparotomy.',
      'Patient was in obstructed labor with Bandl\'s ring palpable and suddenly developed maternal tachycardia with cessation of contractions and vaginal bleeding. Fetal heart rate was undetectable. Diagnosis was spontaneous uterine rupture secondary to obstructed labor requiring emergency surgical intervention.',
      'Patient had a trial of labor after cesarean section and developed sudden severe lower abdominal pain with fetal bradycardia during active labor. Emergency assessment revealed a tender abdomen with loss of uterine contour. Diagnosis was suspected uterine scar dehiscence or rupture requiring emergency laparotomy and repair.',
    ],
    notes: [
      'Under general anesthesia, emergency laparotomy was performed through a midline incision. Hemoperitoneum of approximately 1500 ml was found. The dead fetus and placenta were partially extruded through a rupture at the previous LSCS scar extending laterally to the left broad ligament. The fetus and placenta were delivered. The rupture edges were assessed for viability and the necrotic tissue was debrided. The rupture was repaired in two layers using continuous locking sutures for the first layer and interrupted sutures for the serosal layer. The left uterine artery was intact. Bilateral tubal ligation was performed after discussion with the family regarding future pregnancy risks. The peritoneal cavity was irrigated and hemostasis was confirmed. A drain was placed and the abdomen was closed.',
      'Emergency laparotomy revealed uterine rupture at the lower segment extending to the left lateral wall with active bleeding. The dead fetus was found partially in the abdominal cavity. The fetus and placenta were removed. The rupture edges were freshened and the ruptured uterus was repaired. The first layer closure was performed with continuous locking PGA sutures followed by a second layer of interrupted seromuscular sutures. The left ureter was identified and found to be intact despite the lateral extension of the tear. BLTL was performed. Blood products were transfused as the total blood loss was estimated at 2000 ml. The abdomen was irrigated and closed with drains.',
      'Under general anesthesia, emergency laparotomy was performed. A scar dehiscence was found with the fetus still within the uterus but with the amniotic sac bulging through the defect. The baby was delivered alive via the defect with an APGAR of 4 at 1 minute and 7 at 5 minutes. The placenta was delivered and the uterine defect was assessed. The old scar tissue was excised and the uterine wall was repaired in two layers with good quality myometrium approximated. Both ureters were identified and found safe. The patient was counseled about the absolute need for elective cesarean delivery in any future pregnancy. Hemostasis was confirmed and the abdomen was closed with a drain in situ.',
    ],
    desc: [
      'Emergency repair of ruptured uterus was completed with bilateral tubal ligation performed after family counseling. The patient was stabilized with blood transfusion and was transferred to the ICU for close monitoring.',
      'Uterine rupture repair was accomplished with two-layer closure and BLTL. The patient received blood products and was hemodynamically stable post-operatively in the intensive care unit.',
      'Emergency laparotomy for uterine scar dehiscence resulted in live baby delivery and successful uterine repair. The patient was stable and was counseled regarding future pregnancy management.',
    ],
  },
  'Uterine inversion management': {
    diagnosis: [
      'Patient developed acute uterine inversion immediately following delivery of the placenta with the uterine fundus visible at the introitus. The patient was in hypovolemic shock with severe vaginal bleeding, hypotension, and tachycardia. Diagnosis was acute complete uterine inversion with hemorrhagic shock requiring immediate resuscitation and manual replacement.',
      'Patient had a normal delivery but during the third stage, excessive cord traction was applied resulting in acute uterine inversion with the fundus palpable in the vagina. The patient experienced severe pain and vasovagal symptoms. Diagnosis was acute incomplete uterine inversion following mismanaged third stage of labor.',
      'Patient developed sudden severe post-partum pain and bleeding with a mass felt in the vagina after delivery. On examination, the uterine fundus was inverted and visible at the introitus with the placenta still attached. Diagnosis was acute puerperal uterine inversion with attached placenta requiring emergency management.',
    ],
    notes: [
      'Immediate resuscitation was initiated with two large-bore intravenous lines, rapid fluid administration, and preparation for blood transfusion. Under general anesthesia with uterine relaxation achieved, manual replacement of the inverted uterus was performed using the Johnson maneuver. The fundus was grasped with the palm of the hand and steady upward pressure was applied through the cervical ring pushing the last part of the uterus that came out first back into position. The fundus was held in the corrected position for several minutes until the uterus contracted. Once the uterus was replaced, the hand was slowly withdrawn and oxytocin infusion was started immediately to maintain uterine contraction and prevent re-inversion. The uterus was monitored abdominally to confirm it remained in the corrected position.',
      'The uterine inversion was recognized immediately and the team was mobilized for emergency management. Intravenous access was established and fluids were administered rapidly. Under general anesthesia with halothane for uterine relaxation, hydrostatic reduction using the O\'Sullivan technique was attempted first. Warm saline was infused into the vagina with the operator\'s hand sealing the introitus to create hydrostatic pressure. However, the inversion did not reduce with hydrostatic method. Manual replacement was then performed with the Johnson maneuver, pushing the fundus upward through the cervical ring with sustained pressure. The uterus was successfully repositioned. Oxytocin infusion was immediately commenced and the uterus was monitored to ensure it remained in the correct position.',
      'Acute uterine inversion with attached placenta was managed emergently. The decision was made not to remove the placenta before replacement to avoid additional hemorrhage. Under general anesthesia, the inverted fundus with the attached placenta was grasped and steady upward pressure was applied using the Johnson technique. The fundus was pushed through the cervical ring and the uterus was repositioned. Once the uterus was in normal position, the placenta was separated manually and removed. Oxytocin infusion was started immediately and the uterus contracted well. Bimanual compression was applied for several minutes to maintain the uterine position. The patient was transfused with two units of packed red cells and was monitored in the high-dependency unit.',
    ],
    desc: [
      'Acute uterine inversion was successfully reduced by manual replacement using the Johnson maneuver and the uterus was maintained in position with oxytocin. The patient was resuscitated and stabilized in the high-dependency unit.',
      'Management of uterine inversion was accomplished with manual replacement after failed hydrostatic reduction. The patient was hemodynamically stabilized with fluid resuscitation and close monitoring.',
      'Uterine inversion with attached placenta was managed with replacement followed by placental removal and oxytocin infusion. The patient was stabilized with blood transfusion and was monitored closely post-procedure.',
    ],
  },
  'Vulval hematoma - Identification and Management': {
    diagnosis: [
      'Patient developed a rapidly expanding painful swelling in the left labial region within two hours of vaginal delivery. On examination, a tense, fluctuant, tender hematoma measuring approximately 8 cm was identified in the left labia majora with surrounding ecchymosis. Diagnosis was post-partum vulval hematoma likely secondary to laceration of a branch of the pudendal artery.',
      'Patient complained of severe perineal pain and pressure sensation following instrumental delivery. Examination revealed a large right-sided paravaginal hematoma causing medial displacement of the vaginal wall with the overlying mucosa tense and discolored. Diagnosis was expanding paravaginal hematoma following instrumental delivery requiring surgical evacuation.',
      'Patient presented with progressive vulval swelling and pain several hours after a normal delivery with episiotomy repair. The episiotomy site appeared intact but a large, tense, bluish swelling was noted on the contralateral side of the vulva. Diagnosis was traumatic vulval hematoma requiring identification of the source and surgical management.',
    ],
    notes: [
      'Under regional anesthesia with the patient in lithotomy position, the expanding vulval hematoma was incised at its most prominent point. A large volume of blood clots and liquid blood was evacuated from the hematoma cavity. The cavity was explored and irrigated with warm saline to identify the bleeding source. An actively bleeding vessel was identified at the base of the cavity and was ligated with absorbable sutures. The dead space was obliterated using horizontal mattress sutures of absorbable material placed from the deep tissue to the surface. A vaginal pack was placed for compression. The estimated blood loss including the hematoma was approximately 500 ml and the patient was given intravenous fluids and crossmatched for blood transfusion.',
      'Under general anesthesia, the paravaginal hematoma was incised through the vaginal mucosa. Large clots were evacuated and the cavity was digitally explored to break down any loculations. The hematoma cavity was irrigated with warm saline and systematic inspection was performed to identify the bleeding source. Multiple small bleeding vessels were found and controlled with bipolar cautery and figure-of-eight absorbable sutures. The cavity was packed with hemostatic gauze and the vaginal mucosa was closed with continuous absorbable sutures leaving a small opening for drainage. A firm vaginal pack was placed and the patient was catheterized. Ice packs were applied externally and the patient was observed closely for any re-expansion of the hematoma.',
      'The vulval hematoma was managed surgically under adequate anesthesia. An incision was made over the hematoma at the point of maximum tension and approximately 300 ml of clotted and liquid blood was drained. The cavity was explored thoroughly to locate the source of bleeding. A bleeding point was identified in the superficial perineal vessels and was secured with suture ligation. The wound bed was irrigated with saline and inspected for completeness of hemostasis. The dead space was obliterated with multiple deep mattress sutures using absorbable material. The skin was closed loosely with interrupted sutures to allow for any continued drainage. A pressure dressing was applied and the patient was monitored with serial hemoglobin checks.',
    ],
    desc: [
      'Vulval hematoma was identified and managed surgically with evacuation, hemostasis, and obliteration of dead space. The patient was hemodynamically stable and was monitored closely for any signs of re-accumulation.',
      'Surgical management of the paravaginal hematoma was completed with identification and control of the bleeding vessels. The patient was catheterized and monitored in the post-natal high-dependency area.',
      'The vulval hematoma was evacuated and the bleeding source was identified and ligated. The patient was stable with improving symptoms and was observed for 24 hours before discharge.',
    ],
  },
};

// ─── Interpretative Skill data ───
interface InterpData { indication: string[]; interpretation: string[]; desc: string[] }

const GYN_INTERP: Record<string, InterpData> = {
  'CT Scan': {
    indication: [
      'Patient presented with a large pelvic mass on clinical examination and ultrasonography showing a complex adnexal mass measuring 12 cm with mixed solid and cystic components. CT scan of the abdomen and pelvis was requested for further characterization and staging evaluation.',
      'Patient was diagnosed with cervical carcinoma stage IB2 on clinical examination and biopsy. CT scan of the abdomen and pelvis was requested for staging to evaluate for lymph node involvement, parametrial extension, and distant metastasis before planning definitive treatment.',
      'Patient presented with recurrent ovarian malignancy with rising CA-125 levels six months after completion of chemotherapy. CT abdomen and pelvis was performed to evaluate for sites of disease recurrence and to guide further management decisions.',
    ],
    interpretation: [
      'CT scan showed a large complex pelvic mass measuring 11x9x8 cm arising from the left adnexa with predominantly solid components, enhancing septae, and ascitic fluid in the pelvis. No retroperitoneal lymphadenopathy was noted and the liver and other organs appeared normal. The findings were suggestive of an ovarian neoplasm requiring surgical evaluation.',
      'CT scan revealed a cervical mass measuring 4 cm confined to the cervix with no parametrial invasion. Bilateral pelvic lymph nodes were within normal limits with no para-aortic lymphadenopathy. The kidneys showed bilateral normal excretion with no hydronephrosis. The findings were consistent with localized cervical carcinoma suitable for radical surgery.',
      'CT scan demonstrated multiple peritoneal deposits in the omentum and pouch of Douglas with a 3 cm nodule in the right paracolic gutter. Moderate ascites was present. No liver parenchymal metastasis or lung lesions were identified. The findings were consistent with peritoneal recurrence of ovarian carcinoma.',
    ],
    desc: [
      'CT abdomen and pelvis was reviewed and interpreted in the clinical context of the patient. The findings were discussed with the multidisciplinary team for surgical planning.',
      'CT scan interpretation was completed and the staging findings were documented for treatment planning. The results were communicated to the treating gynecological oncologist.',
      'CT findings were reviewed and correlated with tumor marker levels for comprehensive assessment of disease recurrence. The report was documented and management options were discussed.',
    ],
  },
  'Colonoscopy': {
    indication: [
      'Patient with known deep infiltrating endometriosis presented with cyclical rectal bleeding and dyschezia during menstruation. Pre-operative colonoscopy was requested to assess the extent of bowel involvement and to rule out intraluminal endometriotic nodules before planned surgical excision.',
      'Patient presented with altered bowel habits and per rectal bleeding in the context of a large posterior wall ovarian mass. Colonoscopy was performed to evaluate for colorectal pathology and to assess any bowel involvement by the pelvic mass before planned surgery.',
      'Patient was being evaluated for chronic pelvic pain with suspected colorectal involvement. She reported intermittent rectal bleeding and constipation coinciding with her menstrual cycles. Colonoscopy was indicated to assess for endometriotic infiltration of the bowel wall.',
    ],
    interpretation: [
      'Colonoscopy revealed normal colonic mucosa from the cecum to the rectum with no intraluminal mass or polyps. However, an extrinsic compression was noted at the rectosigmoid junction with smooth intact overlying mucosa consistent with extrinsic endometriotic nodule. No biopsy was warranted from the normal mucosa.',
      'Colonoscopic examination showed normal mucosa throughout the colon. At 15 cm from the anal verge, a smooth submucosal bulge was noted suggestive of extrinsic compression from the known pelvic mass. No intraluminal pathology was identified and the scope was advanced to the cecum without difficulty.',
      'Colonoscopy demonstrated a nodular area on the anterior rectal wall at approximately 12 cm from the anal verge with overlying mucosal erythema and puckering consistent with transmural endometriotic infiltration. The remaining colonic mucosa was normal up to the cecum. Biopsy of the rectal nodule was taken and sent for histopathological confirmation.',
    ],
    desc: [
      'Colonoscopy findings were reviewed and interpreted in the context of known endometriosis. The extrinsic bowel involvement was documented for surgical planning.',
      'Colonoscopic evaluation was completed with no significant intraluminal pathology identified. The findings were documented and correlated with imaging for comprehensive pre-operative assessment.',
      'Colonoscopy findings confirmed rectal wall involvement by endometriosis and the biopsy report was awaited. The results were discussed with the surgical team for multidisciplinary management planning.',
    ],
  },
  'Dopler Study': {
    indication: [
      'Patient presented with a right adnexal mass measuring 7 cm on ultrasonography with mixed echogenicity and internal septations. Color Doppler study was requested to evaluate the vascularity pattern of the mass and assess the risk of malignancy based on the resistive index and pulsatility index of the feeding vessels.',
      'Patient presented with acute onset right lower abdominal pain with a known right ovarian cyst. Doppler study was urgently requested to evaluate blood flow to the right ovary and rule out ovarian torsion by assessing arterial and venous flow patterns.',
      'Patient with uterine fibroids was being evaluated pre-operatively with Doppler study to map the blood supply of the dominant fibroid. Uterine artery Doppler was performed to assess the feasibility of uterine artery embolization as an alternative to surgical myomectomy.',
    ],
    interpretation: [
      'Color Doppler study of the right adnexal mass showed peripheral and central vascularity with low resistance flow pattern. The resistive index was 0.38 and the pulsatility index was 0.62, both suggestive of neovascularization and concerning for malignancy. The left ovary showed normal flow patterns. These findings warrant further evaluation with tumor markers and surgical consultation.',
      'Doppler evaluation of the right ovary showed absent arterial flow and absent venous flow in the right ovarian parenchyma consistent with complete ovarian torsion. The left ovary showed normal arterial and venous flow patterns. The whirlpool sign was positive in the right adnexal region confirming the diagnosis of torsion.',
      'Uterine artery Doppler showed bilateral uterine arteries with normal flow velocities. The dominant fibroid showed peripheral feeding vessels from the right uterine artery with a resistive index of 0.52 consistent with benign vascularity. No abnormal neovascularity was identified within the fibroid. The findings suggested suitability for uterine artery embolization.',
    ],
    desc: [
      'Doppler study was reviewed showing concerning vascular pattern in the adnexal mass warranting further investigation. The findings were documented and communicated for urgent clinical decision-making.',
      'Doppler findings were interpreted as consistent with ovarian torsion requiring emergency surgical intervention. The report was communicated immediately to the surgical team.',
      'Uterine artery Doppler study was interpreted in the context of pre-interventional planning for fibroid management. The findings were documented and discussed with the interventional radiology team.',
    ],
  },
  'Dopler Test': {
    indication: [
      'Patient with a left adnexal mass of uncertain nature was being evaluated for pre-operative planning. Doppler test was requested to differentiate between a vascular and avascular mass and to assess the flow characteristics within and around the lesion.',
      'Patient presented with heavy menstrual bleeding and a large uterine fibroid for which uterine artery embolization was being considered. Pelvic Doppler test was performed to evaluate the uterine artery flow parameters and map the fibroid blood supply pre-procedurally.',
      'Patient with suspected pelvic congestion syndrome presented with chronic pelvic pain that worsened with prolonged standing. Pelvic venous Doppler test was performed to evaluate for venous incompetence and dilated pelvic veins.',
    ],
    interpretation: [
      'Doppler test demonstrated normal arterial flow in bilateral ovarian arteries with normal resistive indices. The left adnexal mass showed minimal internal vascularity with high-resistance flow pattern suggesting a benign nature. No arteriovenous malformation or abnormal shunting was identified in the pelvis.',
      'Pelvic Doppler test showed bilateral uterine arteries with increased flow velocity and decreased resistive index consistent with increased uterine blood flow secondary to the large fibroid. The dominant fibroid had feeding vessels predominantly from the left uterine artery. The flow parameters were documented for embolization planning.',
      'Pelvic venous Doppler demonstrated dilated left ovarian vein measuring 8 mm with venous reflux on Valsalva maneuver. Bilateral internal iliac veins showed normal flow. The findings were consistent with left-sided pelvic congestion syndrome with ovarian vein incompetence.',
    ],
    desc: [
      'Doppler test findings were reviewed and interpreted in the clinical context showing benign flow characteristics. The results were documented for pre-operative planning and surgical decision-making.',
      'Pelvic Doppler test was interpreted with mapping of fibroid vasculature for interventional planning. The report was communicated to the interventional radiology team for embolization consideration.',
      'Pelvic venous Doppler test was reviewed confirming the diagnosis of pelvic congestion syndrome. The findings were documented and management options were discussed with the patient.',
    ],
  },
  'Histopathology': {
    indication: [
      'Patient underwent total abdominal hysterectomy for symptomatic uterine fibroids. The surgical specimen including the uterus with bilateral tubes was submitted for histopathological examination to confirm the diagnosis and rule out any concurrent pathology.',
      'Patient had a cervical punch biopsy taken under colposcopic guidance following an abnormal Pap smear result showing HSIL. The biopsy specimen was sent for histopathological evaluation to determine the grade of cervical intraepithelial neoplasia and guide further management.',
      'Patient underwent laparoscopic ovarian cystectomy for a 6 cm right ovarian cyst. The cyst wall and contents were submitted for histopathological examination to determine the histological type and exclude malignancy.',
    ],
    interpretation: [
      'Histopathological examination of the hysterectomy specimen showed a uterus with multiple intramural leiomyomata, the largest measuring 5 cm in diameter. The endometrium showed proliferative phase changes with no evidence of hyperplasia or malignancy. Bilateral fallopian tubes showed normal histology with no significant abnormality.',
      'Cervical biopsy showed cervical intraepithelial neoplasia grade II (CIN II) involving the transformation zone. The dysplastic epithelium showed loss of maturation involving the lower two-thirds of the epithelium with increased mitotic figures. The deep margin was involved but the lateral margins were clear. No evidence of invasive carcinoma was seen.',
      'Histopathology of the ovarian cyst wall showed a simple serous cystadenoma lined by a single layer of cuboidal to low columnar epithelium without atypia. No papillary excrescences, solid areas, or features of borderline tumor were identified. The findings confirmed a benign serous neoplasm of the ovary.',
    ],
    desc: [
      'Histopathology report was reviewed confirming benign uterine leiomyomata with no malignant features. The findings were documented and the patient was informed during follow-up consultation.',
      'HPE report of the cervical biopsy was interpreted showing CIN II with margin involvement. The findings were discussed and a plan for LEEP excision was recommended to the patient.',
      'Histopathological examination confirmed a benign serous cystadenoma with no features of malignancy. The report was documented and the patient was reassured with advice for routine follow-up.',
    ],
  },
  'MRI': {
    indication: [
      'Patient was diagnosed with multiple uterine fibroids and was being considered for myomectomy. MRI pelvis was performed for detailed fibroid mapping to determine the number, size, location, and relation to the endometrial cavity for surgical planning.',
      'Patient with clinically suspected deep infiltrating endometriosis presented with severe dysmenorrhea, dyschezia, and dyspareunia. MRI pelvis was requested for staging of endometriosis including assessment of rectovaginal septum, uterosacral ligaments, and bowel involvement.',
      'Patient was diagnosed with cervical carcinoma stage IB on clinical examination and biopsy. MRI pelvis was performed for local staging to assess tumor size, depth of stromal invasion, parametrial involvement, and lymph node status for treatment planning.',
    ],
    interpretation: [
      'MRI pelvis showed a uterus measuring 14x10x9 cm with multiple fibroids. Three intramural fibroids were identified: the largest in the posterior wall measuring 6x5 cm, a second in the anterior wall measuring 4x3 cm, and a third fundal fibroid measuring 3x2 cm. A 2 cm submucous fibroid was noted distorting the endometrial cavity. No evidence of sarcomatous change was seen. Both ovaries appeared normal.',
      'MRI pelvis demonstrated deep infiltrating endometriosis involving the rectovaginal septum with a nodule measuring 2.5 cm, obliteration of the posterior cul-de-sac, and bilateral uterosacral ligament thickening with signal abnormality. The junctional zone was thickened suggesting concurrent adenomyosis. No evidence of bowel wall penetration was seen. Bilateral ovaries showed small endometriomas measuring 2 cm each.',
      'MRI demonstrated a cervical mass measuring 3.5x3 cm confined to the cervix with no parametrial extension. The stromal invasion appeared to involve less than 50% of the cervical wall thickness. The vaginal fornices were clear and the pelvic lymph nodes were within normal limits. The tumor showed restricted diffusion on DWI sequence consistent with the known squamous cell carcinoma.',
    ],
    desc: [
      'MRI pelvis was reviewed with detailed fibroid mapping documented for myomectomy planning. The surgical approach was discussed based on fibroid locations and the presence of a submucous component.',
      'MRI interpretation confirmed deep infiltrating endometriosis with rectovaginal involvement. The findings were documented and discussed in the multidisciplinary team meeting for comprehensive surgical planning.',
      'MRI staging of cervical carcinoma was reviewed showing organ-confined disease with no parametrial spread. The findings supported radical hysterectomy as the treatment option and were communicated to the oncology team.',
    ],
  },
  'Pap Smear': {
    indication: [
      'Patient attended the cervical cancer screening program as part of routine preventive health checkup. She was 35 years old with no previous history of abnormal cervical cytology. Pap smear was performed as per screening guidelines for age-appropriate cervical cancer screening.',
      'Patient had a previous Pap smear showing ASCUS one year ago and was returning for follow-up repeat cytology as recommended. She had no interval symptoms and no HPV testing had been performed previously. Repeat Pap smear was done to assess for resolution or progression of the abnormality.',
      'Patient presented for post-treatment surveillance Pap smear six months after LEEP excision for CIN III. She was asymptomatic and the LEEP specimen margins had been reported as clear. Follow-up cytology was performed as part of the standard post-treatment surveillance protocol.',
    ],
    interpretation: [
      'Pap smear result was reported as NILM - Negative for Intraepithelial Lesion or Malignancy. The smear showed normal squamous and endocervical cells with adequate cellularity. No atypical cells, koilocytosis, or inflammatory changes of significance were identified. The transformation zone component was present indicating an adequate sample.',
      'Pap smear cytology showed Atypical Squamous Cells of Undetermined Significance (ASCUS). Scattered atypical squamous cells were noted with slight nuclear enlargement and irregularity that did not meet criteria for squamous intraepithelial lesion. The background showed mild inflammatory changes. HPV co-testing was recommended for further risk stratification.',
      'Follow-up Pap smear showed NILM with no evidence of residual or recurrent dysplasia. The smear was adequate with both ectocervical and endocervical components represented. No atypical cells were identified. The findings were reassuring in the context of post-LEEP surveillance.',
    ],
    desc: [
      'Pap smear result was reviewed and interpreted as normal cervical cytology. The patient was counseled about the result and advised to continue routine screening as per age-appropriate guidelines.',
      'Pap smear interpretation showed ASCUS and HPV co-testing was recommended for further evaluation. The result was communicated to the patient with explanation of management options.',
      'Post-treatment surveillance Pap smear was interpreted as normal with no evidence of residual disease. The patient was reassured and scheduled for continued surveillance as per the protocol.',
    ],
  },
  'Semen Analysis': {
    indication: [
      'Couple presented with primary infertility of three years duration. The female partner evaluation was normal and semen analysis was requested for the male partner as part of the standard couple infertility workup to evaluate sperm parameters according to WHO 2021 reference values.',
      'Patient was being evaluated for secondary infertility with the male partner\'s semen analysis requested as part of the initial assessment. The couple had previously conceived naturally five years ago. The analysis was performed after three days of abstinence as per standard protocol.',
      'Post-vasectomy semen analysis was requested at three months following the vasectomy procedure to confirm azoospermia and the success of the sterilization. The sample was collected after a minimum of 20 ejaculations post-procedure as per the follow-up protocol.',
    ],
    interpretation: [
      'Semen analysis showed normozoospermia with all parameters within WHO 2021 reference values. Volume was 3.5 ml, concentration was 45 million per ml, total motility was 58% with progressive motility of 42%, and normal morphology was 5%. The vitality was 70% and the total sperm count was 157 million. No significant white blood cells were noted.',
      'Semen analysis revealed oligoasthenozoospermia. The volume was adequate at 2.8 ml but the concentration was 8 million per ml which was below the reference value. Total motility was 25% with progressive motility of only 15%, both below reference values. Morphology showed 2% normal forms. The total sperm count was 22 million. Repeat analysis was recommended in three months with lifestyle modification advice.',
      'Post-vasectomy semen analysis demonstrated complete azoospermia with no spermatozoa seen on both fresh and centrifuged samples. The ejaculate volume was 2.5 ml with normal pH. The absence of sperm confirmed successful vasectomy. The couple was advised that additional contraception was no longer required.',
    ],
    desc: [
      'Semen analysis report was reviewed and interpreted as normal with all parameters within WHO reference ranges. The findings were documented and communicated during the couple counseling session for infertility management.',
      'Semen analysis interpretation revealed oligoasthenozoospermia requiring further evaluation and possible assisted reproduction. The results were discussed with the couple and referral to a male infertility specialist was recommended.',
      'Post-vasectomy semen analysis was interpreted confirming complete azoospermia and successful sterilization. The result was communicated to the patient and documented in the clinical record.',
    ],
  },
  'USG': {
    indication: [
      'Patient presented with heavy irregular menstrual bleeding for the past six months not responding to medical therapy. Pelvic ultrasonography was requested to evaluate the uterus for fibroids, adenomyosis, or endometrial pathology and to assess the ovaries for any adnexal pathology.',
      'Patient was undergoing infertility workup and baseline pelvic ultrasonography was requested on day 2 of the menstrual cycle for antral follicle count, assessment of uterine morphology, and exclusion of any pelvic pathology that may be contributing to subfertility.',
      'Patient presented with acute lower abdominal pain with a positive pregnancy test. Pelvic ultrasonography was performed urgently to confirm intrauterine pregnancy location and rule out ectopic pregnancy.',
    ],
    interpretation: [
      'Transabdominal and transvaginal ultrasonography showed a normal-sized anteverted uterus measuring 8x5x4 cm. The endometrial thickness was 12 mm with regular margins and homogeneous echotexture. A small intramural fibroid measuring 2 cm was noted in the posterior wall. Both ovaries were normal in size with normal follicular pattern. No free fluid was seen in the pouch of Douglas.',
      'Pelvic ultrasound on day 2 showed a normal-sized uterus with regular endometrial cavity and thin endometrium measuring 4 mm. The right ovary measured 3x2 cm with 8 antral follicles and the left ovary measured 3.5x2.5 cm with 10 antral follicles. Total antral follicle count was 18 indicating good ovarian reserve. No adnexal pathology was identified.',
      'Transvaginal ultrasonography showed no intrauterine gestational sac. The endometrial thickness was 10 mm. A complex mass measuring 3x2 cm was seen in the right adnexal region with a surrounding echogenic ring and small amount of free fluid in the pouch of Douglas. The left ovary appeared normal. The findings were suggestive of a right tubal ectopic pregnancy.',
    ],
    desc: [
      'Pelvic ultrasonography was reviewed and interpreted showing a small uterine fibroid with normal endometrial thickness. The findings were documented and correlated with clinical presentation for management planning.',
      'Baseline pelvic ultrasound was interpreted showing adequate ovarian reserve with normal uterine morphology for the infertility workup. The antral follicle count was documented for treatment planning.',
      'Urgent pelvic ultrasound was reviewed and interpreted as suspicious for ectopic pregnancy requiring immediate clinical correlation with serum beta-hCG levels. The findings were communicated urgently to the treating team.',
    ],
  },
};

const OBS_INTERP: Record<string, InterpData> = {
  'Anomaly Scan': {
    indication: [
      'Patient was a primigravida at 20 weeks of gestation attending for routine mid-trimester anomaly screening scan as per the antenatal care protocol. There was no family history of congenital anomalies and the first trimester screening was low risk. The scan was performed for systematic evaluation of fetal anatomy.',
      'Patient at 19 weeks of gestation was referred for detailed anomaly scan due to a previous pregnancy resulting in a baby with a neural tube defect. She had been on folic acid supplementation from pre-conception. The scan was requested for thorough evaluation of the fetal spine and brain.',
      'Patient at 21 weeks of gestation was referred for anomaly scan following abnormal first trimester combined screening with increased risk for trisomy 21. Amniocentesis was declined by the patient and she opted for detailed ultrasound evaluation of fetal anatomy as an alternative assessment.',
    ],
    interpretation: [
      'Detailed anomaly scan showed a singleton live fetus in cephalic presentation with biometric parameters consistent with 20 weeks of gestation. Systematic evaluation of the fetal anatomy was performed. The brain showed normal midline echo with cavum septum pellucidum, bilateral choroid plexus, and normal posterior fossa. The face showed normal profile with intact upper lip. The four-chamber heart view and outflow tracts appeared normal. The spine was intact with no neural tube defect. The abdominal organs, kidneys, bladder, and extremities were all within normal limits. The placenta was posterior and upper segment with normal amniotic fluid volume.',
      'Anomaly scan showed a singleton live fetus with all biometric parameters corresponding to 19 weeks. Particular attention was paid to the fetal spine and brain. The spine was intact along its entire length with normal vertebral alignment and no evidence of spina bifida. The brain anatomy was normal with intact cranial vault, normal cerebellum, and no ventriculomegaly. The remaining fetal anatomy including heart, face, abdominal wall, kidneys, and limbs was normal. Amniotic fluid volume was adequate.',
      'Targeted anomaly scan showed a live fetus with biometry corresponding to 21 weeks. No major structural anomaly was detected on systematic evaluation. The nuchal fold measured 4 mm which was within normal limits. No echogenic intracardiac focus, shortened long bones, or echogenic bowel was identified as soft markers for aneuploidy. The fetal anatomy was unremarkable and the amniotic fluid index was normal.',
    ],
    desc: [
      'Mid-trimester anomaly scan was reviewed and interpreted as showing normal fetal anatomy with no structural anomaly detected. The findings were documented and the patient was reassured.',
      'Anomaly scan was interpreted with particular attention to the neural tube and brain showing no evidence of neural tube defect. The normal findings were communicated to the patient and documented in the antenatal record.',
      'Targeted anomaly scan was reviewed showing no structural anomaly or soft markers for aneuploidy. The findings were explained to the patient and she was advised regarding continued routine antenatal care.',
    ],
  },
  'Bio-Physical Profile': {
    indication: [
      'Patient was at 41 weeks of gestation with a post-dates pregnancy awaiting induction of labor. Biophysical profile was performed as part of fetal surveillance to assess fetal well-being before the planned induction to ensure safety of continued expectant management.',
      'Patient with gestational diabetes mellitus on insulin therapy at 36 weeks of gestation was being monitored with biweekly fetal surveillance. BPP was performed as part of the antepartum testing schedule to assess fetal condition and adequacy of the intrauterine environment.',
      'Patient at 34 weeks of gestation with suspected intrauterine growth restriction and reduced fetal movements for the past 24 hours. BPP was requested for comprehensive assessment of fetal well-being including fetal breathing, movement, tone, and amniotic fluid volume.',
    ],
    interpretation: [
      'Biophysical profile scored 8 out of 8 which was reassuring. Fetal breathing movements were observed for more than 30 seconds in 30 minutes. At least three discrete body or limb movements were seen. At least one episode of active extension with return to flexion was documented confirming normal fetal tone. The amniotic fluid index was 10 cm with the largest vertical pocket measuring 3.5 cm. The NST was reactive with two accelerations of 15 bpm lasting 15 seconds in 20 minutes.',
      'BPP showed a score of 6 out of 8 which was borderline. Fetal movements and tone were normal and the NST was reactive. However, no fetal breathing movements were observed during the 30-minute observation period and the amniotic fluid index was 6 cm with the largest pocket measuring 2.5 cm indicating borderline oligohydramnios. Repeat BPP was recommended within 24 hours.',
      'BPP assessment showed fetal body movements present with at least three gross movements observed. Fetal tone was normal with episodes of flexion and extension. Fetal breathing movements were documented. The amniotic fluid index was 12 cm which was normal. The non-stress test showed a reactive pattern. Overall BPP score was 8 out of 8 which was reassuring despite the clinical concern of reduced maternal perception of fetal movements.',
    ],
    desc: [
      'Biophysical profile was reviewed and interpreted as reassuring with a score of 8/8. The findings supported continued expectant management with planned induction and were documented in the antenatal record.',
      'BPP interpretation showed a borderline score of 6/8 with absent fetal breathing and reduced amniotic fluid. Repeat assessment was recommended and the findings were communicated to the obstetric team for management decision.',
      'BPP was interpreted as reassuring with a score of 8/8 despite reported reduced fetal movements. The normal findings were explained to the patient and she was advised regarding ongoing fetal movement monitoring.',
    ],
  },
  'CTG': {
    indication: [
      'Patient at 38 weeks of gestation was admitted in early labor and cardiotocography was performed for intrapartum fetal heart rate monitoring as part of routine labor management for a high-risk pregnancy complicated by gestational hypertension.',
      'Patient at 35 weeks of gestation presented with complaint of reduced fetal movements over the past 12 hours. Antepartum CTG was performed as part of the assessment protocol for decreased fetal movement to evaluate fetal well-being.',
      'Patient at 39 weeks was in active labor with meconium-stained amniotic fluid noted after spontaneous rupture of membranes. Continuous electronic fetal monitoring by CTG was initiated to detect any signs of fetal compromise.',
    ],
    interpretation: [
      'CTG tracing showed a baseline fetal heart rate of 140 beats per minute with normal baseline variability of 10-15 bpm. Two accelerations of more than 15 bpm lasting more than 15 seconds were seen in the 20-minute recording period. No decelerations were noted. The uterine contraction pattern showed regular contractions every 5 minutes. The overall assessment was a reactive reassuring (Category I) tracing with no evidence of fetal compromise.',
      'Antepartum CTG showed a baseline of 148 bpm with moderate variability. The tracing was initially non-reactive for the first 20 minutes but became reactive after stimulation with vibroacoustic stimulus showing two clear accelerations. No decelerations were present throughout the recording. The reactive tracing after stimulation was reassuring and consistent with a fetal sleep-wake cycle rather than fetal compromise.',
      'Intrapartum CTG showed a baseline fetal heart rate of 155 bpm with reduced variability of 5 bpm. Variable decelerations were noted with three contractions over the past 15 minutes, with the deepest deceleration reaching 80 bpm lasting 90 seconds with slow recovery. The pattern was classified as Category II (indeterminate) requiring continuous monitoring, maternal repositioning, and preparation for possible operative delivery.',
    ],
    desc: [
      'CTG tracing was reviewed and interpreted as a reactive reassuring Category I pattern with no evidence of fetal distress. The findings were documented on the partograph and labor was allowed to continue with routine monitoring.',
      'Antepartum CTG was interpreted as reactive after vibroacoustic stimulation providing reassurance of fetal well-being. The result was communicated to the patient and she was advised regarding continued fetal movement monitoring.',
      'Intrapartum CTG was reviewed showing a Category II pattern with variable decelerations requiring close monitoring. The findings were communicated to the obstetric team and intrauterine resuscitation measures were initiated.',
    ],
  },
  'First trimester USG / TVS': {
    indication: [
      'Patient presented at 7 weeks of gestation with mild vaginal spotting and lower abdominal cramping. Transvaginal ultrasonography was performed to confirm the viability and location of the pregnancy and to rule out threatened miscarriage or ectopic pregnancy.',
      'Patient attended the antenatal clinic at 12 weeks for a dating scan as she was unsure of her last menstrual period date. First trimester ultrasonography was performed for accurate gestational age determination and to assess fetal viability before planning the combined first trimester screening.',
      'Patient with a history of two previous ectopic pregnancies presented at 6 weeks of amenorrhea with a positive pregnancy test and mild lower abdominal pain. Early transvaginal scan was requested urgently to confirm intrauterine pregnancy location.',
    ],
    interpretation: [
      'Transvaginal ultrasonography showed a single intrauterine gestational sac with a yolk sac and a fetal pole measuring 10 mm corresponding to 7 weeks and 2 days of gestation. Fetal cardiac activity was present with a heart rate of 152 beats per minute. No subchorionic hemorrhage or retroplacental collection was seen. Both ovaries appeared normal. The cervix was closed and measured 35 mm in length. The findings confirmed a viable intrauterine pregnancy consistent with dates.',
      'First trimester dating scan showed a single live intrauterine pregnancy with a crown-rump length of 56 mm corresponding to 12 weeks and 1 day of gestation. Fetal cardiac activity was normal at 160 bpm. The fetal anatomy appropriate for this gestation was assessed showing normal brain vesicles, intact abdominal wall, presence of stomach bubble, and four limbs. The nuchal translucency was not measured at this visit as the patient was being scheduled for a formal NT scan.',
      'Urgent transvaginal scan showed a small intrauterine gestational sac measuring 12 mm in the endometrial cavity with a yolk sac visible. No definite fetal pole was identified at this stage. No adnexal mass was seen and both ovaries appeared normal. The pouch of Douglas was free. The findings were consistent with an early intrauterine pregnancy at approximately 5-6 weeks. A follow-up scan was recommended in one week to confirm viability with identification of fetal cardiac activity.',
    ],
    desc: [
      'First trimester TVS was reviewed and interpreted confirming a viable intrauterine pregnancy consistent with dates. The findings were reassuring and the patient was advised regarding continued antenatal care.',
      'Dating scan was interpreted showing a viable intrauterine pregnancy with crown-rump length establishing the estimated date of delivery. The patient was scheduled for formal first trimester screening.',
      'Early transvaginal scan was interpreted showing an early intrauterine pregnancy without a visible fetal pole at this stage. A follow-up scan was recommended in one week and the patient was counseled about the expected findings.',
    ],
  },
  'Growth Profile with Doppler Study': {
    indication: [
      'Patient at 32 weeks of gestation with pre-eclampsia on antihypertensive therapy was being monitored for fetal growth and uteroplacental function. Growth scan with umbilical artery and middle cerebral artery Doppler was requested to assess fetal growth velocity and detect any early signs of placental insufficiency.',
      'Patient at 34 weeks of gestation was noted to have fundal height measuring less than dates on clinical examination for the past three visits. Fetal growth scan with Doppler was requested to evaluate for intrauterine growth restriction and assess the fetoplacental circulation.',
      'Patient at 30 weeks with severe early-onset pre-eclampsia and suspected intrauterine growth restriction was being monitored with serial growth scans and Doppler assessment. This scan was performed to evaluate the progression of growth restriction and guide the timing of delivery.',
    ],
    interpretation: [
      'Growth scan showed estimated fetal weight on the 20th percentile for gestational age with an abdominal circumference on the 15th percentile suggesting early asymmetric growth restriction. Umbilical artery Doppler showed a pulsatility index of 1.3 which was above the 95th percentile indicating increased placental resistance. Middle cerebral artery Doppler showed a pulsatility index of 1.5 which was normal with no evidence of brain sparing effect. The cerebroplacental ratio was 1.15 which was borderline. The amniotic fluid index was 8 cm.',
      'Growth profile showed estimated fetal weight on the 8th percentile with head circumference on the 25th percentile and abdominal circumference below the 5th percentile indicating severe asymmetric IUGR. Umbilical artery Doppler showed absent end-diastolic flow which was a concerning finding indicating significant placental insufficiency. Middle cerebral artery showed reduced pulsatility index of 0.9 with centralization of blood flow indicating fetal brain sparing. The ductus venosus showed normal a-wave.',
      'Serial growth scan showed estimated fetal weight on the 35th percentile with normal interval growth velocity compared to the previous scan two weeks ago. Umbilical artery Doppler pulsatility index was 0.95 within normal limits. Middle cerebral artery Doppler was normal with a pulsatility index of 1.6. The cerebroplacental ratio was 1.68 which was normal. Amniotic fluid index was 12 cm. No signs of fetal compromise were detected.',
    ],
    desc: [
      'Growth scan with Doppler was reviewed showing early asymmetric growth restriction with increased placental resistance. Closer surveillance was recommended and the findings were communicated to the obstetric team for management planning.',
      'Growth profile interpretation showed severe IUGR with absent end-diastolic flow indicating significant placental insufficiency. The findings were urgently communicated and delivery planning was initiated.',
      'Serial growth scan with Doppler was interpreted showing normal fetal growth velocity and reassuring Doppler parameters. The findings were documented and continued surveillance was planned.',
    ],
  },
  'NT Scan': {
    indication: [
      'Patient at 12 weeks of gestation attended for combined first trimester screening for aneuploidy. NT scan was performed as part of the combined screening protocol along with maternal serum biochemistry to calculate the risk for trisomy 21, 18, and 13.',
      'Patient was a 39-year-old primigravida at 13 weeks of gestation attending for first trimester screening. Given her advanced maternal age, NT scan was particularly important as part of the risk assessment for chromosomal anomalies.',
      'Patient at 12 weeks of gestation with a previous pregnancy affected by trisomy 18 attended for NT scan as part of recurrence risk assessment. She was anxious and had declined invasive testing at this stage, preferring non-invasive screening first.',
    ],
    interpretation: [
      'NT scan was performed at CRL of 62 mm corresponding to 12 weeks and 3 days. The nuchal translucency measured 1.4 mm which was within normal limits for this crown-rump length. The nasal bone was present and ossified. The ductus venosus flow showed normal a-wave. The tricuspid valve flow was normal with no regurgitation. Based on NT measurement, maternal age, and serum biochemistry, the combined risk for trisomy 21 was calculated as 1:8500 which was low risk.',
      'NT measurement was performed at CRL of 70 mm corresponding to 13 weeks and 1 day. The nuchal translucency measured 1.8 mm which was within normal limits despite the advanced maternal age. The nasal bone was present. No major structural anomaly was detectable at this gestation. The combined screening risk incorporating maternal age, NT, and serum markers showed a risk of 1:1200 for trisomy 21 which was screen negative.',
      'NT scan performed at CRL of 58 mm showed a nuchal translucency measurement of 1.2 mm which was well within normal limits. The nasal bone was visualized and present. Fetal heart rate was 162 bpm. No obvious structural anomaly was detected at this stage. The combined risk assessment with serum markers showed low risk for trisomy 21, 18, and 13. The findings were reassuring in the context of the previous affected pregnancy.',
    ],
    desc: [
      'NT scan was reviewed and interpreted as showing a normal nuchal translucency measurement with low risk on combined first trimester screening. The results were documented and the patient was counseled about the screening outcome.',
      'First trimester NT screening was interpreted as screen negative despite advanced maternal age. The patient was reassured and advised regarding the option of anomaly scan at 20 weeks for further structural assessment.',
      'NT scan was interpreted showing normal measurement with low combined risk for aneuploidies. The findings were explained to the patient who was relieved and agreed to continue with routine antenatal care and mid-trimester anomaly scan.',
    ],
  },
  'Pathograph/LCG': {
    indication: [
      'Patient was a primigravida at 39 weeks in active labor admitted with cervical dilatation of 4 cm and regular uterine contractions. Partograph monitoring was initiated as per standard labor management protocol to track the progress of labor including cervical dilatation, fetal descent, and maternal and fetal parameters.',
      'Patient was in labor at 40 weeks following induction with prostaglandin for post-dates pregnancy. Partograph recording was started from the onset of active labor to monitor cervical dilatation rate and to identify any deviation from expected labor progress that might necessitate augmentation or intervention.',
      'Patient was a multigravida with a previous cesarean section undergoing trial of labor after cesarean. Partograph was being maintained meticulously to monitor labor progress and detect any signs of abnormal labor pattern that might indicate scar dehiscence or the need for repeat cesarean delivery.',
    ],
    interpretation: [
      'Partograph review showed that labor was progressing normally with cervical dilatation following the alert line. From 4 cm, the cervix dilated at a rate of approximately 1 cm per hour reaching full dilatation in 6 hours. Fetal descent progressed from station -2 to station 0 at full dilatation. Fetal heart rate remained between 130-150 bpm throughout with no decelerations. Uterine contractions were adequate with 3-4 contractions in 10 minutes each lasting 40-50 seconds. Maternal vital signs were stable.',
      'Partograph showed initial normal progress from 4 cm to 6 cm in 2 hours. However, cervical dilatation subsequently slowed with only 1 cm progression over the next 3 hours, crossing the alert line. Fetal descent remained at station -1. Contractions were irregular at 2 in 10 minutes lasting 25-30 seconds suggesting inadequate uterine activity. The assessment was secondary arrest of dilatation with inadequate contractions. Oxytocin augmentation was recommended after ensuring no obstruction.',
      'Partograph monitoring of trial of labor showed steady progress with cervical dilatation from 4 cm to 8 cm over 4 hours maintaining progress along the alert line. Fetal descent was satisfactory progressing from station -1 to station +1. Fetal heart rate remained reassuring at 135-145 bpm. No signs of scar tenderness were noted on abdominal examination. Uterine contractions were 3-4 in 10 minutes lasting 40-45 seconds. The labor pattern was normal and consistent with safe TOLAC progress.',
    ],
    desc: [
      'Partograph was reviewed showing normal labor progress with cervical dilatation and fetal descent following the expected pattern. The findings supported continued management with routine monitoring.',
      'Partograph interpretation identified secondary arrest of labor with inadequate contractions crossing the alert line. Augmentation with oxytocin was recommended and the findings were communicated to the managing team.',
      'Partograph review during trial of labor showed satisfactory progress with no concerning features for scar complications. The normal labor pattern was documented and vaginal delivery was anticipated.',
    ],
  },
};

// ─── Helpers ───
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a;
}
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function uniqueNames(count: number): string[] {
  const MAX_FIRST = 10, MAX_LAST = 20;
  const names = new Set<string>();
  const firstFreq: Record<string, number> = {};
  const lastFreq: Record<string, number> = {};
  let attempts = 0;
  while (names.size < count && attempts < count * 100) {
    attempts++;
    const f = pick(FIRST), l = pick(LAST);
    const full = `${f} ${l}`;
    if (names.has(full)) continue;
    if ((firstFreq[f] || 0) >= MAX_FIRST) continue;
    if ((lastFreq[l] || 0) >= MAX_LAST) continue;
    names.add(full);
    firstFreq[f] = (firstFreq[f] || 0) + 1;
    lastFreq[l] = (lastFreq[l] || 0) + 1;
  }
  if (names.size < count) throw new Error(`Need ${count} unique names, only got ${names.size}`);
  return shuffle([...names]);
}

function uniqueRegNos(count: number): string[] {
  const s = new Set<string>();
  while (s.size < count) { s.add(`20260${String(rand(10000, 99999))}`); }
  return [...s];
}

function randomDates(count: number): string[] {
  const start = new Date(2026, 0, 1).getTime(), range = 180;
  const dates: string[] = [];
  let last = '';
  for (let i = 0; i < count; i++) {
    let d: string;
    do { d = fmtDate(new Date(start + rand(0, range) * 86400000)); } while (d === last);
    dates.push(d); last = d;
  }
  return dates;
}

function makeDob(assignDate: string, minAge: number, maxAge: number): { dob: string; age: number } {
  const ad = new Date(assignDate);
  const age = rand(minAge, maxAge);
  const y = ad.getFullYear() - age, m = rand(0, 11), day = rand(1, 28);
  const dob = new Date(y, m, day);
  if (dob >= ad) dob.setFullYear(dob.getFullYear() - 1);
  const calcAge = ad.getFullYear() - dob.getFullYear() - (ad < new Date(ad.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return { dob: fmtDate(dob), age: calcAge };
}

function distributeEvenly<T>(items: T[], n: number): T[] {
  const r: T[] = []; for (let i = 0; i < n; i++) r.push(items[i % items.length]); return shuffle(r);
}

// ─── Row builder ───
interface Row {
  id: string; form: string; caseType: string; skillType: string;
  date: string; name: string; regNo: string; dob: string; age: number;
  competency: string; extra: Record<string, string>;
}

async function main() {
  const SAMPLE = process.argv.includes('--sample');
  const TOTAL = SAMPLE ? 20 : 750;

  const fmPath = path.resolve(__dirname, '..', '..', 'output', 'form-map-obs.json');
  const fm = JSON.parse(fs.readFileSync(fmPath, 'utf-8'));
  const getItems = (f: string, ct: string, st: string): string[] => {
    const leaf = fm.leaves.find((l: any) => l.pathLabels[0] === f && l.pathLabels[1] === ct && l.pathLabels[2] === st);
    return (leaf?.competencyGroup || []).map((g: any) => g.particulars);
  };

  const gynProcItems = getItems('Procedural and Interpretative Skills', 'Gynaecology', 'Procedural skill');
  const gynInterpItems = getItems('Procedural and Interpretative Skills', 'Gynaecology', 'Interpretative Skill');
  const obsProcItems = getItems('Procedural and Interpretative Skills', 'Obstetrics', 'Procedural skill');
  const obsInterpItems = getItems('Procedural and Interpretative Skills', 'Obstetrics', 'Interpretative Skill');

  console.log(`Items: GynProc=${gynProcItems.length}, GynInterp=${gynInterpItems.length}, ObsProc=${obsProcItems.length}, ObsInterp=${obsInterpItems.length}`);

  // Verify all competency items have clinical data
  for (const item of gynProcItems) if (!GYN_PROC[item]) { console.error(`Missing GYN_PROC data: "${item}"`); process.exit(1); }
  for (const item of gynInterpItems) if (!GYN_INTERP[item]) { console.error(`Missing GYN_INTERP data: "${item}"`); process.exit(1); }
  for (const item of obsProcItems) if (!OBS_PROC[item]) { console.error(`Missing OBS_PROC data: "${item}"`); process.exit(1); }
  for (const item of obsInterpItems) if (!OBS_INTERP[item]) { console.error(`Missing OBS_INTERP data: "${item}"`); process.exit(1); }

  const r = TOTAL / 750;
  const dist = {
    gynProc: Math.round(250 * r), gynInterp: Math.round(100 * r),
    obsProc: Math.round(250 * r), obsInterp: Math.round(100 * r),
    gynCounsel: Math.round(25 * r), obsCounsel: Math.round(25 * r),
  };
  dist.gynProc += TOTAL - Object.values(dist).reduce((a, b) => a + b, 0);

  console.log(`Distribution: ${JSON.stringify(dist)} total=${Object.values(dist).reduce((a,b)=>a+b,0)}`);

  const names = uniqueNames(TOTAL);
  const regNos = uniqueRegNos(TOTAL);
  const dates = randomDates(TOTAL);
  const rows: Row[] = [];
  let idx = 0;

  // 1. Gyn Procedural
  const gc = distributeEvenly(gynProcItems, dist.gynProc);
  for (let i = 0; i < dist.gynProc; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 70);
    const cd = GYN_PROC[gc[i]];
    const cplx = COMPLEXITY[gc[i]] || 'Basic';
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology', skillType: 'Procedural skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: gc[i],
      extra: { CompetencyLevel: levelForComplexity(cplx), 'Diagnosis/Problems': pick(cd.diagnosis), 'Brief Procedural Notes': pick(cd.notes), 'Brief Description': pick(cd.desc) },
    });
    idx++;
  }

  // 2. Gyn Interpretative
  const gi = distributeEvenly(gynInterpItems, dist.gynInterp);
  for (let i = 0; i < dist.gynInterp; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 70);
    const cd = GYN_INTERP[gi[i]];
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology', skillType: 'Interpretative Skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: gi[i],
      extra: { 'Indication/Investigation/Findings/Diagnosis': pick(cd.indication), 'Interpretations': pick(cd.interpretation), 'Brief Description': pick(cd.desc) },
    });
    idx++;
  }

  // 3. Obs Procedural
  const oc = distributeEvenly(obsProcItems, dist.obsProc);
  for (let i = 0; i < dist.obsProc; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 45);
    const cd = OBS_PROC[oc[i]];
    const cplx = COMPLEXITY[oc[i]] || 'Basic';
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics', skillType: 'Procedural skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: oc[i],
      extra: { CompetencyLevel: levelForComplexity(cplx), 'Diagnosis/Problems': pick(cd.diagnosis), 'Brief Procedural Notes': pick(cd.notes), 'Brief Description': pick(cd.desc) },
    });
    idx++;
  }

  // 4. Obs Interpretative
  const oi = distributeEvenly(obsInterpItems, dist.obsInterp);
  for (let i = 0; i < dist.obsInterp; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 45);
    const cd = OBS_INTERP[oi[i]];
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics', skillType: 'Interpretative Skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: oi[i],
      extra: { 'Indication/Investigation/Findings/Diagnosis': pick(cd.indication), 'Interpretations': pick(cd.interpretation), 'Brief Description': pick(cd.desc) },
    });
    idx++;
  }

  // 5. Gyn Counselling
  for (let i = 0; i < dist.gynCounsel; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 70);
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Gynaecology & Counselling', skillType: 'Communication and Counselling Skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: '', extra: {},
    });
    idx++;
  }

  // 6. Obs Counselling
  for (let i = 0; i < dist.obsCounsel; i++) {
    const { dob, age } = makeDob(dates[idx], 18, 45);
    rows.push({
      id: `OBS-${String(idx+1).padStart(4,'0')}`, form: 'Procedural and Interpretative Skills',
      caseType: 'Obstetrics & Counselling', skillType: 'Communication and Counselling Skill',
      date: dates[idx], name: names[idx], regNo: regNos[idx], dob, age,
      competency: '', extra: {},
    });
    idx++;
  }

  // ─── FULL AUDIT ───
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  FINAL AUDIT REPORT — ${rows.length} rows`);
  console.log(`${'='.repeat(50)}`);
  let errs = 0;
  const chk = (ok: boolean, msg: string) => { if (!ok) { console.error(`FAIL: ${msg}`); errs++; } else console.log(`PASS: ${msg}`); };

  // 1. Total rows
  console.log(`\n1. Total rows: ${rows.length}`);
  chk(rows.length === TOTAL, `Row count matches target (${TOTAL})`);

  // 2-3. CaseType / SkillType distribution
  console.log(`\n2-3. CaseType × SkillType distribution:`);
  const distSum: Record<string, number> = {};
  rows.forEach(r => { const k = `${r.caseType} > ${r.skillType}`; distSum[k] = (distSum[k]||0)+1; });
  Object.entries(distSum).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // 4. Unique patient names
  const uniqueNameCount = new Set(rows.map(r => r.name)).size;
  console.log(`\n4. Unique patient names: ${uniqueNameCount}/${rows.length}`);
  chk(uniqueNameCount === rows.length, `All names unique (0 duplicates)`);

  // 5. First name frequency
  const firstFreq: Record<string, number> = {};
  rows.forEach(r => { const f = r.name.split(' ')[0]; firstFreq[f] = (firstFreq[f]||0)+1; });
  const firstOver10 = Object.entries(firstFreq).filter(([,v]) => v > 10);
  console.log(`\n5. First name frequency (max allowed: 10):`);
  const topFirst = Object.entries(firstFreq).sort((a,b) => b[1]-a[1]).slice(0,5);
  topFirst.forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log(`  ... ${Object.keys(firstFreq).length} distinct first names`);
  chk(firstOver10.length === 0, `First name >10 occurrences: ${firstOver10.length}`);

  // 6. Surname frequency
  const lastFreq: Record<string, number> = {};
  rows.forEach(r => { const p = r.name.split(' '); lastFreq[p[p.length-1]] = (lastFreq[p[p.length-1]]||0)+1; });
  const lastOver20 = Object.entries(lastFreq).filter(([,v]) => v > 20);
  console.log(`\n6. Surname frequency (max allowed: 20):`);
  const topLast = Object.entries(lastFreq).sort((a,b) => b[1]-a[1]).slice(0,5);
  topLast.forEach(([k,v]) => console.log(`  ${k}: ${v}`));
  console.log(`  ... ${Object.keys(lastFreq).length} distinct surnames`);
  chk(lastOver20.length === 0, `Surname >20 occurrences: ${lastOver20.length}`);

  // 7. Duplicate Reg No
  const regSet = new Set(rows.map(r => r.regNo));
  console.log(`\n7. Duplicate Reg No: ${rows.length - regSet.size}`);
  chk(regSet.size === rows.length, `All reg nos unique`);
  chk(rows.every(r => /^\d{10}$/.test(r.regNo) && r.regNo.startsWith('20260')), `All reg nos match 20260XXXXX format`);

  // 8. Date range
  const dateOk = rows.every(r => { const d=new Date(r.date); return d>=new Date('2026-01-01')&&d<=new Date('2026-06-30'); });
  console.log(`\n8. Date range validation:`);
  chk(dateOk, `All dates within 2026-01-01 to 2026-06-30`);
  let consec = 0;
  for (let i = 1; i < rows.length; i++) if (rows[i].date === rows[i-1].date) consec++;
  console.log(`  Consecutive same dates: ${consec}`);

  // 9. DOB/Age
  console.log(`\n9. DOB/Age validation:`);
  chk(rows.every(r => new Date(r.dob) < new Date(r.date)), `All DOBs before assignment date`);
  chk(rows.every(r => r.age >= 0 && r.age <= 100), `All ages valid (range: ${Math.min(...rows.map(r=>r.age))}-${Math.max(...rows.map(r=>r.age))})`);

  // 10. Competency validation
  console.log(`\n10. Competency validation:`);
  const procR = rows.filter(r => r.skillType === 'Procedural skill');
  const intR = rows.filter(r => r.skillType === 'Interpretative Skill');
  const couR = rows.filter(r => r.skillType === 'Communication and Counselling Skill');
  chk(procR.every(r => r.competency && r.extra['Diagnosis/Problems'] && r.extra['Brief Procedural Notes'] && r.extra['Brief Description']),
    `All ${procR.length} Procedural rows have competency + clinical fields`);
  chk(intR.every(r => r.competency), `All ${intR.length} Interpretative rows have competency`);
  chk(couR.every(r => !r.competency), `All ${couR.length} Counselling rows have no competency`);

  // 11. Level validation
  console.log(`\n11. Level validation:`);
  chk(procR.every(r => ['1','2','3','4'].includes(r.extra.CompetencyLevel)), `All Procedural rows have valid Level (1-4)`);
  chk(intR.every(r => !r.extra.CompetencyLevel), `No Interpretative rows have Level`);
  chk(couR.every(r => !r.extra.CompetencyLevel), `No Counselling rows have Level`);
  const lvlDist: Record<string, number> = {};
  procR.forEach(r => { lvlDist[`L${r.extra.CompetencyLevel}`] = (lvlDist[`L${r.extra.CompetencyLevel}`]||0)+1; });
  console.log(`  Overall level distribution: ${JSON.stringify(lvlDist)}`);
  for (const cx of ['Basic','Intermediate','Advanced'] as Complexity[]) {
    const cxRows = procR.filter(r => (COMPLEXITY[r.competency] || 'Basic') === cx);
    const cxDist: Record<string, number> = {};
    cxRows.forEach(r => { cxDist[`L${r.extra.CompetencyLevel}`] = (cxDist[`L${r.extra.CompetencyLevel}`]||0)+1; });
    const pct = Object.entries(cxDist).map(([k,v])=>`${k}=${v}(${(v/cxRows.length*100).toFixed(0)}%)`).join(', ');
    console.log(`  ${cx} (${cxRows.length} rows): ${pct}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  if (errs) { console.error(`RESULT: ${errs} FAIL(s). Fix before proceeding.`); process.exit(1); }
  console.log(`RESULT: ALL PASS — ${rows.length} rows ready for upload.`);
  console.log(`${'='.repeat(50)}`);

  // ─── Write Excel ───
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DataEntry');
  ws.addRow([
    'ExternalRowId','Action','Form','CaseType','SkillType','CombinationKey',
    'Date of Assignment (YYYY-MM-DD)','Name of the Patient','Patient Reg No',
    'Date of Birth (YYYY-MM-DD)','Age',
    'CompetencyItemsChecked (semicolon-separated)','ExtraFieldsJSON',
  ]);
  for (const r of rows) {
    ws.addRow([r.id,'SAVE_DRAFT',r.form,r.caseType,r.skillType,'',
      r.date,r.name,r.regNo,r.dob,String(r.age),r.competency,
      Object.keys(r.extra).length ? JSON.stringify(r.extra) : '',
    ]);
  }
  ws.columns.forEach(c => { let m=10; c.eachCell?.({includeEmpty:false},cell=>{const l=String(cell.value??'').length;if(l>m)m=l;}); c.width=Math.min(m+2,60); });

  const ur = wb.addWorksheet('UploadResult');
  ur.addRow(['ExternalRowId','Excel Row','Processing Status','Draft Reference','Attempt Time','Failed Field','Error Message','Screenshot Path']);

  const tag = SAMPLE ? '_SAMPLE_20' : '_750';
  const out = path.resolve(__dirname, '..', '..', 'generated-data', 'Obs', `BCPS_OBS_Entries${tag}.xlsx`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  console.log(`\nWritten: ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
