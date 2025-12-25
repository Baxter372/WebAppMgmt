@echo off
REM Finance Companion Tool - Full Backup Launcher
REM Double-click this file to backup source code and get instructions for data backup

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "Backup-All.ps1"

