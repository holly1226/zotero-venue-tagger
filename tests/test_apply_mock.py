import importlib.util
import json
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("tagger_apply", ROOT / "scripts" / "zotero_venue_tagger.py")
tagger = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tagger)


class MockZoteroHandler(BaseHTTPRequestHandler):
    writes = []

    def log_message(self, *args):
        return

    def _send(self, status, payload, content_type="application/json"):
        raw = payload.encode("utf-8") if isinstance(payload, str) else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Zotero-API-Version", "3")
        self.send_header("Zotero-Server-ID", "mock-server")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/api/":
            self._send(200, "Nothing to see here.", "text/plain")
            return
        if self.path == "/api/users/0/items/ITEM0001":
            self._send(
                200,
                {
                    "data": {
                        "key": "ITEM0001",
                        "version": 7,
                        "itemType": "conferencePaper",
                        "title": "A paper",
                        "tags": [{"tag": "reading"}],
                    }
                },
            )
            return
        self._send(404, {"error": "not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        if self.path == "/api/local/authorize":
            self.assert_header("Zotero-Server-ID", "mock-server")
            self._send(200, {"key": "local-write-key", "remember": False})
            return
        if self.path == "/api/users/0/items":
            self.assert_header("Zotero-Server-ID", "mock-server")
            self.assert_header("Zotero-API-Key", "local-write-key")
            type(self).writes.append(body)
            self._send(200, {"successful": {"0": body[0]}, "unchanged": {}, "failed": {}})
            return
        self._send(404, {"error": "not found"})

    def assert_header(self, name, expected):
        actual = self.headers.get(name)
        if actual != expected:
            raise AssertionError("{}: {!r} != {!r}".format(name, actual, expected))


class ApplyPipelineTests(unittest.TestCase):
    def setUp(self):
        MockZoteroHandler.writes = []
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), MockZoteroHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def test_apply_authorizes_checks_version_and_preserves_tags(self):
        document = {
            "schema_version": 1,
            "server_id": "mock-server",
            "items": [
                {
                    "key": "ITEM0001",
                    "version": 7,
                    "add_tags": ["CHI", "浙大-A", "CCF-A"],
                }
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            plan = Path(tmp) / "plan.json"
            plan.write_text(json.dumps(document, ensure_ascii=False), encoding="utf-8")
            args = SimpleNamespace(
                plan=str(plan),
                yes=True,
                base_url="http://127.0.0.1:{}/api".format(self.server.server_port),
            )
            tagger.command_apply(args)

        self.assertEqual(len(MockZoteroHandler.writes), 1)
        update = MockZoteroHandler.writes[0][0]
        self.assertEqual(update["key"], "ITEM0001")
        self.assertEqual(update["version"], 7)
        self.assertEqual(
            [row["tag"] for row in update["tags"]],
            ["reading", "CHI", "浙大-A", "CCF-A"],
        )


if __name__ == "__main__":
    unittest.main()
