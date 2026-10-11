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

## 3. Environment Variables & Configuration

Udhaar is fully configurable through environment variables with sensible local development defaults:

| Variable | Description | Default (Local Dev) | Production Example |
|---|---|---|---|
| `DB_URL` | MySQL JDBC Connection URL | `jdbc:mysql://localhost:3306/udhaar` | `jdbc:mysql://prod-db.internal:3306/udhaar` |
| `DB_USERNAME` | MySQL Database Username | `root` | `udhaar_app` |
| `DB_PASSWORD` | MySQL Database Password | `admin1234` | *[Secure Secret]* |
| `JWT_SECRET` | Secret key for signing JWTs | Base64 256-bit default | *[Generated 256-bit Base64 secret]* |
| `JWT_EXPIRATION` | JWT token lifetime in milliseconds | `3600000` (1 hour) | `86400000` (24 hours) |
| `UDHAAR_PHOTO_DIR` | Private directory for customer photos | `${user.home}/.udhaar/photos` | `/var/data/udhaar/photos` |
| `AI_SERVICE_URL` | Base URL of Python FastAPI service | `http://localhost:8001` | `http://ai-service.internal:8001` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | *Local dev origins* | `https://udhaar.app,https://admin.udhaar.app` |
| `VITE_API_URL` | Frontend API Base URL | `http://localhost:8080` | `https://api.udhaar.app` |

---

## 4. Local Startup Guide (Windows)

You can launch all three services using the helper script `.\run-all.ps1`, or individually:

### A. Start Python AI Service (Port 8001)

```powershell
cd D:\Udhaar\ai-service
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
*Health Check*: `http://localhost:8001/health`

### B. Start Spring Boot Backend (Port 8080)

Ensure MySQL is running, then launch the backend:

```powershell
cd D:\Udhaar\backend
.\mvnw.cmd spring-boot:run
```
*Verification*: `http://localhost:8080/api/auth/me` (returns 401 Unauthorized without JWT)

### C. Start React Frontend (Port 5173)

```powershell
cd D:\Udhaar\frontend
npm run dev
```
*Access*: Open `http://localhost:5173` in your browser.

---

## 5. Customer Identity Cards & Photo-Assisted Reconciliation

Udhaar features visual identity cards that prevent misidentifying parties with similar names:

- **Customer Identity Cards**:
  - Displays customer photo or initials avatar in a fixed, compact 88px container.
  - Supports portrait, landscape, and square photos without cropping or card distortion (`object-fit: contain`).
  - Cards maintain a compact, uniform height (~245px) across all customers.
  - Displays name, phone, locality, registered aliases (alternative names), identifying notes, and net balance.
- **Identity Profile Drawer**:
  - View full identity profile and metrics.
  - Register and delete alternative aliases (e.g. "Ramesh Bhai", "Ramesh Anna").
  - Upload, replace, or remove customer photos securely.
- **Photo-Assisted Reconciliation Workbench**:
  - Side-by-side candidate customer cards with photos, phone endings (e.g., `ending 3210`), and aliases.
  - One-click customer reassign and verification before allocating funds.

---

## 6. API Endpoint Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new business owner account |
| `POST` | `/api/auth/login` | Login and obtain JWT bearer token |
| `GET` | `/api/auth/me` | Validate active authentication session |

### Customer Management & Photos (Owner-Isolated)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers` | List business owner's customers with net balances |
| `POST` | `/api/customers` | Create new customer account with notes |
| `GET` | `/api/customers/{id}` | Get customer profile details |
| `PUT` | `/api/customers/{id}` | Update customer name, phone, address, notes |
| `DELETE` | `/api/customers/{id}` | Delete customer (safeguarded against transactions) |
| `POST` | `/api/customers/{id}/photo` | Upload or replace customer photo (`multipart/form-data`) |
| `GET` | `/api/customers/{id}/photo` | Retrieve customer photo binary (authenticated) |
| `DELETE` | `/api/customers/{id}/photo` | Delete customer photo |
| `GET` | `/api/customers/{id}/aliases` | List aliases for customer |
| `POST` | `/api/customers/{id}/aliases` | Add new alias `{ "aliasName": "..." }` |
| `DELETE` | `/api/customers/{id}/aliases/{aliasId}` | Remove an alias |

### Credit (Udhaar) & Payments
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/customers/{id}/credits` | Record new credit purchase entry |
| `GET` | `/api/customers/{id}/credits` | List all credit purchases for customer |
| `POST` | `/api/customers/{id}/payments` | Record customer payment (cash / UPI) |
| `GET` | `/api/customers/{id}/payments` | List all payment receipts for customer |
| `GET` | `/api/customers/{id}/ledger` | Complete customer ledger with timeline |

### Ingestion & Reconciliation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/imports` | Upload statement/chat/image file for AI extraction |
| `GET` | `/api/imports` | List previous statement imports |
| `GET` | `/api/imports/{id}/records` | List extracted transaction records |
| `POST` | `/api/imports/records/{id}/approve` | Confirm and convert record into financial ledger entry |
| `GET` | `/api/reconciliation/review` | View candidate payment-to-credit allocation matches |
| `POST` | `/api/reconciliation/matches/{id}/reassign` | Reassign match to candidate customer |
| `POST` | `/api/reconciliation/matches/{id}/verify`| Human verification to approve match allocation |
| `POST` | `/api/reconciliation/matches/{id}/reject`| Reject candidate allocation match |

---

## 7. Testing & Production Build Commands

### Backend Tests & Packaging
```powershell
cd D:\Udhaar\backend
# Run full unit and integration test suite
.\mvnw.cmd clean test

# Build production jar
.\mvnw.cmd package
# Output: target/backend-0.0.1-SNAPSHOT.jar
```

### Frontend Production Build
```powershell
cd D:\Udhaar\frontend
# Build production assets
npm run build
# Output: dist/
```

### AI Service Tests
```powershell
cd D:\Udhaar\ai-service
.\venv\Scripts\activate
python -m pytest -v
```

---

## 8. Deployment Preparation Checklist

1. **Database Persistence**: Ensure MySQL 8.0 has persistent disk volumes and automated backup schedules.
2. **Photo Storage**: On cloud container platforms (AWS ECS, GCP Cloud Run, Docker), mount a persistent volume (or configure an S3/GCS bucket adapter) at `UDHAAR_PHOTO_DIR` to prevent photo loss across container restarts.
3. **Secrets Management**: Supply `JWT_SECRET`, `DB_PASSWORD`, and `DB_USERNAME` via environment variables or secret managers (AWS Secrets Manager, GCP Secret Manager).
4. **CORS Configuration**: Restrict `CORS_ALLOWED_ORIGINS` to production domains.
5. **Reverse Proxy & HTTPS**: Serve frontend and backend behind an HTTPS reverse proxy (Nginx, Traefik, or Cloudflare).
