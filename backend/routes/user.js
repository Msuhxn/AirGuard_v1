const express = require("express");
const { db } = require("../db");
const { normalizeGroup } = require("../services/riskEngine");

const router = express.Router();

router.get("/current", (req, res) => {
  db.get(
    `SELECT u.id, u.name, u.age, u.group_type
     FROM app_state s
     LEFT JOIN users u ON u.id = s.current_user_id
     WHERE s.id = 1`,
    (err, row) => {
      if (err) return res.status(500).json({ error: "DB error" });
      if (!row || !row.id) return res.json({ currentUser: null });
      return res.json({ currentUser: row });
    }
  );
});

router.get("/list", (req, res) => {
  db.all("SELECT id, name, age, group_type, created_at FROM users ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const name = String(req.body.name || "").trim();
  const age = Number(req.body.age);
  const group_type = normalizeGroup(req.body.group_type);

  if (!name || !Number.isFinite(age) || age < 0 || age > 120) {
    return res.status(400).json({ error: "name (string) and age (0-120) required" });
  }

  db.run(
    "INSERT INTO users(name, age, group_type, created_at) VALUES(?,?,?,datetime('now'))",
    [name, Math.floor(age), group_type],
    function (err) {
      if (err) return res.status(500).json({ error: "DB error" });

      const newId = this.lastID;
      db.run(
        "UPDATE app_state SET current_user_id=?, updated_at=datetime('now') WHERE id=1",
        [newId],
        (err2) => {
          if (err2) return res.status(500).json({ error: "DB error" });
          res.json({ ok: true, userId: newId });
        }
      );
    }
  );
});

router.post("/set-current", (req, res) => {
  const user_id = Number(req.body.user_id);
  if (!Number.isFinite(user_id)) return res.status(400).json({ error: "user_id required" });

  db.get("SELECT id FROM users WHERE id=?", [user_id], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "User not found" });

    db.run(
      "UPDATE app_state SET current_user_id=?, updated_at=datetime('now') WHERE id=1",
      [user_id],
      (err2) => {
        if (err2) return res.status(500).json({ error: "DB error" });
        res.json({ ok: true });
      }
    );
  });
});

router.post("/update-group", (req, res) => {
  const group_type = normalizeGroup(req.body.group_type);

  db.get("SELECT current_user_id FROM app_state WHERE id=1", (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    const uid = row?.current_user_id;
    if (!uid) return res.status(400).json({ error: "No current user set" });

    db.run("UPDATE users SET group_type=? WHERE id=?", [group_type, uid], (err2) => {
      if (err2) return res.status(500).json({ error: "DB error" });
      res.json({ ok: true });
    });
  });
});

module.exports = router;
