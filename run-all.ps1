$env:SPRING_PROFILES_ACTIVE = "local"
# Udhaar - Startup helper script for Windows PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Udhaar System Services      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start AI Service in separate window
Write-Host "`n[1/3] Launching Python AI Service on port 8001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Udhaar\ai-service; .\venv\Scripts\activate; uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

# 2. Start Spring Boot Backend in separate window
Write-Host "`n[2/3] Launching Spring Boot Backend on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Udhaar\backend; .\mvnw.cmd spring-boot:run"

# 3. Start Frontend in separate window
Write-Host "`n[3/3] Launching React Vite Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\Udhaar\frontend; npm run dev"

Write-Host "`nAll 3 services launched!" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "Backend:   http://localhost:8080" -ForegroundColor White
Write-Host "AI Engine: http://localhost:8001" -ForegroundColor White
