param([Parameter(Mandatory)][string]$Installer, [string]$PreviousInstaller)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$registry = 'HKCU:\Software\ProyectorLLDM'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
function Get-InstalledLocation {
    (Get-ItemProperty -LiteralPath $registry -Name InstallLocation -ErrorAction SilentlyContinue).InstallLocation
}
function Get-StartupCommand {
    (Get-ItemProperty -LiteralPath $runKey -Name 'Proyector LLDM' -ErrorAction SilentlyContinue).'Proyector LLDM'
}
function Invoke-InstallerProcess([string]$Executable, [string]$Arguments) {
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WindowStyle Hidden -PassThru
    try {
        if (-not $process.WaitForExit(180000)) {
            $process.Kill($true)
            throw "Tiempo de espera agotado: $Executable"
        }
        if ($process.ExitCode -ne 0) {
            throw "El proceso terminó con código $($process.ExitCode): $Executable"
        }
    } finally { $process.Dispose() }
}

if ((Get-InstalledLocation) -or (Get-StartupCommand)) {
    throw 'Usa una cuenta de pruebas sin una instalación previa de Proyector LLDM.'
}
$setup = (Resolve-Path -LiteralPath $Installer).Path
$target = Join-Path ([IO.Path]::GetTempPath()) ('LLDMReleaseTest-' + [guid]::NewGuid().ToString('N'))
try {
    # NSIS requiere /D como último argumento, sin comillas incluso si la ruta tiene espacios.
    $env:PROYECTOR_TEST_EXE = Join-Path $target 'Proyector LLDM.exe'
    if ($PreviousInstaller) {
        $previous = (Resolve-Path -LiteralPath $PreviousInstaller).Path
        Invoke-InstallerProcess $previous "/S /D=$target"
        if ((Get-InstalledLocation) -ne $target -or -not (Test-Path -LiteralPath $env:PROYECTOR_TEST_EXE)) {
            throw 'La versión anterior no se instaló en la ubicación temporal.'
        }
        $previousVersion = (Get-Item -LiteralPath $env:PROYECTOR_TEST_EXE).VersionInfo.ProductVersion
        # Sin /D: el instalador debe detectar por sí mismo la copia que se va a actualizar.
        Invoke-InstallerProcess $setup '/S'
        if ((Get-Item -LiteralPath $env:PROYECTOR_TEST_EXE).VersionInfo.ProductVersion -eq $previousVersion) {
            throw 'El instalador no reemplazó el ejecutable anterior.'
        }
        Write-Host "Actualización en la carpeta existente comprobada desde $previousVersion."
    } else {
        Invoke-InstallerProcess $setup "/S /D=$target"
    }
    if ((Get-InstalledLocation) -ne $target -or -not (Test-Path -LiteralPath $env:PROYECTOR_TEST_EXE)) {
        throw 'El instalador no registró y creó el ejecutable en la carpeta de prueba.'
    }
    if (Get-StartupCommand) { throw 'Una instalación silenciosa no debe agregar arranque automático.' }
    npm run test:converter -- --app
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de la instalación.' }
} finally {
    Remove-Item Env:PROYECTOR_TEST_EXE -ErrorAction SilentlyContinue
    $uninstaller = Join-Path $target 'Uninstall Proyector LLDM.exe'
    if (Test-Path -LiteralPath $uninstaller) {
        Invoke-InstallerProcess $uninstaller '/S'
        $deadline = [DateTime]::UtcNow.AddSeconds(30)
        while ((Test-Path -LiteralPath $target) -and [DateTime]::UtcNow -lt $deadline) {
            Start-Sleep -Milliseconds 200
        }
    }
    if ((Get-InstalledLocation) -or (Get-StartupCommand) -or (Test-Path -LiteralPath $target)) {
        throw 'La desinstalación no limpió la instalación temporal.'
    }
}
