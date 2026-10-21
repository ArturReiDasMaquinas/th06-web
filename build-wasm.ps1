<#
.SYNOPSIS
    Recompila o motor do Touhou 6 para WebAssembly e atualiza ./pkg.

.DESCRIPTION
    Precisa de:
      - Rust stable com o target wasm32-unknown-unknown
        rustup target add wasm32-unknown-unknown
      - wasm-pack
        cargo install wasm-pack    (ou baixe o binário de rustwasm/wasm-pack)
      - um linker para o host. Sem o Visual Studio Build Tools, use o GCC do
        MSYS2:  $env:PATH = "C:\msys64\mingw64\bin;$env:PATH"

.EXAMPLE
    .\build-wasm.ps1
#>

[CmdletBinding()]
param(
    # "nightly" ou "stable"
    [string]$Profile = "release"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$engine = Join-Path $root "engine"

# --- toolchain -------------------------------------------------------------

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) { $env:PATH = "$cargoBin;$env:PATH" }

# Linker do host: MSYS2 (mingw64) ou o GCC que estiver no PATH.
$msysGcc = "C:\msys64\mingw64\bin"
if (Test-Path $msysGcc) { $env:PATH = "$msysGcc;$env:PATH" }

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw "cargo não encontrado. Instale o Rust: https://rustup.rs"
}

# wasm-pack: procura no PATH, depois nas pastas usuais.
$wasmPack = Get-Command wasm-pack -ErrorAction SilentlyContinue
if (-not $wasmPack) {
    $candidates = @(
        "$env:USERPROFILE\.cargo\bin\wasm-pack.exe",
        "C:\Program Files\wasm-pack\wasm-pack.exe",
        "$env:LOCALAPPDATA\Temp\opencode\rustsetup\wasm-pack\wasm-pack-v0.13.1-x86_64-pc-windows-msvc\wasm-pack.exe"
    )
    $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) { $wasmPack = $found } else {
        throw "wasm-pack não encontrado. Instale com: cargo install wasm-pack"
    }
}

Write-Host "==> rustc      : $(& rustc --version)"
Write-Host "==> cargo      : $(& cargo --version)"
Write-Host "==> wasm-pack  : $wasmPack"
Write-Host "==> target     : wasm32-unknown-unknown"

# --- build -----------------------------------------------------------------

$outDir = Join-Path $root "pkg"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }

Push-Location $engine
try {
    & $wasmPack build crates/game --release --target web --out-dir ..\pkg --out-name th06
    if ($LASTEXITCODE -ne 0) { throw "wasm-pack falhou (exit $LASTEXITCODE)" }
}
finally {
    Pop-Location
}

# O wasm-pack resolve --out-dir a partir do crate, não do workspace.
$generated = Join-Path $engine "crates\pkg"
if (Test-Path $generated) {
    Remove-Item $generated -Recurse -Force
}

# Limpa o que não é preciso no repositório.
Get-ChildItem $outDir -Filter "package.json" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $outDir -Filter ".gitignore"   -ErrorAction SilentlyContinue | Remove-Item -Force

$wasm = Get-ChildItem $outDir -Filter "*.wasm" | Select-Object -First 1
Write-Host ""
Write-Host "==> pronto: $($wasm.FullName) ($([math]::Round($wasm.Length / 1MB, 2)) MB)"
Write-Host "==> teste local:  cd '$root';  python -m http.server 8080"
