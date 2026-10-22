<#
.SYNOPSIS
    Recompila o motor do Touhou 6 (C++) para WebAssembly e atualiza ./pkg.

.DESCRIPTION
    O motor nao e mais o de Rust: e o branch `portable` do
    GensokyoClub/th06 (o mesmo do APK Android), compilado com o
    Emscripten. O codigo-fonte fica fora deste repositorio, em
    D:\ProjetosGames\th06-web (ou onde o -EnginePath apontar).

    Precisa de:
      - Emscripten (https://emscripten.org)  -> $env:EMSDK_PATH
      - o SDL2 compilado para wasm (o build-wasm.cmd do motor compila)
      - cmake e ninja (o do Android SDK serve)

.EXAMPLE
    .\build-wasm.ps1
#>

[CmdletBinding()]
param(
    # Onde esta o codigo-fonte C++ do motor.
    [string]$EnginePath = "D:\ProjetosGames\th06-web"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path (Join-Path $EnginePath "CMakeLists.txt"))) {
    throw "Motor C++ nao encontrado em: $EnginePath (esperado o CMakeLists.txt)"
}

$script = Join-Path $EnginePath "build-wasm.cmd"
if (-not (Test-Path $script)) {
    throw "Script de build nao encontrado: $script"
}

Write-Host "==> motor em: $EnginePath"
Write-Host "==> compilando (SDL2 + jogo)"

& cmd /c $script
if ($LASTEXITCODE -ne 0) { throw "o build do motor falhou (exit $LASTEXITCODE)" }

# O motor gera pkg\th06.js e pkg\th06.wasm; o site usa o nome com o
# sufixo _bg (o do wasm-pack, de quando o motor era em Rust).
$outDir = Join-Path $root "pkg"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Copy-Item (Join-Path $EnginePath "pkg\th06.js")     (Join-Path $outDir "th06.js")     -Force
Copy-Item (Join-Path $EnginePath "pkg\th06.wasm")   (Join-Path $outDir "th06_bg.wasm") -Force

$wasm = Get-Item (Join-Path $outDir "th06_bg.wasm")
Write-Host ""
Write-Host "==> pronto: $($wasm.FullName) ($([math]::Round($wasm.Length / 1MB, 2)) MB)"
Write-Host "==> teste local:  cd '$root';  python serve.py"
