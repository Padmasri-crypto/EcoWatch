// Trends are read from the server's SQLite history and drawn with Chart.js.
(function () {
  const locationSelect = document.querySelector('#trend-location');
  const pollutantSelect = document.querySelector('#trend-pollutant');
  const rangeSelect = document.querySelector('#trend-range');
  const canvas = document.querySelector('#trend-chart');
  const loading = document.querySelector('#trends-loading');
  const message = document.querySelector('#trends-message');
  let chart;
  let allLocations = [];
  let displayedRows = [];

  async function loadChart() {
    const locationId = locationSelect.value;
    if (!locationId) return;
    EcoWatch.setLoading(loading, true);
    message.hidden = true;
    try {
      const params = new URLSearchParams({
        range: rangeSelect.value,
        pollutant: pollutantSelect.value
      });
      const response = await EcoWatch.api(`/api/locations/${locationId}/readings?${params}`);
      displayedRows = response.readings;
      const config = {
        type: 'line',
        data: {
          labels: displayedRows.map((row) => EcoWatch.formatDate(row.timestamp)),
          datasets: [{
            label: `${EcoWatch.POLLUTANTS[response.pollutant].label} (${EcoWatch.POLLUTANTS[response.pollutant].unit})`,
            data: displayedRows.map((row) => row.value),
            borderColor: '#22745d',
            backgroundColor: 'rgba(34, 116, 93, 0.12)',
            fill: true,
            tension: 0.32,
            pointRadius: 3,
            pointHoverRadius: 6,
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(125, 145, 134, 0.18)' } },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }
          }
        }
      };
      if (chart) chart.destroy();
      chart = new Chart(canvas, config);
      document.querySelector('#trend-empty').hidden = displayedRows.length > 0;
      canvas.hidden = displayedRows.length === 0;
    } catch (error) {
      EcoWatch.showMessage(message, error.message, 'error');
    } finally {
      EcoWatch.setLoading(loading, false);
    }
  }

  EcoWatch.api('/api/locations').then((locations) => {
    allLocations = locations;
    locationSelect.innerHTML = locations.map((place) =>
      `<option value="${place.id}">${place.city_name}</option>`
    ).join('');
    if (!locations.length) {
      EcoWatch.showMessage(message, 'No locations are saved yet. Add a city from the dashboard first.', 'info');
      return;
    }
    const requestedId = new URLSearchParams(location.search).get('location');
    if (requestedId && locations.some((place) => String(place.id) === requestedId)) {
      locationSelect.value = requestedId;
    }
    loadChart();
  }).catch((error) => EcoWatch.showMessage(message, error.message, 'error'));

  [locationSelect, pollutantSelect, rangeSelect].forEach((select) =>
    select.addEventListener('change', loadChart)
  );

  document.querySelector('#export-trends').addEventListener('click', () => {
    const place = allLocations.find((item) => String(item.id) === locationSelect.value);
    if (!displayedRows.length) {
      EcoWatch.showMessage(message, 'There are no readings in this time range to export.', 'info');
      return;
    }
    EcoWatch.exportCsv('ecowatch-trends.csv', [
      ['City', place?.city_name || ''],
      ['Measurement', EcoWatch.POLLUTANTS[pollutantSelect.value].label],
      ['Timestamp', 'Value'],
      ...displayedRows.map((row) => [row.timestamp, row.value ?? ''])
    ]);
  });
}());
