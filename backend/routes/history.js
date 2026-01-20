const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  db.get("SELECT current_user_id FROM app_state WHERE id=1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    const uid = row?.current_user_id;
    if (!uid) return res.json([]);

    db.all(
      "SELECT id, timestamp, location_name, lat, lon, risk_level, pm25, pm10, o3 FROM history WHERE user_id=? ORDER BY id DESC LIMIT 30",
      [uid],
      (err2, rows) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        res.json(rows);
      }
    );
  });
});

module.exports = router;
