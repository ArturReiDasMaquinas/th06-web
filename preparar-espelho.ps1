<#
.SYNOPSIS
    Prepara o repositorio do espelho do Touhou 6 (para o GitHub Pages).

.DESCRIPTION
    Cria uma pasta `th06-data` com os arquivos do jogo na estrutura que o
    site espera:

        th06-data/
        ├── TL.DAT  CM.DAT  ST.DAT  IN.DAT  th06e_ST.DAT
        ├── bgm/th06_01.wav ... bgm/th06_17.wav
        └── index.html          (pagina de teste opcional)

    O site busca em <dataMirror.url>/<arquivo>. Se voce publicar esse repo
    no GitHub Pages (user.github.io/th06-data), aponte:

        "dataMirror": { "url": "https://SEU-USUARIO.github.io/th06-data" }

    **ATENCAO — DIREITOS.** Esses arquivos sao © ZUN / Team Shanghai Alice.
    Publicar isso e um problema de licenca, nao de tecnica. A alternativa
    padrao do site (o visitante escolhe a propria pasta e os bytes nao
    saem da maquina dele) nao tem esse problema e nao precisa de espelho
    nenhum. Use este script so se voce realmente quiser isso.

    O script NAO da push: ele so prepara a pasta e imprime o que fazer.
    Rode o `publicar.ps1` (na pasta do Default Project) para enviar.

.EXAMPLE
    .\preparar-espelho.ps1
    .\preparar-espelho.ps1 -GameDir "D:\Meus Jogos\Touhou 6"
#>

[CmdletBinding()]
param(
    # Pasta do jogo (a que contem TL.DAT e a subpasta bgm/).
    [string]$GameDir = "C:\Users\Artur Barbosa\Downloads\Touhou\TH06 _ The Embodiment of Scarlet Devil\TH06 ~ The Embodiment of Scarlet Devil\kouma",

    # Nome da pasta de saida.
    [string]$OutDir = "..\th06-data",

    # Cria o repo git e faz o commit inicial.
    [switch]$InitGit,

    # So os 5 .DAT (8,7 MB), sem a pasta bgm/ (300 MB).
    # O jogo roda sem musica — o visitante pode mandar a propria pasta
    # se quiser o audio completo.
    [switch]$SemBgm,

    # Converte o BGM para Ogg Vorbis (o que o GitHub aceita de boa):
    # 310 MB de WAV -> 37 MB de Ogg, mesma duracao e qualidade
    # perceptual. O motor do site decodifica Ogg pelo decoder do browser.
    [switch]$Ogg,

    # Caminho do ffmpeg (pra converter o BGM).
    [string]$Ffmpeg = "E:\ffmpeg\bin\ffmpeg.exe"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = if ([System.IO.Path]::IsPathRooted($OutDir)) { $OutDir } else { Join-Path $root $OutDir }

Write-Host ""
Write-Host "  Espelho do Touhou 6" -ForegroundColor Cyan
Write-Host "  origem : $GameDir"
Write-Host "  destino: $out"
Write-Host ""

# --- confere a origem -------------------------------------------------------

if (-not (Test-Path $GameDir)) {
    throw "Pasta do jogo nao encontrada: $GameDir`nUse -GameDir <caminho>."
}

$required = @("TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT")
$missing = $required | Where-Object { -not (Test-Path (Join-Path $GameDir $_)) }
if ($missing) {
    throw "Faltam na pasta do jogo: $($missing -join ', ')`n`nO espelho precisa de TL.DAT, CM.DAT, ST.DAT, IN.DAT e th06e_ST.DAT."
}

$bgmDir = Join-Path $GameDir "bgm"
$wavs = @()
if ((-not $SemBgm) -and (Test-Path $bgmDir)) {
    $wavs = Get-ChildItem $bgmDir -Filter "*.wav" | Sort-Object Name
}

Write-Host "  DATs    : $($required.Count) encontrados"
if ($SemBgm) {
    Write-Host "  BGM     : ignorado (-SemBgm) — o jogo roda em silencio" -ForegroundColor Yellow
} else {
    Write-Host "  BGM     : $($wavs.Count) wavs"
    if ($wavs.Count -eq 0) {
        Write-Host "            (sem bgm/ — o jogo roda em silencio, mas vale a pena incluir)" -ForegroundColor Yellow
    }
}
$total = (Get-ChildItem $GameDir -File | Where-Object { $required -contains $_.Name } | Measure-Object -Property Length -Sum).Sum +
         ($wavs | Measure-Object -Property Length -Sum).Sum
Write-Host ("  tamanho : {0:N0} MB" -f ($total / 1MB))
if (-not $SemBgm -and $wavs.Count -gt 0) {
    Write-Host "            (um repo de ~300 MB: o GitHub aguenta, mas o clone fica pesado)" -ForegroundColor DarkYellow
}
Write-Host ""

# --- copia ------------------------------------------------------------------

if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $out | Out-Null

foreach ($f in $required) {
    Copy-Item (Join-Path $GameDir $f) (Join-Path $out $f) -Force
    Write-Host "  copiado $f"
}

if ($wavs.Count -gt 0) {
    New-Item -ItemType Directory -Force -Path (Join-Path $out "bgm") | Out-Null
    foreach ($w in $wavs) {
        if ($Ogg) {
            # NOTA: em PowerShell o nome da variavel nao diferencia
            # maiusculas, entao $ogg seria o mesmo que o switch $Ogg.
            $oggPath = Join-Path $out "bgm\$($w.BaseName).ogg"
            & $Ffmpeg -hide_banner -loglevel error -y -i $w.FullName -c:a libvorbis -q:a 5 $oggPath
            if ($LASTEXITCODE -ne 0) { throw "ffmpeg falhou em $($w.Name)" }
            Write-Host "  convertido bgm\$($w.BaseName).ogg"
        } else {
            Copy-Item $w.FullName (Join-Path $out "bgm\$($w.Name)") -Force
            Write-Host "  copiado bgm\$($w.Name)"
        }
    }
}

# Pagina de teste: se o espelho estiver no ar, TL.DAT deve baixar em vez de
# mostrar o HTML de listagem do GitHub.
$liDat = ($required | ForEach-Object { '  <li><a href="{0}">{0}</a></li>' -f $_ }) -join "`n"
$liBgm = ($wavs   | ForEach-Object {
    $ext = if ($Ogg) { "ogg" } else { "wav" }
    '  <li><a href="bgm/{0}.{1}">bgm/{0}.{1}</a> ({2} MB)</li>' -f $_.BaseName, $ext, ([math]::Round($_.Length / 1MB, 1))
}) -join "`n"

$page = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Espelho Touhou 6</title>
<style>body{background:#0a0910;color:#e8e8f0;font:14px/1.6 system-ui;padding:30px;max-width:44em;margin:auto}
code{background:#15151f;padding:.15em .4em;border-radius:4px}a{color:#e8b44a}</style></head>
<body>
<h1>Espelho do Touhou 6</h1>
<p>Estes arquivos sao os dados do jogo (&copy; ZUN / Team Shanghai Alice), servidos
para o <a href="../TH06-web/">site do Touhou 6 em WebAssembly</a>.</p>
<p>Arquivos:</p>
<ul>
$liDat
$liBgm
</ul>
</body></html>
"@
Set-Content (Join-Path $out "index.html") -Value $page -Encoding utf8

Write-Host ""
Write-Host "  Copiado para $out" -ForegroundColor Green

# --- git --------------------------------------------------------------------

if ($InitGit) {
    Push-Location $out
    try {
        git init -q -b main
        git config user.name "Artur Barbosa"
        git config user.email "artur@users.noreply.github.com"
        git add -A
        git commit -q -m "Espelho dos dados do Touhou 6 (© ZUN / Team Shanghai Alice)"
        Write-Host "  repo git inicializado e commit feito" -ForegroundColor Green
    }
    finally { Pop-Location }
}

Write-Host ""
Write-Host "  PROXIMOS PASSOS" -ForegroundColor Cyan
Write-Host "  1. Crie o repo 'th06-data' no GitHub (https://github.com/new)"
Write-Host "  2. Envie esta pasta:"
Write-Host "       cd `"$out`""
Write-Host "       git remote add origin https://github.com/SEU-USUARIO/th06-data.git"
Write-Host "       git push -u origin main"
Write-Host "  3. Ligue o Pages nesse repo: Settings -> Pages -> main -> / (root)"
Write-Host "  4. Aponte no site:"
Write-Host '       "dataMirror": { "url": "https://SEU-USUARIO.github.io/th06-data" }'
Write-Host ""
Write-Host "  Lembre: publicar os arquivos do jogo tem implicacao de licenca." -ForegroundColor Yellow
Write-Host ""
