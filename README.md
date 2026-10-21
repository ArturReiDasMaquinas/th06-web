# Touhou 6 â€” WebAssembly

**æ±æ–¹ç´…é­”éƒ· / Touhou 6 ~ the Embodiment of Scarlet Devil** rodando direto no
navegador. O motor do jogo foi reimplementado do zero em Rust e compilado
para WebAssembly â€” sem emulador, sem Flash, sem instalaÃ§Ã£o.

> Projeto de fÃ£, sem vÃ­nculo com a Team Shanghai Alice.
> *Touhou Project* e *the Embodiment of Scarlet Devil* sÃ£o Â© ZUN / Team
> Shanghai Alice. **Este repositÃ³rio nÃ£o distribui nenhum arquivo do jogo** â€”
> ele precisa que vocÃª tenha os seus.

## Como funciona

O site tem dois caminhos para jogar:

1. **Selecionar a pasta do jogo (padrÃ£o).** VocÃª aponta para a pasta do seu
   Touhou 6 e o navegador lÃª os bytes **localmente**. Nada Ã© enviado para
   servidor nenhum. Os arquivos ficam em cache no IndexedDB do seu perfil,
   entÃ£o a prÃ³xima visita Ã© sÃ³ um clique.
2. **Carregar do espelho.** Busca os arquivos de uma URL configurada em
   `site-config.json` (mesma origem ou outra, desde que mande
   `Access-Control-Allow-Origin`).

Arquivos necessÃ¡rios (pasta do jogo):

```
TL.DAT   CM.DAT   ST.DAT   IN.DAT   th06e_ST.DAT   bgm/th06_01.wav ... bgm/th06_17.wav
```

`bgm/` Ã© opcional â€” sem ele o jogo roda em silÃªncio.

## Rodar localmente

```sh
python serve.py            # http://127.0.0.1:8080
```

Use `serve.py` e **nÃ£o** `python -m http.server`: em instalaÃ§Ãµes do Python
sem a tabela de MIME types, o `.js` sai como `text/plain` e o navegador
rejeita o mÃ³dulo ES com *"Failed to fetch dynamically imported module"*.
`serve.py` jÃ¡ serve `.js` como `text/javascript` e `.wasm` como
`application/wasm`.

Para testar o botÃ£o "Carregar do espelho" sem editar o config, use o
parÃ¢metro `?mirror`:

```
http://127.0.0.1:8080/?mirror=http://127.0.0.1:8081
```

## Recompilar o WASM

O cÃ³digo-fonte Rust do motor **nÃ£o fica neste repositÃ³rio** â€” ele mora na
pasta vizinha `touhou6-engine/` (ou em qualquer lugar que vocÃª indicar):

```powershell
.\build-wasm.ps1
.\build-wasm.ps1 -EnginePath "C:\caminho\para\touhou6-engine"
```

O script procura o motor em `./engine` e em `../touhou6-engine`, compila e
escreve o resultado em `pkg/`:

```
pkg/th06.js          glue do wasm-bindgen
pkg/th06_bg.wasm     o motor (~9 MB)
```

Precisa de Rust stable com o target `wasm32-unknown-unknown` e do `wasm-pack`:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Sem o Visual Studio Build Tools, aponte o linker para o GCC do MSYS2:

```powershell
$env:PATH = "C:\msys64\mingw64\bin;$env:PATH"
```

O fonte original tambÃ©m estÃ¡ no GitHub, em
[TheScreamer74/Touhou6](https://github.com/TheScreamer74/Touhou6) (MIT).

## Estrutura

```
TH06-web/
â”œâ”€â”€ index.html              a pÃ¡gina do jogo
â”œâ”€â”€ site-config.json        espelho dos arquivos + link do portal
â”œâ”€â”€ pkg/                    saÃ­da do wasm-pack (versionada)
â”‚   â”œâ”€â”€ th06.js            glue do wasm-bindgen
â”‚   â””â”€â”€ th06_bg.wasm       o motor (~9 MB)
â”œâ”€â”€ assets/
â”‚   â”œâ”€â”€ css/style.css       tema (idÃªntico ao do Portal dos Games)
â”‚   â”œâ”€â”€ css/game.css        estilos da pÃ¡gina do jogo
â”‚   â””â”€â”€ js/game.js          upload, espelho, cache IndexedDB, fullscreen
â”œâ”€â”€ serve.py                servidor local com os MIME types certos
â”œâ”€â”€ build-wasm.ps1          rebuild do pkg/
â”œâ”€â”€ .nojekyll
â””â”€â”€ README.md
```

O motor em Rust fica fora, em `../touhou6-engine/` â€” este repositÃ³rio Ã© sÃ³ o
site que o GitHub Pages serve.

## Publicar no GitHub Pages

```sh
git init
git add .
git commit -m "Touhou 6 em WebAssembly"
git branch -M main
git remote add origin https://github.com/<usuario>/TH06-web.git
git push -u origin main
```

Depois: **Settings â†’ Pages â†’ Deploy from a branch â†’ `main` / `/ (root)`**.
O site sai em `https://<usuario>.github.io/TH06-web/`.

O `.nojekyll` jÃ¡ estÃ¡ na raiz. O GitHub Pages serve `.wasm` como
`application/wasm` e `.js` como `text/javascript` â€” nÃ£o precisa de nada
especial.

### Configurar o espelho

Edite `site-config.json`:

```json
{
  "portalUrl": "https://<usuario>.github.io/PortalDosGames/",
  "dataMirror": {
    "enabled": true,
    "url": "https://<usuario>.github.io/th06-data",
    "files": ["TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT", "bgm/th06_01.wav"]
  }
}
```

`url` pode ser relativa (`./data`, mesma origem) ou absoluta (outro host).
Os caminhos em `files` sÃ£o relativos a `url`.

**O que funciona como espelho?** Isto foi medido no navegador (CORS de
verdade, nao no papel):

| Host | Serve? | Por quÃª |
|---|---|---|
| Outro repo do **mesmo usuÃ¡rio** no GitHub Pages | âœ… | mesma origem (`usuario.github.io`) â€” nem precisa de CORS |
| `raw.githubusercontent.com` | âœ… | manda `Access-Control-Allow-Origin: *` |
| `cdn.jsdelivr.net` | âš ï¸ | manda CORS, mas tem limite de 20 MB por arquivo (5 dos WAVs passam disso) |
| **Dropbox** (`dropbox.com/scl/...?dl=1`) | âŒ | o `302` de redirecionamento nÃ£o manda `Access-Control-Allow-Origin`; o navegador bloqueia antes de chegar no arquivo |
| **GitHub Releases** | âŒ | os assets de release nÃ£o mandam CORS nenhum |

Para Dropbox funcionar seria preciso servir os bytes de outra forma (a API
com token, por exemplo) â€” o link compartilhado nÃ£o dÃ¡.

### Gerar o espelho

```powershell
.\preparar-espelho.ps1
```

Cria a pasta `th06-data` com os arquivos do jogo na estrutura certa, faz o
commit inicial e imprime o passo a passo do push e do Pages.

> **AtenÃ§Ã£o:** os arquivos do jogo sÃ£o Â© ZUN / Team Shanghai Alice.
> DistribuÃ­-los publicamente Ã© um problema de licenÃ§a, nÃ£o de tÃ©cnica. A
> opÃ§Ã£o padrÃ£o â€” o visitante seleciona a prÃ³pria pasta â€” nÃ£o tem esse
> problema e Ã© a que o site usa por padrÃ£o. Use o espelho sÃ³ se vocÃª
> realmente quiser assumir esse risco.

## Controles

| Tecla | AÃ§Ã£o |
|---|---|
| Setas | Mover |
| `Z` | Atirar / confirmar |
| `X` | Bomb / voltar |
| `Shift` | Foco (movimento lento) |
| `Esc` | Pausa / voltar |
| `F` | Tela cheia |

## LicenÃ§a

- O cÃ³digo do motor Ã© MIT, de
  [TheScreamer74/Touhou6](https://github.com/TheScreamer74/Touhou6).
- O site e o tema sÃ£o MIT.
- Os arquivos do jogo **nÃ£o** estÃ£o aqui e continuam sendo de ZUN / Team
  Shanghai Alice.
