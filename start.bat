@echo off
chcp 65001 >nul
title Hisobchi - bot, Mini App va Admin Panel
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\Programs\node-v*-win-x64") do set "PATH=%%D;%PATH%"
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js topilmadi. https://nodejs.org saytidan o'rnating.
  pause
  exit /b 1
)

if not exist node_modules call npm run install:all

echo.
echo  Hisobchi ishga tushmoqda...
echo  Admin Panel: http://localhost:5174
echo  To'xtatish uchun shu oynani yoping yoki Ctrl+C bosing.
echo.
call npm run dev
pause
