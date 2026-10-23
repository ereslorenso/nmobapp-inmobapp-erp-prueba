@echo off
chcp 65001 >nul
title InmobApp ERP - Servidor
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Falta Node.js. Descargalo de https://nodejs.org (version LTS), instalalo y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)
echo.
echo  Si Windows pregunta por el Firewall, marca "Redes privadas" y pulsa "Permitir acceso".
node server.js
pause
