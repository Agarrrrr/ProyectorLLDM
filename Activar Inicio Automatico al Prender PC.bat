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
  echo call "%PROJECT_DIR%\Iniciar Proyector LLDM.bat"
) > "%STARTUP_BAT%"

echo [LISTO] Se guardo el arranque automatico en:
echo %STARTUP_BAT%
echo.
echo Ahora cada vez que prendas la computadora, el Proyector LLDM
echo encendera automaticamente en segundo plano.
echo.
pause
