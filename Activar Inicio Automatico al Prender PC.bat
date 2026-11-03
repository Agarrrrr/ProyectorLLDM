@echo off
chcp 65001 >nul
title Configurar Inicio Automatico al Prender la PC
echo ====================================================================
echo   CONFIGURANDO PROYECTOR LLDM PARA INICIAR AL PRENDER LA PC
echo ====================================================================
echo.

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_BAT=%STARTUP_DIR%\iniciar_cabina.bat"

(
  echo @echo off
  echo cd /d "%PROJECT_DIR%"
  echo if not exist "node_modules\" call npm install
  echo where forever ^>nul 2^>nul
  echo if %%errorlevel%% equ 0 ^(
  echo   call forever stopall 2^>nul
  echo   call forever start server.js
  echo ^) else ^(
  echo   start "Proyector LLDM" /min cmd /c "node server.js"
  echo ^)
  echo exit
) > "%STARTUP_BAT%"

echo [LISTO] Se guardo el arranque automatico en:
echo %STARTUP_BAT%
echo.
echo Ahora cada vez que prendas la computadora, el Proyector LLDM
echo encendera automaticamente en segundo plano.
echo.
pause
