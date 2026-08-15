#!/usr/bin/env python3
import http.server
import socketserver
import mimetypes
import os

# MIME type 설정 강화
mimetypes.init()
mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('application/json', '.json')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/x-icon', '.ico')
mimetypes.add_type('text/html', '.html')

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Service Worker 관련 헤더 추가
        if self.path.endswith('.js'):
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Content-Type', 'text/javascript; charset=utf-8')
        super().end_headers()

    def guess_type(self, path):
        """파일 확장자에 따른 MIME type 추정"""
        mimetype, encoding = mimetypes.guess_type(path)
        if mimetype is None:
            # 기본 설정에 없는 경우 기본값 설정
            if path.endswith('.js'):
                mimetype = 'text/javascript'
            elif path.endswith('.json'):
                mimetype = 'application/json'
            elif path.endswith('.css'):
                mimetype = 'text/css'
            else:
                mimetype = 'application/octet-stream'
        return mimetype, encoding

PORT = 8000

with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
    print(f"서버가 포트 {PORT}에서 실행 중입니다...")
    print(f"Service Worker MIME type 설정이 적용되었습니다.")
    print("종료하려면 Ctrl+C를 누르세요.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n서버가 종료되었습니다.")
        httpd.server_close()
