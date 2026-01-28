#!/usr/bin/env python3
"""Local development server with CSP headers matching vercel.json"""
import http.server
import socketserver

PORT = 8080

class CSPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CSP headers matching vercel.json (with unsafe-eval fix)
        self.send_header('Content-Security-Policy',
            "default-src 'self'; "
            "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net blob:; "
            "style-src 'self'; "
            "font-src 'self'; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' vitals.vercel-insights.com https://cdn.jsdelivr.net https://huggingface.co https://cdn-lfs.hf.co https://cdn-lfs-us-1.hf.co https://cdn-lfs.huggingface.co; "
            "worker-src 'self' blob:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        super().end_headers()

with socketserver.TCPServer(("", PORT), CSPHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
