// EcoWatch's small Express server handles API calls and keeps readings in SQLite.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'database', 'ecowatch.db');
const app = express();

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(ROOT, 'database', 'schema.sql'), 'utf8'));

// Seed only a brand-new database; real readings are never reset on restart.
if (db.prepare('SELECT COUNT(*) AS count FROM locations').get().count === 0) {
  db.exec(fs.readFileSync(path.join(ROOT, 'database', 'seed.sql'), 'utf8'));
}

app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(ROOT, 'public')));

const pollutantFields = new Set([
  'aqi', 'pm25', 'pm10', 'co', 'no2', 'o3',
  'temperature', 'humidity', 'wind_speed'
]);
const allowedAlertPollutants = new Set(['aqi', 'pm25', 'pm10', 'co', 'no2', 'o3']);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateCoordinates(latitude, longitude) {
  return isFiniteNumber(latitude) && latitude >= -90 && latitude <= 90
    && isFiniteNumber(longitude) && longitude >= -180 && longitude <= 180;
}

function getLocationByName(cityName) {
  return db.prepare('SELECT id, city_name, latitude, longitude FROM locations WHERE city_name = ?')
    .get(cityName);
}

function getLatestReading(locationId) {
  return db.prepare(`
    SELECT id, location_id, timestamp, aqi, pm25, pm10, co, no2, o3,
      temperature, humidity, wind_speed
    FROM readings
    WHERE location_id = ?
    ORDER BY timestamp DESC, id DESC
    LIMIT 1
  `).get(locationId);
}

function getHealthAdvice(aqi) {
  if (aqi == null) return 'Air quality data is not available right now.';
  if (aqi <= 50) return 'Air quality is good. It is a great day to enjoy the outdoors.';
  if (aqi <= 100) return 'Air quality is moderate. Unusually sensitive people may wish to limit long outdoor activity.';
  if (aqi <= 150) return 'Sensitive groups should reduce prolonged or strenuous outdoor activity.';
  if (aqi <= 200) return 'Everyone may begin to experience effects. Limit strenuous outdoor activity.';
  if (aqi <= 300) return 'Health alert: avoid prolonged outdoor activity and consider wearing a well-fitting mask.';
  return 'Health emergency: stay indoors, keep windows closed, and follow local health guidance.';
}

function getTriggeredAlerts(locationId, reading) {
  if (!reading) return [];
  const alerts = db.prepare(`
    SELECT id, location_id, pollutant, threshold, created_at
    FROM alerts
    WHERE location_id = ? AND is_active = 1
  `).all(locationId);
  return alerts.filter((alert) => {
    const value = reading[alert.pollutant];
    return typeof value === 'number' && value > alert.threshold;
  }).map((alert) => ({
    ...alert,
    value: reading[alert.pollutant]
  }));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) {
    throw new Error(`Data provider returned HTTP ${response.status}.`);
  }
  return response.json();
}

async function fetchAndSaveReading(location) {
  const coords = `latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${coords}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone&timezone=GMT`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?${coords}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=GMT`;
  const [air, weather] = await Promise.all([fetchJson(airUrl), fetchJson(weatherUrl)]);

  if (!air.current || !weather.current) {
    throw new Error('The data provider did not return current conditions for this location.');
  }

  const reading = {
    timestamp: air.current.time || weather.current.time || new Date().toISOString(),
    aqi: air.current.us_aqi ?? null,
    pm25: air.current.pm2_5 ?? null,
    pm10: air.current.pm10 ?? null,
    co: air.current.carbon_monoxide ?? null,
    no2: air.current.nitrogen_dioxide ?? null,
    o3: air.current.ozone ?? null,
    temperature: weather.current.temperature_2m ?? null,
    humidity: weather.current.relative_humidity_2m ?? null,
    wind_speed: weather.current.wind_speed_10m ?? null
  };

  const insertReading = db.prepare(`
    INSERT INTO readings (
      location_id, timestamp, aqi, pm25, pm10, co, no2, o3,
      temperature, humidity, wind_speed
    ) VALUES (
      @location_id, @timestamp, @aqi, @pm25, @pm10, @co, @no2, @o3,
      @temperature, @humidity, @wind_speed
    )
  `);
  insertReading.run({ location_id: location.id, ...reading });

  return { ...reading, id: db.prepare('SELECT last_insert_rowid() AS id').get().id };
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

// Return every saved location with its most recent observation for the map.
app.get('/api/locations', (req, res) => {
  const locations = db.prepare(`
    SELECT l.id, l.city_name, l.latitude, l.longitude, l.created_at,
      r.timestamp, r.aqi, r.pm25, r.pm10, r.co, r.no2, r.o3,
      r.temperature, r.humidity, r.wind_speed
    FROM locations l
    LEFT JOIN readings r ON r.id = (
      SELECT id FROM readings WHERE location_id = l.id
      ORDER BY timestamp DESC, id DESC LIMIT 1
    )
    ORDER BY l.city_name
  `).all();
  res.json(locations);
});

// Search a city using Open-Meteo geocoding, then fetch and persist its conditions.
app.post('/api/search', async (req, res) => {
  const city = typeof req.body?.city === 'string' ? req.body.city.trim() : '';
  if (city.length < 2 || city.length > 80 || !/^[\p{L}\p{M} .'-]+$/u.test(city)) {
    return sendError(res, 400, 'Enter a city name using letters, spaces, apostrophes, or hyphens.');
  }

  try {
    const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const search = await fetchJson(searchUrl);
    const match = search.results?.[0];
    if (!match) return sendError(res, 404, `We could not find “${city}”. Try another city name.`);

    const cityName = String(match.name).slice(0, 80);
    const location = db.prepare(`
      INSERT INTO locations (city_name, latitude, longitude)
      VALUES (@city_name, @latitude, @longitude)
      ON CONFLICT(city_name) DO UPDATE SET
        latitude = excluded.latitude,
        longitude = excluded.longitude
      RETURNING id, city_name, latitude, longitude
    `).get({
      city_name: cityName,
      latitude: match.latitude,
      longitude: match.longitude
    });
    const reading = await fetchAndSaveReading(location);
    res.json({
      location,
      reading,
      advice: getHealthAdvice(reading.aqi),
      triggeredAlerts: getTriggeredAlerts(location.id, reading)
    });
  } catch (error) {
    console.error('City lookup failed:', error.message);
    sendError(res, 502, 'Live environmental data is temporarily unavailable. Please try again shortly.');
  }
});

// Fetch current conditions for a device's coordinates and save them like a city search.
app.post('/api/location', async (req, res) => {
  const latitude = req.body?.latitude;
  const longitude = req.body?.longitude;
  if (!validateCoordinates(latitude, longitude)) {
    return sendError(res, 400, 'Latitude and longitude must be valid geographic coordinates.');
  }

  try {
    const cityName = 'My location';
    const location = db.prepare(`
      INSERT INTO locations (city_name, latitude, longitude)
      VALUES (@city_name, @latitude, @longitude)
      ON CONFLICT(city_name) DO UPDATE SET
        latitude = excluded.latitude,
        longitude = excluded.longitude
      RETURNING id, city_name, latitude, longitude
    `).get({ city_name: cityName, latitude, longitude });
    const reading = await fetchAndSaveReading(location);
    res.json({
      location,
      reading,
      advice: getHealthAdvice(reading.aqi),
      triggeredAlerts: getTriggeredAlerts(location.id, reading)
    });
  } catch (error) {
    console.error('Location lookup failed:', error.message);
    sendError(res, 502, 'Could not fetch live data for your location. Check your connection and try again.');
  }
});

// Read saved history. Pollutant names are selected only from a fixed allow-list.
app.get('/api/locations/:id/readings', (req, res) => {
  const locationId = Number(req.params.id);
  const range = req.query.range === '7d' ? '-7 days' : '-24 hours';
  const pollutant = typeof req.query.pollutant === 'string' ? req.query.pollutant : 'aqi';
  if (!Number.isSafeInteger(locationId) || locationId < 1) {
    return sendError(res, 400, 'Location ID must be a positive integer.');
  }
  if (!pollutantFields.has(pollutant)) {
    return sendError(res, 400, 'Choose a supported pollutant or weather measurement.');
  }
  const location = db.prepare('SELECT id, city_name FROM locations WHERE id = ?').get(locationId);
  if (!location) return sendError(res, 404, 'That saved location was not found.');
  const rows = db.prepare(`
    SELECT timestamp, ${pollutant} AS value
    FROM readings
    WHERE location_id = ? AND timestamp >= datetime('now', ?)
    ORDER BY timestamp
  `).all(locationId, range);
  res.json({ location, pollutant, range: req.query.range === '7d' ? '7d' : '24h', readings: rows });
});

// Alert listing includes city names and their current readings for clear status display.
app.get('/api/alerts', (req, res) => {
  const alerts = db.prepare(`
    SELECT a.id, a.location_id, l.city_name, a.pollutant, a.threshold,
      a.is_active, a.created_at
    FROM alerts a
    JOIN locations l ON l.id = a.location_id
    ORDER BY a.created_at DESC, a.id DESC
  `).all().map((alert) => {
    const reading = getLatestReading(alert.location_id);
    return {
      ...alert,
      current_value: reading?.[alert.pollutant] ?? null,
      triggered: Boolean(alert.is_active && reading
        && typeof reading[alert.pollutant] === 'number'
        && reading[alert.pollutant] > alert.threshold)
    };
  });
  res.json(alerts);
});

app.post('/api/alerts', (req, res) => {
  const locationId = req.body?.location_id;
  const pollutant = req.body?.pollutant;
  const threshold = req.body?.threshold;
  if (!Number.isSafeInteger(locationId) || locationId < 1) {
    return sendError(res, 400, 'Choose a saved location for this alert.');
  }
  if (typeof pollutant !== 'string' || !allowedAlertPollutants.has(pollutant)) {
    return sendError(res, 400, 'Choose a supported air-quality measurement.');
  }
  if (!isFiniteNumber(threshold) || threshold < 0 || threshold > 1000000) {
    return sendError(res, 400, 'Threshold must be a number between 0 and 1,000,000.');
  }
  const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
  if (!location) return sendError(res, 404, 'That saved location was not found.');
  const result = db.prepare(`
    INSERT INTO alerts (location_id, pollutant, threshold)
    VALUES (?, ?, ?)
  `).run(locationId, pollutant, threshold);
  res.status(201).json(db.prepare(`
    SELECT a.id, a.location_id, l.city_name, a.pollutant, a.threshold,
      a.is_active, a.created_at
    FROM alerts a JOIN locations l ON l.id = a.location_id
    WHERE a.id = ?
  `).get(result.lastInsertRowid));
});

app.delete('/api/alerts/:id', (req, res) => {
  const alertId = Number(req.params.id);
  if (!Number.isSafeInteger(alertId) || alertId < 1) {
    return sendError(res, 400, 'Alert ID must be a positive integer.');
  }
  const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(alertId);
  if (result.changes === 0) return sendError(res, 404, 'That alert was not found.');
  res.status(204).end();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.listen(PORT, () => {
  console.log(`EcoWatch is running at http://localhost:${PORT}`);
});
