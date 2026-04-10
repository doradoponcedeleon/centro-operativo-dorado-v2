#!/data/data/com.termux/files/usr/bin/python3
import json
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            u = urlparse(self.path)
            if u.path != '/load':
                self.send_response(404)
                self.end_headers()
                return
            qs = parse_qs(u.query)
            path = qs.get('path', [''])[0]
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            body = json.dumps(data).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

if __name__ == '__main__':
    print('Local bridge en http://127.0.0.1:8091')
    HTTPServer(('127.0.0.1', 8091), Handler).serve_forever()
