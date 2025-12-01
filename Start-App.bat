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
echo Checking if server is already running...
echo.

REM Check if port 5173 is already in use
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul

if %ERRORLEVEL% EQU 0 (
    echo Server is already running!
    echo Opening browser...
    echo.
    start http://localhost:5173
    echo.
    echo Browser opened. You can close this window.
    timeout /t 3 >nul
    exit
) else (
    echo Server is not running. Starting it now...
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
)

