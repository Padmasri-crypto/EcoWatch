# EcoWatch

EcoWatch is a small, responsive environmental monitoring website. Search for a city (or share your device location) to view current air quality and weather, review saved readings on a map and charts, and create threshold alerts. The site uses plain HTML, CSS, and JavaScript with a minimal Express API and a local SQLite database.

## Requirements

- Node.js 18 or newer (for the built-in `fetch` API)
- npm
- An internet connection for live Open-Meteo data and the Chart.js, Leaflet, map-tile, and font CDNs

## Setup and run

1. Open a terminal in the project folder.
2. Install dependencies with `npm install`.
3. Start the site with `npm start`.
4. Visit <http://localhost:3000>.

The server creates `database/ecowatch.db` automatically. It applies `database/schema.sql` and inserts Madurai, Chennai, and Bengaluru sample locations, hourly readings, and a week of daily history from `database/seed.sql` the first time the database is created. Restarting the server keeps your saved readings and alert rules.

To use another port, set the `PORT` environment variable before running `npm start`.

## Using the website

- **Dashboard:** Search for a city or use your location to fetch and save current data. The dashboard shows an AQI category, health guidance, and any matching alerts.
- **Map:** Explore saved locations. Click a marker for its latest reading and a link to trends.
- **Trends:** Select a location, measurement, and a 24-hour or 7-day range. Export the displayed readings to CSV.
- **Alerts:** Save and remove pollutant/AQI thresholds. Alerts are compared with the most recently saved reading and are shown when a city is refreshed on the dashboard.
- **About:** Read a plain-language guide to pollutants and US AQI categories.
- **Theme:** Use the theme button in the shared navigation; your preference is stored in local storage.

## Data and units

Live air measurements and geocoding come from Open-Meteo's free APIs. Weather comes from Open-Meteo Forecast. The AQI shown is US AQI; particulate matter and gas concentrations are presented in µg/m³ as returned by the air-quality service. Weather values are °C, %, and km/h. These are model-based estimates, not a replacement for official local monitoring or medical advice.

## Project files

| Path | Purpose |
| --- | --- |
| `server.js` | Express server, input validation, Open-Meteo proxy, and parameterized SQLite queries. |
| `package.json` | Project metadata, dependencies, and the `npm start` command. |
| `database/schema.sql` | SQLite tables, constraints, and the readings index. |
| `database/seed.sql` | First-run sample locations and historical readings. |
| `database/ecowatch.db` | Automatically created local database (ignored by Git). |
| `public/index.html` | Searchable live dashboard and CSV export. |
| `public/map.html` | Saved city map using Leaflet and OpenStreetMap. |
| `public/trends.html` | Historical charts using Chart.js. |
| `public/alerts.html` | Alert creation and management. |
| `public/about.html` | Pollutant and AQI educational guide. |
| `public/css/style.css` | Shared responsive styling, theme variables, and dark mode. |
| `public/js/utils.js` | Shared API, formatting, theme, navigation, and CSV helpers. |
| `public/js/dashboard.js` | Dashboard searches, location lookup, readings, and alerts. |
| `public/js/map.js` | Map markers and reading popups. |
| `public/js/trends.js` | Trend queries, chart creation, and export. |
| `public/js/alerts.js` | Alert form and saved-rule management. |
| `.gitignore` | Excludes dependencies, local database, and environment files. |

## API overview

- `GET /api/health` — service/database health check.
- `GET /api/locations` — saved cities with their latest readings.
- `POST /api/search` — accepts `{ "city": "Madurai" }`, fetches and saves a reading.
- `POST /api/location` — accepts latitude and longitude, then fetches and saves a reading.
- `GET /api/locations/:id/readings?range=24h&pollutant=aqi` — saved history.
- `GET /api/alerts`, `POST /api/alerts`, `DELETE /api/alerts/:id` — alert rules.
