// Abby the Akita page: renders the newest posts mentioning "Abby" from
// posts.json — the same data file recent.html uses, so this section keeps
// itself updated by the hourly feed workflow with no extra pipeline.
(function () {
  var grid = document.getElementById('abby-grid');
  if (!grid) return;
  var countEl = document.getElementById('abby-count');
  var LIMIT = 9;

  var SOURCE_LABEL = { youtube: 'YouTube', x: 'X', instagram: 'Instagram' };

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

  // Same strict 11-char id extraction recent.js uses (watch/shorts/youtu.be).
  function youtubeId(post) {
    var m = /[?&]v=([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /\/(shorts|live|embed)\/([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /youtu\.be\/([A-Za-z0-9_-]{11})/.exec(post.url || '') ||
      /\/vi\/([A-Za-z0-9_-]{11})\//.exec(post.thumbnail || '');
    return m ? m[m.length - 1] : '';
  }

  function cardHtml(post, index) {
    var source = post.source || 'youtube';
    var label = SOURCE_LABEL[source] || source;
    var vid = source === 'youtube' ? youtubeId(post) : '';
    var loading = index < 3 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
    var thumb;
    if (vid) {
      var small = 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg';
      var large = 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg';
      thumb = '<a class="post-thumb link-thumb" href="' + escapeHtml(post.url) +
        '" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">' +
        '<img src="' + small + '" srcset="' + small + ' 320w, ' + large + ' 480w"' +
        ' sizes="(max-width: 600px) calc(100vw - 2.5rem), 330px" alt="" ' + loading + '></a>';
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
        '</div>' +
      '</article>'
    );
  }

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
    })
    .catch(function () {
      grid.innerHTML = '<div class="feed-error">Could not load Abby\'s episodes right now — ' +
        'catch up on <a href="https://www.youtube.com/@ghettovanadventures" target="_blank" rel="noopener">YouTube</a> instead.</div>';
      if (countEl) countEl.textContent = '';
    });
})();
