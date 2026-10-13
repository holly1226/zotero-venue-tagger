#!/usr/bin/env python3
"""Preview and safely apply compact venue/ranking tags to Zotero items."""

from __future__ import print_function

import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path


APP_NAME = "Zotero Venue Tagger"
DEFAULT_BASE_URL = "http://127.0.0.1:23119/api"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RULES = ROOT / "references" / "venue_rules.json"
DEFAULT_OVERRIDES = ROOT / "references" / "track_overrides.json"
NON_FULL_PREFIXES = (
    "EA",
    "Companion",
    "Poster",
    "Workshop",
    "Demo",
    "WiP",
    "LBW",
    "Doctoral-Consortium",
    "SRC",
)


class TaggerError(RuntimeError):
    pass


def load_json(path):
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def clean_text(value):
    if value is None:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_doi(value):
    text = clean_text(value).lower()
    text = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", text)
    text = re.sub(r"^doi:\s*", "", text)
    return text.strip().rstrip(".")


def item_data(item):
    return item.get("data", item)


def venue_text(data):
    fields = (
        "publicationTitle",
        "proceedingsTitle",
        "conferenceName",
        "series",
        "seriesTitle",
        "bookTitle",
        "pages",
    )
    return " | ".join(clean_text(data.get(field)) for field in fields if data.get(field))


def match_rule(data, rules):
    source = venue_text(data)
    item_type = data.get("itemType", "")
    ordered = sorted(rules["venues"], key=lambda row: row.get("priority", 0), reverse=True)
    for rule in ordered:
        allowed = rule.get("item_types")
        if allowed and item_type not in allowed:
            continue
        all_patterns = rule.get("all_patterns", [])
        if all_patterns and not all(re.search(pattern, source) for pattern in all_patterns):
            continue
        patterns = rule.get("patterns", [])
        if patterns and not any(re.search(pattern, source) for pattern in patterns):
            continue
        if all_patterns or patterns:
            return rule
    return None


def infer_track(data, overrides):
    doi = normalize_doi(data.get("DOI", ""))
    explicit = overrides.get("overrides", {}).get(doi)
    if explicit:
        return explicit, "doi-override"

    source = venue_text(data)
    extra = clean_text(data.get("extra", ""))
    combined = " | ".join((source, extra))
    checks = (
        (r"(?i)late[- ]breaking work|\bLBW\b", "EA-LBW"),
        (r"(?i)works? in progress|\bWiP\b", "Companion-WiP"),
        (r"(?i)doctoral consortium", "Doctoral-Consortium"),
        (r"(?i)student research competition|\bSRC\b", "SRC"),
        (r"(?i)workshop", "Workshop"),
        (r"(?i)interactive demo|demonstration|\bdemo\b", "Demo"),
        (r"(?i)poster", "Poster"),
    )
    for pattern, tag in checks:
        if re.search(pattern, combined):
            if re.search(r"(?i)extended abstracts?|\bEA\s*['’]?\d{2,4}\b", source) and not tag.startswith("EA-"):
                return "EA-" + tag, "metadata"
            if re.search(r"(?i)companion", source) and not tag.startswith("Companion-"):
                return "Companion-" + tag, "metadata"
            return tag, "metadata"

    if re.search(r"(?i)extended abstracts?|\bEA\s*['’]?\d{2,4}\b", source):
        return "EA", "metadata"
    if re.search(r"(?i)companion", source):
        return "Companion", "metadata"
    return None, None


def is_non_full(track):
    return bool(track) and track.startswith(NON_FULL_PREFIXES)


def existing_tags(data):
    result = []
    for entry in data.get("tags", []) or []:
        if isinstance(entry, dict):
            tag = clean_text(entry.get("tag"))
        else:
            tag = clean_text(entry)
        if tag:
            result.append(tag)
    return result


def classify_item(item, rules, overrides, rank_non_full=False):
    data = item_data(item)
    rule = match_rule(data, rules)
    if not rule:
        return None

    track, track_basis = infer_track(data, overrides)
    tags = [rule["acronym"]]
    if track:
        tags.append(track)

    zju = rule.get("zju")
    zju_basis = "direct" if zju else None
    if not zju and rule.get("ccf"):
        zju = rule["ccf"]
        zju_basis = "ccf-fallback"

    if not is_non_full(track) or rank_non_full:
        if zju:
            tags.append("浙大-" + zju)
        if rule.get("ccf"):
            tags.append("CCF-" + rule["ccf"])

    current = existing_tags(data)
    current_set = {tag.casefold() for tag in current}
    add_tags = [tag for tag in tags if tag.casefold() not in current_set]

    warning = None
    if track in ("EA", "Companion"):
        warning = "track subtype not available in Zotero metadata"

    return {
        "key": data.get("key") or item.get("key"),
        "version": data.get("version") or item.get("version"),
        "itemType": data.get("itemType"),
        "title": clean_text(data.get("title")),
        "date": clean_text(data.get("date")),
        "year": extract_year(data.get("date")),
        "doi": normalize_doi(data.get("DOI", "")),
        "venue_id": rule["id"],
        "venue": rule["acronym"],
        "track": track,
        "track_basis": track_basis,
        "zju": zju,
        "zju_basis": zju_basis,
        "ccf": rule.get("ccf"),
        "proposed_tags": tags,
        "existing_tags": current,
        "add_tags": add_tags,
        "warning": warning,
    }


def extract_year(value):
    match = re.search(r"(?:19|20)\d{2}", clean_text(value))
    return match.group(0) if match else ""


class ZoteroLocalClient(object):
    def __init__(self, base_url=DEFAULT_BASE_URL, timeout=20):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def request(self, method, path, payload=None, headers=None):
        url = self.base_url + "/" + path.lstrip("/")
        body = None
        request_headers = {"Accept": "application/json", "Zotero-API-Version": "3"}
        if headers:
            request_headers.update(headers)
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(url, data=body, headers=request_headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
                parsed = None
                if raw:
                    decoded = raw.decode("utf-8")
                    content_type = response.headers.get("Content-Type", "")
                    if "json" in content_type or decoded.lstrip().startswith(("{", "[")):
                        parsed = json.loads(decoded)
                    else:
                        parsed = decoded.strip()
                return parsed, dict(response.headers), response.status
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise TaggerError("Zotero API {} {} failed: {} {}".format(method, path, exc.code, detail))
        except urllib.error.URLError as exc:
            raise TaggerError("Cannot reach Zotero at {}: {}".format(self.base_url, exc.reason))

    def status(self):
        payload, headers, _ = self.request("GET", "/")
        return {
            "ok": True,
            "base_url": self.base_url,
            "server_id": headers.get("Zotero-Server-ID"),
            "api_version": headers.get("Zotero-API-Version"),
            "payload": payload,
        }

    def get_items(self, keys=None):
        if keys:
            result = []
            for key in keys:
                payload, _, _ = self.request("GET", "/users/0/items/{}".format(key))
                result.append(payload)
            return result
        payload, _, _ = self.request("GET", "/users/0/items/top")
        return payload

    def authorize(self, server_id):
        payload, _, _ = self.request(
            "POST",
            "/local/authorize",
            {"appName": APP_NAME},
            {"Zotero-Server-ID": server_id},
        )
        if not payload or not payload.get("key"):
            raise TaggerError("Zotero did not return a local write key")
        return payload["key"]

    def update_items(self, updates, server_id, api_key):
        payload, headers, status = self.request(
            "POST",
            "/users/0/items",
            updates,
            {"Zotero-Server-ID": server_id, "Zotero-API-Key": api_key},
        )
        return payload, headers, status


def build_plan(items, rules, overrides, rank_non_full=False, limit=None):
    rows = []
    for item in items:
        data = item_data(item)
        if data.get("itemType") in ("attachment", "note", "annotation"):
            continue
        row = classify_item(item, rules, overrides, rank_non_full=rank_non_full)
        if row:
            rows.append(row)
            if limit and len(rows) >= limit:
                break
    return rows


def plan_document(rows, server_id, rules):
    return {
        "schema_version": 1,
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "server_id": server_id,
        "rule_set": rules.get("rule_set"),
        "items": rows,
    }


def save_plan(path, document):
    target = Path(path).expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    return target


def shorten(text, width=58):
    if len(text) <= width:
        return text
    return text[: width - 1].rstrip() + "…"


def print_preview(rows):
    if not rows:
        print("No matching venue items found.")
        return
    print("KEY       YEAR  TITLE                                                       ADD TAGS")
    print("--------  ----  ----------------------------------------------------------  ------------------------------")
    for row in rows:
        tags = "  ".join(row["add_tags"]) if row["add_tags"] else "(already tagged)"
        print("{:<8}  {:<4}  {:<58}  {}".format(row["key"] or "", row["year"], shorten(row["title"]), tags))
        if row.get("warning"):
            print("          note: {}".format(row["warning"]))


def command_status(args):
    client = ZoteroLocalClient(args.base_url)
    status = client.status()
    print(json.dumps(status, ensure_ascii=False, indent=2))


def command_preview(args):
    rules = load_json(args.rules)
    overrides = load_json(args.track_overrides)
    client = ZoteroLocalClient(args.base_url)
    status = client.status()
    items = client.get_items(args.item_key)
    rows = build_plan(items, rules, overrides, rank_non_full=args.rank_non_full, limit=args.limit)
    document = plan_document(rows, status.get("server_id"), rules)
    if args.plan_out:
        target = save_plan(args.plan_out, document)
        if not args.json:
            print("Plan saved: {}".format(target))
    if args.json:
        print(json.dumps(document, ensure_ascii=False, indent=2))
    else:
        print_preview(rows)
        changed = sum(bool(row["add_tags"]) for row in rows)
        print("\nMatched: {}  Items with additions: {}  Zotero writes: 0".format(len(rows), changed))


def merge_tag_objects(current, additions):
    merged = []
    seen = set()
    for entry in current or []:
        obj = entry if isinstance(entry, dict) else {"tag": str(entry)}
        tag = clean_text(obj.get("tag"))
        if tag and tag.casefold() not in seen:
            merged.append(obj)
            seen.add(tag.casefold())
    for tag in additions:
        if tag.casefold() not in seen:
            merged.append({"tag": tag})
            seen.add(tag.casefold())
    return merged


def command_apply(args):
    document = load_json(args.plan)
    planned = [row for row in document.get("items", []) if row.get("add_tags")]
    if not planned:
        print("Nothing to apply.")
        return
    if not args.yes:
        if not sys.stdin.isatty():
            raise TaggerError("Refusing non-interactive write without --yes")
        response = input("Type APPLY to add tags to {} Zotero items: ".format(len(planned)))
        if response != "APPLY":
            raise TaggerError("Write cancelled")

    client = ZoteroLocalClient(args.base_url)
    status = client.status()
    server_id = status.get("server_id")
    if document.get("server_id") and document["server_id"] != server_id:
        raise TaggerError("The plan belongs to a different Zotero database; create a new preview")

    updates = []
    for row in planned:
        item = client.get_items([row["key"]])[0]
        data = item_data(item)
        if data.get("version") != row.get("version"):
            raise TaggerError("Item {} changed after preview; create a new plan".format(row["key"]))
        updates.append(
            {
                "key": row["key"],
                "version": data["version"],
                "tags": merge_tag_objects(data.get("tags", []), row["add_tags"]),
            }
        )

    applied = 0
    for offset in range(0, len(updates), 50):
        batch = updates[offset : offset + 50]
        api_key = client.authorize(server_id)
        payload, _, _ = client.update_items(batch, server_id, api_key)
        failures = (payload or {}).get("failed", {})
        if failures:
            raise TaggerError("Zotero rejected part of the batch: {}".format(json.dumps(failures, ensure_ascii=False)))
        applied += len(batch)
    print("Applied tags to {} Zotero items.".format(applied))


def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("ZOTERO_LOCAL_API", DEFAULT_BASE_URL))
    subparsers = parser.add_subparsers(dest="command", required=True)

    status = subparsers.add_parser("status", help="Check the Zotero local API")
    status.set_defaults(func=command_status)

    preview = subparsers.add_parser("preview", help="Preview tags without writing to Zotero")
    preview.add_argument("--rules", default=str(DEFAULT_RULES))
    preview.add_argument("--track-overrides", default=str(DEFAULT_OVERRIDES))
    preview.add_argument("--item-key", action="append", help="Preview one Zotero item key; repeat as needed")
    preview.add_argument("--limit", type=int, help="Maximum matched items to show")
    preview.add_argument("--rank-non-full", action="store_true", help="Also attach rank tags to EA/companion tracks")
    preview.add_argument("--plan-out", help="Save the reviewed plan as JSON")
    preview.add_argument("--json", action="store_true")
    preview.set_defaults(func=command_preview)

    apply_cmd = subparsers.add_parser("apply", help="Apply a previously reviewed plan")
    apply_cmd.add_argument("--plan", required=True)
    apply_cmd.add_argument("--yes", action="store_true", help="Confirm a non-interactive write")
    apply_cmd.set_defaults(func=command_apply)
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.func(args)
    except (TaggerError, OSError, ValueError, json.JSONDecodeError) as exc:
        print("error: {}".format(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
