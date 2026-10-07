// Spotted map: approved sightings from sightings.json (Leaflet markers) +
// visitor reports POSTed from the page via FormSubmit (no signup) to the
// inbox. Nothing appears publicly until the owner appends it to
// sightings.json: moderation is structural, spam can never reach the map.
(function () {
  var mapEl = document.getElementById('spotted-map');
  if (!mapEl) return;

  var statusEl = document.getElementById('map-status');
  var form = document.getElementById('spot-form');
  var placeInput = document.getElementById('spot-place');
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
  // Esri dark-gray canvas + matching labels overlay: free, no key, matches
  // the night-road theme. (CARTO's free tiles now demand an API key.)
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ &amp; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 18
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
    var place = placeInput && placeInput.value ? placeInput.value.trim() : '';
    if (!pinLatLng) {
      if (e.preventDefault) e.preventDefault();
      say('Drop a pin on the map first — click where you saw the van.', false);
      return;
    }
    if (!place) {
      if (e.preventDefault) e.preventDefault();
      say('Give the spot a name — nearest town or landmark works.', false);
      return;
    }
    // Valid: stamp the coordinates (date stays optional — empty is fine)
    // and let the form POST natively to FormSubmit.
    var latInput = document.getElementById('spot-lat');
    var lngInput = document.getElementById('spot-lng');
    if (latInput) latInput.value = pinLatLng.lat.toFixed(5);
    if (lngInput) lngInput.value = pinLatLng.lng.toFixed(5);
  });
})();
