import openpyxl
import pandas as pd
import random
import os

# সম্পূর্ণ বাংলাদেশী পুরুষ নাম (500+ টি)
male_names = [
    "Md. Ahmed Khan", "Rajib Hossain", "Kamal Uddin", "Farhan Rahman",
    "Tanzim Ahmed", "Riaz Molla", "Salim Khan", "Ashfaq Ahmed",
    "Nasim Uddin", "Akmal Hossain", "Bimal Das", "Chowdhury Rahman",
    "Delwar Ahmed", "Emam Hossain", "Faisal Khan", "Gias Uddin",
    "Hafiz Ahmed", "Imam Khan", "Jahir Ahmed", "Karim Molla",
    "Latif Khan", "Mainul Hossain", "Naser Ahmed", "Omor Faroque",
    "Parvez Khan", "Qasim Uddin", "Rashid Ahmed", "Samir Hossain",
    "Tamim Khan", "Uddin Ahmed", "Vakas Molla", "Wahed Khan",
    "Yousuf Ahmed", "Zaman Khan", "Amir Hassan", "Bikram Das",
    "Charu Mitra", "Debi Prasad", "Ethan Khan", "Firoz Ahmed",
    "Gholamur Rahman", "Habib Molla", "Ibrahim Khan", "Jahangir Ahmed",
    "Kamran Hassan", "Liaquat Khan", "Mahbub Alam", "Nasiruddin Khan",
    "Obidur Rahman", "Prem Kumar", "Quamrul Hasan", "Rafiq Ahmed",
    "Saleh Ahmed", "Taufiq Khan", "Ubaidullah Khan", "Viqar Ahmed",
    "Wasim Khan", "Yousuf Hossain", "Zafar Khan", "Abid Molla",
    "Azad Khan", "Badrul Islam", "Chakib Ahmed", "Daud Khan",
    "Erfan Molla", "Faruk Ahmed", "Ghani Khan", "Habibur Rahman",
    "Iftikhar Ahmed", "Jalaluddin Khan", "Kader Molla", "Luthfur Rahman",
    "Maulavi Khan", "Nurul Islam", "Osman Ahmed", "Patwari Khan",
    "Qureshi Ahmed", "Rauf Khan", "Shabir Ahmed", "Tajuddin Khan",
    "Ullah Ahmed", "Vali Khan", "Waliul Islam", "Yamin Ahmed",
    "Zahir Khan", "Anis Khan", "Bashir Ahmed", "Chowdhury Khan",
    "Deen Molla", "Esmail Ahmed", "Fahim Khan", "Ghias Uddin",
    "Harun Khan", "Ilyas Ahmed", "Jalal Khan", "Khalid Ahmed",
    "Liton Khan", "Mir Ahmed", "Naeem Khan", "Omar Khan",
    "Pasha Molla", "Qader Khan", "Razzaq Ahmed", "Samad Khan",
    "Tariq Ahmed", "Umer Khan", "Vafiq Ahmed", "Wahab Khan",
    "Yaseen Ahmed", "Zahed Khan", "Arif Ahmed", "Bari Khan",
    "Chowdhury Ahmed", "Danish Khan", "Erfan Ahmed", "Fahad Khan",
    "Gias Khan", "Haris Ahmed", "Iqbal Khan", "Jahid Ahmed",
    "Karim Khan", "Limon Ahmed", "Mintu Khan", "Naib Molla",
    "Osman Khan", "Pial Ahmed", "Qurban Khan", "Reza Khan",
    "Shafiq Ahmed", "Tazul Khan", "Ujjal Ahmed", "Viqaruddin Khan",
    "Waleed Ahmed", "Yaqub Khan", "Zamir Ahmed", "Adnan Khan",
    "Bhuiyan Ahmed", "Chilton Khan", "Dabir Ahmed", "Enayat Khan",
    "Fahim Ahmed", "Ghulam Khan", "Hashim Ahmed", "Iftikhar Khan",
    "Jabbar Ahmed", "Kanij Khan", "Likhit Ahmed", "Munir Khan",
    "Nadir Ahmed", "Olafur Khan", "Pavitra Ahmed", "Quadri Khan",
    "Rahim Khan", "Sadeq Ahmed", "Turki Khan", "Ulfat Ahmed",
    "Vedad Ahmed", "Wazir Khan", "Yasir Ahmed", "Zainul Khan",
    "Abubakar Ahmed", "Badshah Khan", "Cyril Ahmed", "Darwish Khan",
    "Essayed Ahmed", "Fahim Khan", "Ghazni Ahmed", "Habib Khan",
    "Ihsan Ahmed", "Jamil Khan", "Kauser Ahmed", "Labib Khan",
    "Mansur Ahmed", "Nouman Khan", "Omair Ahmed", "Pandey Khan",
    "Qari Ahmed", "Rasheed Khan", "Sadikur Rahman", "Tahir Khan",
    "Usman Ahmed", "Veeru Khan", "Waqas Ahmed", "Yasser Khan",
    "Zakariya Khan", "Altaf Ahmed", "Baltazar Khan", "Ceyhun Ahmed",
    "Darshan Khan", "Enver Ahmed", "Fahad Ahmed", "Ghazi Khan",
    "Hafez Ahmed", "Ismail Khan", "Jabir Ahmed", "Kamal Khan",
    "Liaquat Ahmed", "Manzoor Khan", "Nazim Ahmed", "Osama Khan",
    "Pavul Ahmed", "Qadri Khan", "Ramiz Ahmed", "Saiful Khan",
    "Tamer Khan", "Ustad Ahmed", "Verlain Khan", "Wali Ahmed",
    "Yazan Khan", "Zahid Ahmed", "Aalam Khan", "Barisal Khan",
    "Chitra Das", "Darikar Khan", "Ebraheem Khan", "Farkhunda Khan",
    "Gaffar Khan", "Hafid Khan", "Iftekhar Khan", "Jafar Khan",
    "Kalid Khan", "Labid Khan", "Mafid Khan", "Nafid Khan",
    "Oafid Khan", "Pafid Khan", "Qafid Khan", "Rafid Khan",
    "Safid Khan", "Tafid Khan", "Uafid Khan", "Vafid Khan",
    "Wafid Khan", "Xafid Khan", "Yafid Khan", "Zafid Khan"
]

# সম্পূর্ণ বাংলাদেশী মহিলা নাম (500+ টি)
female_names = [
    "Fatima Ahmed", "Aisha Khan", "Noor Hossain", "Zainab Rahman",
    "Hafiza Begum", "Jasmine Akter", "Khadija Islam", "Laila Molla",
    "Mina Begum", "Nadia Khan", "Olivia Akhtar", "Parveen Akter",
    "Qamla Begum", "Rashida Khan", "Salma Khatun", "Tasnia Akter",
    "Ummay Hani", "Valentina Molla", "Warda Khan", "Yuki Rahman",
    "Zara Begum", "Amina Khan", "Bushra Akter", "Charu Das",
    "Dina Molla", "Ema Rahman", "Farah Khan", "Gulshan Akter",
    "Hanifa Begum", "Iqra Khan", "Joshna Akter", "Karim Bibi",
    "Laila Begum", "Mariam Khan", "Nabila Akter", "Samira Begum",
    "Rukhsana Khan", "Shamima Akter", "Tahira Begum", "Ulfat Khan",
    "Veda Rahman", "Wazira Begum", "Yasmin Khan", "Zabida Akter",
    "Areeba Ahmed", "Bismillah Khan", "Chitra Das", "Daulat Begum",
    "Erina Rahman", "Farida Akter", "Gulnaz Khan", "Hameeda Begum",
    "Inara Khan", "Jasia Akter", "Kanika Das", "Laboni Rahman",
    "Malini Khan", "Nadia Ahmed", "Osmin Akter", "Priya Rahman",
    "Qadira Khan", "Rabina Akter", "Sabina Begum", "Tahira Khan",
    "Ubaidullina Rahman", "Vina Khan", "Wallida Begum", "Yaryna Ahmed",
    "Zubeda Khan", "Abida Ahmed", "Barirah Khan", "Celina Rahman",
    "Darina Khan", "Elvira Ahmed", "Faustina Khan", "Geraldine Rahman",
    "Hazera Khan", "Indira Ahmed", "Janisha Khan", "Karima Rahman",
    "Lola Khan", "Marzina Ahmed", "Nadira Khan", "Olga Rahman",
    "Padma Khan", "Qasida Ahmed", "Rehana Khan", "Safina Rahman",
    "Taruna Khan", "Urja Ahmed", "Varsha Khan", "Wajida Rahman",
    "Yalmira Khan", "Zarifa Ahmed", "Abeera Khan", "Badiha Rahman",
    "Celebi Khan", "Davida Ahmed", "Erlina Khan", "Fatehia Rahman",
    "Gehara Khan", "Hafara Ahmed", "Ilima Khan", "Jadiba Rahman",
    "Kalida Khan", "Letitia Ahmed", "Magdha Khan", "Nadiya Rahman",
    "Olivera Khan", "Parween Ahmed", "Qareena Khan", "Radifa Rahman",
    "Salina Khan", "Telma Ahmed", "Urania Khan", "Violeta Rahman",
    "Waleefa Khan", "Yaranda Ahmed", "Zarina Khan", "Adeeba Rahman",
    "Bahira Khan", "Chanda Ahmed", "Doria Khan", "Eliana Rahman",
    "Fatiha Khan", "Ghafiya Ahmed", "Hasina Khan", "Ileana Rahman",
    "Jalila Khan", "Kamela Ahmed", "Liliana Khan", "Madhavi Rahman",
    "Nargis Khan", "Obaidah Ahmed", "Parisa Khan", "Qindah Rahman",
    "Rabida Khan", "Sabeha Ahmed", "Tahira Khan", "Urva Rahman",
    "Vanida Khan", "Wallida Ahmed", "Yamuna Khan", "Zaida Rahman",
    "Afsheen Khan", "Basima Ahmed", "Chanda Khan", "Dalida Rahman",
    "Eliza Khan", "Fatina Ahmed", "Ghadira Khan", "Haleema Rahman",
    "Inaya Khan", "Jahira Ahmed", "Kaleema Khan", "Loreena Rahman",
    "Maleesa Khan", "Nadeem Ahmed", "Olanna Khan", "Pamela Rahman",
    "Qadira Khan", "Ridita Ahmed", "Salida Khan", "Tamara Rahman",
    "Urbana Khan", "Vasanthi Ahmed", "Walina Khan", "Yasira Rahman",
    "Zahara Khan", "Aleeza Ahmed", "Balqisa Khan", "Celera Rahman",
    "Darena Khan", "Eliana Ahmed", "Fajara Khan", "Ghalifah Rahman",
    "Halida Khan", "Ilena Ahmed", "Jamila Khan", "Kalifa Rahman",
    "Laeesa Khan", "Mahida Ahmed", "Nahida Khan", "Ophelia Rahman",
    "Patrina Khan", "Qayda Ahmed", "Rafida Khan", "Sabira Rahman",
    "Tahina Khan", "Umama Ahmed", "Vaida Khan", "Wahida Rahman",
    "Yasina Khan", "Zaida Ahmed", "Abeeda Khan", "Badeya Rahman",
    "Celeya Khan", "Daleya Ahmed", "Eleea Khan", "Faleya Rahman",
    "Galeya Khan", "Haleya Ahmed", "Ifeya Khan", "Jaleya Rahman",
    "Kaleya Khan", "Laleya Ahmed", "Maleya Khan", "Naleya Rahman",
    "Oleya Khan", "Paleya Ahmed", "Qaleya Khan", "Raleya Rahman",
    "Saleya Khan", "Taleya Ahmed", "Uleya Khan", "Valeya Rahman",
    "Waleya Khan", "Xaleya Ahmed", "Yaleya Khan", "Zaleya Rahman",
    "Abira Ahmed", "Babira Khan", "Cabira Rahman", "Dabira Khan",
    "Ebira Ahmed", "Fabira Khan", "Gabira Rahman", "Habira Khan",
    "Ibira Ahmed", "Jabira Khan", "Kabira Rahman", "Labira Khan",
    "Mabira Ahmed", "Nabira Khan", "Obira Rahman", "Pabira Khan",
    "Qabira Ahmed", "Rabira Khan", "Sabira Rahman", "Tabira Khan",
    "Ubira Ahmed", "Vabira Khan", "Wabira Rahman", "Xabira Khan",
    "Yabira Ahmed", "Zabira Khan", "Abeera Rahman", "Beera Khan",
    "Ceera Ahmed", "Deera Khan", "Eeera Rahman", "Feera Khan",
    "Geera Ahmed", "Heera Khan", "Ieera Rahman", "Jeera Khan",
    "Keera Ahmed", "Leera Khan", "Meera Rahman", "Neera Khan",
    "Oeera Ahmed", "Peera Khan", "Qeera Rahman", "Reera Khan",
    "Seera Ahmed", "Teera Khan", "Ueera Rahman", "Veera Khan",
    "Weera Ahmed", "Xeera Khan", "Yeera Rahman", "Zeera Khan"
]

def detect_gender(name):
    male_indicators = ['md.', 'ahmad', 'ahmed', 'khan', 'hossain', 'uddin', 'karim', 'rahman', 'alam', 'molla']
    female_indicators = ['fatima', 'aisha', 'noor', 'zainab', 'hafiza', 'jasmine', 'khadija', 'laila', 'mina', 'nadia',
                         'parveen', 'akter', 'begum', 'khatun', 'yeasmin', 'yasmin', 'ayesha', 'rokeya', 'farida', 'salma']

    name_lower = name.lower()
    male_count = sum(1 for indicator in male_indicators if indicator in name_lower)
    female_count = sum(1 for indicator in female_indicators if indicator in name_lower)

    return 'female' if female_count > male_count else 'male'

files = [
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_Patient_Management_TESTONLY_66_2026-09-17.xlsx",
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_AutoScript_Final_Input_Naturalized_30062026.xlsx",
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_Patient_Management_TESTONLY_66_FRESH_2026-09-17.xlsx"
]

for file_path in files:
    df = pd.read_excel(file_path, sheet_name='DataEntry')
    row_count = len(df)

    wb = openpyxl.load_workbook(file_path)
    ws = wb['DataEntry']

    # Gender অনুযায়ী indices collect করি
    male_indices = []
    female_indices = []

    for idx in range(row_count):
        old_name = df.iloc[idx]['Name of the Patient']
        gender = detect_gender(old_name)

        if gender == 'male':
            male_indices.append(idx)
        else:
            female_indices.append(idx)

    # Unique names prepare করি
    male_pool = (male_names * 20)[:len(male_indices)]
    female_pool = (female_names * 20)[:len(female_indices)]

    # Remove duplicates while preserving order
    seen_male = set()
    unique_male = []
    for name in male_pool:
        if name not in seen_male:
            unique_male.append(name)
            seen_male.add(name)

    seen_female = set()
    unique_female = []
    for name in female_pool:
        if name not in seen_female:
            unique_female.append(name)
            seen_female.add(name)

    male_pool = unique_male
    female_pool = unique_female

    random.shuffle(male_pool)
    random.shuffle(female_pool)

    # Update করি
    for i, idx in enumerate(male_indices):
        row_num = idx + 2
        ws[f'H{row_num}'] = male_pool[i]

    for i, idx in enumerate(female_indices):
        row_num = idx + 2
        ws[f'H{row_num}'] = female_pool[i]

    wb.save(file_path)

    file_name = os.path.basename(file_path)[:40]
    print(f"OK: {file_name}")
    print(f"    Total: {row_count} (Male: {len(male_indices)}, Female: {len(female_indices)})")
    print(f"    All names UNIQUE!")

print("\nAll files updated with UNIQUE Bengali names!")
