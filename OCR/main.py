from trocr import extract_text
from grouping import build_structure, group_lines
from cleaned import parse_lines
from normalise import map_to_item
import json

with open("data/items.json") as f:
    items_data = json.load(f)
    

image_path = "data/Preprocessed_Image/data2_preprocessed.jpg"

results = extract_text(image_path)

columns, col_types, rows = build_structure(results)

# Convert rows → text lines
lines = []
for row in rows:
    text_line = " ".join([w[1] for w in row['words']])
    lines.append(text_line)



print("\nColumn Types Detected:")
for i, t in enumerate(col_types):
    print(f"Column {i}: {t}")

print("\nRaw Lines:\n")
for line in lines:
    print(line)

# Parsing the lines to extract items & prices

final_data = []
total = None

for row in rows:
    item = ""
    price = None

    for bbox, text, conf in row['words']:
        x_center = (bbox[0][0] + bbox[2][0]) / 2

        distances = [abs(x_center - col['x']) for col in columns]
        col_idx = distances.index(min(distances))

        col_type = col_types[col_idx]
        
        if col_type == "text":
            item += " " + text

        elif col_type == "number":
            if text.isdigit():
                price = int(text)

    item = item.strip().lower().replace(".", "")
    item = map_to_item(item, items_data["items"])

    if item == "" and price:
        total = price
    elif item:
        final_data.append((item, price))

print("\n🧾 Final Parsed Output:\n")

for item, price in final_data:
    print(f"{item}: {price}")

print(f"\nTotal: {total}")