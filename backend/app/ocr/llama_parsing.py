"""
ocr/llama_parsing.py — LlamaCloud OCR extraction module inside app/ocr.

Uses settings.LLAMA_API_KEY loaded via core/config.py.
"""
import json
import time
from pathlib import Path
from llama_cloud import LlamaCloud

from ..core.config import settings

LlamaApiKey = settings.LLAMA_API_KEY
if not LlamaApiKey:
    raise RuntimeError(
        "LlamaParsing requires the LLAMA_API_KEY environment variable. "
        "Set it in backend/.env before starting the backend."
    )

client = LlamaCloud(api_key=LlamaApiKey)


DATA_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "description": "List of items extracted from the handwritten list",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "description": "The name or description of the item (e.g. Jk Posto, Chato, Maggie, Batesa, Kachachola, Refine oil, Marrie biscuit)",
                        "anyOf": [{"type": "string"}, {"type": "null"}]
                    },
                    "item_price": {
                        "description": "The handwritten price written on the line for this item. Do NOT multiply price by quantity. The written number is already the total line price.",
                        "anyOf": [{"type": "number"}, {"type": "null"}]
                    },
                    "amount": {
                        "description": "The quantity/amount string exactly as written on the receipt, including unit suffixes if present (e.g. '50g', '500g', '1ltr', '1lt', '1ta', '300', '500', '1kg', '2pc')",
                        "anyOf": [{"type": "string"}, {"type": "number"}, {"type": "null"}]
                    },
                    "unit": {
                        "description": "The unit suffix if explicitly written (e.g. 'g', 'kg', 'ltr', 'lt', 'ta', 'pc', 'piece'), or null if not written",
                        "anyOf": [{"type": "string"}, {"type": "null"}]
                    }
                },
                "required": ["item_name", "item_price", "amount"],
                "additionalProperties": False
            }
        },
        "total_amount": {
            "description": "Grand total written on the bill. If not present, return null.",
            "anyOf": [
                {"type": "number"},
                {"type": "null"}
            ]
        }
    },
    "required": ["items", "total_amount"],
    "additionalProperties": False
}


SYSTEM_PROMPT = """
You are extracting information from handwritten grocery shopping lists or bills.

Extract for each item line:
- item_name: Name of the item (e.g. "Jk Posto", "Chato", "Maggie", "Batesa", "Kachachola", "Refine oil", "Marrie biscuit").
- item_price: The exact handwritten price written for that line item (e.g. 110, 80, 82, 30, 48, 128, 50). Do NOT multiply or divide the price yourself. The written number is already the total price for that line.
- amount: The quantity/amount exactly as written, INCLUDING any unit suffixes if present (e.g. "50g", "500g", "1ltr", "1lt", "1ta", "300", "500").
- unit: The unit token if explicitly written (e.g. "g", "kg", "ltr", "lt", "ta", "pc"), otherwise null.

Also identify the GRAND TOTAL of the bill if it is explicitly written at the bottom (usually underlined or below a horizontal line, e.g. 528).
Do NOT calculate or modify any total yourself.
Preserve the item order exactly as written.
"""

# Default output path inside backend/app/ocr/Result/extracted.json
_DEFAULT_OUTPUT = Path(__file__).resolve().parent / "Result" / "extracted.json"


def extract_handwritten_list(
    image_path: "str | Path",
    save_json: bool = True,
    output_path: "str | Path" = _DEFAULT_OUTPUT,
):
    """
    Extract handwritten grocery items using LlamaCloud.

    Parameters
    ----------
    image_path : str | Path
        Path to image/pdf.

    save_json : bool
        Whether to save extracted JSON.

    output_path : str | Path
        Output json path.

    Returns
    -------
    dict
        Extracted JSON.
    """

    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(image_path)

    file_obj = client.files.create(file=str(image_path), purpose="extract")

    job = client.extract.create(
        file_input=file_obj.id,
        configuration={
            "data_schema": DATA_SCHEMA,
            "tier": "agentic",
            "parse_tier": "agentic",
            "extraction_target": "per_doc",
            "cite_sources": True,
            "confidence_scores": True,
            "system_prompt": SYSTEM_PROMPT,
        },
    )

    while job.status not in ("COMPLETED", "FAILED", "CANCELLED"):
        time.sleep(2)
        job = client.extract.get(job.id)

    if job.status != "COMPLETED":
        raise RuntimeError(f"Extract job {job.id} ended in {job.status}: {job.error_message}")

    result = job.extract_result

    if save_json:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    return result
