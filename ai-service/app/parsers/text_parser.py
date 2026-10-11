import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.matching.entity_matcher import match_customer_name
from app.parsers.csv_parser import parse_date

# Keywords
PAYMENT_KEYWORDS = [
    r"\bpaid\b", r"\bpay\b", r"\bpayment\b", r"\breceived\b", r"\bgave\b",
    r"\bdiya\b", r"\b जमा\b", r"\bjama\b", r"\bsettled\b", r"\bupi\b",
    r"\bgpay\b", r"\bphonepe\b", r"\bpaytm\b", r"\bcash\b"
]
CREDIT_KEYWORDS = [
    r"\budhaar\b", r"\budhar\b", r"\bcredit\b", r"\bborrowed\b",
    r"\btook\b", r"\bliya\b", r"\bbaaki\b", r"\bbaki\b", r"\bdue\b",
    r"\bgoods\b", r"\bsaman\b"
]

def extract_amount_from_line(line: str) -> Optional[float]:
    # Look for patterns like Rs. 500, Rs 500, INR 500, ₹500, 500/-, 500 rs, or just isolated amounts
    patterns = [
        r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)",
        r"([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹|/-)",
        r"(?:amount|amt)[:\s]*([\d,]+(?:\.\d{1,2})?)",
        r"\b([\d,]+(?:\.\d{1,2})?)\s*(?:paid|gave|received|udhar|credit)\b",
        r"(?:paid|gave|received|udhar|credit)\s*([\d,]+(?:\.\d{1,2})?)\b",
        r"\b(\d{2,7}(?:\.\d{1,2})?)\b" # general fallback for 2-7 digit numbers
    ]
    for pat in patterns:
        m = re.search(pat, line, re.IGNORECASE)
        if m:
            clean_str = m.group(1).replace(",", "")
            try:
                val = float(clean_str)
                if 1 <= val <= 10000000:
                    return val
            except ValueError:
                continue
    return None

def extract_date_from_line(line: str) -> Optional[str]:
    # Pattern for dates
    date_patterns = [
        r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
        r"\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b",
        r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b"
    ]
    for pat in date_patterns:
        m = re.search(pat, line, re.IGNORECASE)
        if m:
            d = parse_date(m.group(1))
            if d:
                return d
    return None

def extract_name_from_line(line: str, amount_str: Optional[str] = None) -> Optional[str]:
    # Remove dates, timestamps, WhatsApp prefixes (e.g., "[12/09/2026, 10:30 AM] Ramesh:")
    cleaned = re.sub(r"\[?\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^:]*\]?\s*:", "", line)
    cleaned = re.sub(r"\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?", "", cleaned, flags=re.IGNORECASE)

    # WhatsApp sender format: "Ramesh Bhai: Paid 500"
    sender_match = re.search(r"^([A-Za-z\s]{3,25}):", cleaned.strip())
    if sender_match:
        return sender_match.group(1).strip()

    # Look for "from <Name>", "to <Name>", "by <Name>", "<Name> paid", "<Name> udhar"
    name_patterns = [
        r"(?:from|to|by|customer|party)[:\s]+([A-Za-z\s]{3,25})",
        r"^([A-Za-z\s]{3,20})\s+(?:paid|gave|received|diya|liya|udhaar|udhar|credit)",
        r"(?:udhaar|udhar|credit)\s+(?:to\s+)?([A-Za-z\s]{3,20})"
    ]
    for pat in name_patterns:
        m = re.search(pat, cleaned, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # Exclude false positives like "cash", "upi", "yesterday"
            if candidate.lower() not in ["cash", "upi", "gpay", "online", "yesterday", "today", "goods", "items", "amount"]:
                return candidate

    return None

def parse_text_content(
    text: str,
    known_customers: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    results = []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    for line_idx, line in enumerate(lines):
        # Skip pure system messages
        if len(line) < 5 or "Messages and calls are end-to-end encrypted" in line:
            continue

        amount = extract_amount_from_line(line)
        if not amount:
            continue

        extracted_date = extract_date_from_line(line)
        extracted_name = extract_name_from_line(line)

        # Classify RecordType
        line_lower = line.lower()
        is_payment = any(re.search(kw, line_lower) for kw in PAYMENT_KEYWORDS)
        is_credit = any(re.search(kw, line_lower) for kw in CREDIT_KEYWORDS)

        if is_payment and not is_credit:
            record_type = "PAYMENT"
            confidence = 0.85
            type_reason = "Identified payment action keywords"
        elif is_credit and not is_payment:
            record_type = "CREDIT"
            confidence = 0.85
            type_reason = "Identified credit/udhaar action keywords"
        else:
            record_type = "UNKNOWN"
            confidence = 0.50
            type_reason = "Ambiguous transaction direction"

        reasons = [type_reason]

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
            elif match_res["confidence"] >= 0.40:
                reasons.append(f"Possible customer candidate: {match_res['customerName']} ({int(match_res['confidence']*100)}%)")

        results.append({
            "recordType": record_type,
            "extractedName": extracted_name or "Unidentified Customer",
            "extractedAmount": round(amount, 2),
            "extractedDate": extracted_date or datetime.now().strftime("%Y-%m-%d"),
            "extractedDescription": line[:150],
            "rawText": line[:500],
            "confidence": confidence,
            "reason": "; ".join(reasons),
            "suggestedCustomerId": matched_cust_id,
            "suggestedCustomerName": matched_cust_name
        })

    return results
