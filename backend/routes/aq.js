const express = require("express");
const { db } = require("../db");
const { fetchAirPollution } = require("../services/openweather");
const { reverseGeocode } = require("../services/nominatim");
const { evaluateRisk, normalizeGroup } = require("../services/riskEngine");

const router = express.Router();

// Promisified DB read
const getUser = () => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT s.current_user_id AS user_id, u.group_type, u.name, u.age
       FROM app_state s
       LEFT JOIN users u ON u.id = s.current_user_id
       WHERE s.id = 1`,
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
};

router.get("/", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Invalid coordinates." });
    }

    // 1️⃣ Get user + group
    const userRow = await getUser();
    const overrideGroup = req.query.group_type;
    const groupType = overrideGroup
      ? normalizeGroup(overrideGroup)
      : normalizeGroup(userRow?.group_type || "normal");

    // 2️⃣ Fetch AQ data + location in parallel
    const [pollutants, locationName] = await Promise.all([
      fetchAirPollution(lat, lon),
      reverseGeocode(lat, lon)
    ]);

    // 3️⃣ Risk evaluation
    const risk = evaluateRisk({ ...pollutants, groupType });

    // 4️⃣ Save history (non-blocking)
    if (userRow?.user_id) {
      db.run(
        `INSERT INTO history(
          user_id, timestamp, lat, lon, location_name,
          risk_level, pm25, pm10, o3
        )
        VALUES(?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`,
        [
          userRow.user_id,
          lat,
          lon,
          locationName || "Unknown Location",
          risk.level,
          pollutants.pm25,
          pollutants.pm10,
          pollutants.o3
        ],
        (err) => {
          if (err) console.warn("History insert failed:", err.message);
        }
      );
    }

    // 5️⃣ Response (CORRECT & HONEST)
    res.json({
      locationName: locationName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      coords: { lat, lon },
      source: {
        provider: "OpenWeather",
        type: "model-based",
        note: "Estimated air quality (global model, not station-measured)"
      },
      user: userRow?.user_id
        ? {
            id: userRow.user_id,
            name: userRow.name,
            group_type: groupType
          }
        : null,
      pollutants,
      risk
    });

  } catch (error) {
    console.error("AQ Route Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
});

module.exports = router;