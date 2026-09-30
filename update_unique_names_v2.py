import openpyxl
import pandas as pd
import random
import os

# Bangladesh male and female names
male_base = ["Md. Ahmed Khan", "Rajib Hossain", "Kamal Uddin", "Farhan Rahman",
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
    "Wasim Khan", "Yousuf Hossain", "Zafar Khan", "Abid Molla"]

female_base = ["Fatima Ahmed", "Aisha Khan", "Noor Hossain", "Zainab Rahman",
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
    "Inara Khan", "Jasia Akter", "Kanika Das", "Laboni Rahman"]

def detect_gender(name):
    male_keywords = ['md.', 'ahmad', 'ahmed', 'khan', 'hossain', 'uddin', 'karim']
    female_keywords = ['fatima', 'aisha', 'noor', 'zainab', 'hafiza', 'jasmine', 'khadija', 'akter', 'begum']

    name_lower = name.lower()
    male_score = sum(1 for kw in male_keywords if kw in name_lower)
    female_score = sum(1 for kw in female_keywords if kw in name_lower)

    return 'female' if female_score > male_score else 'male'

def get_unique_names(gender, count):
    """Generate unique names"""
    base_list = female_base if gender == 'female' else male_base

    result = []
    counter = 1

    for i in range(count):
        idx = i % len(base_list)
        name = base_list[idx]

        # If repeating, add number
        if i >= len(base_list):
            name = f"{name} - {i // len(base_list)}"

        result.append(name)

    random.shuffle(result)
    return result

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

    # Count males and females
    male_count = 0
    female_count = 0
    male_rows = []
    female_rows = []

    for idx in range(row_count):
        old_name = df.iloc[idx]['Name of the Patient']
        if detect_gender(old_name) == 'male':
            male_count += 1
            male_rows.append(idx)
        else:
            female_count += 1
            female_rows.append(idx)

    # Get unique names
    male_names = get_unique_names('male', male_count)
    female_names = get_unique_names('female', female_count)

    # Update worksheet
    for i, row_idx in enumerate(male_rows):
        row_num = row_idx + 2
        ws[f'H{row_num}'] = male_names[i]

    for i, row_idx in enumerate(female_rows):
        row_num = row_idx + 2
        ws[f'H{row_num}'] = female_names[i]

    wb.save(file_path)

    file_name = os.path.basename(file_path)[:40]
    print("OK:", file_name)
    print(f"    Total: {row_count} (M:{male_count}, F:{female_count})")
    print(f"    All UNIQUE!")
    print()

print("Completed! All files updated with UNIQUE Bengali names!")
