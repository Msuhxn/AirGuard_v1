PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  group_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_user_id INTEGER,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (current_user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO app_state (id, current_user_id, updated_at)
VALUES (1, NULL, datetime('now'));

CREATE TABLE IF NOT EXISTS favourites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  location_name TEXT,
  risk_level TEXT NOT NULL,
  pm25 REAL,
  pm10 REAL,
  o3 REAL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_user_time ON history(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites(user_id, id DESC);
