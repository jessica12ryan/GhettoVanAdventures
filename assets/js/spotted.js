// Spotted map: Leaflet markers from Supabase (approved only) + visitor
// submissions saved as pending for one-click approval in the dashboard.
// Needs assets/js/site-config.js filled in; without it the page shows a
// "coming soon" notice instead of breaking.
(function () {
  var mapEl = document.getElementById('spotted-map');
  if (!mapEl) return;

  var cfg = window.GVA_CONFIG || {};
  var statusEl = document.getElementById('map-status');
  var form = document.getElementById('spot-form');
  var nameInput = document.getElementById('spot-name');
  var placeInput = document.getElementById('spot-place');
  var dateInput = document.getElementById('spot-date');
  var noteInput = document.getElementById('spot-note');
  var coordsEl = document.getElementById('spot-coords');
  var clearBtn = document.getElementById('spot-clear');
  var submitBtn = document.getElementById('spot-submit');
  var msgEl = document.getElementById('spot-msg');

  function configured() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
      cfg.SUPABASE_URL.indexOf('YOUR-') !== 0 &&
      cfg.SUPABASE_ANON_KEY.indexOf('YOUR-') !== 0);
  }

  function notice(msg) {
    if (statusEl) { statusEl.textContent = msg; statusEl.hidden = false; }
  }

  function say(msg, ok) {
    if (!msgEl) return;
    msgEl.textContent = msg;
    msgEl.className = 'form-note' + (ok ? '' : ' form-error');
    msgEl.hidden = false;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function api(path, options) {
    options = options || {};
    var extra = options.headers || {};
    options.headers = {
      apikey: cfg.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    for (var k in extra) options.headers[k] = extra[k];
    return fetch(cfg.SUPABASE_URL.replace(/\/$/, '') + path, options);
  }

  function popupHtml(s) {
    var date = s.date_seen || 'Date unknown';
    var html = '<strong>' + escapeHtml(s.place || 'Van sighting') + '</strong><br>' +
      '<span>' + escapeHtml(date) + '</span>';
    if (s.note) html += '<br>' + escapeHtml(s.note);
    html += '<br><em>— ' + escapeHtml(s.reporter || 'Anonymous') + '</em>';
    return html;
  }

  if (!configured()) {
    notice('The sightings map is gearing up — check back soon!');
    if (form) form.hidden = true;
    return;
  }

  if (!window.L) {
    notice('Could not load the map library. Check your connection and refresh.');
    return;
  }

  var map = window.L.map('spotted-map').setView([44.5, -78.5], 6);
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  api('/rest/v1/sightings?approved=eq.true&order=date_seen.desc.nullslast&select=id,lat,lng,place,date_seen,note,reporter')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (rows) {
      rows = Array.isArray(rows) ? rows : [];
      var bounds = [];
      rows.forEach(function (s) {
        if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
        window.L.marker([s.lat, s.lng]).addTo(map).bindPopup(popupHtml(s));
        bounds.push([s.lat, s.lng]);
      });
      if (bounds.length && map.fitBounds) {
        try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
      }
      if (!rows.length) notice('No approved sightings yet — be the first to drop a pin!');
    })
    .catch(function () {
      notice('Could not load sightings right now. The map below still takes reports.');
    });

  var pin = null;
  var pinLatLng = null;

  function updateCoords() {
    if (coordsEl) {
      coordsEl.textContent = pinLatLng
        ? pinLatLng.lat.toFixed(4) + ', ' + pinLatLng.lng.toFixed(4)
        : 'Click the map to drop your pin';
    }
  }

  map.on('click', function (e) {
    if (!e || !e.latlng) return;
    pinLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (!pin) {
      pin = window.L.marker([pinLatLng.lat, pinLatLng.lng], { draggable: true }).addTo(map);
      if (pin.on) pin.on('dragend', function () {
        try {
          var ll = pin.getLatLng();
          pinLatLng = { lat: ll.lat, lng: ll.lng };
          updateCoords();
        } catch (_) {}
      });
    } else if (pin.setLatLng) {
      pin.setLatLng([pinLatLng.lat, pinLatLng.lng]);
    }
    updateCoords();
  });

  if (clearBtn) clearBtn.addEventListener('click', function () {
    pinLatLng = null;
    try { if (pin && pin.remove) pin.remove(); } catch (_) {}
    pin = null;
    updateCoords();
  });
  updateCoords();

  if (form) form.addEventListener('submit', function (e) {
    if (e.preventDefault) e.preventDefault();
    if (!pinLatLng) {
      say('Drop a pin on the map first — click where you saw the van.', false);
      return;
    }
    var place = placeInput && placeInput.value ? placeInput.value.trim() : '';
    if (!place) {
      say('Give the spot a name — nearest town or landmark works.', false);
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    var body = {
      lat: pinLatLng.lat,
      lng: pinLatLng.lng,
      place: place,
      date_seen: (dateInput && dateInput.value) || null,
      note: (noteInput && noteInput.value ? noteInput.value.trim() : ''),
      reporter: (nameInput && nameInput.value ? nameInput.value.trim() : '') || 'Anonymous',
      approved: false
    };
    api('/rest/v1/sightings', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        say('Thanks! Your sighting is in for review and will appear after approval.', true);
        form.reset();
        pinLatLng = null;
        try { if (pin && pin.remove) pin.remove(); } catch (_) {}
        pin = null;
        updateCoords();
      })
      .catch(function () {
        say('Could not send that just now — check your connection and try again.', false);
      });
    // Re-enable submit shortly after (success and failure paths converge here).
    setTimeout(function () { if (submitBtn) submitBtn.disabled = false; }, 1500);
  });
})();
