param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9A-Fa-f]{40}$')]
    [string]$Thumbprint
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
$cert = Get-Item -LiteralPath "Cert:\CurrentUser\My\$Thumbprint"
if (-not $cert.HasPrivateKey -or $cert.NotAfter -le (Get-Date) -or $cert.NotBefore -gt (Get-Date) -or
    -not ($cert.EnhancedKeyUsageList.ObjectId.Value -contains '1.3.6.1.5.5.7.3.3')) {
    throw 'El certificado debe estar vigente, tener acceso a la clave y admitir firma de código.'
}

Push-Location -LiteralPath $root
try {
    npm run build:windows -- '-c.forceCodeSigning=true' "-c.win.signtoolOptions.certificateSha1=$Thumbprint"
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación firmada.' }
    $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
    foreach ($file in @("output/windows/Proyector-LLDM-Setup-$version.exe", 'output/windows/win-unpacked/Proyector LLDM.exe')) {
        $signature = Get-AuthenticodeSignature -LiteralPath $file
        if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Thumbprint -ne $Thumbprint -or
            -not $signature.TimeStamperCertificate) {
            throw "No se verificó la firma con sello de tiempo de $file."
        }
        Write-Host "Firma verificada: $file"
    }
} finally {
    Pop-Location
}
