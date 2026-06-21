"""
Transparent HTTP proxy for Ollama.

Routes third-party app traffic from port 11435 → 11434, intercepts
token counts from the final streaming chunk (done=true) or buffered
non-streaming response, and appends a JSONL record to ~/.trace/ollama_proxy.jsonl
for the watcher to ingest.
"""
import http.server
import http.client
import json
import socket
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import OLLAMA_PROXY_PORT

_OLLAMA_HOST = "localhost"
_OLLAMA_PORT = 11434
_LOG_PATH = Path.home() / ".trace" / "ollama_proxy.jsonl"

_server: Optional[http.server.HTTPServer] = None
_requests_logged: int = 0
_running: bool = False


def get_proxy_status() -> dict:
    return {
        "running": _running,
        "port": OLLAMA_PROXY_PORT,
        "requests_logged": _requests_logged,
    }


def _append_record(model: str, prompt_tokens: int, completion_tokens: int, latency_ms: int):
    global _requests_logged
    _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "session_id": f"proxy-{uuid.uuid4().hex[:12]}",
        "model": model,
        "timestamp": datetime.utcnow().isoformat(),
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        },
        "latency_ms": latency_ms,
    }
    with _LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    _requests_logged += 1


class _OllamaProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # silence default access log

    def _forward(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""

        # Parse request body to detect streaming preference and model name
        req_model = "unknown"
        is_streaming = True  # Ollama defaults to streaming
        if body:
            try:
                req_json = json.loads(body)
                req_model = req_json.get("model", "unknown")
                if "stream" in req_json:
                    is_streaming = req_json["stream"]
            except Exception:
                pass

        start_ms = _now_ms()

        conn = http.client.HTTPConnection(_OLLAMA_HOST, _OLLAMA_PORT, timeout=120)
        try:
            headers = {k: v for k, v in self.headers.items()
                       if k.lower() not in ("host", "transfer-encoding")}
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()

            self.send_response(resp.status)
            for name, value in resp.getheaders():
                if name.lower() not in ("transfer-encoding", "content-length"):
                    self.send_header(name, value)
            self.end_headers()

            if is_streaming:
                # Forward chunks; watch for the final done=true object
                prompt_tokens = 0
                completion_tokens = 0
                while True:
                    chunk = resp.readline()
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    try:
                        obj = json.loads(chunk.decode("utf-8", errors="ignore"))
                        if obj.get("done"):
                            req_model = obj.get("model", req_model)
                            prompt_tokens = obj.get("prompt_eval_count", 0)
                            completion_tokens = obj.get("eval_count", 0)
                    except Exception:
                        pass
                if prompt_tokens or completion_tokens:
                    _append_record(req_model, prompt_tokens, completion_tokens, _now_ms() - start_ms)
            else:
                data = resp.read()
                self.wfile.write(data)
                try:
                    obj = json.loads(data.decode("utf-8", errors="ignore"))
                    pt = obj.get("prompt_eval_count", 0)
                    ct = obj.get("eval_count", 0)
                    model = obj.get("model", req_model)
                    if pt or ct:
                        _append_record(model, pt, ct, _now_ms() - start_ms)
                except Exception:
                    pass
        except Exception as e:
            print(f"[OllamaProxy] Forward error: {e}")
        finally:
            conn.close()

    do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = do_HEAD = do_OPTIONS = _forward


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)


def start_ollama_proxy():
    global _server, _running
    # Check port availability before binding
    test = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        test.bind(("", OLLAMA_PROXY_PORT))
    except OSError:
        print(f"[OllamaProxy] Port {OLLAMA_PROXY_PORT} already in use — proxy not started")
        return
    finally:
        test.close()

    try:
        _server = http.server.HTTPServer(("", OLLAMA_PROXY_PORT), _OllamaProxyHandler)
        _running = True
        t = threading.Thread(target=_server.serve_forever, daemon=True)
        t.start()
        print(f"[OllamaProxy] Started on port {OLLAMA_PROXY_PORT}")
    except Exception as e:
        print(f"[OllamaProxy] Failed to start: {e}")
        _running = False


def stop_ollama_proxy():
    global _server, _running
    if _server:
        _server.shutdown()
        _server = None
    _running = False
    print("[OllamaProxy] Stopped")
