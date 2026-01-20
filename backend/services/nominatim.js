async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const r = await fetch(url, { headers: { "User-Agent": "AirGuard-IU-Portfolio" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j.display_name ?? null;
}

module.exports = { reverseGeocode };
