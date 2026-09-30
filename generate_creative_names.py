import openpyxl
import pandas as pd
import random
import os
from itertools import combinations

# Male first names (Bengali)
male_first = [
    "Ahmed", "Karim", "Habib", "Rafiq", "Nasir", "Salim", "Tariq", "Wasim",
    "Jahid", "Hamid", "Samid", "Rashid", "Jahid", "Masud", "Basil", "Saiful",
    "Anwar", "Amir", "Amin", "Arif", "Aziz", "Bashar", "Bilal", "Dawood",
    "Ehsan", "Fahim", "Ghassan", "Harun", "Iftikhar", "Jalal", "Kamal",
    "Liaquat", "Mahbub", "Naeem", "Obaid", "Parvez", "Qasim", "Rauf",
    "Shafiq", "Tamer", "Usman", "Vaqar", "Waqar", "Yasir", "Zafar",
    "Aafaq", "Babar", "Chaudhry", "Darshan", "Essam", "Farooq", "Ghani",
    "Habeel", "Ibraheem", "Jamal", "Khalil", "Lokman", "Mahendra", "Nasiruddin"
]

# Male last names (Bengali family names)
male_last = [
    "Khan", "Ahmed", "Rahman", "Uddin", "Hossain", "Islam", "Alam", "Hassan",
    "Hassan", "Malik", "Molla", "Das", "Dutta", "Roy", "Saha", "Nath",
    "Sarkar", "Sharma", "Singh", "Gupta", "Verma", "Misra", "Pandey", "Tiwari",
    "Chopra", "Bhat", "Thakur", "Desai", "Nair", "Iyer", "Reddy", "Rao",
    "Sethi", "Arora", "Kapoor", "Malhotra", "Banerjee", "Chatterjee", "Mukherjee",
    "Sengupta", "Bhattacharya", "Dasgupta", "Mukerji", "Ghosh", "Mitra", "Bose",
    "Dey", "Seal", "Moitra", "Bagchi", "Mazumdar", "Sinha", "Roy Chowdhury"
]

# Female first names (Bengali)
female_first = [
    "Fatima", "Aisha", "Zainab", "Hafiza", "Jasmine", "Khadija", "Laila", "Mina",
    "Nadia", "Olivia", "Parveen", "Qamla", "Rashida", "Salma", "Tasnia", "Ummay",
    "Valentina", "Warda", "Yuki", "Zara", "Amina", "Bushra", "Chitra", "Dina",
    "Ema", "Farah", "Gulshan", "Hanifa", "Iqra", "Joshna", "Kanika", "Laboni",
    "Malini", "Nabila", "Osmin", "Priya", "Qadira", "Rabina", "Sabina", "Tahira",
    "Ubaidullina", "Vina", "Wallida", "Yaryna", "Zubeda", "Abida", "Barirah",
    "Celina", "Darina", "Elvira", "Faustina", "Geraldine", "Hazera", "Indira",
    "Janisha", "Karima", "Lola", "Marzina", "Nadira", "Olga", "Padma"
]

# Female last names (suffixes/family names)
female_last = [
    "Khan", "Begum", "Akter", "Bibi", "Ahmed", "Rahman", "Uddin", "Hossain",
    "Islam", "Alam", "Hassan", "Das", "Dutta", "Roy", "Saha", "Nath",
    "Sarkar", "Sharma", "Singh", "Gupta", "Verma", "Misra", "Pandey", "Tiwari",
    "Chopra", "Bhat", "Thakur", "Desai", "Nair", "Iyer", "Reddy", "Rao",
    "Sethi", "Arora", "Kapoor", "Malhotra", "Banerjee", "Chatterjee", "Mukherjee",
    "Sengupta", "Bhattacharya", "Dasgupta", "Mukerji", "Ghosh", "Mitra", "Bose",
    "Dey", "Seal", "Moitra", "Bagchi", "Mazumdar", "Sinha", "Roy Chowdhury",
    "Khatun", "Molla", "Mitra", "Devi", "Kumari", "Bala", "Chowdhury"
]

# Male prefixes
male_prefix = ["Md.", "Muhammad", "Maulavi", "Mr."]

def detect_gender(name):
    male_keywords = ['md.', 'ahmad', 'ahmed', 'khan', 'hossain', 'uddin', 'mr.']
    female_keywords = ['fatima', 'aisha', 'noor', 'zainab', 'hafiza', 'jasmine', 'khadija', 'akter', 'begum']

    name_lower = name.lower()
    male_score = sum(1 for kw in male_keywords if kw in name_lower)
    female_score = sum(1 for kw in female_keywords if kw in name_lower)

    return 'female' if female_score > male_score else 'male'

def generate_male_name():
    """Generate a unique male name"""
    prefix = random.choice(male_prefix)
    first = random.choice(male_first)
    last = random.choice(male_last)
    return f"{prefix} {first} {last}"

def generate_female_name():
    """Generate a unique female name"""
    first = random.choice(female_first)
    last = random.choice(female_last)
    return f"{first} {last}"

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
    male_indices = []
    female_indices = []

    for idx in range(row_count):
        old_name = df.iloc[idx]['Name of the Patient']
        if detect_gender(old_name) == 'male':
            male_indices.append(idx)
        else:
            female_indices.append(idx)

    # Generate unique names
    used_names = set()
    male_names = []
    female_names = []

    # Generate male names
    while len(male_names) < len(male_indices):
        new_name = generate_male_name()
        if new_name not in used_names:
            male_names.append(new_name)
            used_names.add(new_name)

    # Generate female names
    while len(female_names) < len(female_indices):
        new_name = generate_female_name()
        if new_name not in used_names:
            female_names.append(new_name)
            used_names.add(new_name)

    random.shuffle(male_names)
    random.shuffle(female_names)

    # Update worksheet
    for i, row_idx in enumerate(male_indices):
        row_num = row_idx + 2
        ws[f'H{row_num}'] = male_names[i]

    for i, row_idx in enumerate(female_indices):
        row_num = row_idx + 2
        ws[f'H{row_num}'] = female_names[i]

    wb.save(file_path)

    file_name = os.path.basename(file_path)[:40]
    print("OK: " + file_name)
    print(f"    Total: {row_count} (Male: {len(male_indices)}, Female: {len(female_indices)})")
    print(f"    Sample M: {male_names[0]}")
    print(f"    Sample F: {female_names[0] if female_names else 'N/A'}")
    print()

print("All files updated with CREATIVE unique Bengali names!")
