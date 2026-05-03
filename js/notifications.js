// Notifications Module
const Notifications = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },

  async sendNotification(title, options = {}) {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) return;
    
    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      ...options
    };
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  },

  // Schedule fasting reminder
  scheduleFastingReminder(time) {
    // Clear existing
    this.clearReminder('fasting');
    
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduled = new Date();
    scheduled.setHours(hours, minutes, 0, 0);
    
    // If time already passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    
    const delay = scheduled - now;
    
    const timeoutId = setTimeout(() => {
      this.sendNotification('⏰ 空腹血糖测量提醒', {
        body: '该测量空腹血糖了，记得记录哦！',
        tag: 'fasting-reminder'
      });
      
      // Reschedule for next day
      this.scheduleFastingReminder(time);
    }, delay);
    
    // Store timeout ID
    this.storeTimeout('fasting', timeoutId);
  },

  // Schedule post-meal reminder (after meal + offset minutes)
  schedulePostMealReminder(mealType, offsetMinutes) {
    const timeoutId = setTimeout(() => {
      this.sendNotification('⏰ 餐后血糖测量提醒', {
        body: `该测量${this.getMealName(mealType)}后${offsetMinutes}分钟的血糖了！`,
        tag: `post-${mealType}-reminder`
      });
    }, offsetMinutes * 60 * 1000);
    
    this.storeTimeout(`post-${mealType}`, timeoutId);
  },

  getMealName(mealType) {
    const names = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return names[mealType] || mealType;
  },

  storeTimeout(key, timeoutId) {
    if (!this.timeouts) this.timeouts = {};
    this.timeouts[key] = timeoutId;
  },

  clearReminder(key) {
    if (this.timeouts && this.timeouts[key]) {
      clearTimeout(this.timeouts[key]);
      delete this.timeouts[key];
    }
  },

  // Initialize reminders from settings
  initFromSettings() {
    const reminders = Store.getReminders();
    
    if (reminders.fastingReminder.enabled) {
      this.scheduleFastingReminder(reminders.fastingReminder.time);
    }
  }
};

window.Notifications = Notifications;
