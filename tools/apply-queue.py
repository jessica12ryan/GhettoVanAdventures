#!/usr/bin/env python3
"""Turn social-queue.txt lines into posts.json feed cards.

Usage:
    python3 tools/apply-queue.py

No API keys needed. X post URLs are enriched automatically via the free
single-tweet lookup (text, date, photo thumbnail). Instagram serves nothing
to unauthenticated requests, so IG lines must carry date + title by hand.
The queue is an append-only log: importing is idempotent, re-runs only
write posts.json when a card is new or changed. Run hourly via
.github/workflows/update-posts.yml.
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import feedlib

ROOT = Path(__file__).resolve().parent.parent
POSTS_FILE = ROOT / "posts.json"
QUEUE_FILE = ROOT / "social-queue.txt"

STATUS_RE = re.compile(
    r"(?:x\.com|twitter\.com)/([A-Za-z0-9_]+)/status/(\d+)"
)
IG_RE = re.compile(r"instagram\.com/(?:[A-Za-z0-9_.]+/)?(?:p|reel)/([A-Za-z0-9_-]+)")


def log(msg):
    print(msg)


def lookup_tweet(handle, tweet_id):
    """Free single-tweet lookup, no auth. Returns dict or None."""
    url = f"https://api.vxtwitter.com/{handle}/status/{tweet_id}"
    req = urllib.request.Request(
        url, headers={"User-Agent": "GVA-site-updater", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode("utf-8"))


def clean_text(text):
    text = re.sub(r"https?://\S+", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def small_thumb(url):
    if "pbs.twimg.com/media/" in url and "name=" in url:
        return re.sub(r"name=\w+", "name=small", url)
    return url


def parse_queue():
    entries = []
    if not QUEUE_FILE.exists():
        return entries
    for lineno, raw in enumerate(QUEUE_FILE.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 2:
            log(f"queue line {lineno}: expected 'source | url [| date | title [| excerpt]]' — skipped")
            continue
        source = parts[0].lower()
        if source not in ("x", "instagram"):
            log(f"queue line {lineno}: unknown source '{parts[0]}' — skipped")
            continue
        entries.append({
            "source": source,
            "url": parts[1],
            "date": parts[2] if len(parts) > 2 else "",
            "title": parts[3] if len(parts) > 3 else "",
            "excerpt": parts[4] if len(parts) > 4 else "",
            "lineno": lineno,
        })
    return entries


def build_card(entry):
    if entry["source"] == "x":
        m = STATUS_RE.search(entry["url"])
        if not m:
            log(f"queue line {entry['lineno']}: not an X status URL — skipped")
            return None
        handle, tweet_id = m.groups()
        card = {
            "id": f"x-{tweet_id}",
            "source": "x",
            "title": entry["title"],
            "url": f"https://x.com/{handle}/status/{tweet_id}",
            "date": entry["date"],
            "thumbnail": "",
            "excerpt": entry["excerpt"],
        }
        try:
            data = lookup_tweet(handle, tweet_id)
        except Exception as exc:
            log(f"queue line {entry['lineno']}: lookup failed ({exc}) — using given fields")
            data = None
        if data:
            text = clean_text(data.get("text") or "")
            epoch = data.get("date_epoch")
            if text and not card["title"]:
                card["title"] = text if len(text) <= 120 else text[:120].rstrip() + "…"
            if epoch and not card["date"]:
                from datetime import datetime, timezone
                card["date"] = datetime.fromtimestamp(epoch, timezone.utc).date().isoformat()
            media = data.get("mediaURLs") or []
            if media:
                card["thumbnail"] = small_thumb(media[0])
            if text and not card["excerpt"] and len(text) > 120:
                card["excerpt"] = text
        if not card["title"] or not card["date"]:
            log(f"queue line {entry['lineno']}: unresolvable and missing title/date — skipped")
            return None
        return card

    # instagram: everything by hand
    m = IG_RE.search(entry["url"])
    slug = m.group(1) if m else re.sub(r"\W+", "", entry["url"])[-16:]
    if not entry["date"] or not entry["title"]:
        log(f"queue line {entry['lineno']}: instagram needs date + title — skipped")
        return None
    return {
        "id": f"q-ig-{slug}",
        "source": "instagram",
        "title": entry["title"],
        "url": entry["url"],
        "date": entry["date"],
        "thumbnail": "",
        "excerpt": entry["excerpt"],
    }


def main():
    entries = parse_queue()
    if not entries:
        log("Queue empty. posts.json left untouched.")
        return

    data = json.loads(POSTS_FILE.read_text())
    before = feedlib.snapshot(data.get("posts", []))
    by_id = {p["id"]: p for p in data.get("posts", [])}

    added = 0
    for entry in entries:
        card = build_card(entry)
        if not card:
            continue
        if card["id"] in by_id and not card["excerpt"] and by_id[card["id"]].get("excerpt"):
            card["excerpt"] = by_id[card["id"]]["excerpt"]
        if by_id.get(card["id"]) != card:
            by_id[card["id"]] = card
            added += 1

    data["posts"] = feedlib.sort_posts(by_id.values())
    if feedlib.snapshot(data["posts"]) == before:
        log("Queue unchanged. posts.json left untouched.")
        return

    POSTS_FILE.write_text(json.dumps(data, indent=2) + "\n")
    log(f"Queue applied: {added} card(s) new or updated.")


if __name__ == "__main__":
    main()
