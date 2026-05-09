// Data Storage Module — v3 Schema
// Breaking change: adds daily_sessions as root, carbs on foods, cross-linking records
const Store = {
  dbName: 'bg_tracking_db',
  dbVersion: 3,
  db: null,
  _migrationDone: false,

  // ==================== Date Helpers ====================
  getLocalDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },

  // ==================== Init & Migration ====================
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        const oldVersion = e.oldVersion;

        // --- v1 → v2: add weight_records ---
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('glucose_records')) {
            const gs = db.createObjectStore('glucose_records', { keyPath: 'id' });
            gs.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('meal_records')) {
            const ms = db.createObjectStore('meal_records', { keyPath: 'id' });
            ms.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('exercise_records')) {
            const es = db.createObjectStore('exercise_records', { keyPath: 'id' });
            es.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('weight_records')) {
            const ws = db.createObjectStore('weight_records', { keyPath: 'id' });
            ws.createIndex('date', 'date', { unique: false });
          }
        }

        // --- v2 → v3: restructure ---
        if (oldVersion < 3) {
          // daily_sessions: one per day, root of all data
          if (!db.objectStoreNames.contains('daily_sessions')) {
            const ds = db.createObjectStore('daily_sessions', { keyPath: 'id' });
            ds.createIndex('date', 'date', { unique: true });
          }

          // Upgrade glucose_records: add sessionId, mealId, source fields
          if (!db.objectStoreNames.contains('glucose_records')) {
            const gs = db.createObjectStore('glucose_records', { keyPath: 'id' });
            gs.createIndex('date', 'date', { unique: false });
            gs.createIndex('sessionId', 'sessionId', { unique: false });
            gs.createIndex('mealId', 'mealId', { unique: false });
          }

          // Upgrade meal_records: add sessionId, carbs, avgGI, postGlucoseId
          if (!db.objectStoreNames.contains('meal_records')) {
            const ms = db.createObjectStore('meal_records', { keyPath: 'id' });
            ms.createIndex('date', 'date', { unique: false });
            ms.createIndex('sessionId', 'sessionId', { unique: false });
          }

          // Upgrade exercise_records: add sessionId, caloriesBurned
          if (!db.objectStoreNames.contains('exercise_records')) {
            const es = db.createObjectStore('exercise_records', { keyPath: 'id' });
            es.createIndex('date', 'date', { unique: false });
            es.createIndex('sessionId', 'sessionId', { unique: false });
          }

          // weight_records stays same (date, value, unit)
          if (!db.objectStoreNames.contains('weight_records')) {
            const ws = db.createObjectStore('weight_records', { keyPath: 'id' });
            ws.createIndex('date', 'date', { unique: false });
          }
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this._runMigration().then(resolve).catch(reject);
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  // ==================== v2 → v3 Migration ====================
  async _runMigration() {
    if (this._migrationDone) return;
    this._migrationDone = true;

    try {
      const meta = localStorage.getItem('bg_migration_v3');
      if (meta === 'done') {
        console.log('Migration already done, skipping.');
        return;
      }
    } catch (e) {}

    // Check if old stores exist (if db is fresh, skip migration)
    const existingStores = Array.from(this.db.objectStoreNames);
    const hasOldData = existingStores.some(s =>
      ['glucose_records', 'meal_records', 'exercise_records', 'weight_records'].includes(s)
    );
    const hasNewSession = existingStores.includes('daily_sessions');

    // If daily_sessions already has data, migration was done
    if (hasNewSession) {
      const sessions = await this.getAll('daily_sessions');
      if (sessions.length > 0) {
        console.log('daily_sessions already populated, skipping migration.');
        return;
      }
    }

    if (!hasOldData) {
      console.log('No old data to migrate.');
      return;
    }

    console.log('Running v2→v3 migration...');
    const startTime = Date.now();

    // Read all old records
    const [glucoseRecords, mealRecords, exerciseRecords, weightRecords] = await Promise.all([
      this.getAll('glucose_records'),
      this.getAll('meal_records'),
      this.getAll('exercise_records'),
      this.getAll('weight_records')
    ]);

    console.log(`Found: ${glucoseRecords.length} glucose, ${mealRecords.length} meals, ${exerciseRecords.length} exercise, ${weightRecords.length} weight`);

    // Group by date
    const byDate = {};
    const allDates = new Set();

    const addToDate = (record, store) => {
      const d = record.date;
      if (!d) return;
      if (!byDate[d]) byDate[d] = { glucose: [], meals: [], exercise: [], weight: [] };
      if (store === 'glucose') byDate[d].glucose.push(record);
      if (store === 'meal') byDate[d].meals.push(record);
      if (store === 'exercise') byDate[d].exercise.push(record);
      if (store === 'weight') byDate[d].weight.push(record);
      allDates.add(d);
    };

    glucoseRecords.forEach(r => addToDate(r, 'glucose'));
    mealRecords.forEach(r => addToDate(r, 'meal'));
    exerciseRecords.forEach(r => addToDate(r, 'exercise'));
    weightRecords.forEach(r => addToDate(r, 'weight'));

    // For each date, create a daily_session and link records
    const sortedDates = Array.from(allDates).sort();
    let migrated = 0;

    for (const date of sortedDates) {
      const day = byDate[date];
      if (day.glucose.length === 0 && day.meals.length === 0 &&
          day.exercise.length === 0 && day.weight.length === 0) {
        continue;
      }

      // Create daily_session
      const fasting = day.glucose.find(r => r.type === 'fasting');
      const bedtime = day.glucose.find(r => r.type === 'bedtime');
      const weight = day.weight.length > 0 ? day.weight[day.weight.length - 1] : null;

      const session = {
        id: this.generateId(),
        date: date,
        fastingGlucoseId: fasting ? fasting.id : null,
        bedtimeGlucoseId: bedtime ? bedtime.id : null,
        weightId: weight ? weight.id : null,
        exerciseIds: day.exercise.map(e => e.id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save session
      await this._put('daily_sessions', session);

      // Update each glucose record with sessionId
      for (const g of day.glucose) {
        // Find which meal this glucose belongs to (best effort)
        let mealId = null;
        if (g.meal) {
          const linkedMeal = day.meals.find(m => m.meal === g.meal);
          if (linkedMeal) mealId = linkedMeal.id;
        }
        await this._put('glucose_records', {
          ...g,
          sessionId: session.id,
          mealId: g.mealId || mealId || null,
          source: g.source || 'manual'
        });
      }

      // Update each meal record with sessionId and carbs/avgGI (compute if missing)
      for (const m of day.meals) {
        const foods = (m.foods || []).map(f => {
          if (typeof f === 'string') {
            return { name: f, carbs: 0, gi: null };
          }
          return { name: f.name || f, carbs: f.carbs || 0, gi: f.gi || null };
        });
        const carbs = foods.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0), 0);
        const giFoods = foods.filter(f => f.gi != null && f.carbs > 0);
        const avgGI = giFoods.length > 0
          ? giFoods.reduce((sum, f) => sum + f.gi * f.carbs, 0) / giFoods.reduce((sum, f) => sum + f.carbs, 0)
          : null;

        await this._put('meal_records', {
          ...m,
          sessionId: session.id,
          foods: foods,
          totalCarbs: carbs,
          avgGI: avgGI ? Math.round(avgGI) : null,
          postGlucoseId: m.glucoseId || null
        });
      }

      // Update exercise records with sessionId and calories
      for (const e of day.exercise) {
        const calories = this._estimateCalories(e.type, e.duration, e.intensity);
        await this._put('exercise_records', {
          ...e,
          sessionId: session.id,
          caloriesBurned: e.caloriesBurned || calories
        });
      }

      // weight_records already have id, just ensure they're consistent
      migrated++;
    }

    console.log(`Migration complete: ${migrated} days migrated in ${Date.now() - startTime}ms`);

    try {
      localStorage.setItem('bg_migration_v3', 'done');
    } catch (e) {}
  },

  _estimateCalories(exerciseType, duration, intensity) {
    // Rough calorie estimation per 30 min
    const baseRates = {
      walking: 120, running: 300, cycling: 250, swimming: 300,
      yoga: 80, strength: 180, hiit: 350, other: 150
    };
    const intensityMultiplier = { light: 0.7, medium: 1.0, hard: 1.4 };
    const rate = baseRates[exerciseType] || baseRates.other;
    const mult = intensityMultiplier[intensity] || 1.0;
    const mins = parseInt(duration) || 0;
    return Math.round(rate * mult * mins / 30);
  },

  // ==================== Generic CRUD ====================
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  _put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  getByDate(storeName, date) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve((request.result || []).filter(r => r.date === date));
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  getByDateRange(storeName, startDate, endDate) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('date');
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ==================== Daily Sessions ====================
  async getOrCreateSession(date) {
    const sessions = await this.getAll('daily_sessions');
    let session = sessions.find(s => s.date === date);
    if (!session) {
      session = {
        id: this.generateId(),
        date: date,
        fastingGlucoseId: null,
        bedtimeGlucoseId: null,
        weightId: null,
        exerciseIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this._put('daily_sessions', session);
    }
    return session;
  },

  async updateSession(id, updates) {
    const tx = this.db.transaction('daily_sessions', 'readonly');
    const store = tx.objectStore('daily_sessions');
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const session = { ...request.result, ...updates, updatedAt: new Date().toISOString() };
        this._put('daily_sessions', session).then(resolve).catch(reject);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ==================== Glucose Records ====================
  async addGlucose(data) {
    const date = data.date || this.getLocalDateString(new Date());
    const session = await this.getOrCreateSession(date);

    const record = {
      id: this.generateId(),
      sessionId: session.id,
      mealId: data.mealId || null,
      type: data.type,
      value: parseFloat(data.value),
      unit: 'mmol/L',
      status: this.getGlucoseStatus(data.value),
      timestamp: data.timestamp || new Date().toISOString(),
      date: date,
      source: data.source || 'manual',
      note: data.note || ''
    };

    await this._put('glucose_records', record);

    // Link to session
    if (data.type === 'fasting' && !session.fastingGlucoseId) {
      await this.updateSession(session.id, { fastingGlucoseId: record.id });
    } else if (data.type === 'bedtime') {
      await this.updateSession(session.id, { bedtimeGlucoseId: record.id });
    }

    return record;
  },

  getGlucoseByDate(date) {
    return this.getByDate('glucose_records', date);
  },

  getGlucoseByRange(startDate, endDate) {
    return this.getByDateRange('glucose_records', startDate, endDate);
  },

  getGlucoseStatus(value) {
    const v = parseFloat(value);
    if (v < 4.0) return 'low';
    if (v <= 7.8) return 'normal';
    if (v <= 11.0) return 'high';
    return 'very_high';
  },

  // ==================== Meal Records ====================
  async addMeal(data) {
    const date = data.date || this.getLocalDateString(new Date());
    const session = await this.getOrCreateSession(date);

    // Process foods: ensure carbs and gi are numbers
    const foods = (data.foods || []).map(f => {
      if (typeof f === 'string') return { name: f, carbs: 0, gi: null };
      return {
        name: f.name || f,
        carbs: parseFloat(f.carbs) || 0,
        gi: f.gi != null ? parseFloat(f.gi) : null
      };
    });

    const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);
    const giFoods = foods.filter(f => f.gi != null && f.carbs > 0);
    const avgGI = giFoods.length > 0
      ? giFoods.reduce((s, f) => s + f.gi * f.carbs, 0) / giFoods.reduce((s, f) => s + f.carbs, 0)
      : null;

    const record = {
      id: this.generateId(),
      sessionId: session.id,
      meal: data.meal,
      foods: foods,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      avgGI: avgGI ? Math.round(avgGI) : null,
      postGlucoseId: data.postGlucoseId || null,
      timestamp: data.timestamp || new Date().toISOString(),
      date: date,
      note: data.note || ''
    };

    await this._put('meal_records', record);
    return record;
  },

  async linkMealPostGlucose(mealId, glucoseId) {
    const tx = this.db.transaction('meal_records', 'readonly');
    const store = tx.objectStore('meal_records');
    const request = store.get(mealId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const meal = request.result;
        if (meal) {
          meal.postGlucoseId = glucoseId;
          this._put('meal_records', meal).then(resolve).catch(reject);
        } else {
          resolve(null);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  getMealByDate(date) {
    return this.getByDate('meal_records', date);
  },

  // ==================== Exercise Records ====================
  async addExercise(data) {
    const date = data.date || this.getLocalDateString(new Date());
    const session = await this.getOrCreateSession(date);

    const caloriesBurned = data.caloriesBurned ||
      this._estimateCalories(data.type, data.duration, data.intensity);

    const record = {
      id: this.generateId(),
      sessionId: session.id,
      type: data.type || 'walking',
      customName: data.customName || '',
      duration: parseInt(data.duration) || 0,
      intensity: data.intensity || 'medium',
      caloriesBurned: caloriesBurned,
      timestamp: data.timestamp || new Date().toISOString(),
      date: date,
      note: data.note || ''
    };

    await this._put('exercise_records', record);

    // Add to session's exerciseIds
    const exerciseIds = [...(session.exerciseIds || []), record.id];
    await this.updateSession(session.id, { exerciseIds: exerciseIds });

    return record;
  },

  getExerciseByDate(date) {
    return this.getByDate('exercise_records', date);
  },

  // ==================== Weight Records ====================
  async addWeight(data) {
    const date = data.date || this.getLocalDateString(new Date());
    const session = await this.getOrCreateSession(date);

    const record = {
      id: this.generateId(),
      sessionId: session.id,
      date: date,
      value: parseFloat(data.value),
      unit: data.unit || 'kg',
      timestamp: data.timestamp || new Date().toISOString(),
      note: data.note || ''
    };

    await this._put('weight_records', record);
    await this.updateSession(session.id, { weightId: record.id });
    return record;
  },

  getWeightByDate(date) {
    return this.getByDate('weight_records', date);
  },

  getWeightByRange(startDate, endDate) {
    return this.getByDateRange('weight_records', startDate, endDate);
  },

  // ==================== Settings (LocalStorage) ====================
  getSettings() {
    try {
      const s = localStorage.getItem('bg_settings');
      return s ? JSON.parse(s) : {
        unit: 'mmol/L',
        targetRange: { min: 4.0, max: 7.8 },
        personalInfo: { name: '', age: 0 }
      };
    } catch (e) {
      return { unit: 'mmol/L', targetRange: { min: 4.0, max: 7.8 }, personalInfo: { name: '', age: 0 } };
    }
  },

  saveSettings(settings) {
    localStorage.setItem('bg_settings', JSON.stringify(settings));
  },

  getReminders() {
    try {
      const r = localStorage.getItem('bg_reminders');
      return r ? JSON.parse(r) : {
        fastingReminder: { enabled: false, time: '07:00' },
        postMealReminder: { enabled: false, offset: 120 },
        exerciseReminder: { enabled: false, time: '18:00' }
      };
    } catch (e) {
      return { fastingReminder: { enabled: false, time: '07:00' }, postMealReminder: { enabled: false, offset: 120 }, exerciseReminder: { enabled: false, time: '18:00' } };
    }
  },

  saveReminders(reminders) {
    localStorage.setItem('bg_reminders', JSON.stringify(reminders));
  },

  getCustomFoods() {
    try {
      const f = localStorage.getItem('bg_foods_custom');
      return f ? JSON.parse(f) : [];
    } catch (e) { return []; }
  },

  saveCustomFoods(foods) {
    localStorage.setItem('bg_foods_custom', JSON.stringify(foods));
  }
};

window.Store = Store;
