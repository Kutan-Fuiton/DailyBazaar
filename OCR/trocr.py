import easyocr
from PIL import Image
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from grouping import build_structure
from cleaned import clean_by_type
import re

reader = easyocr.Reader(['en'], gpu=True)

token = "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"

processor = TrOCRProcessor.from_pretrained("microsoft/trocr-large-handwritten", token = token)
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-large-handwritten", token = token, use_safetensors=True)


def extract_text(image_path):
    image = Image.open(image_path).convert("RGB")

    results = reader.readtext(image_path)

    cols, col_types, _ = build_structure(results)  # building the structure

    final_results = []

    for (bbox, _, conf) in results:
        x1, y1 = map(int, bbox[0])
        x2, y2 = map(int, bbox[2])

        crop = image.crop((x1, y1, x2, y2))

        # column classification
        x_center = (x1 + x2) / 2
        distances = [abs(x_center - col['x']) for col in cols]
        col_idx = distances.index(min(distances))

        col_type = col_types[col_idx]

        pixel_values = processor(images=crop, return_tensors="pt").pixel_values

        generated_ids = model.generate(pixel_values)

        text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        text = clean_by_type(text, col_type)

        # 🔥 Force numeric cleaning
        if col_type == "number":
            text = re.sub(r'[^0-9]', '', text)

        final_results.append((bbox, text, conf))

    return final_results


if __name__ == "__main__":
    img_path = "data/Preprocessed_Image/data1_preprocessed.jpg"

    print("🔥 EasyOCR + TrOCR Output:\n")

    results = extract_text(img_path)

    for r in results:
        print(r)