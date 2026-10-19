@echo off
title BCPS Automation Server
cd /d "%~dp0"
echo Starting BCPS Automation app at http://localhost:4321
echo Close this window (or press Ctrl+C) to stop the server.
echo.
start "" http://localhost:4321
npm run app
pause
