const express = require("express");
const { db } = require("../db");

const router = express.Router();

function getCurrentUserId(cb) {
  db.get("SELECT current_user_id FROM app_state WHERE id=1", (err, row) => {
    if (err) return cb(err, null);
    return cb(null, row?.current_user_id ?? null);
  });
}

router.get("/", (req, res) => {
  getCurrentUserId((err, uid) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!uid) return res.json([]);

    db.all(
      "SELECT id, label, lat, lon, created_at FROM favourites WHERE user_id=? ORDER BY id DESC",
      [uid],
      (err2, rows) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        res.json(rows);
      }
    );
  });
});

router.post("/", (req, res) => {
  const label = String(req.body.label || "").trim();
  const lat = Number(req.body.lat);
  const lon = Number(req.body.lon);
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "label, lat, lon required" });
  }

  getCurrentUserId((err, uid) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!uid) return res.status(400).json({ error: "No current user set" });

    db.run(
      "INSERT INTO favourites(user_id, label, lat, lon, created_at) VALUES(?,?,?,?,datetime('now'))",
      [uid, label, lat, lon],
      function (err2) {
        if (err2) return res.status(500).json({ error: "DB error" });
        res.json({ ok: true, id: this.lastID });
      }
    );
  });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  getCurrentUserId((err, uid) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!uid) return res.status(400).json({ error: "No current user set" });

    db.run("DELETE FROM favourites WHERE id=? AND user_id=?", [id, uid], (err2) => {
      if (err2) return res.status(500).json({ error: "DB error" });
      res.json({ ok: true });
    });
  });
});

module.exports = router;
