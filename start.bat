@echo off
title .NET Archaeologist - Launcher
color 1F

echo ==============================================================================
echo                      .NET Archaeologist - Startup
echo ==============================================================================
echo.
echo Avvio in corso dei servizi locali:
echo  - Backend API: http://127.0.0.1:5123
echo  - Frontend Web (Windows 98 UI): http://localhost:5173
echo.

:: Avvio del Backend API in una finestra dedicata
start ".NET Archaeologist - Backend API" cmd /k "dotnet run --project src\DotNetArchaeologist.Api --urls http://127.0.0.1:5123"

:: Attesa breve per l'inizializzazione del backend
timeout /t 2 /nobreak >nul

:: Avvio del Frontend Vite in una finestra dedicata
start ".NET Archaeologist - Web Frontend" cmd /k "npm --prefix src\DotNetArchaeologist.Web run dev"

:: Attesa per il server Vite e apertura automatica del browser predefinito
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ==============================================================================
echo [INFO] Servizi avviati con successo!
echo Il browser predefinito e stato aperto all'indirizzo:
echo   http://localhost:5173
echo.
echo Per chiudere l'applicazione:
echo Chiudi le finestre del terminale aperte per Backend e Frontend.
echo ==============================================================================
echo.
pause
