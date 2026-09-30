import openpyxl
import pandas as pd

# Extract source names
source_file = r"F:\2026\touhid\new project\generated-data\copy data\BCPS_AutoScript_Final_Input_Naturalized_30062026.xlsx"
df_source = pd.read_excel(source_file, sheet_name='DataEntry')

def detect_gender(name):
    male_kw = ['md.', 'mr.', 'maulavi', 'muhammad', 'ahmed', 'khan', 'hossain', 'uddin', 'rahim', 'habib', 'alam', 'islam']
    female_kw = ['begum', 'akter', 'bibi', 'khatun', 'molla', 'devi', 'kumari', 'dey', 'roy']

    name_lower = name.lower()
    male_score = sum(1 for kw in male_kw if kw in name_lower)
    female_score = sum(1 for kw in female_kw if kw in name_lower)

    return 'female' if female_score > male_score else 'male'

# Extract and separate source names
source_male_names = []
source_female_names = []

for name in df_source['Name of the Patient']:
    if detect_gender(name) == 'male':
        source_male_names.append(name)
    else:
        source_female_names.append(name)

print(f"Source: Male {len(source_male_names)}, Female {len(source_female_names)}")

# Target files in copy data\2nd
dest_files = [
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_Patient_Management_TESTONLY_66_2026-09-17.xlsx",
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_AutoScript_Final_Input_Naturalized_30062026.xlsx",
    r"F:\2026\touhid\new project\generated-data\copy data\2nd\BCPS_Patient_Management_TESTONLY_66_FRESH_2026-09-17.xlsx"
]

for dest_file in dest_files:
    print(f"\nProcessing: {dest_file.split(chr(92))[-1]}")

    # Read destination
    df_dest = pd.read_excel(dest_file, sheet_name='DataEntry')

    wb = openpyxl.load_workbook(dest_file)
    ws = wb['DataEntry']

    # Separate destination rows by gender
    dest_male_indices = []
    dest_female_indices = []

    for idx, row in df_dest.iterrows():
        old_name = row['Name of the Patient']
        if detect_gender(old_name) == 'male':
            dest_male_indices.append(idx)
        else:
            dest_female_indices.append(idx)

    print(f"  Destination: Male {len(dest_male_indices)}, Female {len(dest_female_indices)}")

    # Place source names (repeat if needed)
    male_idx = 0
    female_idx = 0

    # Place male names
    for row_idx in dest_male_indices:
        excel_row = row_idx + 2  # +2 because header is row 1 and 0-indexed
        source_name = source_male_names[male_idx % len(source_male_names)]
        ws[f'H{excel_row}'] = source_name
        male_idx += 1

    # Place female names
    for row_idx in dest_female_indices:
        excel_row = row_idx + 2
        source_name = source_female_names[female_idx % len(source_female_names)]
        ws[f'H{excel_row}'] = source_name
        female_idx += 1

    # Save
    wb.save(dest_file)
    print(f"  Updated successfully!")

print("\nAll files updated with source names!")
