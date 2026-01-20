// backend/services/openweather.js

async function safeFetch(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal });
    return r;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchAirPollution(lat, lon) {
  const key = process.env.OPENWEATHER_KEY;
  if (!key) {
    return { pm25: null, pm10: null, o3: null };
  }

  const url =
    `https://api.openweathermap.org/data/2.5/air_pollution` +
    `?lat=${lat}&lon=${lon}&appid=${key}`;

  const r = await safeFetch(url);
  if (!r || !r.ok) {
    return { pm25: null, pm10: null, o3: null };
  }

  try {
    const j = await r.json();
    const c = j?.list?.[0]?.components;
    if (!c) return { pm25: null, pm10: null, o3: null };

    return {
      pm25: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      o3: c.o3 ?? null
    };
  } catch {
    return { pm25: null, pm10: null, o3: null };
  }
}

module.exports = { fetchAirPollution };