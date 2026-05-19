#!/usr/bin/env python3
"""Start a local static server on the first available port."""
import http.server
import os
import socket
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFERRED_PORTS = (8080, 3000, 5173, 4000, 8888)


def find_free_port():
    for port in PREFERRED_PORTS:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(("", port))
                return port
        except OSError:
            continue
    for port in range(9000, 9100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                return port
        except OSError:
            continue
    print("Error: no free port found. Stop other dev servers and try again.", file=sys.stderr)
    sys.exit(1)


def main():
    os.chdir(ROOT)
    port = find_free_port()
    handler = http.server.SimpleHTTPRequestHandler
    server = http.server.HTTPServer(("", port), handler)
    print(f"\n  PDF Voice → http://localhost:{port}\n")
    print("  Press Ctrl+C to stop\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
