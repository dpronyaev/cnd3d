"""Local dev server for the game: like `python -m http.server 8123`, but tells the browser not to cache files,
so a reload always picks up the latest modules and level data."""
import http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    print(f'http://127.0.0.1:{port}/')
    http.server.ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
