@echo off
REM WAMS Application Launcher
REM Double-click this file to start the app!

echo.
echo ========================================
echo   WAMS Application Launcher
echo ========================================
echo.

REM Navigate to the directory where this batch file is located
cd /d "%~dp0"

echo Current directory: %CD%
echo.

REM Kill any existing node processes on ports 5173 and 5174
echo Stopping any existing servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo Killing process on port 5173 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do (
    echo Killing process on port 5174 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM Clear Vite cache
echo Clearing Vite cache...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite" >nul 2>&1
    echo Cache cleared.
) else (
    echo No cache to clear.
)
echo.

REM Find and copy the latest backup from Downloads
echo Looking for latest backup in Downloads...
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "LATEST_BACKUP="

REM Find the newest bills-apps-backup-*.json file
for /f "delims=" %%F in ('dir /b /o-d "%DOWNLOADS%\bills-apps-backup-*.json" 2^>nul') do (
    if not defined LATEST_BACKUP (
        set "LATEST_BACKUP=%%F"
    )
)

if defined LATEST_BACKUP (
    echo Found latest backup: %LATEST_BACKUP%
    echo Copying to public\auto-restore.json...
    copy /y "%DOWNLOADS%\%LATEST_BACKUP%" "public\auto-restore.json" >nul
    echo Backup ready for auto-restore!
) else (
    echo No backup files found in Downloads.
    REM Remove any old auto-restore file if no new backup exists
    if exist "public\auto-restore.json" del "public\auto-restore.json" >nul 2>&1
)
echo.

echo Installing/checking dependencies...
echo.

REM Run npm install (in case there are updates or first time)
call npm install

echo.
echo Starting development server...
echo.
echo The app will open automatically in your browser!
echo To stop the server, press Ctrl+C in this window.
echo.

REM Start the development server
call npm run dev

REM Keep window open if there's an error
pause
