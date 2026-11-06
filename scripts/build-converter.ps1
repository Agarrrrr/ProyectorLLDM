$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$root = Split-Path -Parent $PSScriptRoot
$output = Join-Path $root 'output'
$bundle = Join-Path $output 'converter'
$build = Join-Path $output 'converter-build'
$maven = (Get-Command mvn.cmd -ErrorAction Stop).Source
$jlink = (Get-Command jlink.exe -ErrorAction Stop).Source

& $maven -B -f (Join-Path $root 'desktop/converter/pom.xml') clean package dependency:copy-dependencies

if (Test-Path -LiteralPath $bundle) {
    $resolved = (Resolve-Path -LiteralPath $bundle).Path
    if ($resolved -ne [IO.Path]::GetFullPath((Join-Path $root 'output/converter'))) {
        throw "Unexpected converter output path: $resolved"
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
$lib = Join-Path $bundle 'lib'
New-Item -ItemType Directory -Path $lib -Force | Out-Null
Copy-Item -Path (Join-Path $build 'dependency/*.jar') -Destination $lib
Copy-Item -LiteralPath (Join-Path $build 'slide-renderer-1.jar') -Destination $lib
& $jlink --add-modules java.se,jdk.charsets,jdk.crypto.ec,jdk.unsupported --no-header-files --no-man-pages --compress=2 --output (Join-Path $bundle 'runtime')
