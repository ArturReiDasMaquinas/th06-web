?# Touhou 6 — WebAssembly

**�?�方紅魔郷 / Touhou 6 ~ the Embodiment of Scarlet Devil** rodando direto no
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

## Onde está o motor (e o que fazer com a pasta `engine`)

O **código-fonte Rust do motor não está neste repositório** — ele fica na
pasta vizinha `touhou6-engine/` (5 MB), e o `.wasm` já compilado está em
`pkg/` (versionado aqui, é o que o Pages serve).

Você **não precisa** da pasta do motor para publicar o site. Ela só é útil
se você for mexer no motor.

```
Default Project\
├── PortalDosGames\     repo do portal
├── TH06-web\           repo do site  <- este
└── touhou6-engine\     fonte Rust do motor (fora do repo, 5 MB)
```

Para recompilar:

```powershell
.\build-wasm.ps1
```

O script acha o motor sozinho em `./engine` ou `../touhou6-engine` (ou por
`-EnginePath`). Recompilar leva **~1m45s** do zero; com o cache de build
(`target/`, 600 MB) leva ~20s.

**Três opções pra pasta do motor:** deixar aí (5 MB), apagar (dá pra
re-baixar do upstream quando precisar) ou virar um repo próprio no GitHub.
O `target/` é cache de build e pode ser apagado à vontade — é regenerável.

O fonte original também está no GitHub, em
[TheScreamer74/Touhou6](https://github.com/TheScreamer74/Touhou6) (MIT).

### Toolchain para recompilar

Precisa de Rust stable com o target `wasm32-unknown-unknown` e do `wasm-pack`:

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

Sem o Visual Studio Build Tools, aponte o linker para o GCC do MSYS2:

```powershell
$env:PATH = "C:\msys64\mingw64\bin;$env:PATH"
```

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
    "url": "https://<usuario>.github.io/th06-data",
    "files": ["TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT", "bgm/th06_01.wav"]
  }
}
```

`url` pode ser relativa (`./data`, mesma origem) ou absoluta (outro host).
Os caminhos em `files` são relativos a `url`.

**O que funciona como espelho?** Isto foi medido no navegador (CORS de
verdade, nao no papel):

| Host | Serve? | Por quê |
|---|---|---|
| Outro repo do **mesmo usuário** no GitHub Pages | ✅ | mesma origem (`usuario.github.io`) — nem precisa de CORS |
| `raw.githubusercontent.com` | ✅ | manda `Access-Control-Allow-Origin: *` |
| `cdn.jsdelivr.net` | ⚠�? | manda CORS, mas tem limite de 20 MB por arquivo (5 dos WAVs passam disso) |
| **Dropbox** (`dropbox.com/scl/...?dl=1`) | �?� | o `302` de redirecionamento não manda `Access-Control-Allow-Origin`; o navegador bloqueia antes de chegar no arquivo |
| **GitHub Releases** | �?� | os assets de release não mandam CORS nenhum |

Para Dropbox funcionar seria preciso servir os bytes de outra forma (a API
com token, por exemplo) — o link compartilhado não dá.

### Gerar o espelho

```powershell
.\preparar-espelho.ps1
```

Cria a pasta `th06-data` com os arquivos do jogo na estrutura certa, faz o
commit inicial e imprime o passo a passo do push e do Pages.

### Usar o Dropbox como espelho

**O link compartilhado do Dropbox não funciona** num site: o `302` de
redirecionamento não manda `Access-Control-Allow-Origin` e o navegador
bloqueia antes de chegar no arquivo. (Já medido no navegador.)

O que **funciona** é a **API do Dropbox**, com um token:

1. <https://www.dropbox.com/developers/apps> → *Create app* → permissão
   `files.content.read` → acesso *App folder* (o token só enxerga aquela
   pasta).
2. Coloque a pasta `TH06 Preservation` (com a `kouma/` dentro) dentro do
   app-folder.
3. Gere o token: no seu app → *OAuth 2* → *Generate access token*.
4. Configure:

```json
"dataMirror": {
  "enabled": true,
  "format": "zip",
  "method": "POST",
  "url": "https://content.dropboxapi.com/2/files/download_zip",
  "headers": { "Authorization": "Bearer SEU_TOKEN_AQUI" },
  "body": "{ \"path\": \"/TH06 Preservation\" }",
  "files": ["TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT", "bgm/th06_01.wav"]
}
```

A API devolve um ZIP; o site descompacta no navegador
(`assets/js/zip.js`) e casa os arquivos pelo **fim** do caminho, então tanto
`TL.DAT` quanto `bgm/th06_01.wav` funcionam, com a `kouma/` no meio ou não.

Testado ponta a ponta: 346 MB de ZIP, 22 arquivos extraídos, jogo rodando
com música.

> O token fica no `site-config.json`, que é público no repositório. Com
> acesso *App folder* ele só dá acesso àquela pasta — e dá para revogar a
> qualquer momento. Ainda assim: os arquivos são © ZUN / Team Shanghai
> Alice.

> **Atenção:** os arquivos do jogo são © ZUN / Team Shanghai Alice.
> Distribuí-los publicamente é um problema de licença, não de técnica. A
> opção padrão — o visitante seleciona a própria pasta — não tem esse
> problema e é a que o site usa por padrão. Use o espelho só se você
> realmente quiser assumir esse risco.

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
