#!/usr/bin/env python3
"""Auto-import X posts into posts.json via the free FxEmbed timeline API.

Usage:
    python3 tools/fetch-x.py

No API key or dependencies needed. Fetches the public, reverse-chronological
timeline for @ghetto_van (original posts only — no replies) and upserts the
newest entries as feed cards, preserving hand-written excerpts and any
non-tweet X entries (e.g. profile-link cards).

Fail-safe by design: any network error, unexpected response, or empty
timeline exits quietly WITHOUT touching posts.json, so a flaky third-party
service can never wipe the feed. Run hourly via
.github/workflows/update-posts.yml, which commits only when changed.

Notes:
  - Do not pass ?count=N to the statuses endpoint: during testing, any
    count parameter caused a 404 while the bare endpoint returns 200.
  - Retweets are skipped; only original posts become cards.
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

HANDLE = "ghetto_van"
TIMELINE_URL = f"https://api.fxtwitter.com/2/profile/{HANDLE}/statuses"
ROOT = Path(__file__).resolve().parent.parent
POSTS_FILE = ROOT / "posts.json"
# Well above the account's total post count so hourly runs (and backfills)
# never trim history away.
MAX_KEEP = 500  # max auto-imported X posts retained
MAX_PAGES = 30  # timeline pagination safety cap (~20 posts per page)
TITLE_LEN = 120


def log(msg):
    print(msg, flush=True)


def fetch_page(url, retries=4):
    """Fetch one timeline page with retries: FxEmbed intermittently 404s
    valid timelines/cursors (transient miss — retrying normally recovers)."""
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "GVA-site-updater", "Accept": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as exc:
            last_exc = exc
            log(f"X timeline attempt {attempt}/{retries} failed ({exc})")
            time.sleep(5)
    raise last_exc


def fetch_all_pages():
    """Walk the whole timeline via bottom cursors. Returns the combined
    results list, or None if even the first page failed."""
    combined = []
    cursor = None
    for page in range(1, MAX_PAGES + 1):
        url = TIMELINE_URL + (("?cursor=" + urllib.parse.quote(cursor)) if cursor else "")
        try:
            payload = fetch_page(url)
        except Exception as exc:
            log(f"X timeline page {page} unreachable ({exc})")
            return combined if combined else None
        if not isinstance(payload, dict) or payload.get("code") != 200:
            log(f"X timeline page {page} returned code="
                f"{payload.get('code') if isinstance(payload, dict) else '?'}")
            return combined if combined else None
        results = payload.get("results") or []
        new = [t for t in results if isinstance(t, dict)]
        if not new:
            break
        combined.extend(new)
        nxt = (payload.get("cursor") or {}).get("bottom")
        if not nxt or nxt == cursor:
            break
        cursor = nxt
        log(f"X timeline page {page}: {len(combined)} posts so far")
    return combined


def clean_text(text):
    text = re.sub(r"https?://\S+", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def small_thumb(url):
    # Prefer the small variant for feed cards; leave unknown shapes alone.
    if "pbs.twimg.com/media/" in url and "name=" in url:
        return re.sub(r"name=\w+", "name=small", url)
    return url


def to_card(item):
    tweet_id = str(item.get("id") or "")
    if not tweet_id.isdigit():
        return None
    if item.get("retweet"):
        return None  # skip retweets, keep original posts only
    text = clean_text(item.get("text") or "")
    if not text:
        return None
    try:
        day = datetime.strptime(
            item.get("created_at", ""), "%a %b %d %H:%M:%S %z %Y"
        ).date().isoformat()
    except (ValueError, TypeError):
        return None
    photos = ((item.get("media") or {}).get("photos") or [])
    thumb = small_thumb(photos[0].get("url", "")) if photos and photos[0].get("url") else ""
    return {
        "id": f"x-{tweet_id}",
        "source": "x",
        "title": text if len(text) <= TITLE_LEN else text[:TITLE_LEN].rstrip() + "…",
        "url": item.get("url") or f"https://x.com/{HANDLE}/status/{tweet_id}",
        "date": day,
        "thumbnail": thumb,
        "excerpt": "" if len(text) <= TITLE_LEN else text,
    }


def main():
    results = fetch_all_pages()
    if not results:
        log("X timeline unreachable or empty; posts.json left untouched.")
        return

    cards = []
    for item in results:
        if not isinstance(item, dict) or item.get("type", "status") != "status":
            continue
        card = to_card(item)
        if card:
            cards.append(card)
    if not cards:
        log("X timeline had no usable posts; posts.json left untouched.")
        return

    data = json.loads(POSTS_FILE.read_text())
    before = json.dumps(data.get("posts", []), sort_keys=True)

    managed = {p["id"]: p for p in data.get("posts", [])
               if p.get("source") == "x" and re.fullmatch(r"x-\d+", p.get("id", ""))}
    for card in cards:
        if card["id"] in managed and managed[card["id"]].get("excerpt"):
            card["excerpt"] = managed[card["id"]]["excerpt"]  # keep hand-written text
        managed[card["id"]] = card

    kept = sorted(managed.values(), key=lambda p: p["date"], reverse=True)[:MAX_KEEP]
    rest = [p for p in data.get("posts", [])
            if not (p.get("source") == "x" and re.fullmatch(r"x-\d+", p.get("id", "")))]
    data["posts"] = sorted(kept + rest, key=lambda p: p.get("date", ""), reverse=True)

    if json.dumps(data["posts"], sort_keys=True) == before:
        log(f"No new X posts ({len(kept)} tracked). posts.json left untouched.")
        return

    POSTS_FILE.write_text(json.dumps(data, indent=2) + "\n")
    log(f"X feed updated: {len(kept)} posts tracked.")


if __name__ == "__main__":
    main()
