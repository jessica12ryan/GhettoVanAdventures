// Spotted map: approved sightings from sightings.json (Leaflet markers) +
// visitor reports sent through the visitor's OWN email app (mailto link —
// zero third-party services, accounts, or keys). Nothing appears publicly
// until the owner appends it to sightings.json: moderation is structural,
// spam can never reach the live map.
(function () {
  var EMAIL = 'GhettoVanAdventures@gmail.com';

  var mapEl = document.getElementById('spotted-map');
  if (!mapEl) return;

  var statusEl = document.getElementById('map-status');
  var form = document.getElementById('spot-form');
  var nameInput = document.getElementById('spot-name');
  var placeInput = document.getElementById('spot-place');
  var dateInput = document.getElementById('spot-date');
  var noteInput = document.getElementById('spot-note');
  var coordsEl = document.getElementById('spot-coords');
  var clearBtn = document.getElementById('spot-clear');
  var msgEl = document.getElementById('spot-msg');

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

  function popupHtml(s) {
    var date = s.date_seen || 'Date unknown';
    var html = '<strong>' + escapeHtml(s.place || 'Van sighting') + '</strong><br>' +
      '<span>' + escapeHtml(date) + '</span>';
    if (s.note) html += '<br>' + escapeHtml(s.note);
    html += '<br><em>— ' + escapeHtml(s.reporter || 'Anonymous') + '</em>';
    return html;
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

  fetch('sightings.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var rows = (data && Array.isArray(data.sightings)) ? data.sightings : [];
      var bounds = [];
      rows.forEach(function (s) {
        if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
        window.L.marker([s.lat, s.lng]).addTo(map).bindPopup(popupHtml(s));
        bounds.push([s.lat, s.lng]);
      });
      if (bounds.length && map.fitBounds) {
        try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 }); } catch (_) {}
      }
      if (!rows.length) notice('No sightings yet — be the first to report one below!');
    })
    .catch(function () {
      notice('Could not load sightings right now. The form below still works.');
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
    var lines = [
      'New van sighting report (from the Spotted page):',
      '',
      'Where: ' + place,
      'Coordinates: ' + pinLatLng.lat.toFixed(5) + ', ' + pinLatLng.lng.toFixed(5),
      'Date seen: ' + ((dateInput && dateInput.value) || 'unknown'),
      'Reporter: ' + ((nameInput && nameInput.value ? nameInput.value.trim() : '') || 'Anonymous'),
      '',
      'Note:',
      (noteInput && noteInput.value ? noteInput.value.trim() : '') || '(none)'
    ];
    window.location.href = 'mailto:' + EMAIL +
      '?subject=' + encodeURIComponent('Van sighting: ' + place) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    say('Opening your email app — press send and your sighting is in for review!', true);
  });
})();
