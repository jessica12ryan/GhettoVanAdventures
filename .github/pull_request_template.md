## What is this?

- [ ] New van sighting for the Spotted map
- [ ] Site change / fix
- [ ] Content update (posts, text, images)

---

### New sighting — delete this section for other changes

Add your entry inside the `"sightings"` array in `sightings.json`:

```json
{
  "id": "toronto-aug-2026",
  "lat": 43.6532,
  "lng": -79.3832,
  "place": "Toronto, Ontario",
  "date_seen": "2026-08-14",
  "note": "What you saw (optional)",
  "reporter": "Your name (optional)"
}
```

Field rules:

- `id`: lowercase letters, numbers and dashes, unique (e.g. `ottawa-jul-2026`).
- `lat` / `lng`: decimal numbers — grab them from the pin on the Spotted page or any map.
- `place`: nearest town or landmark — never an exact street address.
- `date_seen`: `YYYY-MM-DD`, or `null` if unknown.
- `note` / `reporter`: optional (`reporter` shows as `Anonymous` when empty).

Checklist:

- [ ] Entry added to `sightings.json` and the file is still valid JSON
- [ ] `id` is unique (not used by another entry)
- [ ] Coordinates point to the right area (double-checked on a map)
- [ ] No exact home or business addresses — town or landmark only

---

### Site change — delete this section for sightings

- What changed and why:
- Pages affected:
- [ ] Checked the page(s) locally before submitting (`python3 -m http.server`)
