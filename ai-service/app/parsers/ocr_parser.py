import io
from typing import List, Dict, Any, Optional
from PIL import Image
from app.parsers.text_parser import parse_text_content

def parse_image_content(
    file_bytes: bytes,
    known_customers: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    try:
        import pytesseract
        image = Image.open(io.BytesIO(file_bytes))
        extracted_text = pytesseract.image_to_string(image)
        if extracted_text.strip():
            records = parse_text_content(extracted_text, known_customers)
            if records:
                return records
            return [{
                "recordType": "UNKNOWN",
                "extractedName": "Unresolved Image",
                "extractedAmount": None,
                "extractedDate": None,
                "extractedDescription": "Image text recognized but no structured financial transaction detected",
                "rawText": extracted_text[:500],
                "confidence": 0.30,
                "reason": "Text detected via OCR, manual review recommended"
            }]
    except Exception as e:
        # Pytesseract not installed or tesseract binary not on PATH
        pass

    return [{
        "recordType": "UNKNOWN",
        "extractedName": "Notebook Image",
        "extractedAmount": None,
        "extractedDate": None,
        "extractedDescription": "Image uploaded. Local OCR engine (Tesseract) not configured; please transcribe record details manually.",
        "rawText": "[Image Binary Upload]",
        "confidence": 0.20,
        "reason": "Image uploaded without automated OCR output; queued for manual entry."
    }]
