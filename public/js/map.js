// The map shows all cities that have been saved by searches or sample data.
(function () {
  const map = L.map('map', { scrollWheelZoom: false }).setView([11.5, 78.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(map);

  function markerColor(aqi) {
    return EcoWatch.aqiCategory(aqi).className;
  }

  function popupContent(place) {
    const category = EcoWatch.aqiCategory(place.aqi);
    return `<div class="map-popup"><strong>${place.city_name}</strong>
      <span class="map-aqi map-aqi--${markerColor(place.aqi)}">${category.name} · AQI ${EcoWatch.formatValue(place.aqi, 0)}</span>
      <span>PM2.5: ${EcoWatch.formatValue(place.pm25)} µg/m³</span>
      <span>Temperature: ${EcoWatch.formatValue(place.temperature)} °C</span>
      <a href="trends.html?location=${place.id}">View trends</a></div>`;
  }

  EcoWatch.api('/api/locations').then((locations) => {
    const bounds = [];
    locations.forEach((place) => {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return;
      const icon = L.divIcon({
        className: 'map-marker-wrap',
        html: `<span class="map-marker map-marker--${markerColor(place.aqi)}" aria-label="${place.city_name}, AQI ${EcoWatch.formatValue(place.aqi, 0)}"></span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([place.latitude, place.longitude], { icon }).addTo(map).bindPopup(popupContent(place));
      bounds.push([place.latitude, place.longitude]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 8 });
    document.querySelector('#map-loading').hidden = true;
    if (!locations.length) {
      EcoWatch.showMessage(document.querySelector('#map-message'), 'No saved locations yet. Search for a city on the dashboard to add one.', 'info');
    }
  }).catch((error) => {
    document.querySelector('#map-loading').hidden = true;
    EcoWatch.showMessage(document.querySelector('#map-message'), error.message, 'error');
  });
}());
