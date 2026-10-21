/* ==========================================================================
   zip.js — leitor de ZIP mínimo, para espelhos que entregam um .zip
   (é o caso do Dropbox: a API /2/files/download_zip devolve um ZIP, e
   compartilhar uma pasta e baixar pelo navegador também).

   Só precisa de STORE (method 0) e DEFLATE (method 8). A descompressão usa
   DecompressionStream('deflate-raw'), que existe no Chrome 103+, Firefox 113+
   e Safari 16.4+.

   A API:
     unzip(buffer, { files })  ->  Promise<Map<string, Uint8Array>>

       files: array de caminhos que você quer, ex.:
                ["TL.DAT", "bgm/th06_01.wav"]

       Cada entrada do ZIP é casada pelo FIM do caminho (entrada "TH06
       Preservation/kouma/bgm/th06_01.wav" casa com "bgm/th06_01.wav"), e a
       chave do resultado é o caminho pedido — não o do ZIP. Assim funciona
       com qualquer hierarquia de pastas dentro do zip.
   ========================================================================== */

(function (global) {
  "use strict";

  var EOCD_SIG = 0x06054b50;
  var CEN_SIG = 0x02014b50;
  var LOC_SIG = 0x04034b50;

  function u16(dv, off) { return dv.getUint16(off, true); }
  function u32(dv, off) { return dv.getUint32(off, true); }

  /* acha o End Of Central Directory (o ZIP pode ter um comentario no fim) */
  function findEocd(dv) {
    var min = Math.max(0, dv.byteLength - 0xffff - 22);
    for (var i = dv.byteLength - 22; i >= min; i--) {
      if (u32(dv, i) === EOCD_SIG) return i;
    }
    throw new Error("ZIP invalido: EOCD nao encontrado");
  }

  function readCentralDirectory(dv) {
    var eocd = findEocd(dv);
    var count = u16(dv, eocd + 10);
    var offset = u32(dv, eocd + 16);
    var entries = [];
    var p = offset;

    for (var i = 0; i < count; i++) {
      if (p + 46 > dv.byteLength || u32(dv, p) !== CEN_SIG) break;

      var method = u16(dv, p + 10);
      var compSize = u32(dv, p + 20);
      var nameLen = u16(dv, p + 28);
      var extraLen = u16(dv, p + 30);
      var commentLen = u16(dv, p + 32);
      var localOff = u32(dv, p + 42);
      var name = new TextDecoder("utf-8").decode(
        new Uint8Array(dv.buffer, dv.byteOffset + p + 46, nameLen));

      entries.push({
        name: name,
        method: method,
        compSize: compSize,
        localOff: localOff
      });

      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  /* os bytes crus (ainda comprimidos) de uma entrada */
  function readLocal(dv, entry) {
    var p = entry.localOff;
    if (u32(dv, p) !== LOC_SIG) {
      throw new Error("ZIP invalido: cabecalho local ausente em " + entry.name);
    }
    var nameLen = u16(dv, p + 26);
    var extraLen = u16(dv, p + 28);
    var start = p + 30 + nameLen + extraLen;
    return new Uint8Array(dv.buffer, dv.byteOffset + start, entry.compSize);
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("este navegador nao tem DecompressionStream (Chrome 103+, Firefox 113+, Safari 16.4+)");
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    var buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  /* o caminho da entrada termina com o que a gente procura? */
  function matches(entryName, wanted) {
    if (entryName === wanted) return true;
    return entryName.length > wanted.length &&
           entryName.charAt(entryName.length - wanted.length - 1) === "/" &&
           entryName.slice(entryName.length - wanted.length) === wanted;
  }

  /**
   * @param {ArrayBuffer} buffer
   * @param {object} opts
   *   files: array de caminhos queridos (ex.: ["TL.DAT", "bgm/th06_01.wav"])
   * @returns {Promise<Map<string, Uint8Array>>} chave = caminho pedido
   */
  async function unzip(buffer, opts) {
    opts = opts || {};
    var wanted = (opts.files || []).map(function (w) { return String(w).replace(/^\/+/, ""); });
    var dv = new DataView(buffer);
    var entries = readCentralDirectory(dv);
    var out = new Map();

    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.name.charAt(e.name.length - 1) === "/") continue; // diretorio

      /* acha qual caminho pedido esta entrada satisfazendo */
      var key = null;
      for (var w = 0; w < wanted.length; w++) {
        if (matches(e.name, wanted[w])) { key = wanted[w]; break; }
      }
      if (key === null) continue;
      if (out.has(key)) continue;

      var raw = readLocal(dv, e);
      var bytes;
      if (e.method === 0) {
        bytes = raw.slice(); // STORE
      } else if (e.method === 8) {
        bytes = await inflateRaw(raw);
      } else {
        continue; // metodo de compressao desconhecido: pula
      }
      out.set(key, bytes);
    }
    return out;
  }

  global.Zip = { unzip: unzip };
})(typeof window !== "undefined" ? window : this);
