// Recent Content feed: renders posts.json newest-first by default,
// with a dropdown to flip to oldest-first + a source filter.
(function () {
  var grid = document.getElementById('feed-grid');
  var sortSelect = document.getElementById('sort-order');
  var sourceSelect = document.getElementById('source-filter');
  var meta = document.getElementById('feed-meta');
  if (!grid) return;

  var allPosts = [];

  var SOURCE_LABEL = { youtube: 'YouTube', x: 'X', instagram: 'Instagram' };
  var LINK_TEXT = {
    youtube: 'Watch on YouTube',
    x: 'View on X',
    instagram: 'View on Instagram'
  };

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
    var thumb = post.thumbnail
      ? '<div class="post-thumb"><img src="' + escapeHtml(post.thumbnail) +
        '" alt="" loading="lazy"></div>'
      : '<div class="post-thumb placeholder" aria-hidden="true">' + escapeHtml(label) + '</div>';
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

  function render() {
    var newestFirst = !sortSelect || sortSelect.value !== 'oldest';
    var source = sourceSelect ? sourceSelect.value : 'all';

    var posts = allPosts.filter(function (p) {
      return source === 'all' || p.source === source;
    });

    posts.sort(function (a, b) {
      var diff = parseDate(b.date) - parseDate(a.date);
      return newestFirst ? diff : -diff;
    });

    if (!posts.length) {
      grid.innerHTML = '<div class="feed-empty">No posts for this filter yet — ' +
        'the van is probably somewhere without signal. Check back soon.</div>';
    } else {
      grid.innerHTML = posts.map(cardHtml).join('');
    }

    if (meta) {
      meta.textContent = posts.length + (posts.length === 1 ? ' post' : ' posts') +
        ' · ' + (newestFirst ? 'newest first' : 'oldest first');
    }
  }

  if (sortSelect) sortSelect.addEventListener('change', render);
  if (sourceSelect) sourceSelect.addEventListener('change', render);

  fetch('posts.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      allPosts = Array.isArray(data.posts) ? data.posts : [];
      render();
    })
    .catch(function () {
      grid.innerHTML =
        '<div class="feed-error">Could not load the post feed (posts.json). ' +
        'In the meantime, catch up directly on ' +
        '<a href="https://www.youtube.com/@ghettovanadventures" target="_blank" rel="noopener">YouTube</a>, ' +
        '<a href="https://x.com/ghetto_van" target="_blank" rel="noopener">X</a> or ' +
        '<a href="https://www.instagram.com/ghettovanadventures/" target="_blank" rel="noopener">Instagram</a>.</div>';
      if (meta) meta.textContent = 'feed unavailable';
    });
})();
