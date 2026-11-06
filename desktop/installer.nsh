!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
Var StartupCheckbox
Var StartupCheckboxState
Var StartupPreviousInstallLocation
Var StartupPreviousRunValue
!endif

!macro customPageAfterChangeDir
Page custom StartupOptionsPage StartupOptionsPageLeave
Function StartupOptionsPage
  ReadRegStr $StartupPreviousInstallLocation HKCU "Software\ProyectorLLDM" "InstallLocation"
  ${If} $StartupPreviousInstallLocation != ""
    !insertmacro MUI_HEADER_TEXT "Actualiza Proyector LLDM" "Instala la nueva versión sobre tu copia actual."
  ${Else}
    !insertmacro MUI_HEADER_TEXT "Instala Proyector LLDM" "Cabina de proyección para TV y OBS."
  ${EndIf}

  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${If} $StartupPreviousInstallLocation != ""
    ${NSD_CreateLabel} 0 8u 96% 30u "Cierra la cabina antes de continuar. Tus ajustes, listas y presentaciones se conservan al actualizar."
  ${Else}
    ${NSD_CreateLabel} 0 8u 96% 30u "La cabina incluye todo lo necesario para proyectar e importar archivos PDF y PowerPoint sin conexión."
  ${EndIf}
  Pop $0

  ${NSD_CreateCheckbox} 0 49u 100% 16u "Iniciar Proyector LLDM al entrar a Windows"
  Pop $StartupCheckbox
  ${NSD_CreateLabel} 12u 70u 90% 26u "También puedes abrir la cabina desde el menú Inicio cuando la necesites."
  Pop $0

  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM"
  StrCpy $StartupPreviousRunValue $0
  ${If} $0 != ""
    ${NSD_Check} $StartupCheckbox
  ${ElseIf} $StartupPreviousInstallLocation != ""
    ; Existing installs without a Run value had startup disabled.
    ${NSD_Uncheck} $StartupCheckbox
  ${Else}
    ${NSD_Check} $StartupCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function StartupOptionsPageLeave
  ${NSD_GetState} $StartupCheckbox $StartupCheckboxState
FunctionEnd
!macroend

!macro customInstallmode
  ; Keep the assisted installer per-user so HKCU startup registration matches
  ; the selected installation context without showing an install-mode page.
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInstall
  WriteRegStr HKCU "Software\ProyectorLLDM" "InstallLocation" "$INSTDIR"

  ; Silent invocations are updater installs. The options page is not shown,
  ; so leave the user's existing startup preference untouched.
  ${IfNot} ${Silent}
    ${If} $StartupCheckboxState == "1"
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM" "$\"$INSTDIR\Proyector LLDM.exe$\""
    ${ElseIf} $StartupCheckboxState == "0"
      ${If} $StartupPreviousRunValue == "$\"$StartupPreviousInstallLocation\Proyector LLDM.exe$\""
        DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM"
      ${ElseIf} $StartupPreviousRunValue == "$\"$INSTDIR\Proyector LLDM.exe$\""
        DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM"
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ; electron-builder runs the old uninstaller during upgrades. Keep both
  ; registration values then; the new installer refreshes InstallLocation.
  ${IfNot} ${isUpdated}
    ReadRegStr $0 HKCU "Software\ProyectorLLDM" "InstallLocation"
    ${If} $0 == "$INSTDIR"
      DeleteRegValue HKCU "Software\ProyectorLLDM" "InstallLocation"
    ${EndIf}

    ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM"
    ${If} $0 == "$\"$INSTDIR\Proyector LLDM.exe$\""
      DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Proyector LLDM"
    ${EndIf}
  ${EndIf}
!macroend
