import io
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from app.parsers.text_parser import parse_text_content

def parse_pdf_content(
    file_bytes: bytes,
    known_customers: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    full_text = []
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                full_text.append(text)
    except Exception as e:
        return [{
            "recordType": "UNKNOWN",
            "extractedName": "PDF Parse Error",
            "extractedAmount": None,
            "extractedDate": None,
            "extractedDescription": f"Failed to read PDF pages: {str(e)}",
            "rawText": "",
            "confidence": 0.0,
            "reason": "PDF text extraction failed; file may be scanned or corrupted"
        }]

    combined_text = "\n".join(full_text)
    if not combined_text.strip():
        return [{
            "recordType": "UNKNOWN",
            "extractedName": "Scanned Document",
            "extractedAmount": None,
            "extractedDate": None,
            "extractedDescription": "No selectable text found in PDF. Scanned PDF requires OCR or manual entry.",
            "rawText": "",
            "confidence": 0.0,
            "reason": "Scanned PDF without embedded text layer"
        }]

    return parse_text_content(combined_text, known_customers)
