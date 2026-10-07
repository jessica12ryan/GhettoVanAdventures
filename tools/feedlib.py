"""Shared feed helpers for the updater scripts.

There is exactly one canonical post order — newest date first, with source
and id as deterministic tiebreakers. Every script that writes posts.json
(fetch-youtube.py, fetch-x.py, apply-queue.py) MUST sort with sort_posts():
same-date posts from different sources would otherwise shuffle forever as
each script rewrites the file in its own order, causing a pointless commit
(and Pages redeploy) on every hourly run. The on-page order is unaffected:
recent.js sorts by date at render time.
"""

import json


def sort_key(post):
    return (post.get("date", ""), post.get("source", ""), post.get("id", ""))


def sort_posts(posts):
    return sorted(posts, key=sort_key, reverse=True)


def snapshot(posts):
    return json.dumps(posts, sort_keys=True)
