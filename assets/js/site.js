// Shared site behaviour: mobile nav, footer year.
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

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
