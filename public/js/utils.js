// Shared helpers keep the pages consistent and avoid repeating small tasks.
(function () {
  const POLLUTANTS = {
    aqi: { label: 'AQI', unit: 'US AQI' },
    pm25: { label: 'PM2.5', unit: 'µg/m³' },
    pm10: { label: 'PM10', unit: 'µg/m³' },
    co: { label: 'Carbon monoxide', unit: 'µg/m³' },
    no2: { label: 'Nitrogen dioxide', unit: 'µg/m³' },
    o3: { label: 'Ozone', unit: 'µg/m³' },
    temperature: { label: 'Temperature', unit: '°C' },
    humidity: { label: 'Humidity', unit: '%' },
    wind_speed: { label: 'Wind speed', unit: 'km/h' }
  };

  function formatValue(value, digits) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return Number(value).toFixed(digits === undefined ? 1 : digits);
  }

  function aqiCategory(aqi) {
    if (aqi == null || !Number.isFinite(Number(aqi))) return { name: 'Unavailable', className: 'unknown' };
    const value = Number(aqi);
    if (value <= 50) return { name: 'Good', className: 'good' };
    if (value <= 100) return { name: 'Moderate', className: 'moderate' };
    if (value <= 150) return { name: 'Sensitive groups', className: 'sensitive' };
    if (value <= 200) return { name: 'Unhealthy', className: 'unhealthy' };
    if (value <= 300) return { name: 'Very unhealthy', className: 'very-unhealthy' };
    return { name: 'Hazardous', className: 'hazardous' };
  }

  function formatDate(value, options) {
    if (!value) return '—';
    const date = new Date(value.replace(' ', 'T') + (value.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, options || {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(date);
  }

  async function api(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options && options.headers),
        ...(options && options.body ? { 'Content-Type': 'application/json' } : {})
      }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }

  function setLoading(element, loading, message) {
    if (!element) return;
    element.hidden = !loading;
    if (message) {
      const label = element.querySelector('[data-loading-label]');
      if (label) label.textContent = message;
    }
  }

  function showMessage(element, message, type) {
    if (!element) return;
    element.textContent = message;
    element.className = `message message--${type || 'info'}`;
    element.hidden = false;
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem('ecowatch-theme');
    if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const updateLabel = () => {
        const dark = document.documentElement.dataset.theme === 'dark';
        button.setAttribute('aria-pressed', String(dark));
        button.textContent = dark ? '☀ Light mode' : '☾ Dark mode';
      };
      updateLabel();
      button.addEventListener('click', () => {
        const dark = document.documentElement.dataset.theme !== 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        localStorage.setItem('ecowatch-theme', dark ? 'dark' : 'light');
        updateLabel();
      });
    });
  }

  function setupNavigation() {
    const current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a').forEach((link) => {
      const target = link.getAttribute('href').split('/').pop();
      if (target === current) link.setAttribute('aria-current', 'page');
    });
  }

  function exportCsv(filename, rows) {
    if (!rows.length) return false;
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupNavigation();
  });

  window.EcoWatch = {
    POLLUTANTS,
    api,
    aqiCategory,
    exportCsv,
    formatDate,
    formatValue,
    setLoading,
    showMessage
  };
}());
