// Dashboard interactions: searching, location permissions, alerts, and CSV export.
(function () {
  const $ = (selector) => document.querySelector(selector);
  const form = $('#city-search-form');
  const input = $('#city-search');
  const loading = $('#dashboard-loading');
  const message = $('#dashboard-message');
  const result = $('#dashboard-result');
  const alertBanner = $('#dashboard-alerts');
  let currentLocation = null;
  let currentReading = null;

  const cards = [
    ['aqi', 'Air quality index', 'AQI', 'gauge'],
    ['pm25', 'Fine particles', 'µg/m³', 'particles'],
    ['pm10', 'Coarse particles', 'µg/m³', 'particles'],
    ['co', 'Carbon monoxide', 'µg/m³', 'gas'],
    ['no2', 'Nitrogen dioxide', 'µg/m³', 'gas'],
    ['o3', 'Ozone', 'µg/m³', 'gas'],
    ['temperature', 'Temperature', '°C', 'weather'],
    ['humidity', 'Humidity', '%', 'weather'],
    ['wind_speed', 'Wind speed', 'km/h', 'weather']
  ];

  function renderReading(data) {
    currentLocation = data.location;
    currentReading = data.reading;
    result.hidden = false;
    $('#place-name').textContent = data.location.city_name;
    $('#place-coordinates').textContent =
      `${Number(data.location.latitude).toFixed(3)}°, ${Number(data.location.longitude).toFixed(3)}°`;
    $('#last-updated').textContent = `Updated ${EcoWatch.formatDate(data.reading.timestamp)}`;
    const category = EcoWatch.aqiCategory(data.reading.aqi);
    $('#metric-grid').innerHTML = cards.map(([key, label, unit, icon]) => {
      const value = EcoWatch.formatValue(data.reading[key], key === 'aqi' || key === 'humidity' ? 0 : 1);
      const suffix = key === 'aqi' ? '' : ` <span class="metric-unit">${unit}</span>`;
      const badge = key === 'aqi' ? `<span class="metric-category">${category.name}</span>` : '';
      return `<article id="metric-${key}" class="metric-card metric-card--${key === 'aqi' ? category.className : ''}">
        <div class="metric-topline"><span class="metric-icon" aria-hidden="true">${icon === 'gauge' ? '◎' : icon === 'particles' ? '◌' : icon === 'weather' ? '◒' : '≈'}</span>
        <span class="metric-label">${label}</span></div>
        <div class="metric-value">${value}${suffix}</div>${badge}
      </article>`;
    }).join('');

    $('#health-advice').textContent = data.advice;
    renderAlerts(data.triggeredAlerts || []);
    message.hidden = true;
  }

  function renderAlerts(alerts) {
    if (!alerts.length) {
      alertBanner.hidden = true;
      return;
    }
    alertBanner.innerHTML = `<strong>Air quality alert</strong><ul>${alerts.map((alert) =>
      `<li>${EcoWatch.POLLUTANTS[alert.pollutant].label} is ${EcoWatch.formatValue(alert.value)} ${EcoWatch.POLLUTANTS[alert.pollutant].unit} — above your ${EcoWatch.formatValue(alert.threshold)} threshold.</li>`
    ).join('')}</ul><a href="alerts.html">Manage alerts</a>`;
    alertBanner.hidden = false;
  }

  async function searchCity(city) {
    EcoWatch.setLoading(loading, true, 'Finding live air quality and weather…');
    message.hidden = true;
    try {
      renderReading(await EcoWatch.api('/api/search', {
        method: 'POST',
        body: JSON.stringify({ city })
      }));
    } catch (error) {
      EcoWatch.showMessage(message, error.message, 'error');
    } finally {
      EcoWatch.setLoading(loading, false);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const city = input.value.trim();
    if (city) searchCity(city);
  });

  $('#use-location').addEventListener('click', () => {
    if (!navigator.geolocation) {
      EcoWatch.showMessage(message, 'Location access is not available in this browser.', 'error');
      return;
    }
    EcoWatch.setLoading(loading, true, 'Getting your location…');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        renderReading(await EcoWatch.api('/api/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        }));
      } catch (error) {
        EcoWatch.showMessage(message, error.message, 'error');
      } finally {
        EcoWatch.setLoading(loading, false);
      }
    }, () => {
      EcoWatch.setLoading(loading, false);
      EcoWatch.showMessage(message, 'We could not access your location. Allow location access or search for a city instead.', 'error');
    }, { timeout: 12000, maximumAge: 300000 });
  });

  $('#export-dashboard').addEventListener('click', () => {
    if (!currentReading || !currentLocation) {
      EcoWatch.showMessage(message, 'Search for a city before exporting its readings.', 'info');
      return;
    }
    const rows = [
      ['City', currentLocation.city_name],
      ['Timestamp', currentReading.timestamp],
      ['Measurement', 'Value', 'Unit'],
      ...cards.map(([key, label, unit]) => [label, currentReading[key] ?? '', unit])
    ];
    EcoWatch.exportCsv('ecowatch-readings.csv', rows);
  });

  searchCity('Madurai');
}());
