// Data Storage Module
const Store = {
  dbName: 'bg_tracking_db',
  dbVersion: 2,
  db: null,

  // Get local date string (YYYY-MM-DD in local time zone)
  getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },

  // Get UTC date string (YYYY-MM-DD in UTC)
  getUTCDateString(date) {
    return date.toISOString().split('T')[0];
  },

  // Initialize IndexedDB
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Glucose records store
        if (!db.objectStoreNames.contains('glucose_records')) {
          const glucoseStore = db.createObjectStore('glucose_records', { keyPath: 'id' });
          glucoseStore.createIndex('date', 'date', { unique: false });
          glucoseStore.createIndex('type', 'type', { unique: false });
        }
        
        // Meal records store
        if (!db.objectStoreNames.contains('meal_records')) {
          const mealStore = db.createObjectStore('meal_records', { keyPath: 'id' });
          mealStore.createIndex('date', 'date', { unique: false });
          mealStore.createIndex('meal', 'meal', { unique: false });
        }
        
        // Exercise records store
        if (!db.objectStoreNames.contains('exercise_records')) {
          const exerciseStore = db.createObjectStore('exercise_records', { keyPath: 'id' });
          exerciseStore.createIndex('date', 'date', { unique: false });
          exerciseStore.createIndex('type', 'type', { unique: false });
        }
        
        // Weight records store
        if (!db.objectStoreNames.contains('weight_records')) {
          const weightStore = db.createObjectStore('weight_records', { keyPath: 'id' });
          weightStore.createIndex('date', 'date', { unique: false });
        }
      };
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      
      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  // Generate UUID
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Generic add function
  add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(data);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Generic get all function
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Generic get by date (reads all, filters in JS — works for both UTC and local date formats)
  getByDate(storeName, date) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        const results = all.filter(r => r.date === date);
        resolve(results);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Get by date range
  getByDateRange(storeName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Delete record
  delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ==================== Glucose Records ====================
  
  async addGlucose(data) {
    const record = {
      id: this.generateId(),
      type: data.type, // 'fasting', 'pre_meal', 'post_1h', 'post_2h', 'bedtime', 'random'
      value: parseFloat(data.value),
      unit: 'mmol/L',
      status: this.getGlucoseStatus(data.value),
      timestamp: data.timestamp || new Date().toISOString(),
      date: data.date || this.getLocalDateString(new Date()),
      meal: data.meal || null,
      photo: data.photo || null,
      note: data.note || ''
    };
    
    return await this.add('glucose_records', record);
  },

  async getGlucoseByDate(date) {
    return await this.getByDate('glucose_records', date);
  },

  async getGlucoseByRange(startDate, endDate) {
    return await this.getByDateRange('glucose_records', startDate, endDate);
  },

  getGlucoseStatus(value) {
    if (value < 4.0) return 'low';
    if (value <= 7.8) return 'normal';
    if (value <= 11.0) return 'high';
    return 'very_high';
  },

  // ==================== Meal Records ====================
  
  async addMeal(data) {
    const record = {
      id: this.generateId(),
      date: data.date || this.getLocalDateString(new Date()),
      meal: data.meal, // 'breakfast', 'lunch', 'dinner'
      foods: data.foods || [],
      glucoseId: data.glucoseId || null,
      note: data.note || ''
    };
    
    return await this.add('meal_records', record);
  },

  async getMealByDate(date) {
    return await this.getByDate('meal_records', date);
  },

  // ==================== Exercise Records ====================
  
  async addExercise(data) {
    const record = {
      id: this.generateId(),
      date: data.date || this.getLocalDateString(new Date()),
      type: data.type || 'walking',
      customName: data.customName || '',
      duration: parseInt(data.duration) || 0,
      intensity: data.intensity || 'medium',
      timestamp: data.timestamp || new Date().toISOString(),
      note: data.note || ''
    };
    
    return await this.add('exercise_records', record);
  },

  async getExerciseByDate(date) {
    return await this.getByDate('exercise_records', date);
  },

  // ==================== Weight Records ====================

  async addWeight(data) {
    const record = {
      id: this.generateId(),
      date: data.date || this.getLocalDateString(new Date()),
      value: parseFloat(data.value),
      unit: data.unit || 'kg',
      timestamp: data.timestamp || new Date().toISOString(),
      note: data.note || ''
    };

    return await this.add('weight_records', record);
  },

  async getWeightByDate(date) {
    return await this.getByDate('weight_records', date);
  },

  async getWeightByRange(startDate, endDate) {
    return await this.getByDateRange('weight_records', startDate, endDate);
  },

  // ==================== Settings (LocalStorage) ====================
  
  getSettings() {
    const settings = localStorage.getItem('bg_settings');
    return settings ? JSON.parse(settings) : {
      unit: 'mmol/L',
      targetRange: { min: 4.0, max: 7.8 },
      personalInfo: { name: '', age: 0 }
    };
  },

  saveSettings(settings) {
    localStorage.setItem('bg_settings', JSON.stringify(settings));
  },

  getReminders() {
    const reminders = localStorage.getItem('bg_reminders');
    return reminders ? JSON.parse(reminders) : {
      fastingReminder: { enabled: false, time: '07:00' },
      postMealReminder: { enabled: false, offset: 120 },
      exerciseReminder: { enabled: false, time: '18:00' }
    };
  },

  saveReminders(reminders) {
    localStorage.setItem('bg_reminders', JSON.stringify(reminders));
  },

  getCustomFoods() {
    const foods = localStorage.getItem('bg_foods_custom');
    return foods ? JSON.parse(foods) : [];
  },

  saveCustomFoods(foods) {
    localStorage.setItem('bg_foods_custom', JSON.stringify(foods));
  }
};

// Export
window.Store = Store;
