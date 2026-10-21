# Touhou 6 — WebAssembly

**東方紅魔郷 / Touhou 6 ~ the Embodiment of Scarlet Devil** rodando direto no
navegador. O motor do jogo foi reimplementado do zero em Rust e compilado
para WebAssembly — sem emulador, sem Flash, sem instalação.

> Projeto de fã, sem vínculo com a Team Shanghai Alice.
> *Touhou Project* e *the Embodiment of Scarlet Devil* são © ZUN / Team
> Shanghai Alice. **Este repositório não distribui nenhum arquivo do jogo** —
> ele precisa que você tenha os seus.

## Como funciona

O site tem dois caminhos para jogar:

1. **Selecionar a pasta do jogo (padrão).** Você aponta para a pasta do seu
   Touhou 6 e o navegador lê os bytes **localmente**. Nada é enviado para
   servidor nenhum. Os arquivos ficam em cache no IndexedDB do seu perfil,
   então a próxima visita é só um clique.
2. **Carregar do espelho.** Busca os arquivos de uma URL configurada em
   `site-config.json` (mesma origem ou outra, desde que mande
   `Access-Control-Allow-Origin`).

Arquivos necessários (pasta do jogo):

```
TL.DAT   CM.DAT   ST.DAT   IN.DAT   th06e_ST.DAT   bgm/th06_01.wav ... bgm/th06_17.wav
```

`bgm/` é opcional — sem ele o jogo roda em silêncio.

## Rodar localmente

```sh
python serve.py            # http://127.0.0.1:8080
```

Use `serve.py` e **não** `python -m http.server`: em instalações do Python
sem a tabela de MIME types, o `.js` sai como `text/plain` e o navegador
rejeita o módulo ES com *"Failed to fetch dynamically imported module"*.
`serve.py` já serve `.js` como `text/javascript` e `.wasm` como
`application/wasm`.

Para testar o botão "Carregar do espelho" sem editar o config, use o
parâmetro `?mirror`:

```
http://127.0.0.1:8080/?mirror=http://127.0.0.1:8081
```

## Recompilar o WASM

O código-fonte Rust do motor **não fica neste repositório** — ele mora na
pasta vizinha `touhou6-engine/` (ou em qualquer lugar que você indicar):

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

O fonte original também está no GitHub, em
[TheScreamer74/Touhou6](https://github.com/TheScreamer74/Touhou6) (MIT).

## Estrutura

```
TH06-web/
├── index.html              a página do jogo
├── site-config.json        espelho dos arquivos + link do portal
├── pkg/                    saída do wasm-pack (versionada)
│   ├── th06.js            glue do wasm-bindgen
│   └── th06_bg.wasm       o motor (~9 MB)
├── assets/
│   ├── css/style.css       tema (idêntico ao do Portal dos Games)
│   ├── css/game.css        estilos da página do jogo
│   └── js/game.js          upload, espelho, cache IndexedDB, fullscreen
├── serve.py                servidor local com os MIME types certos
├── build-wasm.ps1          rebuild do pkg/
├── .nojekyll
└── README.md
```

O motor em Rust fica fora, em `../touhou6-engine/` — este repositório é só o
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

Depois: **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
O site sai em `https://<usuario>.github.io/TH06-web/`.

O `.nojekyll` já está na raiz. O GitHub Pages serve `.wasm` como
`application/wasm` e `.js` como `text/javascript` — não precisa de nada
especial.

### Configurar o espelho

Edite `site-config.json`:

```json
{
  "portalUrl": "https://<usuario>.github.io/PortalDosGames/",
  "dataMirror": {
    "enabled": true,
    "url": "./data",
    "files": ["TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT", "bgm/th06_01.wav"]
  }
}
```

`url` pode ser relativa (`./data`, mesma origem) ou absoluta (um CDN ou outro
domínio — nesse caso o servidor precisa mandar
`Access-Control-Allow-Origin: *`).

> **Atenção:** os arquivos do jogo são © ZUN / Team Shanghai Alice. Distribuí-los
> publicamente é um problema de licença, não de técnica. A opção padrão —
> o visitante seleciona a própria pasta — não tem esse problema e é a que o
> site usa por padrão.

## Controles

| Tecla | Ação |
|---|---|
| Setas | Mover |
| `Z` | Atirar / confirmar |
| `X` | Bomb / voltar |
| `Shift` | Foco (movimento lento) |
| `Esc` | Pausa / voltar |
| `F` | Tela cheia |

## Licença

- O código do motor é MIT, de
  [TheScreamer74/Touhou6](https://github.com/TheScreamer74/Touhou6).
- O site e o tema são MIT.
- Os arquivos do jogo **não** estão aqui e continuam sendo de ZUN / Team
  Shanghai Alice.
