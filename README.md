This repository hosts the public web files for [GhettoVanAdventures.com](http://GhettoVanAdventures.com) and [GhettoVanAdventures.ca](http://GhettoVanAdventures.ca). It is a plain static site — just open `index.html` or push to GitHub Pages.

## Pages

- `index.html` — Home: hero over the moving-road background, latest-uploads embed, social cards.
- `recent.html` — Recent Content: unified feed (YouTube + X + Instagram) with **Newest → Oldest / Oldest → Newest** dropdown + source filter, plus live embeds.
- `about.html` — About: story, facts, support info. Built with room to grow.
- `contact.html` — Contact: name/email/subject/message form that emails submissions to `GhettoVanAdventures@gmail.com`.
- `spotted.html` — Spotted: visitor sightings map (Leaflet, no API key) driven by `sightings.json`; see below.
- `assets/css/style.css` — shared styles, including the moving-road background (`.road`) and the slim in-page divider (`.road-strip`).
- `assets/js/site.js` — mobile nav + footer year. `assets/js/recent.js` — feed rendering/sorting. `assets/js/spotted.js` — sightings map.

## The moving road background

The animated night-highway from the original splash page lives in `assets/css/style.css` (`.road`, `.stars`, `.horizon`, `.tarmac`, `.dashes`). It renders as a fixed full-page layer behind every page, and a slim animated variant (`.road-strip`) is reused as a divider between sections. `prefers-reduced-motion` disables the animation.

## Recent Content feed (`posts.json`)

The feed is driven by `posts.json`:

```json
{ "id": "yt-VIDEOID", "source": "youtube", "title": "...",
  "url": "...", "date": "2026-10-07", "thumbnail": "...", "excerpt": "..." }
```

- `source` is one of `youtube`, `x`, `instagram`.
- The page sorts **newest → oldest** by default; the dropdown flips to oldest-first.

### Automatic hourly updates (no API keys)

`.github/workflows/update-posts.yml` runs every hour and commits `posts.json`
only when something changed (Pages redeploys on the push). Latency from
upload to feed card is roughly an hour. It runs three steps:

1. `tools/fetch-youtube.py` — pulls the channel RSS feed
   (`UC10tXd2bgXh1sFqG89shP5w`), adds new uploads, refreshes changed titles.
2. `tools/fetch-x.py` — polls the free FxEmbed timeline for `@ghetto_van`
   and upserts original posts (text, date, photo thumbnails; retweets and
   replies skipped). Any error exits without touching `posts.json`, so a
   third-party outage can never wipe the feed.
3. `tools/apply-queue.py` — converts `social-queue.txt` lines into cards.

You can also trigger a run on demand from the Actions tab ("Run workflow"),
and run any script by hand to preview (`git diff posts.json` afterwards).

Two GitHub caveats: cron runs in UTC and may drift a few minutes under load;
and GitHub pauses scheduled workflows after 60 days with no repo activity —
any push or manual run re-arms the schedule.

### Featuring X / Instagram posts by hand (`social-queue.txt`)

Append one line per post (append-only log, re-runs are harmless):

```text
x | https://x.com/ghetto_van/status/1234567890
instagram | https://www.instagram.com/ghettovanadventures/p/ABC123/ | 2026-10-08 | Camp sunset
```

- X lines need only the URL — text, date and thumbnail resolve automatically.
  (Also a backup if the timeline ever misses a post.)
- Instagram serves nothing to unauthenticated requests (verified: post pages
  return a login wall), so IG lines must include `date` and `title` by hand.
  The `ig-profile` card in `posts.json` links to the live profile meanwhile.

### X & Instagram embeds

- The **Live Feeds** section on `recent.html` embeds the X timeline (via `platform.twitter.com/widgets.js`) and always-current YouTube uploads playlist — these update themselves in real time.
- To feature a single Instagram post as a card, add its URL to `social-queue.txt` (see above) instead of editing `posts.json` directly.

## Contact form backend

The static site can't send email itself, so `contact.html` posts to
[FormSubmit](https://formsubmit.co) (free, no signup), which forwards
submissions to `GhettoVanAdventures@gmail.com` with a honeypot spam trap,
no captcha, and a redirect back to `contact.html?sent=1` showing a
confirmation banner.

One-time setup: submit the form once yourself, then click the activation
link FormSubmit emails to the inbox. Until then, submissions are held.
To re-enable its captcha, delete the `_captcha` hidden field in
`contact.html`.

## Spotted sightings map (`sightings.json`)

No backend, no accounts, no third-party services. Approved spots live in
`sightings.json`:

```json
{ "id": "brighton-home", "lat": 44.0426, "lng": -77.7379,
  "place": "Brighton, Ontario", "date_seen": null,
  "note": "Home base.", "reporter": "GVA" }
```

Visitors drop a pin + details on `spotted.html`; the form POSTs from the
page via FormSubmit (free, no signup) to `jessica12ryan@outlook.com`
with a honeypot spam trap, no captcha, and a redirect back showing a
confirmation banner. One-time setup: submit once yourself, then click the
activation link FormSubmit emails to that inbox. The date field is
optional — empty submits fine. To approve: append the spot to
`sightings.json`, commit, push. Nothing appears publicly until you do, so
spam can never reach the live map.
Ask visitors for nearest town/landmark, never exact addresses (stated on
the form).

## Adding pages (room for expansion)1. Copy `about.html` to e.g. `tour.html`, swap the `<main>` content.
2. Add one `<li><a href="tour.html">…</a></li>` to the `.nav-links` list in each page header (and the footer nav), setting `aria-current="page"` on the new page's own link.
3. Add any page-specific styles to `assets/css/style.css` and behaviour to `assets/js/site.js` (or a new file under `assets/js/`).
