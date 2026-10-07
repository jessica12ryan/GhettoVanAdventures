#!/usr/bin/env python3
"""Refresh the YouTube entries in posts.json from the channel RSS feed.

Usage:
    python3 tools/fetch-youtube.py

No API key or dependencies needed — it reads the public RSS feed at
https://www.youtube.com/feeds/videos.xml?channel_id=<CHANNEL_ID>

What it does:
  - Downloads the latest ~15 uploads for the channel.
  - Adds any new videos to posts.json (newest kept, no duplicates).
  - Leaves hand-added X / Instagram entries untouched.
  - Sorts YouTube entries newest-first and writes the file back.

X and Instagram have no public feed usable from a static site, so add
those posts by hand in posts.json using the same shape:

    {
      "id": "x-123456",
      "source": "x",
      "title": "Post text...",
      "url": "https://x.com/ghetto_van/status/<id>",
      "date": "2026-10-07",
      "thumbnail": "",
      "excerpt": "Optional one-liner."
    }

Tip: this runs hourly via .github/workflows/update-posts.yml, which commits
posts.json only when something changed. Run it by hand any time to preview.
"""

import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import feedlib

CHANNEL_ID = "UC10tXd2bgXh1sFqG89shP5w"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
ROOT = Path(__file__).resolve().parent.parent
POSTS_FILE = ROOT / "posts.json"
# No retention cap: the RSS feed only ever shows the latest ~15 uploads, but
# posts.json also holds the full backfilled archive, and hourly runs must
# never trim history away.

NS = {
    "a": "http://www.w3.org/2005/Atom",
    "m": "http://search.yahoo.com/mrss/",
    "y": "http://www.youtube.com/xml/schemas/2015",
}


def fetch_feed():
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "GVA-site-updater"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read()


def parse_feed(raw: bytes):
    root = ET.fromstring(raw)
    videos = []
    for entry in root.findall("a:entry", NS):
        vid_el = entry.find("y:videoId", NS)
        title_el = entry.find("a:title", NS)
        pub_el = entry.find("a:published", NS)
        link_el = entry.find("a:link", NS)
        if vid_el is None or title_el is None:
            continue
        vid = vid_el.text.strip()
        pub = pub_el.text[:10] if pub_el is not None and pub_el.text else date.today().isoformat()
        url = (
            link_el.attrib.get("href", f"https://www.youtube.com/watch?v={vid}")
            if link_el is not None
            else f"https://www.youtube.com/watch?v={vid}"
        )
        videos.append(
            {
                "id": f"yt-{vid}",
                "source": "youtube",
                "title": title_el.text.strip(),
                "url": url,
                "date": pub,
                "thumbnail": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "excerpt": "",
            }
        )
    return videos


def main():
    videos = parse_feed(fetch_feed())
    print(f"Found {len(videos)} videos in RSS feed.")

    data = json.loads(POSTS_FILE.read_text())
    existing = {p["id"]: p for p in data.get("posts", []) if p.get("source") == "youtube"}

    added = 0
    for v in videos:
        if v["id"] in existing:
            # Refresh title/url/thumbnail in case they changed; keep hand-written excerpt.
            existing[v["id"]].update(
                {k: v[k] for k in ("title", "url", "date", "thumbnail")}
            )
        else:
            existing[v["id"]] = v
            added += 1

    before = feedlib.snapshot(data.get("posts", []))

    yt_posts = sorted(existing.values(), key=lambda p: p["date"], reverse=True)
    other_posts = [p for p in data.get("posts", []) if p.get("source") != "youtube"]

    data["posts"] = feedlib.sort_posts(yt_posts + other_posts)

    if feedlib.snapshot(data["posts"]) == before:
        print(f"No changes ({len(yt_posts)} YouTube + {len(other_posts)} other entries). "
              "posts.json left untouched.")
        return

    data["updated"] = date.today().isoformat()
    POSTS_FILE.write_text(json.dumps(data, indent=2) + "\n")

    print(f"Added {added} new video(s). posts.json now holds "
          f"{len(yt_posts)} YouTube + {len(other_posts)} other entries.")


if __name__ == "__main__":
    main()
