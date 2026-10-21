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

  var REQUIRED = ["TL.DAT", "CM.DAT", "ST.DAT", "IN.DAT", "th06e_ST.DAT"];

  /* Arquivos que o espelho deve expor (caminhos relativos à URL base). */
  var DEFAULT_MIRROR_FILES = REQUIRED.concat([
    "bgm/th06_01.wav", "bgm/th06_02.wav", "bgm/th06_03.wav",
    "bgm/th06_04.wav", "bgm/th06_05.wav", "bgm/th06_06.wav",
    "bgm/th06_07.wav", "bgm/th06_08.wav", "bgm/th06_09.wav",
    "bgm/th06_10.wav", "bgm/th06_11.wav", "bgm/th06_12.wav",
    "bgm/th06_13.wav", "bgm/th06_14.wav", "bgm/th06_15.wav",
    "bgm/th06_16.wav", "bgm/th06_17.wav"
  ]);

  var CONFIG = {
    dataMirror: {
      enabled: true,
      url: "",
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
    reqList: $("reqList")
  };

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
      var missing = REQUIRED.indexOf(n) === -1 && !/\.wav$/.test(n) && n !== "__tag";
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

  function loadConfig() {
    /* Override de espelho pela URL: index.html?mirror=https://exemplo.com
       Útil para testar sem editar o site-config.json. Tem prioridade
       sobre o valor do config. */
    var override = new URLSearchParams(window.location.search).get("mirror");
    if (override) CONFIG.dataMirror.url = override.replace(/\/+$/, "");

    if (!window.fetch) return Promise.resolve();
    return fetch("site-config.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg) return;
        if (cfg.dataMirror) {
          CONFIG.dataMirror.enabled = cfg.dataMirror.enabled !== false;
          if (cfg.dataMirror.url && !override) {
            CONFIG.dataMirror.url = cfg.dataMirror.url.replace(/\/+$/, "");
          }
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
          if (REQUIRED.some(function (n) { return !(n in out); })) { resolve(null); return; }
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

  function startGame(map) {
    setStatus("Carregando o motor…");
    busy(true);
    return importModule()
      .then(function (mod) {
        return initModule(mod).then(function () { return mod.start_game(map); });
      })
      .then(function () {
        document.body.classList.add("playing");
        var canvas = document.getElementById("th06-canvas");
        if (canvas) {
          canvas.addEventListener("dblclick", toggleFullscreen);
          canvas.focus();
        }
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
      var missing = REQUIRED.filter(function (n) { return !(n in map); });
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

  /* ----------------------------------------------- 2. carregar do espelho */

  function loadFromMirror() {
    var base = CONFIG.dataMirror.url;
    if (!base) {
      setStatus("Nenhum espelho configurado em site-config.json.", "error");
      return Promise.resolve(null);
    }

    var files = CONFIG.dataMirror.files;
    setStatus("Baixando do espelho…");
    setProgress(1, "Baixando…");

    var map = {};
    var done = 0;

    return files.reduce(function (chain, path) {
      return chain.then(function () {
        return fetch(base + "/" + path)
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
      var missing = REQUIRED.filter(function (n) { return !(n in map); });
      if (missing.length) throw new Error("O espelho não tem os arquivos obrigatórios.");
      showFiles(map);
      setProgress(100, "Pronto");
      return map;
    });
  }

  /* -------------------------------------------------------- fullscreen */

  function toggleFullscreen() {
    var canvas = document.getElementById("th06-canvas");
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
        loadFromMirror()
          .then(function (map) { if (map) return startGame(map); })
          .catch(function (err) {
            console.error(err);
            setStatus("Falha ao baixar do espelho: " + (err.message || err), "error");
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
