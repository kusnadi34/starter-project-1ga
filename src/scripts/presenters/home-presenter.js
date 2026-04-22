import StoryModel from '../models/story-model.js';
import MapHelper from '../utils/map-helper.js';
import { getAllStories, saveStory, clearStories, getUnsyncedStories, deleteStory as deleteOfflineStory } from '../utils/idb.js';
import { subscribePush, unsubscribePush } from '../utils/push.js';  

export default class HomePresenter {
  constructor(view) {
    this.view = view;
    this.map = null;
    this.markers = [];
    this.stories = [];
    this.pushEnabled = false;
  }
  
  async loadStories(forceOnline = false) {
    try {
      let stories = [];
      if (forceOnline || navigator.onLine) {
        stories = await StoryModel.getAllStories(1, 50, 1);
        await clearStories();
        for (const s of stories) await saveStory(s);
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        this.pushEnabled = !!sub;
        this.view.updatePushButton(this.pushEnabled);
      } else {
        stories = await getAllStories();
        this.view.showError('Mode offline - data dari cache lokal');
      }
      this.stories = stories;
      this.view.showStories(stories);
      this.initMap(stories);
    } catch (err) {
      console.error(err);
      const offlineStories = await getAllStories();
      if (offlineStories.length) {
        this.view.showStories(offlineStories);
        this.initMap(offlineStories);
        this.view.showError('Gagal ambil data online. Menampilkan data offline.');
      } else {
        this.view.showError('Gagal memuat data. Coba lagi nanti.');
      }
    }
  }
  
  initMap(stories) {
    if (!this.map) {
      this.map = MapHelper.initMap('map', -6.2, 106.8, 12);
      MapHelper.addTileLayer(this.map, 'street');
    } else {
      this.map.invalidateSize();
    }
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
    stories.forEach(s => {
      if (s.lat && s.lon) {
        const m = MapHelper.addMarker(this.map, s.lat, s.lon, `
          <b>${s.name}</b><br>${s.description}<br>
          <img src="${s.photoUrl}" width="150" alt="preview">
          <button class="delete-story-btn" data-id="${s.id}">Hapus</button>
        `);
        this.markers.push(m);
        m.on('popupopen', () => {
          const btn = document.querySelector('.delete-story-btn');
          if (btn) btn.onclick = () => this.deleteStory(s.id);
        });
      }
    });
  }
  async deleteStory(id) {
    if (confirm('Hapus cerita ini?')) {
      await deleteOfflineStory(id);
      this.loadStories(true);
    }
  }
  async syncOfflineStories() {
    const unsynced = await getUnsyncedStories();
    if (unsynced.length === 0) {
      this.view.showError('Tidak ada cerita offline yang perlu disinkronkan.');
      return;
    }
    this.view.showError(`Menyinkronkan ${unsynced.length} cerita...`);
    for (const story of unsynced) {
      try {
        const file = new File([story.photoFile], 'photo.jpg', { type: 'image/jpeg' });
        await StoryModel.addStory(story.description, file, story.lat, story.lon);
        story.sync = true;
        await saveStory(story);
      } catch (e) {
        console.error(e);
      }
    }
    this.view.showError('Sinkronisasi selesai!');
    this.loadStories(true);
  }
  async togglePush() {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.view.showError('Izin notifikasi diperlukan untuk push notification.');
        return;
      }
    }
    if (this.pushEnabled) {
      await unsubscribePush();
      this.pushEnabled = false;
    } else {
      await subscribePush();
      this.pushEnabled = true;
    }
    this.view.updatePushButton(this.pushEnabled);
  }
  flyToMarker(idx, lat, lon) {
    if (lat && lon && this.markers[idx]) {
      this.map.setView([lat, lon], 15);
      this.markers[idx].openPopup();
    }
  }
  
  switchLayer(type) {
    MapHelper.switchTileLayer(this.map, type);
  }
}