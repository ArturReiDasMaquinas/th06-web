#!/usr/bin/env python3
"""Servidor local para o site TH06-web.

O `python -m http.server` não serve `.js` como `text/javascript` em toda
instalação do Python, e um módulo ES com o MIME type errado é rejeitado pelo
navegador ("Failed to fetch dynamically imported module"). O GitHub Pages
serve `.js` e `.wasm` corretamente — este script só existe para o
desenvolvimento local.

    python serve.py            # http://127.0.0.1:8080
    python serve.py 9000
"""

import functools
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".json": "application/json",
        ".wasm.map": "application/json",
    }

    def end_headers(self):
        # O motor e os assets mudam entre builds; nunca sirva cache velho.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with Server(("127.0.0.1", PORT), handler) as httpd:
        print(f"Touhou 6 (WASM) em http://127.0.0.1:{PORT}/  — Ctrl+C para sair")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")
