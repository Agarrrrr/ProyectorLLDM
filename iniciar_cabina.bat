@echo off
cd /d "%~dp0"
title Proyector LLDM
node -e "for (const d of Object.keys(require('./package.json').dependencies || {})) require.resolve(d)" >nul 2>nul
if %errorlevel% neq 0 (
  echo Instalando o actualizando componentes necesarios...
  call npm ci --omit=dev --ignore-scripts
  if errorlevel 1 call npm install --omit=dev --ignore-scripts
)
echo Iniciando cabina. Usa la direccion que aparece en la consola.
node server.js
pause
