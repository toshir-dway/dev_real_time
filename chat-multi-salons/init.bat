@echo off
setlocal

:: Arrête et supprime le conteneur my-redis s'il existe
docker stop my-redis >nul 2>&1
docker rm my-redis >nul 2>&1

:: Crée et démarre un nouveau conteneur Redis nommé my-redis
docker run --name my-redis -p 6379:6379 -d redis/redis-stack-server:latest

timeout /t 2 >nul

start cmd /k "node index.js 3000"
start cmd /k "node index.js 3001"
start cmd /k "node index.js 3002"
timeout /t 2 >nul
start http://localhost:3000/
start http://localhost:3001/
start http://localhost:3002/

endlocal