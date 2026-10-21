-- Saved cities and their observed environmental readings.
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  aqi REAL,
  pm25 REAL,
  pm10 REAL,
  co REAL,
  no2 REAL,
  o3 REAL,
  temperature REAL,
  humidity REAL,
  wind_speed REAL
);

CREATE INDEX IF NOT EXISTS idx_readings_location_time
  ON readings(location_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  pollutant TEXT NOT NULL,
  threshold REAL NOT NULL CHECK (threshold >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
