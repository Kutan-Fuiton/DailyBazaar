from fastapi import FastAPI, UploadFile, File
from PIL import Image
import io
import time

from glm_ocr import run_glm_ocr

app = FastAPI()

@app.post("/scan")
async def scan(file: UploadFile = File(...)):
    start = time.time()

    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))

    prompt = "Extract the items, quantities, and prices from this receipt:"

    # 👉 call your GLM-OCR function here
    result = run_glm_ocr(image, prompt)

    end = time.time()
    print(f"Processing time: {end - start:.2f} seconds")
    return {"result": result}