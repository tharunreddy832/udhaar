import json
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.parsers.csv_parser import parse_csv_content
from app.parsers.text_parser import parse_text_content
from app.parsers.pdf_parser import parse_pdf_content
from app.parsers.ocr_parser import parse_image_content
from app.matching.entity_matcher import match_customer_name

app = FastAPI(
    title="Udhaar AI Processing Service",
    description="Local offline AI service for document extraction, OCR, and fuzzy entity resolution.",
    version="1.0.0"
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MatchRequest(BaseModel):
    extractedName: str
    knownCustomers: List[Dict[str, Any]] = []

@app.get("/health")
def health_check():
    ocr_available = False
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        ocr_available = True
    except Exception:
        ocr_available = False

    return {
        "status": "UP",
        "service": "Udhaar AI Service",
        "port": 8001,
        "ocrAvailable": ocr_available,
        "supportedFormats": ["csv", "txt", "pdf", "png", "jpg", "jpeg"]
    }

@app.post("/extract")
async def extract_records(
    file: UploadFile = File(...),
    sourceType: str = Form("UPI_STATEMENT"),
    knownCustomersJson: Optional[str] = Form(None)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    known_customers = []
    if knownCustomersJson:
        try:
            known_customers = json.loads(knownCustomersJson)
        except Exception:
            known_customers = []

    content = await file.read()
    filename_lower = file.filename.lower()

    if filename_lower.endswith((".csv", ".tsv")):
        records = parse_csv_content(content, known_customers)
    elif filename_lower.endswith((".txt", ".log", ".chat")):
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            text = content.decode("latin-1", errors="ignore")
        records = parse_text_content(text, known_customers)
    elif filename_lower.endswith(".pdf"):
        records = parse_pdf_content(content, known_customers)
    elif filename_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp")):
        records = parse_image_content(content, known_customers)
    else:
        # Fallback based on sourceType parameter
        if sourceType == "NOTEBOOK":
            records = parse_image_content(content, known_customers)
        elif sourceType == "CHAT":
            text = content.decode("utf-8", errors="ignore")
            records = parse_text_content(text, known_customers)
        else:
            records = parse_csv_content(content, known_customers)

    return {
        "success": True,
        "fileName": file.filename,
        "sourceType": sourceType,
        "count": len(records),
        "records": records
    }

@app.post("/match-customer")
def match_customer(request: MatchRequest):
    result = match_customer_name(request.extractedName, request.knownCustomers)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
