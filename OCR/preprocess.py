import cv2


def preprocess_data(input_path, output_path):
    # read the image
    img = cv2.imread(input_path)

    # The image is by default BGR color while reading, now converting it into grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Applying blur to remove noise 
    blur = cv2.GaussianBlur(gray, (5,5), 0)

    # Converting to Binary Image (Black and White)
    _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Save Processed Image
    cv2.imwrite(output_path, thresh)

    return output_path


if __name__ == "__main__":

    raw = f"data/Raw_Image/data2.jpg"
    preprocessed = f"data/Preprocessed_Image/data2_preprocessed.jpg"

    print("Only Preprocessing the bill")
    preprocess_data(raw, preprocessed)