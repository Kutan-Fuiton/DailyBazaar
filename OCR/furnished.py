import easyocr
import numpy as np
import re
import json

# ------------------ LOAD ------------------

reader = easyocr.Reader(['en'], gpu=True)

with open("data/corrections.json") as f:
    corrections = json.load(f)

CORR_MAP = {item["input"]: item["output"] for item in corrections}


# ------------------ HELPERS ------------------

def get_x_center(bbox):
    return (bbox[0][0] + bbox[2][0]) / 2

def get_y_center(bbox):
    return (bbox[0][1] + bbox[2][1]) / 2


# ------------------ ADAPTIVE THRESHOLDS ------------------

def get_adaptive_threshold(values, scale=1.5, default=50):
    if len(values) < 2:
        return default
    
    gaps = [values[i+1] - values[i] for i in range(len(values)-1)]
    return np.median(gaps) * scale


# ------------------ COLUMN CLUSTERING ------------------

def cluster_columns(results):
    x_centers = sorted([get_x_center(b) for b, _, _ in results])
    x_thresh = get_adaptive_threshold(x_centers)

    columns = []

    for bbox, text, conf in results:
        x = get_x_center(bbox)

        placed = False
        for col in columns:
            if abs(col['x'] - x) < x_thresh:
                col['words'].append((bbox, text, conf))
                placed = True
                break

        if not placed:
            columns.append({'x': x, 'words': [(bbox, text, conf)]})

    return sorted(columns, key=lambda c: c['x'])


# ------------------ ROW GROUPING ------------------

def group_rows(results):
    y_centers = sorted([get_y_center(b) for b, _, _ in results])
    y_thresh = get_adaptive_threshold(y_centers, scale=1.2, default=40)

    rows = []

    results = sorted(results, key=lambda x: get_y_center(x[0]))

    for bbox, text, conf in results:
        y = get_y_center(bbox)

        placed = False
        for row in rows:
            if abs(row['y'] - y) < y_thresh:
                row['words'].append((bbox, text, conf))
                placed = True
                break

        if not placed:
            rows.append({'y': y, 'words': [(bbox, text, conf)]})

    # sort left → right
    for row in rows:
        row['words'] = sorted(row['words'], key=lambda x: get_x_center(x[0]))

    return rows


# ------------------ CLEANING ------------------

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)

    for k, v in corrections.items():
        text = text.replace(k, v)

    return text.strip()


def fix_numbers(text):
    return re.sub(r'(\d)\s+(\d)', r'\1\2', text)


def extract_number(text):
    nums = re.findall(r'\d+', text)
    if nums:
        return int("".join(nums))
    return None


# ------------------ NORMALIZATION ------------------

def normalize(word):
    return CORR_MAP.get(word, word)


# ------------------ COLUMN TYPE DETECTION ------------------

def is_numeric_column(col):
    texts = [w[1] for w in col['words']]
    count = sum(any(c.isdigit() for c in t) for t in texts)
    return count / len(texts) > 0.7


# ------------------ MAIN PARSER ------------------

def parse(rows, columns):
    final_data = []
    total = None

    # identify column roles
    if len(columns) == 2:
        item_idx = 0
        price_idx = 1
        qty_idx = None

    elif len(columns) == 3:
        numeric_cols = [i for i, c in enumerate(columns) if is_numeric_column(c)]

        price_idx = numeric_cols[-1]
        qty_idx = numeric_cols[0] if len(numeric_cols) > 1 else None
        item_idx = [i for i in range(3) if i not in numeric_cols][0]

    else:
        return [], None  # unsupported layout

    for row in rows:
        words = row['words']

        # map column-wise
        row_data = [""] * len(columns)

        for bbox, text, conf in words:
            x = get_x_center(bbox)

            # find closest column
            distances = [abs(x - c['x']) for c in columns]
            col_idx = distances.index(min(distances))

            row_data[col_idx] += " " + text

        row_data = [fix_numbers(clean_text(t.strip())) for t in row_data]

        item = normalize(row_data[item_idx]) if item_idx is not None else ""
        price = extract_number(row_data[price_idx]) if price_idx is not None else None
        qty = extract_number(row_data[qty_idx]) if qty_idx is not None else 1

        # detect total row
        if item == "" and price:
            total = price
        elif item:
            final_data.append({
                "item": item,
                "quantity": qty if qty else 1,
                "price": price
            })

    return final_data, total


# ------------------ MAIN FUNCTION ------------------

def process_image(image_path):
    results = reader.readtext(image_path)

    columns = cluster_columns(results)
    rows = group_rows(results)

    data, total = parse(rows, columns)

    return {
        "items": data,
        "total": total
    }


# ------------------ RUN ------------------

if __name__ == "__main__":
    output = process_image("data/Preprocessed_Image/data1_preprocessed.jpg")

    print("\n🧾 Final Output:\n")
    for item in output["items"]:
        print(item)

    print("\nTotal:", output["total"])