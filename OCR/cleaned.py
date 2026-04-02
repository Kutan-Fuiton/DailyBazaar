import re
import json

with open("data/corrections.json") as f:
    corrections = json.load(f)

CORR_MAP = {item["input"]: item["output"] for item in corrections}

# 🔥 Clean text
def clean_line(line):
    line = line.lower()

    for k, v in CORR_MAP.items():
        line = line.replace(k, v)

    # remove dots
    line = line.replace(".", "")

    return line.strip()


# 🔥 Fix broken numbers like "5 0" → "50"
def fix_numbers(text):
    return re.sub(r'(\d)\s+(\d)', r'\1\2', text)


# 🔥 Extract number
def extract_number(text):
    nums = re.findall(r'\d+', text)
    if nums:
        return int("".join(nums))
    return None

def clean_by_type(text, col_type):
    text = text.lower()

    if col_type == "text":
        # fix OCR mistakes
        text = text.replace("0", "o")   # 🔥 important
        text = text.replace("1", "l")
        text = re.sub(r'[^a-z\s]', '', text)

    elif col_type == "number":
        # keep only digits
        text = re.sub(r'[^0-9]', '', text)

    return text.strip()

# 🔥 Parse lines
def parse_lines(lines):
    data = []
    total = None

    for line in lines:
        line = clean_line(line)
        line = fix_numbers(line)

        words = line.split()

        # extract number
        number = extract_number(line)

        # extract item (non-numeric words)
        item_words = [w for w in words if not re.search(r'\d', w)]
        item = " ".join(item_words)

        # 🔥 If no item → it's total
        if item == "":
            total = number
        else:
            data.append((item, number))

    return data, total