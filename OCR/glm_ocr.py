from transformers import AutoProcessor, AutoModelForImageTextToText
import torch

from dotenv import load_dotenv
import os
load_dotenv()
token = os.getenv("HF_TOKEN")

MODEL_PATH = "zai-org/GLM-OCR"

# Load processor + model
processor = AutoProcessor.from_pretrained(MODEL_PATH)
model = AutoModelForImageTextToText.from_pretrained(
    MODEL_PATH,
    torch_dtype="auto",
    token = token,
    device_map="cuda"   # uses your GPU automatically
)

def run_glm_ocr(image_path: str, prompt: str = "Text Recognition:"):
    # input (image + prompt)
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "url": image_path},
                {"type": "text", "text": prompt}
            ],
        }
    ]

    # Prepare input
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt"
    ).to(model.device)

    inputs.pop("token_type_ids", None)

    # Generate
    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=2048)

    # Decode output
    output_text = processor.decode(
        generated_ids[0][inputs["input_ids"].shape[1]:],
        skip_special_tokens=False
    )

    return output_text

if __name__ == "__main__":
    image_path = "data/Raw_Image/data2.jpg"
    prompt = "Extract the items, quantities, and prices from this receipt:"
    output = run_glm_ocr(image_path, prompt)
    print(output)