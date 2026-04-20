import StoryModel from '../../models/story-model.js';
import MapHelper from '../../utils/map-helper.js';

let mapInstance = null;
let markers = [];

export default class HomePage {
  async render() {
    return `
      <div class="container">
        <h1>Cerita Lokal</h1>
        <div id="map" style="height: 400px;"></div>
        <div class="layer-control" style="margin-block: 10px;">
          <button id="toggle-satelit">Mode Satelit</button>
          <button id="toggle-street">Mode Jalan</button>
        </div>
        <h2>Daftar Cerita</h2>
        <div id="story-list" class="story-list">Memuat data...</div>
      </div>
    `;
  }
  
  async afterRender() {
    try {
      const stories = await StoryModel.getAllStories(1, 20, 1);
      const listContainer = document.getElementById('story-list');
      if (!listContainer) return;
      if (stories.length === 0) {
        listContainer.innerHTML = '<p>Belum ada cerita dengan lokasi.</p>';
      } else {
        listContainer.innerHTML = stories.map(story => `
          <div class="story-card" data-lat="${story.lat}" data-lon="${story.lon}">
            <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}" loading="lazy">
            <div class="content">
              <strong>${story.name}</strong>
              <p>${story.description.substring(0, 100)}</p>
              <small>${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
            </div>
          </div>
        `).join('');
      }
      
      if (!mapInstance) {
        mapInstance = MapHelper.initMap('map', -6.2, 106.8, 12);
        MapHelper.addTileLayer(mapInstance, 'street');
      } else {
        mapInstance.invalidateSize();
      }
      
      markers.forEach(m => mapInstance.removeLayer(m));
      markers = [];
      
      stories.forEach(story => {
        if (story.lat && story.lon) {
          const marker = MapHelper.addMarker(mapInstance, story.lat, story.lon, `
            <b>${story.name}</b><br>${story.description}<br>
            <img src="${story.photoUrl}" width="150" alt="preview">
          `);
          markers.push(marker);
        }
      });
      
      document.querySelectorAll('.story-card').forEach((card, idx) => {
        card.addEventListener('click', () => {
          const lat = parseFloat(card.dataset.lat);
          const lon = parseFloat(card.dataset.lon);
          if (lat && lon && markers[idx]) {
            mapInstance.setView([lat, lon], 15);
            markers[idx].openPopup();
          }
        });
      });
      
      let currentLayer = 'street';
      document.getElementById('toggle-satelit')?.addEventListener('click', () => {
        if (currentLayer === 'street') {
          MapHelper.switchTileLayer(mapInstance, 'satellite');
          currentLayer = 'satellite';
        }
      });
      document.getElementById('toggle-street')?.addEventListener('click', () => {
        if (currentLayer === 'satellite') {
          MapHelper.switchTileLayer(mapInstance, 'street');
          currentLayer = 'street';
        }
      });
      
    } catch (error) {
      console.error(error);
      document.getElementById('story-list').innerHTML = '<p>Gagal memuat data. Coba login dulu?</p>';
    }
  }
}