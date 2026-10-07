// Recent Content feed: renders posts.json newest-first by default,
// with dropdowns for sort order, source filter, and page size,
// plus numbered pagination.
(function () {
  var grid = document.getElementById('feed-grid');
  var sortSelect = document.getElementById('sort-order');
  var sourceSelect = document.getElementById('source-filter');
  var pageSizeSelect = document.getElementById('page-size');
  var pager = document.getElementById('feed-pager');
  var meta = document.getElementById('feed-meta');
  if (!grid) return;

  var allPosts = [];
  var currentPage = 1;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SOURCE_LABEL = { youtube: 'YouTube', x: 'X', instagram: 'Instagram' };
  var LINK_TEXT = {
    youtube: 'Watch on YouTube',
    x: 'View on X',
    instagram: 'View on Instagram'
  };
  var SORT_LABEL = {
    newest: 'newest first',
    oldest: 'oldest first',
    az: 'A to Z',
    za: 'Z to A'
  };
  var YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

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

  function parseDate(value) {
    var t = Date.parse(value);
    return isNaN(t) ? 0 : t;
  }

  function formatDate(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return value || '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHtml(post) {
    var source = post.source || 'youtube';
    var label = SOURCE_LABEL[source] || source;
    var linkText = LINK_TEXT[source] || 'View post';
    var vid = source === 'youtube' ? youtubeId(post) : '';
    var thumb;
    if (vid && post.thumbnail) {
      // Click-to-play facade: no YouTube iframe until the visitor asks.
      thumb = '<div class="post-thumb playable" data-video="' + vid + '">' +
        '<img src="' + escapeHtml(post.thumbnail) + '" alt="" loading="lazy">' +
        '<button type="button" class="play-btn" data-play="' + vid + '"' +
        ' data-title="' + escapeHtml(post.title || 'YouTube video') + '"' +
        ' aria-label="Play ' + escapeHtml(post.title || 'video') + ' on this page">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
        '</button></div>';
    } else if (post.thumbnail) {
      thumb = '<div class="post-thumb"><img src="' + escapeHtml(post.thumbnail) +
        '" alt="" loading="lazy"></div>';
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

  function pageSize() {
    var n = pageSizeSelect ? parseInt(pageSizeSelect.value, 10) : 15;
    return (n === 30 || n === 45 || n === 60) ? n : 15;
  }

  function sortMode() {
    var v = sortSelect ? sortSelect.value : 'newest';
    return (v === 'oldest' || v === 'az' || v === 'za') ? v : 'newest';
  }

  function compareTitles(a, b, dir) {
    var c = String(a.title || '').localeCompare(String(b.title || ''), undefined,
      { sensitivity: 'base', numeric: true });
    if (c === 0) c = parseDate(b.date) - parseDate(a.date); // stable tiebreak
    return dir === 'za' ? -c : c;
  }

  function getFiltered() {
    var mode = sortMode();
    var source = sourceSelect ? sourceSelect.value : 'all';

    var posts = allPosts.filter(function (p) {
      return source === 'all' || p.source === source;
    });

    if (mode === 'az' || mode === 'za') {
      posts.sort(function (a, b) { return compareTitles(a, b, mode); });
    } else {
      var diff_sign = mode === 'oldest' ? -1 : 1;
      posts.sort(function (a, b) {
        return (parseDate(b.date) - parseDate(a.date)) * diff_sign;
      });
    }

    return { posts: posts, sortLabel: SORT_LABEL[mode] };
  }

  // Compact page list: all numbers up to 7 pages, else 1 … window … last.
  function pageList(total, current) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var nums = [current - 1, current, current + 1].filter(function (n) {
      return n > 1 && n < total;
    });
    nums.sort(function (a, b) { return a - b; });
    var out = [1];
    var prev = 1;
    nums.forEach(function (n) {
      if (n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    });
    if (total - prev > 1) out.push('…');
    out.push(total);
    return out;
  }

  function renderPager(totalPages) {
    if (!pager) return;
    if (totalPages <= 1) {
      pager.innerHTML = '';
      pager.hidden = true;
      return;
    }
    pager.hidden = false;
    var html = '<button type="button" class="page-btn" data-page="prev"' +
      (currentPage === 1 ? ' disabled' : '') + ' aria-label="Previous page">&larr;</button>';
    pageList(totalPages, currentPage).forEach(function (p) {
      if (p === '…') {
        html += '<span class="page-gap" aria-hidden="true">…</span>';
      } else {
        html += '<button type="button" class="page-btn' + (p === currentPage ? ' active' : '') +
          '" data-page="' + p + '"' + (p === currentPage ? ' aria-current="page"' : '') +
          ' aria-label="Page ' + p + '">' + p + '</button>';
      }
    });
    html += '<button type="button" class="page-btn" data-page="next"' +
      (currentPage === totalPages ? ' disabled' : '') + ' aria-label="Next page">&rarr;</button>';
    pager.innerHTML = html;
  }

  function render(scroll) {
    var result = getFiltered();
    var posts = result.posts;
    var size = pageSize();
    var totalPages = Math.max(1, Math.ceil(posts.length / size));
    if (currentPage > totalPages) currentPage = totalPages;

    if (!posts.length) {
      grid.innerHTML = '<div class="feed-empty">No posts for this filter yet — ' +
        'the van is probably somewhere without signal. Check back soon.</div>';
    } else {
      var start = (currentPage - 1) * size;
      grid.innerHTML = posts.slice(start, start + size).map(cardHtml).join('');
    }
    renderPager(posts.length ? totalPages : 0);

    if (meta) {
      if (!posts.length) {
        meta.textContent = '0 posts · ' + result.sortLabel;
      } else {
        var from = (currentPage - 1) * size + 1;
        var to = Math.min(currentPage * size, posts.length);
        meta.textContent = 'Showing ' + from + '–' + to + ' of ' + posts.length +
          (posts.length === 1 ? ' post' : ' posts') +
          ' · ' + result.sortLabel;
      }
    }

    if (scroll && grid.scrollIntoView) {
      grid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function resetAndRender() { currentPage = 1; render(false); }

  if (sortSelect) sortSelect.addEventListener('change', resetAndRender);
  if (sourceSelect) sourceSelect.addEventListener('change', resetAndRender);
  if (pageSizeSelect) pageSizeSelect.addEventListener('change', resetAndRender);
  // Inline YouTube playback: swap the thumbnail facade for the player.
  grid.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-play]') : null;
    if (!btn) return;
    var id = btn.getAttribute('data-play') || '';
    if (!YT_ID_RE.test(id)) return;
    var box = btn.closest ? btn.closest('.post-thumb') : null;
    if (!box) return;
    box.classList.add('playing');
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&rel=0&playsinline=1" title="' + escapeHtml(btn.getAttribute('data-title') || 'YouTube video') +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
      'allowfullscreen></iframe>';
  });

  if (pager) pager.addEventListener('click', function (e) {    var btn = e.target && e.target.closest ? e.target.closest('[data-page]') : null;
    if (!btn || btn.disabled) return;
    var total = Math.max(1, Math.ceil(getFiltered().posts.length / pageSize()));
    var val = btn.getAttribute('data-page');
    if (val === 'prev') {
      currentPage = Math.max(1, currentPage - 1);
    } else if (val === 'next') {
      currentPage = Math.min(total, currentPage + 1);
    } else {
      currentPage = Math.min(total, Math.max(1, parseInt(val, 10) || 1));
    }
    render(true);
  });

  fetch('posts.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      allPosts = Array.isArray(data.posts) ? data.posts : [];
      render(false);
    })
    .catch(function () {
      if (pager) { pager.innerHTML = ''; pager.hidden = true; }
      grid.innerHTML =
        '<div class="feed-error">Could not load the latest posts right now. ' +
        'In the meantime, catch up directly on ' +
        '<a href="https://www.youtube.com/@ghettovanadventures" target="_blank" rel="noopener">YouTube</a>, ' +
        '<a href="https://x.com/ghetto_van" target="_blank" rel="noopener">X</a> or ' +
        '<a href="https://www.instagram.com/ghettovanadventures/" target="_blank" rel="noopener">Instagram</a>.</div>';
      if (meta) meta.textContent = 'feed unavailable';
    });
})();
