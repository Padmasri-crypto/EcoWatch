-- Initial data gives the dashboard and charts useful content on first launch.
INSERT OR IGNORE INTO locations (city_name, latitude, longitude)
VALUES
  ('Madurai', 9.9252, 78.1198),
  ('Chennai', 13.0827, 80.2707),
  ('Bengaluru', 12.9716, 77.5946);

-- A week of daily sample points, including Madurai and two other cities.
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-7 days'), 68, 18.2, 34.1, 210.0, 12.5, 42.0, 28.1, 66, 9.0
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-6 days'), 74, 20.5, 38.4, 224.0, 13.8, 39.0, 29.0, 63, 10.0
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-5 days'), 61, 16.8, 31.2, 198.0, 11.2, 45.0, 27.4, 70, 8.0
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-4 days'), 82, 24.3, 43.0, 241.0, 15.6, 36.0, 30.2, 60, 11.0
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-3 days'), 77, 22.1, 40.7, 232.0, 14.1, 38.0, 29.7, 62, 9.5
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-2 days'), 65, 17.9, 33.6, 206.0, 12.0, 44.0, 28.5, 68, 8.5
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-1 day'), 71, 19.4, 36.2, 218.0, 13.1, 41.0, 29.2, 64, 10.5
FROM locations WHERE city_name = 'Madurai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-7 days'), 91, 27.4, 49.2, 280.0, 20.0, 32.0, 30.5, 72, 12.0
FROM locations WHERE city_name = 'Chennai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-3 days'), 84, 25.2, 45.7, 265.0, 18.5, 35.0, 31.0, 68, 13.0
FROM locations WHERE city_name = 'Chennai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-1 day'), 79, 23.1, 42.0, 250.0, 17.0, 37.0, 30.2, 70, 11.5
FROM locations WHERE city_name = 'Chennai';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-7 days'), 48, 12.1, 24.0, 180.0, 9.0, 51.0, 25.0, 58, 6.0
FROM locations WHERE city_name = 'Bengaluru';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-3 days'), 53, 13.9, 27.3, 188.0, 10.1, 49.0, 25.6, 56, 7.2
FROM locations WHERE city_name = 'Bengaluru';
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT id, datetime('now', '-1 day'), 45, 11.4, 22.8, 174.0, 8.7, 54.0, 24.8, 60, 5.8
FROM locations WHERE city_name = 'Bengaluru';
-- Hourly samples make both 24-hour trend charts and first-run maps useful.
WITH RECURSIVE hours(hour) AS (
  SELECT 0
  UNION ALL
  SELECT hour + 1 FROM hours WHERE hour < 23
)
INSERT INTO readings
  (location_id, timestamp, aqi, pm25, pm10, co, no2, o3, temperature, humidity, wind_speed)
SELECT
  l.id,
  datetime('now', printf('-%d hours', hours.hour)),
  CASE l.city_name
    WHEN 'Madurai' THEN 56 + ((hours.hour % 6) - 3) * 3
    WHEN 'Chennai' THEN 86 + ((hours.hour % 6) - 3) * 3
    ELSE 51 + ((hours.hour % 6) - 3) * 3
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 14.8 + ((hours.hour % 5) - 2) * 0.9
    WHEN 'Chennai' THEN 26.0 + ((hours.hour % 5) - 2) * 0.9
    ELSE 13.0 + ((hours.hour % 5) - 2) * 0.9
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 29.3 + ((hours.hour % 4) - 1) * 2
    WHEN 'Chennai' THEN 47.5 + ((hours.hour % 4) - 1) * 2
    ELSE 25.6 + ((hours.hour % 4) - 1) * 2
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 190 + (hours.hour % 5) * 6
    WHEN 'Chennai' THEN 271 + (hours.hour % 5) * 6
    ELSE 183 + (hours.hour % 5) * 6
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 10.4 + (hours.hour % 4) * 0.6
    WHEN 'Chennai' THEN 19.2 + (hours.hour % 4) * 0.6
    ELSE 9.5 + (hours.hour % 4) * 0.6
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 48 + (hours.hour % 5) * 1.5
    WHEN 'Chennai' THEN 34 + (hours.hour % 5) * 1.5
    ELSE 50 + (hours.hour % 5) * 1.5
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 27.8 + (hours.hour % 5) * 0.3
    WHEN 'Chennai' THEN 31.4 + (hours.hour % 5) * 0.3
    ELSE 25.4 + (hours.hour % 5) * 0.3
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 72 - (hours.hour % 5)
    WHEN 'Chennai' THEN 67 - (hours.hour % 5)
    ELSE 57 - (hours.hour % 5)
  END,
  CASE l.city_name
    WHEN 'Madurai' THEN 7 + (hours.hour % 4) * 0.5
    WHEN 'Chennai' THEN 12.2 + (hours.hour % 4) * 0.5
    ELSE 6.7 + (hours.hour % 4) * 0.5
  END
FROM locations l CROSS JOIN hours;
