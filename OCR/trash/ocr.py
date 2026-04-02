import easyocr

# Load models once
reader = easyocr.Reader(['en'], gpu = True)

def extract_text(image_path):
    results = reader.readtext(image_path)
    return results


if __name__ == "__main__":
    preprocessed = "data/Preprocessed_Image/data1_preprocessed.jpg"

    print("EasyOCR running")
    results = extract_text(preprocessed)

    for r in results:
        print(r)