@echo off
setlocal
chcp 65001 >nul
title Proyector LLDM para OBS
echo ========================================================
echo        INICIANDO PROYECTOR LLDM PARA OBS STUDIO
echo ========================================================
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] No se encontro Node.js instalado en esta computadora.
  echo Por favor descarga e instala Node.js desde: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo [PRIMERA VEZ] Instalando componentes necesarios automaticamente...
  echo Esto tomara solo unos segundos. Por favor espera...
  echo.
  call npm ci --omit=dev --ignore-scripts
  if errorlevel 1 (
    echo [ERROR] No se pudieron instalar los componentes. Revisa internet y vuelve a abrir este archivo.
    pause
    exit /b 1
  )
)

REM El servidor abre el navegador cuando esta listo, despues de revisar actualizaciones.
set "PROYECTOR_OPEN_BROWSER=1"

node server.js
pause
