@echo off
setlocal
chcp 65001 >nul
title Proyector LLDM para OBS
echo ========================================================
echo        INICIANDO PROYECTOR LLDM PARA OBS STUDIO
echo ========================================================
cd /d "%~dp0"

REM En una instalacion, abre la aplicacion empaquetada sin requerir Node.js.
if exist "%~dp0Proyector LLDM.exe" (
  start "" "%~dp0Proyector LLDM.exe"
  exit /b 0
)

REM El BAT puede estar fuera de la carpeta instalada. Busca la instalacion
REM registrada por el instalador antes de recurrir al modo legado con Node.
set "INSTALL_DIR="
for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\ProyectorLLDM" /v InstallLocation 2^>nul ^| findstr /i "InstallLocation"') do set "INSTALL_DIR=%%B"
if defined INSTALL_DIR if exist "%INSTALL_DIR%\Proyector LLDM.exe" (
  start "" "%INSTALL_DIR%\Proyector LLDM.exe"
  exit /b 0
)

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] No se encontro Node.js instalado en esta computadora.
  echo Por favor descarga e instala Node.js desde: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

node -e "for (const d of Object.keys(require('./package.json').dependencies || {})) require.resolve(d)" >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo [COMPONENTES] Instalando o actualizando componentes necesarios automaticamente...
  echo Esto tomara solo unos segundos. Por favor espera...
  echo.
  call npm ci --omit=dev --ignore-scripts
  if errorlevel 1 call npm install --omit=dev --ignore-scripts
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
