# Udhaar — AI-Powered Informal Credit Reconciliation & Customer Identity System

Udhaar is a full-stack, AI-powered financial ledger and reconciliation system designed for retail businesses, shopkeepers, and merchants. It resolves informal customer credit (udhaar), visual customer identities, and digital payments (UPI statements, WhatsApp chat logs, and physical ledger notebook scans) into a single, verified ledger.

---

## 1. Architecture Overview

```text
                 BUSINESS OWNER / MERCHANT
                            │
                            ▼
               REACT FRONTEND (Port 5173)
             [Vite + Vanilla Design System]
                            │
                            ▼
            SPRING BOOT REST API (Port 8080)
            [Java 21 + Spring Security + JWT]
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        MYSQL DATABASE          PYTHON AI SERVICE (Port 8001)
          (udhaar)                [FastAPI + RapidFuzz + OCR]
              │                           │
              │                 ┌─────────┴─────────┐
              │                 ▼         ▼         ▼
              │                OCR     ENTITY    PAYMENT
              │                      RESOLUTION  MATCHING
              ▼                           │
    LOCAL PHOTO STORAGE                   ▼
   (~/.udhaar/photos)              CONFIDENCE SCORE
                                          │
                                          ▼
                                 HUMAN RECONCILIATION
                                    [Workbench]
```

### Technology Stack

- **Backend**: Spring Boot 3.5, Java 21, Spring Data JPA, Spring Security, JJWT, Maven
- **Database**: MySQL 8.0 (`udhaar`) with multi-tenant owner-level data isolation
- **Photo Storage**: Protected server-side storage with raster format validation (JPEG, PNG, WebP) and owner authorization
- **AI Processing Service**: Python 3.10, FastAPI, RapidFuzz (fuzzy entity and alias matching), PyPDF, PIL (Tesseract OCR fallback)
- **Frontend**: React 18, Vite, React Router 7, Axios, Lucide Icons, Paper Meets Intelligence Design System

---

## 2. Prerequisites

1. **Java Development Kit**: JDK 21 LTS (`JAVA_HOME` pointing to JDK 21)
2. **Database**: MySQL 8.0 running on port 3306 with schema `udhaar`
3. **Node.js**: Node.js 18+ and npm
4. **Python**: Python 3.10+ (with `venv` support)

---

