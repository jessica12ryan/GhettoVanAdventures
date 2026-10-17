// Shared site behaviour: mobile nav, About submenu, footer year.
// To add a page: copy the <header class="site-header"> block from
// index.html into the new file, add a <li> link, and set
// aria-current="page" on that page's link.
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // About submenu: button click toggles (touch + keyboard), CSS hover
  // covers the desktop pointer, and outside-click / Escape / mouseleave
  // all close it so no menu ever gets stuck open.
  var subItems = document.querySelectorAll('.has-sub');
  function closeSubs(except) {
    for (var i = 0; i < subItems.length; i++) {
      if (subItems[i] === except) continue;
      subItems[i].classList.remove('open');
      var b = subItems[i].querySelector('.sub-toggle');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  }
  for (var s = 0; s < subItems.length; s++) {
    (function (li) {
      var btn = li.querySelector('.sub-toggle');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation(); // let the document click handler see it as inside
        // On hover-capable desktops the CSS hover already owns the menu, so a
        // mouse click (detail > 0) is left alone; keyboard Enter (detail 0)
        // and touch taps still toggle.
        var hoverCapable = window.matchMedia && window.matchMedia('(hover: hover)').matches;
        if (e.detail > 0 && hoverCapable) return;
        var open = li.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) closeSubs(null);
      });
      li.addEventListener('mouseleave', function () {
        // Hover-capable devices close via CSS :hover, so don't also clear a
        // menu a keyboard user opened just because the mouse wandered off.
        var hoverCapable = window.matchMedia && window.matchMedia('(hover: hover)').matches;
        if (hoverCapable) return;
        li.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    })(subItems[s]);
  }
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest || !e.target.closest('.has-sub')) closeSubs(null);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSubs(null);
  });

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
