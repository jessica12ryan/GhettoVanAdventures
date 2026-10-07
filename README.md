This repository hosts the public web files for [GhettoVanAdventures.com](http://GhettoVanAdventures.com) and [GhettoVanAdventures.ca](http://GhettoVanAdventures.ca). It is a plain static site — just open `index.html` or push to GitHub Pages.

## Pages

- `index.html` — Home: hero over the moving-road background, latest-uploads embed, social cards.
- `recent.html` — Recent Content: unified feed (YouTube + X + Instagram) with **Newest → Oldest / Oldest → Newest** dropdown + source filter, plus live embeds.
- `about.html` — About: story, facts, support info. Built with room to grow.
- `assets/css/style.css` — shared styles, including the moving-road background (`.road`) and the slim in-page divider (`.road-strip`).
- `assets/js/site.js` — mobile nav + footer year. `assets/js/recent.js` — feed rendering/sorting.

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

### Keeping YouTube fresh (automatic, no API key)

```sh
python3 tools/fetch-youtube.py
```

This pulls the channel RSS feed (`UC10tXd2bgXh1sFqG89shP5w`), adds new uploads, and leaves hand-added X/Instagram entries alone. Run it weekly, or schedule it with a GitHub Action (cron) that commits the updated `posts.json`.

### X & Instagram

X and Instagram offer no public feed usable from a static site (X needs a paid API, Instagram needs an app token), so:

- The **Live Feeds** section on `recent.html` embeds the X timeline (via `platform.twitter.com/widgets.js`) and always-current YouTube uploads playlist — these update themselves.
- Individual X/Instagram posts are added **by hand** to `posts.json` with their post URL, e.g. `"url": "https://x.com/ghetto_van/status/<id>"`. The two profile-link cards already in `posts.json` (`x-profile`, `ig-profile`) are placeholders — replace them with real post URLs over time.

## Adding pages (room for expansion)

1. Copy `about.html` to e.g. `tour.html`, swap the `<main>` content.
2. Add one `<li><a href="tour.html">…</a></li>` to the `.nav-links` list in each page header (and the footer nav), setting `aria-current="page"` on the new page's own link.
3. Add any page-specific styles to `assets/css/style.css` and behaviour to `assets/js/site.js` (or a new file under `assets/js/`).
