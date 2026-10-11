import pytest
from app.parsers.csv_parser import parse_csv_content
from app.parsers.text_parser import parse_text_content
from app.matching.entity_matcher import match_customer_name

def test_csv_parser():
    sample_csv = b"""Date,Customer,Debit,Credit,Description
12/09/2026,Ramesh Patel,,1500.00,UPI settlement
13/09/2026,Suresh Kumar,800.00,,Goods udhaar purchase
"""
    customers = [{"id": 1, "name": "Ramesh Patel", "aliases": ["Ramesh Bhai"]}]
    records = parse_csv_content(sample_csv, customers)

    assert len(records) == 2
    rec1 = records[0]
    assert rec1["recordType"] == "CREDIT"
    assert rec1["extractedAmount"] == 1500.00
    assert rec1["extractedDate"] == "2026-09-12"
    assert rec1["suggestedCustomerId"] == 1

    rec2 = records[1]
    assert rec2["recordType"] == "PAYMENT"
    assert rec2["extractedAmount"] == 800.00
    assert rec2["extractedDate"] == "2026-09-13"

def test_text_parser():
    sample_text = """
15/09/2026: Ramesh bhai paid 1500 via gpay
Udhaar to Suresh 500 Rs
Received 2000 from Deepak
"""
    customers = [
        {"id": 10, "name": "Ramesh Patel", "aliases": ["Ramesh Bhai"]},
        {"id": 20, "name": "Suresh Kumar", "aliases": ["Suresh"]}
    ]
    records = parse_text_content(sample_text, customers)
    assert len(records) == 3

    # Record 1: Payment
    assert records[0]["recordType"] == "PAYMENT"
    assert records[0]["extractedAmount"] == 1500.00
    assert records[0]["suggestedCustomerId"] == 10

    # Record 2: Credit
    assert records[1]["recordType"] == "CREDIT"
    assert records[1]["extractedAmount"] == 500.00
    assert records[1]["suggestedCustomerId"] == 20

    # Record 3: Payment
    assert records[2]["recordType"] == "PAYMENT"
    assert records[2]["extractedAmount"] == 2000.00

def test_entity_matcher():
    known_customers = [
        {"id": 1, "name": "Ramesh Patel", "aliases": ["Ramesh Bhai", "Rameshji"]},
        {"id": 2, "name": "Mukesh Ambani", "aliases": []}
    ]

    # Exact match
    res1 = match_customer_name("Ramesh Patel", known_customers)
    assert res1["matched"] is True
    assert res1["customerId"] == 1
    assert res1["confidence"] == 1.0

    # Alias match
    res2 = match_customer_name("Ramesh Bhai", known_customers)
    assert res2["matched"] is True
    assert res2["customerId"] == 1
    assert res2["confidence"] >= 0.90

    # Fuzzy match
    res3 = match_customer_name("Ramesh Patell", known_customers)
    assert res3["confidence"] >= 0.80

    # Unmatched
    res4 = match_customer_name("Random Person X", known_customers)
    assert res4["confidence"] < 0.50
