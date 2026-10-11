import csv
import io
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.matching.entity_matcher import match_customer_name

def parse_date(date_str: str) -> Optional[str]:
    if not date_str:
        return None
    cleaned = date_str.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d",
        "%d/%m/%y", "%d-%m-%y", "%d %b %Y", "%d %B %Y",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Regex fallback for DD/MM/YYYY or YYYY-MM-DD
    m = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", cleaned)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})", cleaned)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return None

def clean_amount(val: Any) -> Optional[float]:
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    # Remove currency symbols and formatting
    s = re.sub(r"[^\d.-]", "", s)
    try:
        amt = float(s)
        return abs(amt) if amt != 0 else None
    except ValueError:
        return None

def parse_csv_content(
    file_bytes: bytes,
    known_customers: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    results = []
    # Try decoding utf-8, fallback to latin-1
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1", errors="ignore")

    f = io.StringIO(text.strip())
    # Sniff delimiter
    try:
        dialect = csv.Sniffer().sniff(text[:2048])
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    reader = csv.reader(f, delimiter=delimiter)
    rows = [r for r in reader if r and any(cell.strip() for cell in r)]
    if not rows:
        return results

    headers = [h.strip().lower() for h in rows[0]]
    data_rows = rows[1:]

    # Map header column indices
    col_map = {}
    for idx, h in enumerate(headers):
        if any(k in h for k in ["date", "time", "dt"]):
            col_map.setdefault("date", idx)
        elif any(k in h for k in ["customer", "party", "name", "payee", "payer"]):
            col_map.setdefault("name", idx)
        elif any(k in h for k in ["particulars", "narration", "desc", "remark", "detail"]):
            col_map.setdefault("description", idx)
        elif any(k in h for k in ["credit", "cr"]):
            col_map.setdefault("credit", idx)
        elif any(k in h for k in ["debit", "dr"]):
            col_map.setdefault("debit", idx)
        elif any(k in h for k in ["amount", "amt", "total"]):
            col_map.setdefault("amount", idx)
        elif any(k in h for k in ["type", "mode"]):
            col_map.setdefault("type", idx)
        elif any(k in h for k in ["ref", "upi", "txn", "utr"]):
            col_map.setdefault("reference", idx)

    for row_idx, row in enumerate(data_rows, start=2):
        if not any(c.strip() for c in row):
            continue

        raw_line = delimiter.join(row)
        extracted_date = None
        extracted_name = None
        extracted_desc = None
        extracted_amount = None
        record_type = "UNKNOWN"
        confidence = 0.80
        reasons = []

        if "date" in col_map and col_map["date"] < len(row):
            extracted_date = parse_date(row[col_map["date"]])
            if extracted_date:
                reasons.append("Date mapped from column")

        if "name" in col_map and col_map["name"] < len(row):
            extracted_name = row[col_map["name"]].strip()
            if extracted_name:
                reasons.append("Name mapped from column")

        if "description" in col_map and col_map["description"] < len(row):
            extracted_desc = row[col_map["description"]].strip()

        # Fallback for name from particulars/description if name not in designated column
        if not extracted_name and extracted_desc:
            # e.g., "UPI/12345/Ramesh Bhai/Payment" or "Paid to Suresh"
            name_match = re.search(r"(?:from|to|by|for)\s+([A-Za-z\s]{3,25})", extracted_desc, re.IGNORECASE)
            if name_match:
                extracted_name = name_match.group(1).strip()
                reasons.append("Name inferred from description")

        # Determine Amount and Type
        credit_amt = clean_amount(row[col_map["credit"]]) if "credit" in col_map and col_map["credit"] < len(row) else None
        debit_amt = clean_amount(row[col_map["debit"]]) if "debit" in col_map and col_map["debit"] < len(row) else None
        gen_amt = clean_amount(row[col_map["amount"]]) if "amount" in col_map and col_map["amount"] < len(row) else None

        if credit_amt and not debit_amt:
            extracted_amount = credit_amt
            record_type = "CREDIT"
            reasons.append("Credit amount column populated")
        elif debit_amt and not credit_amt:
            extracted_amount = debit_amt
            record_type = "PAYMENT"
            reasons.append("Debit amount column populated")
        elif gen_amt:
            extracted_amount = gen_amt
            # Check type column or description
            type_val = row[col_map["type"]].lower() if "type" in col_map and col_map["type"] < len(row) else ""
            desc_val = (extracted_desc or "").lower()

            if any(k in type_val or k in desc_val for k in ["payment", "deposit", "received", "cr", "paid", "settlement"]):
                record_type = "PAYMENT"
                reasons.append("Marked as payment based on description/type")
            elif any(k in type_val or k in desc_val for k in ["credit", "udhaar", "loan", "purchase", "dr", "bill"]):
                record_type = "CREDIT"
                reasons.append("Marked as credit based on description/type")
            else:
                record_type = "PAYMENT"  # default for statements
                confidence = 0.65
                reasons.append("Defaulted to payment for bank statement record")

        if not extracted_amount:
            # Skip rows with no amount
            continue

        # Match against known customers if available
        matched_cust_id = None
        matched_cust_name = None
        if extracted_name and known_customers:
            match_res = match_customer_name(extracted_name, known_customers)
            if match_res["matched"] or match_res["confidence"] >= 0.70:
                matched_cust_id = match_res["customerId"]
                matched_cust_name = match_res["customerName"]
                confidence = min(0.95, round(confidence * 0.5 + match_res["confidence"] * 0.5, 2))
                reasons.append(f"Linked customer: {match_res['reason']}")

        results.append({
            "recordType": record_type,
            "extractedName": extracted_name or "Unknown Customer",
            "extractedAmount": round(extracted_amount, 2),
            "extractedDate": extracted_date or datetime.now().strftime("%Y-%m-%d"),
            "extractedDescription": extracted_desc or f"CSV import row {row_idx}",
            "rawText": raw_line[:500],
            "confidence": confidence,
            "reason": "; ".join(reasons) if reasons else "Extracted from CSV structure",
            "suggestedCustomerId": matched_cust_id,
            "suggestedCustomerName": matched_cust_name
        })

    return results
