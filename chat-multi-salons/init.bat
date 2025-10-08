@echo off
setlocal

:: Stop and remove existing Redis container
docker stop my-redis >nul 2>&1
docker rm my-redis >nul 2>&1

:: Start Redis
docker run --name my-redis -p 6379:6379 -d redis/redis-stack-server:latest
timeout /t 2 >nul

:: Start Node.js servers
start cmd /k "node index.js 3000"
start cmd /k "node index.js 3001"
start cmd /k "node index.js 3002"
timeout /t 3 >nul

:: Launch Firefox windows
start "" "firefox" -new-window "http://localhost:3000"
timeout /t 6 >nul
start "" "firefox" -new-window "http://localhost:3001"
timeout /t 4 >nul
start "" "firefox" -new-window "http://localhost:3002"

:: Wait for windows to fully load
timeout /t 8 >nul

:: Arrange windows using a separate PowerShell script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arrange_windows.ps1"

endlocal
pause