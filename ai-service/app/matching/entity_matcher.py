import re
from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz

def normalize_name(name: str) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"[^\w\s]", "", name).strip().lower()
    # Normalize common Indian suffixes/honorifics for comparison if needed
    cleaned = re.sub(r"\b(bhai|ji|sahab|seth|kumar|singh|sharma|patel)\b", "", cleaned).strip()
    return cleaned

def match_customer_name(
    extracted_name: str,
    known_customers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Matches an extracted customer name against known customers and their aliases.
    known_customers format: [
        {"id": 1, "name": "Ramesh Patel", "aliases": ["Ramesh Bhai", "Rameshji"]},
        ...
    ]
    Returns best match dict:
    {
        "matched": bool,
        "customerId": Optional[int],
        "customerName": Optional[str],
        "confidence": float (0.0 to 1.0),
        "reason": str,
        "candidates": List[Dict]
    }
    """
    if not extracted_name or not known_customers:
        return {
            "matched": False,
            "customerId": None,
            "customerName": None,
            "confidence": 0.0,
            "reason": "No extracted name or no known customers provided",
            "candidates": []
        }

    q_raw = extracted_name.strip()
    q_norm = normalize_name(q_raw)

    best_score = 0.0
    best_candidate = None
    best_reason = ""
    candidate_list = []

    for cust in known_customers:
        cust_id = cust.get("id")
        cust_name = cust.get("name", "")
        aliases = cust.get("aliases", []) or []

        all_names = [cust_name] + aliases

        for target in all_names:
            if not target:
                continue
            target_raw = target.strip()
            target_norm = normalize_name(target_raw)

            # Exact match (case insensitive)
            if q_raw.lower() == target_raw.lower():
                score = 1.0
                reason = f"Exact match with '{target_raw}'"
            elif q_norm and target_norm and q_norm == target_norm:
                score = 0.95
                reason = f"Normalized exact match with '{target_raw}'"
            else:
                # RapidFuzz similarity
                token_sort = fuzz.token_sort_ratio(q_raw.lower(), target_raw.lower()) / 100.0
                partial = fuzz.partial_ratio(q_raw.lower(), target_raw.lower()) / 100.0
                # Weighted combination prioritizing token_sort
                score = round(max(token_sort, partial * 0.85), 2)
                reason = f"Fuzzy match similarity {int(score * 100)}% with '{target_raw}'"

            if score > 0.40:
                candidate_list.append({
                    "customerId": cust_id,
                    "customerName": cust_name,
                    "matchedTerm": target_raw,
                    "confidence": score,
                    "reason": reason
                })

            if score > best_score:
                best_score = score
                best_candidate = cust
                best_reason = reason

    # Sort candidate list descending by score
    candidate_list.sort(key=lambda x: x["confidence"], reverse=True)

    is_matched = best_score >= 0.70

    return {
        "matched": is_matched,
        "customerId": best_candidate.get("id") if best_candidate and best_score >= 0.50 else None,
        "customerName": best_candidate.get("name") if best_candidate and best_score >= 0.50 else None,
        "confidence": round(best_score, 2),
        "reason": best_reason if best_candidate else "No plausible customer match found",
        "candidates": candidate_list[:5]
    }
