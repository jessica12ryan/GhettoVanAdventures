// Abby the Akita page: renders the newest posts mentioning "Abby" from
// posts.json — the same data file recent.html uses, so this section keeps
// itself updated by the hourly feed workflow with no extra pipeline.
// Inline YouTube playback (click-to-play facade → real paused player),
// plus the description when one is available, consistent with recent.html.
(function () {
  var grid = document.getElementById('abby-grid');
  if (!grid) return;
  var countEl = document.getElementById('abby-count');
  var LIMIT = 9;

  var SOURCE_LABEL = { youtube: 'YouTube', x: 'X', instagram: 'Instagram' };
  var LINK_TEXT = {
    youtube: 'Watch on YouTube',
    x: 'View on X',
    instagram: 'View on Instagram'
  };
  var YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseDate(value) {
    var t = Date.parse(value);
    return isNaN(t) ? 0 : t;
  }

  function formatDate(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return value || '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Extract a strict 11-char YouTube id from a watch/shorts/share URL
  // or thumbnail path. Returns '' when nothing valid is found.
  function youtubeId(post) {
    var m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /\/(shorts|live|embed)\/([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /youtu\.be\/([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /\/vi\/([A-Za-z0-9_-]{11})\//.exec(post.thumbnail || '');
    var id = m ? m[m.length - 1] : '';
    return YT_ID_RE.test(id) ? id : '';
  }

  function cardHtml(post, index) {
    var source = post.source || 'youtube';
    var label = SOURCE_LABEL[source] || source;
    var linkText = LINK_TEXT[source] || 'View post';
    var vid = source === 'youtube' ? youtubeId(post) : '';
    var loading = index < 3 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    var thumb;
    if (vid) {
      var small = 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg';
      var large = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
      // Click-to-play facade: no YouTube iframe until the visitor asks.
      thumb = '<div class="post-thumb playable" data-video="' + vid + '">' +
        '<img src="' + small + '"' +
        ' srcset="' + small + ' 320w, ' + large + ' 480w"' +
        ' sizes="(max-width: 600px) calc(100vw - 2.5rem), 330px" alt="" ' + loading + '>' +
        '<button type="button" class="play-btn" data-play="' + vid + '"' +
        ' data-title="' + escapeHtml(post.title || 'YouTube video') + '"' +
        ' aria-label="Play ' + escapeHtml(post.title || 'video') + ' on this page">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button></div>';
    } else if (post.thumbnail) {
      thumb = '<a class="post-thumb link-thumb" href="' + escapeHtml(post.url) +
        '" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">' +
        '<img src="' + escapeHtml(post.thumbnail) + '" alt="" ' + loading + '></a>';
    } else {
      thumb = '<div class="post-thumb placeholder" aria-hidden="true">' + escapeHtml(label) + '</div>';
    }
    return (
      '<article class="post-card">' + thumb +
        '<div class="post-body">' +
          '<div class="post-top">' +
            '<span class="badge ' + escapeHtml(source) + '">' + escapeHtml(label) + '</span>' +
            '<time class="post-date" datetime="' + escapeHtml(post.date || '') + '">' +
              escapeHtml(formatDate(post.date)) + '</time>' +
          '</div>' +
          '<h3><a href="' + escapeHtml(post.url) + '" target="_blank" rel="noopener noreferrer">' +
            escapeHtml(post.title) + '</a></h3>' +
          (post.excerpt ? '<p class="excerpt">' + escapeHtml(post.excerpt) + '</p>' : '') +
          '<a class="post-link" href="' + escapeHtml(post.url) +
            '" target="_blank" rel="noopener noreferrer">' + escapeHtml(linkText) + ' &rarr;</a>' +
        '</div>' +
      '</article>'
    );
  }

  function playerHtml(id, title, autoplay) {
    return '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?rel=0&playsinline=1' + (autoplay ? '&autoplay=1' : '') +
      '" title="' + escapeHtml(title || 'YouTube video') +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      'allowfullscreen></iframe>';
  }

  // ── Inline playback ──────────────────────────────────────────────
  // Facades stay light until a card nears the viewport; then a REAL paused
  // YouTube player is queued so the visitor's tap lands directly on
  // YouTube's own play button — a genuine in-player gesture no autoplay
  // policy blocks (Safari included). Only a few boot at once; cards never
  // observed (old browsers, data-saver) keep the facade and load an
  // autoplay player on click as fallback.
  var gridObserver = null;
  var pendingSwaps = [];
  var activeLoads = 0;
  var MAX_CONCURRENT_LOADS = 4;

  function pumpSwapQueue() {
    while (activeLoads < MAX_CONCURRENT_LOADS && pendingSwaps.length) {
      var btn = pendingSwaps.shift();
      try {
        var box = btn.closest ? btn.closest('.post-thumb') : null;
        if (!box) continue;
        if ('isConnected' in box && !box.isConnected) continue;
        if (box.getAttribute && box.getAttribute('data-player') === 'ready') continue;
        var id = btn.getAttribute ? (btn.getAttribute('data-play') || '') : '';
        if (!YT_ID_RE.test(id)) continue;
        startPlayerLoad(box, id, (btn.getAttribute && btn.getAttribute('data-title')) || 'YouTube video');
      } catch (_) {}
    }
  }

  function startPlayerLoad(box, id, title) {
    var frame;
    try {
      frame = document.createElement('iframe');
    } catch (_) {
      return;
    }
    activeLoads++;
    var settled = false;
    var done = function (ok) {
      if (settled) return;
      settled = true;
      activeLoads = Math.max(0, activeLoads - 1);
      try {
        if (ok) {
          if (box.setAttribute) box.setAttribute('data-player', 'ready');
          if (box.classList) box.classList.add('player-ready');
        } else if (frame.remove) {
          frame.remove(); // blocked/failed: leave the facade fallback in place
        }
      } catch (_) {}
      pumpSwapQueue();
    };
    try {
      frame.className = 'yt-preload';
      frame.title = title || 'YouTube video';
      frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      frame.setAttribute('allowfullscreen', '');
      if (frame.addEventListener) frame.addEventListener('load', function () { done(true); });
      box.appendChild(frame);
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1';
      setTimeout(function () { done(false); }, 20000);
    } catch (_) {
      done(false);
    }
  }

  function observeFacades() {
    if (!('IntersectionObserver' in window)) return;
    try {
      if (!gridObserver) {
        gridObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            gridObserver.unobserve(entry.target);
            pendingSwaps.push(entry.target);
            pumpSwapQueue();
          });
        }, { rootMargin: '300px 0px' });
      } else {
        gridObserver.disconnect(); // drop detached cards from last render
      }
      pendingSwaps.length = 0; // fresh buttons on every render
      if (!grid.querySelectorAll) return;
      var btns = grid.querySelectorAll('[data-play]');
      for (var i = 0; i < btns.length; i++) gridObserver.observe(btns[i]);
    } catch (_) {}
  }

  // Fallback for cards never swapped in (old browsers, data-saver):
  // facade click loads an autoplay player directly.
  // NOTE: never hide/move the facade on pointerdown to "forward" the press
  // into the player — Safari drops the click when its target disappears
  // mid-gesture, which turns every video into a two-click video.
  grid.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-play]') : null;
    if (!btn) return;
    var id = btn.getAttribute('data-play') || '';
    if (!YT_ID_RE.test(id)) return;
    var box = btn.closest ? btn.closest('.post-thumb') : null;
    if (!box || !box.classList) return;
    box.classList.add('playing');
    if (box.setAttribute) box.setAttribute('data-player', 'ready');
    box.innerHTML = playerHtml(id, btn.getAttribute('data-title') || 'YouTube video', true);
  });

  fetch('posts.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var all = Array.isArray(data.posts) ? data.posts : [];
      var hits = all.filter(function (p) {
        var text = String(p.title || '') + ' ' + String(p.excerpt || '');
        return /abby/i.test(text);
      });
      hits.sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });

      if (countEl) {
        countEl.textContent = hits.length
          ? hits.length + (hits.length === 1 ? ' post' : ' posts') + ' feature Abby — newest ' +
            Math.min(LIMIT, hits.length) + ' below.'
          : '';
      }

      if (!hits.length) {
        grid.innerHTML = '<div class="feed-empty">Abby\'s star is still rising — ' +
          'her episodes will show up here as soon as the feed catches them.</div>';
        return;
      }
      grid.innerHTML = hits.slice(0, LIMIT).map(cardHtml).join('');
      observeFacades(); // swap near-viewport facades for real players
    })
    .catch(function () {
      grid.innerHTML = '<div class="feed-error">Could not load Abby\'s episodes right now — ' +
        'catch up on <a href="https://www.youtube.com/@ghettovanadventures" target="_blank" rel="noopener">YouTube</a> instead.</div>';
      if (countEl) countEl.textContent = '';
    });
})();
