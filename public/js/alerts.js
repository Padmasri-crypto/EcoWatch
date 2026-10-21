// Saved alert rules can be reviewed and removed from this page.
(function () {
  const form = document.querySelector('#alert-form');
  const locationSelect = document.querySelector('#alert-location');
  const list = document.querySelector('#alert-list');
  const message = document.querySelector('#alerts-message');
  const loading = document.querySelector('#alerts-loading');
  let locations = [];

  async function refreshAlerts() {
    const alerts = await EcoWatch.api('/api/alerts');
    if (!alerts.length) {
      list.innerHTML = '<div class="empty-state"><span aria-hidden="true">♧</span><h3>No alert rules yet</h3><p>Create a threshold below and we will flag it on the dashboard when it is exceeded.</p></div>';
      return;
    }
    list.innerHTML = alerts.map((alert) => {
      const label = EcoWatch.POLLUTANTS[alert.pollutant];
      return `<article class="alert-card ${alert.triggered ? 'alert-card--triggered' : ''}">
        <div><span class="alert-status">${alert.triggered ? '● Threshold exceeded' : '● Monitoring'}</span>
          <h3>${alert.city_name} · ${label.label} &gt; ${EcoWatch.formatValue(alert.threshold)} ${label.unit}</h3>
          <p>Current reading: ${EcoWatch.formatValue(alert.current_value)} ${label.unit}</p></div>
        <button class="button button--quiet" type="button" data-delete-alert="${alert.id}" aria-label="Delete ${label.label} alert for ${alert.city_name}">Remove</button>
      </article>`;
    }).join('');
  }

  EcoWatch.api('/api/locations').then((data) => {
    locations = data;
    locationSelect.innerHTML = data.map((place) =>
      `<option value="${place.id}">${place.city_name}</option>`
    ).join('');
    if (!data.length) {
      EcoWatch.showMessage(message, 'Search for a city on the dashboard before creating an alert.', 'info');
      form.querySelector('button[type="submit"]').disabled = true;
    }
    return refreshAlerts();
  }).catch((error) => EcoWatch.showMessage(message, error.message, 'error'))
    .finally(() => EcoWatch.setLoading(loading, false));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.hidden = true;
    const formData = new FormData(form);
    const threshold = Number(formData.get('threshold'));
    try {
      await EcoWatch.api('/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          location_id: Number(formData.get('location_id')),
          pollutant: formData.get('pollutant'),
          threshold
        })
      });
      form.reset();
      EcoWatch.showMessage(message, 'Your alert has been saved.', 'success');
      await refreshAlerts();
    } catch (error) {
      EcoWatch.showMessage(message, error.message, 'error');
    }
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-alert]');
    if (!button) return;
    try {
      await EcoWatch.api(`/api/alerts/${button.dataset.deleteAlert}`, { method: 'DELETE' });
      await refreshAlerts();
      EcoWatch.showMessage(message, 'Alert removed.', 'success');
    } catch (error) {
      EcoWatch.showMessage(message, error.message, 'error');
    }
  });
}());
