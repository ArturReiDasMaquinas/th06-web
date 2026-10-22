/* ==========================================================================
   TH06-web — launcher
   - escolhe a pasta do jogo no PC (os bytes NUNCA saem da máquina)
   - ou carrega os arquivos de um espelho configurado em site-config.json
   - guarda tudo em IndexedDB, para as próximas visitas ser um clique
   ========================================================================== */

(function () {
  "use strict";

  /* `import()` resolve URLs relativos ao MÓDULO que os contém — este arquivo
     vive em assets/js/, então "./pkg/th06.js" apontaria para
     assets/js/pkg/th06.js. A URL do módulo wasm é derivada do próprio
     game.js, o que funciona tanto num site na raiz do domínio
     (usuario.github.io/REPO/) quanto num subpath. */
  var SCRIPT_SRC = document.currentScript ? document.currentScript.src : null;

  function wasmModuleUrl() {
    if (SCRIPT_SRC) return new URL("../../pkg/th06.js", SCRIPT_SRC).href;
    return new URL("pkg/th06.js", window.location.href).href;
  }

  /* Os arquivos obrigatorios. O patch ingles (th06e_*) e o preferido: e o
   mesmo jogo com o texto traduzido, e os nomes dos arquivos dentro do
   arquivo sao os mesmos. Uma pasta so com os .DAT originais tambem vale. */
var REQUIRED = [
  ["th06e_TL.DAT", "TL.DAT"],
  ["th06e_CM.DAT", "CM.DAT"],
  ["th06e_ST.DAT", "ST.DAT"],
  ["th06e_IN.DAT", "IN.DAT"]
];

/* Quais grupos obrigatorios nao tem nenhum arquivo no mapa. */
function missingRequired(map) {
  var missing = [];
  REQUIRED.forEach(function (group) {
    var found = group.some(function (n) { return n in map; });
    if (!found) missing.push(group[0]);
  });
  return missing;
}

/* O espelho tem os .DAT do patch ingles (e os originais, como reserva). */
var DEFAULT_MIRROR_FILES = [
  "th06e_TL.DAT", "th06e_CM.DAT", "th06e_ST.DAT", "th06e_IN.DAT",
  "TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT"
].concat([
  "bgm/th06_01.ogg", "bgm/th06_02.ogg", "bgm/th06_03.ogg",
  "bgm/th06_04.ogg", "bgm/th06_05.ogg", "bgm/th06_06.ogg",
  "bgm/th06_07.ogg", "bgm/th06_08.ogg", "bgm/th06_09.ogg",
  "bgm/th06_10.ogg", "bgm/th06_11.ogg", "bgm/th06_12.ogg",
  "bgm/th06_13.ogg", "bgm/th06_14.ogg", "bgm/th06_15.ogg",
  "bgm/th06_16.ogg", "bgm/th06_17.ogg"
  ]);

  /* Arquivos que o espelho deve expor (caminhos relativos à URL base). */
  

  var CONFIG = {
    dataMirror: {
      enabled: true,
      url: "",
      format: "files",   // "files" (um por arquivo) | "zip" (um .zip só)
      method: "GET",
      headers: {},
      body: "",
      files: DEFAULT_MIRROR_FILES
    },
    portalUrl: "../PortalDosGames/"
  };

  /* ------------------------------------------------------------------ dom */

  function $(id) { return document.getElementById(id); }

  var el = {
    drop: $("dropzone"),
    input: $("folderInput"),
    pickBtn: $("pickBtn"),
    hostBtn: $("hostBtn"),
    progress: $("progress"),
    progressFill: $("progressFill"),
    progressLabel: $("progressLabel"),
    status: $("status"),
    fileList: $("fileList"),
    fsBtn: $("fsBtn"),
    reqList: $("reqList"),
    touchBtn: $("touchBtn"),
    touchFloatBtn: $("touchBtnFloat")
  };

  /* --------------------------------------------------------- modo touch */

  /* Os controles na tela (os botoes virtuais nas tarjas pretas) sao uteis
     no celular, mas no PC so atrapalham o teclado. O botao liga e desliga
     eles, e a escolha fica guardada no navegador. */
  var TOUCH_KEY = "th06-touch-mode";

  function defaultTouchMode() {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        return true;
      }
    } catch (e) { /* sem matchMedia: cai no teste da largura */ }
    return window.innerWidth < 900;
  }

  var touchEnabled = (function () {
    try {
      var saved = localStorage.getItem(TOUCH_KEY);
      if (saved === "on") return true;
      if (saved === "off") return false;
    } catch (e) { /* sem localStorage */ }
    return defaultTouchMode();
  })();

  /* Liga/desliga os controles na tela, no motor e no botao. */
  function applyTouchMode() {
    var label = touchEnabled ? "ligado" : "desligado";

    if (el.touchBtn) {
      el.touchBtn.textContent = "📱 Modo touch: " + label;
      el.touchBtn.setAttribute("aria-pressed", touchEnabled ? "true" : "false");
      el.touchBtn.classList.toggle("is-on", touchEnabled);
    }
    if (el.touchFloatBtn) {
      el.touchFloatBtn.textContent = touchEnabled ? "📱 TOUCH: on" : "📱 TOUCH: off";
      el.touchFloatBtn.setAttribute("aria-pressed", touchEnabled ? "true" : "false");
      el.touchFloatBtn.classList.toggle("is-on", touchEnabled);
    }

    var mod = window.__th06Module;
    if (mod && typeof mod._th06_set_touch === "function") {
      mod._th06_set_touch(touchEnabled ? 1 : 0);
    }
  }

  function toggleTouchMode() {
    touchEnabled = !touchEnabled;
    try {
      localStorage.setItem(TOUCH_KEY, touchEnabled ? "on" : "off");
    } catch (e) { /* sem localStorage */ }
    applyTouchMode();
  }

  /* ---------------------------------------------------------------- utils */

  function setStatus(msg, kind) {
    if (!el.status) return;
    el.status.textContent = msg || "";
    el.status.className = "status" + (kind ? " status--" + kind : "");
  }

  function setProgress(pct, label) {
    if (!el.progress) return;
    el.progress.classList.add("is-visible");
    el.progressFill.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (label) el.progressLabel.textContent = label;
  }

  function hideProgress() {
    if (el.progress) el.progress.classList.remove("is-visible");
  }

  function showFiles(map) {
    if (!el.fileList) return;
    var names = Object.keys(map).sort();
    var html = "";
    names.forEach(function (n) {
      var known = REQUIRED.some(function (g) { return g.indexOf(n) !== -1; });
      var missing = !known && !/\.wav$/.test(n) && !/\.ogg$/.test(n) && n !== "__tag";
      html += "<li" + (missing ? ' class="is-missing"' : "") + ">" +
              escapeHtml(n) + "</li>";
    });
    el.fileList.innerHTML =
      '<p class="filelist__title">Arquivos encontrados (' + names.length + ")</p><ul>" + html + "</ul>";
    el.fileList.classList.add("is-visible");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function busy(on) {
    if (el.pickBtn) el.pickBtn.disabled = on;
    if (el.hostBtn) el.hostBtn.disabled = on;
  }

  function basename(path) {
    var parts = String(path).split(/[\\/]/);
    return parts[parts.length - 1];
  }

  /* -------------------------------------------------------------- config */

  /* Editar JSON no Bloco de Notas / VS Code no Windows pode gravar um BOM
     UTF-8, que Response.json() não aceita. Tiramos o BOM antes do parse. */
  function parseJson(text) {
    if (text && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    return JSON.parse(text);
  }

  function loadConfig() {
    /* Override pela URL, para testar sem editar o site-config.json:
         index.html?mirror=https://exemplo.com          -> troca a URL
         index.html?mirror=...&format=zip                -> forca o modo zip
       O override tem prioridade sobre o valor do config. */
    var override = new URLSearchParams(window.location.search).get("mirror");
    var formatOverride = new URLSearchParams(window.location.search).get("format");
    if (override) CONFIG.dataMirror.url = override.replace(/\/+$/, "");
    if (formatOverride) CONFIG.dataMirror.format = formatOverride;

    if (!window.fetch) return Promise.resolve();
    return fetch("site-config.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt) return;
        var cfg = parseJson(txt);
        if (cfg.dataMirror) {
          CONFIG.dataMirror.enabled = cfg.dataMirror.enabled !== false;
          if (cfg.dataMirror.url && !override) {
            CONFIG.dataMirror.url = cfg.dataMirror.url.replace(/\/+$/, "");
          }
          if (cfg.dataMirror.format) {
            CONFIG.dataMirror.format = cfg.dataMirror.format;
          }
          if (cfg.dataMirror.method) CONFIG.dataMirror.method = cfg.dataMirror.method;
          if (cfg.dataMirror.headers) CONFIG.dataMirror.headers = cfg.dataMirror.headers;
          if (cfg.dataMirror.body) CONFIG.dataMirror.body = cfg.dataMirror.body;
          if (Array.isArray(cfg.dataMirror.files) && cfg.dataMirror.files.length) {
            CONFIG.dataMirror.files = cfg.dataMirror.files;
          }
        }
        if (cfg.portalUrl) CONFIG.portalUrl = cfg.portalUrl;
        applyConfigToDom(cfg);
      })
      .catch(function () { /* sem config: usa os defaults */ });
  }

  function applyConfigToDom(cfg) {
    $$all("[data-config]").forEach(function (node) {
      var path = node.getAttribute("data-config").split(".");
      var val = cfg;
      for (var i = 0; i < path.length && val; i++) val = val[path[i]];
      if (val === undefined || val === null || val === "") return;
      var attr = node.getAttribute("data-config-attr");
      if (attr) node.setAttribute(attr, val);
      else node.textContent = val;
    });
  }

  function $$all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ------------------------------------------------------- IndexedDB cache */

  var IDB_NAME = "th06-files", IDB_STORE = "files", IDB_VERSION = 1, CACHE_TAG = "v2";

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbSave(map) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        var store = tx.objectStore(IDB_STORE);
        store.clear();
        store.put(CACHE_TAG, "__tag");
        Object.keys(map).forEach(function (name) { store.put(map[name], name); });
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function idbLoad() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, "readonly");
        var store = tx.objectStore(IDB_STORE);
        var keysReq = store.getAllKeys(), valsReq = store.getAll();
        tx.oncomplete = function () {
          var out = {};
          keysReq.result.forEach(function (k, i) { out[k] = valsReq.result[i]; });
          db.close();
          if (!out.__tag || out.__tag !== CACHE_TAG) { resolve(null); return; }
          delete out.__tag;
          /* só retoma com um conjunto completo */
          if (missingRequired(out).length) { resolve(null); return; }
          resolve(out);
        };
        tx.onerror = function () { db.close(); resolve(null); };
      });
    }).catch(function () { return null; });
  }

  function idbClear() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); resolve(); };
      });
    }).catch(function () { });
  }

  /* ------------------------------------------------------------- importar */

  function importModule() {
    return import(wasmModuleUrl());
  }

  /* wasm-pack (--target web) exporta a função de inicialização como
     export *default*; versões mais novas também expõem `init` nomeado.
     Aceitamos as duas formas. */
  function initModule(mod) {
    var init = typeof mod.init === "function" ? mod.init : mod.default;
    if (typeof init !== "function") {
      throw new Error("módulo wasm sem função de inicialização");
    }
    return init();
  }

  /* O canvas do jogo. O SDL2 do Emscripten usa o elemento com o id
     "canvas" (estao fixo no SDL), entao e esse que a gente cria. */
  function ensureCanvas() {
    var canvas = document.getElementById("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "canvas";
      canvas.width = 1024;
      canvas.height = 576;
      canvas.tabIndex = 0;
      document.body.appendChild(canvas);
    }
    return canvas;
  }

  /* O motor e o do APK: o mesmo C++, compilado para WebAssembly. Os
     arquivos do jogo (os .DAT do patch ingles e o BGM em Ogg) vao para o
     sistema de arquivos virtual do Emscripten, e o jogo roda em cima
     deles. */
  function startGame(map) {
    setStatus("Carregando o motor…");
    busy(true);
    var canvas = ensureCanvas();
    return importModule()
      .then(function (mod) {
        var factory = mod.default || mod;
        return factory({
          canvas: canvas,
          /* O Emscripten procura o wasm com o nome cru (th06.wasm); o site
             usa o nome com o sufixo _bg, que e o do wasm-pack. */
          locateFile: function (path) {
            return wasmModuleUrl().replace(/[^/]+$/, "th06_bg.wasm");
          },
          print: function (t) { console.log("[th06] " + t); },
          printErr: function (t) { console.error("[th06] " + t); }
        });
      })
      .then(function (Module) {
        /* Deixa o modulo a mao, para o console (e os testes) poderem
           chamar as funcoes exportadas do motor. */
        window.__th06Module = Module;
        /* Liga (ou desliga) os controles na tela, conforme o botao. */
        applyTouchMode();
        /* A fonte: o motor procura "NotoSans-Regular.ttf" na pasta de
           trabalho, e sem ela nenhum texto do jogo aparece. */
        return fetch("assets/NotoSans-Regular.ttf")
          .then(function (r) { return r.arrayBuffer(); })
          .then(function (buf) {
            Module.FS.writeFile("/NotoSans-Regular.ttf", new Uint8Array(buf));
          })
          .catch(function (e) {
            console.warn("[th06] nao consegui pegar a fonte: " + e);
          })
          .then(function () { return Module; });
      })
      .then(function (Module) {
        Object.keys(map).forEach(function (name) {
          var path = "/" + name.replace(/^\/+/, "");
          /* As faixas de musica ficam na pasta bgm/, onde o jogo procura
             (o .ogg ePreferred; o .wav e o reserva). */
          if (/^th06_\d+\.(ogg|wav|mp3)$/i.test(name)) {
            path = "/bgm/" + name;
          }
          var dir = path.substring(0, path.lastIndexOf("/"));
          if (dir && dir !== "/") {
            try { Module.FS.mkdirTree(dir); } catch (e) { /* ja existe */ }
          }
          Module.FS.writeFile(path, map[name]);
        });
        /* O Emscripten exporta o simbolo com o underscore delante
           (Module["_th06_start"]); o nome exato depende da versao, entao
           a gente aceita os dois. */
        var start = Module["_th06_start"] || Module["th06_start"];
        if (typeof start !== "function") {
          throw new Error("o motor nao exportou th06_start");
        }
        start();
        return Module;
      })
      .then(function () {
        document.body.classList.add("playing");
        canvas.addEventListener("dblclick", toggleFullscreen);
        canvas.focus();
        /* O botao do modo touch continua na tela durante o jogo, para
           poder ligar e desligar os controles na hora. */
        if (el.touchFloatBtn) el.touchFloatBtn.hidden = false;
        setStatus("");
        hideProgress();
        busy(false);
      })
      .catch(function (err) {
        console.error(err);
        setStatus("Falha ao iniciar: " + err, "error");
        busy(false);
        hideProgress();
      });
  }

  /* ------------------------------------------------- 1. upload local (BYOF) */

  function filesFromInput(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return Promise.resolve(null);

    setStatus("Lendo os arquivos do seu PC…");
    setProgress(2, "Lendo…");

    var map = {};
    var total = files.length;
    var done = 0;

    return files.reduce(function (chain, f) {
      return chain.then(function () {
        return f.arrayBuffer().then(function (buf) {
          map[f.name] = new Uint8Array(buf);
          done++;
          setProgress(4 + (done / total) * 60, "Lendo " + done + "/" + total + "…");
        });
      });
    }, Promise.resolve()).then(function () {
      var missing = missingRequired(map);
      if (missing.length) {
        throw new Error("Faltam os arquivos: " + missing.join(", ") +
                        ". Selecione a pasta do jogo (a que contém TL.DAT, CM.DAT, ST.DAT, IN.DAT e th06e_ST.DAT).");
      }
      showFiles(map);
      setStatus("Salvando no navegador…");
      setProgress(70, "Salvando…");
      return idbSave(map).catch(function () { /* cota cheia: seguimos sem cache */ })
        .then(function () {
          setProgress(100, "Pronto");
          return map;
        });
    });
  }

  /* ----------------------------------------------- 2. carregar do espelho

     Dois modos:

     "files" (padrão) — cada arquivo é buscado em <url>/<caminho>.
                         Ex.: url = "https://user.github.io/th06-data"

     "zip"            — <url> devolve UM .zip com tudo dentro; descompactamos
                         no navegador. É o formato da API do Dropbox
                         (/2/files/download_zip) e de qualquer host que sirva
                         um zip. Pode mandar cabeçalhos (Authorization) e corpo.
   */

  function loadFromMirror() {
    var m = CONFIG.dataMirror;
    if (!m.url) {
      return Promise.reject(new Error("nenhum espelho configurado"));
    }

    if (m.format === "zip") return loadFromMirrorZip(m);
    return loadFromMirrorFiles(m);
  }

  function loadFromMirrorFiles(m) {
    var files = m.files;
    setStatus("Baixando do espelho…");
    setProgress(1, "Baixando…");

    var map = {};
    var done = 0;

    return files.reduce(function (chain, path) {
      return chain.then(function () {
        return fetch(m.url + "/" + path)
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status + " em " + path);
            return r.arrayBuffer();
          })
          .then(function (buf) {
            map[basename(path)] = new Uint8Array(buf);
            done++;
            setProgress((done / files.length) * 90, "Baixando " + done + "/" + files.length + "…");
          });
      });
    }, Promise.resolve()).then(function () {
      var missing = missingRequired(map);
      if (missing.length) throw new Error("O espelho não tem os arquivos obrigatórios.");
      showFiles(map);
      setProgress(96, "Salvando…");
      /* Guarda localmente também: na próxima visita é só "Continuar". */
      return idbSave(map)
        .catch(function () { /* cota cheia: seguimos sem cache */ })
        .then(function () {
          setProgress(100, "Pronto");
          return map;
        });
    });
  }

  function loadFromMirrorZip(m) {
    setStatus("Baixando o espelho…");
    setProgress(5, "Baixando…");

    var opts = { method: m.method || "GET", headers: m.headers || {} };
    if (m.body) opts.body = m.body;

    return fetch(m.url, opts)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then(function (buf) {
        setProgress(55, "Descompactando…");
        if (!window.Zip) throw new Error("assets/js/zip.js não foi carregado");
        return window.Zip.unzip(buf, { files: m.files });
      })
      .then(function (entries) {
        /* a chave precisa ser o nome do arquivo, não o caminho dentro do zip */
        var map = {};
        entries.forEach(function (bytes, path) { map[basename(path)] = bytes; });

        var missing = missingRequired(map);
        if (missing.length) {
          throw new Error("O zip não tem: " + missing.join(", ") +
                          ". conferir o caminho da pasta dentro do zip.");
        }
        showFiles(map);
        setProgress(96, "Salvando…");
        return idbSave(map)
          .catch(function () { /* cota cheia: seguimos sem cache */ })
          .then(function () {
            setProgress(100, "Pronto");
            return map;
          });
      });
  }

  /* -------------------------------------------------------- fullscreen */

  function toggleFullscreen() {
    var canvas = document.getElementById("canvas");
    if (!canvas) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      canvas.requestFullscreen().catch(function (e) { console.warn("fullscreen:", e); });
    }
  }

  /* ------------------------------------------------------ requisitos */

  function renderRequirements() {
    if (!el.reqList) return;
    var checks = [
      { ok: typeof WebAssembly === "object", label: "WebAssembly" },
      { ok: !!document.createElement("canvas").getContext("webgl2"), label: "WebGL2" },
      { ok: !!window.indexedDB, label: "IndexedDB (cache local)" },
      { ok: !!(window.AudioContext || window.webkitAudioContext), label: "Web Audio" }
    ];
    el.reqList.innerHTML = checks.map(function (c) {
      return '<div class="requirement"><span class="' + (c.ok ? "requirement__ok" : "requirement__no") + '">' +
             (c.ok ? "✔" : "✖") + '</span><span>' + c.label + "</span></div>";
    }).join("");
  }

  /* ------------------------------------------------------------- init */

  function init() {
    renderRequirements();
    applyTouchMode();

    /* Os botoes do modo touch (o do launcher e o que fica por cima do
       jogo). */
    if (el.touchBtn) el.touchBtn.addEventListener("click", toggleTouchMode);
    if (el.touchFloatBtn) el.touchFloatBtn.addEventListener("click", toggleTouchMode);

    /* Teste automatico: ?autotest=1 carrega do espelho e comeca o jogo,
       sem precisar de clicar. */
    if (new URLSearchParams(window.location.search).has("autotest")) {
      setTimeout(function () {
        var b = document.getElementById("hostBtn");
        if (b) b.click();
      }, 300);
    }

    /* botão "selecionar pasta" */
    if (el.pickBtn && el.input) {
      el.pickBtn.addEventListener("click", function () { el.input.click(); });
      el.input.addEventListener("change", function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        filesFromInput(files)
          .then(function (map) { if (map) return startGame(map); })
          .catch(function (err) {
            console.error(err);
            setStatus(err.message || String(err), "error");
            hideProgress();
            busy(false);
          });
      });
    }

    /* arrastar e soltar a pasta em cima da área */
    if (el.drop) {
      ["dragenter", "dragover"].forEach(function (ev) {
        el.drop.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          el.drop.classList.add("is-over");
        });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        el.drop.addEventListener(ev, function (e) {
          e.preventDefault(); e.stopPropagation();
          if (ev === "dragleave" && el.drop.contains(e.relatedTarget)) return;
          el.drop.classList.remove("is-over");
        });
      });
      el.drop.addEventListener("drop", function (e) {
        var dt = e.dataTransfer;
        if (!dt) return;
        var files = dt.files;
        if (!files || !files.length) {
          setStatus("Solte a pasta do jogo (com TL.DAT, CM.DAT, ST.DAT, IN.DAT e th06e_ST.DAT).", "error");
          return;
        }
        filesFromInput(files)
          .then(function (map) { if (map) return startGame(map); })
          .catch(function (err) {
            console.error(err);
            setStatus(err.message || String(err), "error");
            hideProgress();
            busy(false);
          });
      });
    }

    /* botão "carregar do espelho" */
    if (el.hostBtn) {
      el.hostBtn.addEventListener("click", function () {
        if (!CONFIG.dataMirror.url) {
          setStatus("Nenhum espelho configurado. Edite dataMirror.url em site-config.json, ou use “Selecionar pasta do jogo”.", "error");
          return;
        }
        loadFromMirror()
          .then(function (map) { if (map) return startGame(map); })
          .catch(function (err) {
            console.error(err);
            setStatus("Não consegui baixar do espelho (" + CONFIG.dataMirror.url + "): " +
                      (err.message || err) +
                      " — se o espelho não existir, use “Selecionar pasta do jogo”.", "error");
            hideProgress();
            busy(false);
          });
      });
    }

    /* fullscreen */
    if (el.fsBtn) el.fsBtn.addEventListener("click", toggleFullscreen);
    window.addEventListener("keydown", function (e) {
      if (document.body.classList.contains("playing") && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        toggleFullscreen();
      }
    }, true);

    /* cache salvo: mostra o botão de continuar */
    loadConfig().then(function () {
      if (el.hostBtn && !CONFIG.dataMirror.url) {
        el.hostBtn.hidden = true;
      }
      return idbLoad();
    }).then(function (saved) {
      if (!saved) return;
      var btn = $("resumeBtn");
      if (!btn) return;
      btn.hidden = false;
      btn.addEventListener("click", function () {
        startGame(saved);
      });
      var clear = $("clearCacheBtn");
      if (clear) {
        clear.hidden = false;
        clear.addEventListener("click", function () {
          idbClear().then(function () {
            btn.hidden = true;
            clear.hidden = true;
            setStatus("Cache local apagado.");
          });
        });
      }
      setStatus("Arquivos do jogo já estão salvos neste navegador — é só clicar em Continuar.");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
