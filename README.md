# Touhou 6 — WebAssembly

**東方紅魔郷 / Touhou 6 ~ the Embodiment of Scarlet Devil** rodando direto no
navegador. O motor é o **branch `portable` do
[GensokyoClub/th06](https://github.com/GensokyoClub/th06)** (MIT) — a
reimplementação em C++/SDL2/OpenGL do jogo de 2002 — compilado para
WebAssembly com o [Emscripten](https://emscripten.org). Sem emulador, sem
Flash, sem instalação.

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
   `site-config.json`. No padrão, o espelho é o repo
   <https://github.com/ArturReiDasMaquinas/th06-data>, servido em
   `arturreidasmaquinas.github.io/th06-data` — **mesma origem** do site,
   então nem existe CORS.

Arquivos necessários (pasta do jogo):

```
th06e_TL.DAT  th06e_CM.DAT  th06e_ST.DAT  th06e_IN.DAT   bgm/th06_*.wav (ou .ogg)
```

O `th06e_*` é o patch de tradução para o inglês (a versão 0.8 do Simon
Elenbogen). Se a pasta tiver só os `.DAT` originais em japonês
(`TL.DAT`, `CM.DAT`, `ST.DAT`, `IN.DAT`), o site usa esses — o motor
prefere o patch, mas os dois funcionam.

`bgm/` é opcional — sem ele o jogo roda em silêncio.

### O BGM em Ogg

O BGM original são 17 WAVs PCM de 44,1 kHz (310 MB, 10–32 MB cada) — acima
do limite de 25 MB da upload do GitHub pelo navegador. No espelho ele está
em **Ogg Vorbis**: 37,7 MB no total, 1,1–3,6 MB por faixa, mesma duração e
qualidade perceptual (rms 0,1079 contra 0,1125 do WAV original).

O motor aceita os dois formatos: PCM é lido pelo parser dele mesmo, e o
comprimido é decodificado **dentro do wasm** pelo `stb_vorbis` (o mesmo
código do APK Android) — o `decodeAudioData` do navegador não é usado.

## Rodar localmente

```sh
python serve.py            # http://127.0.0.1:8080
```

Use `serve.py` e **não** `python -m http.server`: em instalações do Python
sem a tabela de MIME types, o `.js` sai como `text/plain` e o navegador
rejeita o módulo ES com *"Failed to fetch dynamically imported module"*.
`serve.py` já serve `.js` como `text/javascript` e `.wasm` como
`application/wasm`.

## Compilar o motor

O código-fonte do motor fica **fora** deste repositório (ele é grande e o
Pages só precisa do site + do `.wasm`):

```
..\th06-web\        fonte C++ do jogo (fora do repo)
```

Precisa do [Emscripten](https://emscripten.org) e do SDL2 compilado para
wasm. O `build-wasm.cmd` faz as duas coisas:

```sh
cd ..\th06-web
build-wasm.cmd
```

Ele recompila o SDL2 (`D:\src\SDL2`) para `wasm32-unemscripten` (o ninja é
incremental, então é rápido) e depois o jogo, gerando `pkg/th06.js` +
`pkg/th06_bg.wasm`.

Detalhes que só aparecem no navegador:

- **Não há thread.** O `SharedArrayBuffer` (que o Emscripten precisa para
  pthreads) só existe em páginas com isolamento de origem, e o GitHub Pages
  não tem. O `SoundPlayer` transmite a música do laço principal.
- **O ASYNCIFY** é o que devolve o controle ao navegador a cada quadro
  (o laço do jogo é ocupado).
- **O canvas é 16:9** e o jogo 4:3 fica no meio, com as tarjas pretas de
  cada lado onde ficam os controles de toque.
- **O WebGL (GLES2) não tem arrays de vértice do cliente**: cada atributo
  (posição, uv, cor) é copiado para o seu próprio VBO na hora de desenhar.
  Com um VBO só, o desenho sai todo corrompido.

## Controles

- **Teclado:** setas para mover, `Z` atira/confirma, `X` bomba/volta,
  `Shift` foco, `Enter` confirma nos menus, `Esc` pausa/volta, `F` tela cheia.
- **Toque:** o botão **“Modo touch”** (ao lado de “Carregar do espelho”)
  liga e desliga os botões virtuais nas tarjas pretas — antes de abrir o
  jogo. Fica ligado sozinho em telas de toque, e a escolha é guardada
  no navegador.

## Estrutura

```
th06-web/
├── index.html             a pagina do jogo
├── site-config.json       a configuracao do espelho (da para editar sem rebuild)
├── serve.py               o servidor local (com os MIME types certos)
├── preparar-espelho.ps1   monta a pasta do espelho (e converte o BGM pra Ogg)
├── build-wasm.ps1         (o motor fica em ../touhou6-web)
├── assets/
│   ├── css/               o visual do site
│   ├── img/th06-icon.png  o icone do proprio executavel do jogo
│   └── js/game.js         o carregador: escolhe os arquivos e sobe o motor
├── pkg/
│   ├── th06.js            o glue do Emscripten
│   └── th06_bg.wasm       o motor compilado
└── .github/workflows/     o deploy automatico do GitHub Pages
```

## Créditos

- **ZUN** — pelo jogo.
- [GensokyoClub/th06](https://github.com/GensokyoClub/th06) — o motor
  (branch `portable`), MIT.
- [happyhavoc/th06](https://github.com/happyhavoc/th06) — a decompilação
  original, a referência de comportamento.
- [nothings/stb](https://github.com/nothings/stb) — stb_image,
  stb_truetype e stb_vorbis.
- [SDL2](https://github.com/libsdl-org/SDL) — a camada de janela, áudio e
  entrada.

Este é um projeto de fã, sem vínculo com a Team Shanghai Alice.
*Touhou Project* e *the Embodiment of Scarlet Devil* são © ZUN / Team
Shanghai Alice. Os arquivos do jogo neste repositório são o patch inglês
que o usuário possui legalmente.
