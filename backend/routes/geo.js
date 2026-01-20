const express = require("express");
const router = express.Router();

// OpenWeather Geocoding: https://openweathermap.org/api/geocoding-api
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q || q.length < 2) return res.json({ results: [] });

  const key = process.env.OPENWEATHER_KEY;
  if (!key) return res.status(500).json({ results: [], error: "Missing OPENWEATHER_KEY" });

  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct` +
      `?q=${encodeURIComponent(q)}&limit=6&appid=${encodeURIComponent(key)}`;

    const r = await fetch(url);
    if (!r.ok) return res.json({ results: [] });

    const data = await r.json();

    res.json({
      results: (data || []).map((x) => ({
        name: `${x.name}${x.state ? ", " + x.state : ""}, ${x.country}`,
        lat: Number(x.lat),
        lon: Number(x.lon)
      }))
    });
  } catch (e) {
    res.json({ results: [], error: e.message });
  }
});

module.exports = router;