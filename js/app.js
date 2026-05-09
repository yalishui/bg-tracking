// Main Application Logic
const app = {
  currentTab: 'home',
  currentPeriod: 'week',
  currentGlucoseType: null,
  currentMealType: null,
  currentExerciseType: 'walking',
  currentIntensity: 'medium',
  currentRecordFilter: 'all',

  // ==================== Date Helpers (6am cutoff) ====================
  // "Today" = before 6am shows yesterday's data (last completed day)
  getEffectiveDate() {
    var now = new Date();
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
  },

  // "Yesterday" = the day before the effective date (for trends)
  getEffectiveYesterday() {
    var d = new Date();
    if (d.getHours() < 6) {
      d.setDate(d.getDate() - 2);
    } else {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  },

  // Format date for display (shows which "day window" user is viewing)
  getEffectiveDateDisplay() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (now.getHours() < 6) {
      now.setDate(now.getDate() - 1);
    }
    var weekday = weekdayNames[now.getDay()];
    var dateStr = year + '年' + month + '月' + day + '日';
    return { dateStr: dateStr, weekday: weekday, isPrevDay: now.getHours() < 6 };
  },

  // ==================== Initialization ====================
  async init() {
    console.log('BG Tracking App Initializing...');
    try {
      await Store.init();
      console.log('Store initialized');
      Charts.init();
      console.log('Charts initialized');
      this.updateDateDisplay();
      await this.loadHomeData();
      this.loadRemindersUI();
      this.loadGIData();
      console.log('App initialized successfully');
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  // ==================== Tab Navigation ====================
  switchTab(tab) {
    this.currentTab = tab;
    var self = this;
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.page').forEach(function(page) {
      var expectedId = 'page' + tab.charAt(0).toUpperCase() + tab.slice(1);
      page.classList.toggle('active', page.id === expectedId);
    });
    if (tab === 'trends') {
      Charts.update(this.currentPeriod);
    } else if (tab === 'records') {
      this.loadRecordsData();
    }
  },

  // ==================== Date Display ====================
  updateDateDisplay() {
    var info = this.getEffectiveDateDisplay();
    var dateEl = document.querySelector('.date-text');
    var weekEl = document.querySelector('.weekday-text');
    if (dateEl) dateEl.textContent = info.dateStr;
    if (weekEl) weekEl.textContent = info.weekday;
  },

  // ==================== Home Page ====================
  async loadHomeData() {
    var today = this.getEffectiveDate();
    var glucoseRecords = await Store.getGlucoseByDate(today);
    var fastingRecord = null;
    for (var i = 0; i < glucoseRecords.length; i++) {
      if (glucoseRecords[i].type === 'fasting') {
        fastingRecord = glucoseRecords[i];
        break;
      }
    }
    if (fastingRecord) {
      this.displayGlucose('fasting', fastingRecord);
    }
    var mealRecords = await Store.getMealByDate(today);
    this.displayMeals(mealRecords);
    var postRecords = glucoseRecords.filter(function(r) {
      return r.type === 'post_1h' || r.type === 'post_2h';
    });
    this.displayPostMealGlucose(postRecords);
    var exerciseRecords = await Store.getExerciseByDate(today);
    this.displayExercise(exerciseRecords);
    var weightRecord = await Store.getWeightByDate(today);
    this.displayWeight(weightRecord.length > 0 ? weightRecord[weightRecord.length - 1] : null);
  },

  displayWeight(record) {
    var display = document.getElementById('weightDisplay');
    var timeEl = document.getElementById('weightTime');
    if (!display) return;
    if (record) {
      display.classList.remove('placeholder');
      display.innerHTML =
        '<span class="weight-value">' + record.value.toFixed(1) + '</span>' +
        '<span class="weight-unit">kg</span>';
      if (timeEl && record.timestamp) {
        var t = new Date(record.timestamp);
        var hh = t.getHours() < 10 ? '0' + t.getHours() : '' + t.getHours();
        var mm = t.getMinutes() < 10 ? '0' + t.getMinutes() : '' + t.getMinutes();
        timeEl.textContent = hh + ':' + mm;
      }
    } else {
      display.classList.add('placeholder');
      display.innerHTML = '<span class="weight-value placeholder">--</span><span class="weight-unit">kg</span>';
      if (timeEl) timeEl.textContent = '';
    }
  },

  displayGlucose(type, record) {
    var display = document.getElementById('fastingDisplay');
    var statusEl = document.getElementById('fastingStatus');
    var timeEl = document.getElementById('fastingTime');
    if (!display) return;
    var statusClass = record.status || 'normal';
    display.classList.remove('placeholder');
    display.innerHTML =
      '<span class="glucose-value ' + statusClass + '">' + record.value.toFixed(1) + '</span>' +
      '<span class="glucose-unit">mmol/L</span>';
    if (statusEl) {
      statusEl.innerHTML = '<span class="status-badge ' + statusClass + '">' + this.getStatusText(record.status) + '</span>';
    }
    if (timeEl && record.timestamp) {
      var t = new Date(record.timestamp);
      var hh = t.getHours() < 10 ? '0' + t.getHours() : '' + t.getHours();
      var mm = t.getMinutes() < 10 ? '0' + t.getMinutes() : '' + t.getMinutes();
      timeEl.textContent = hh + ':' + mm;
    }
  },

  displayMeals(mealRecords) {
    var types = ['breakfast', 'lunch', 'dinner'];
    for (var i = 0; i < types.length; i++) {
      var mealType = types[i];
      var container = document.getElementById(mealType + 'Foods');
      if (!container) continue;
      var mealRecord = null;
      for (var j = 0; j < mealRecords.length; j++) {
        if (mealRecords[j].meal === mealType) {
          mealRecord = mealRecords[j];
          break;
        }
      }
      if (mealRecord && mealRecord.foods && mealRecord.foods.length > 0) {
        var tags = mealRecord.foods.map(function(food) {
          return '<span class="food-tag">' + food + '</span>';
        }).join('');
        container.innerHTML = tags;
      } else {
        container.innerHTML = '<span class="no-data">未记录</span>';
      }
    }
  },

  displayPostMealGlucose(records) {
    // Reset all meal post values first
    var types = ['breakfast', 'lunch', 'dinner'];
    for (var i = 0; i < types.length; i++) {
      var valueContainer = document.getElementById(types[i] + 'PostValue');
      if (valueContainer) {
        valueContainer.innerHTML = '<span class="placeholder">--</span>';
      }
    }
    // Display each record in its corresponding meal card
    for (var j = 0; j < records.length; j++) {
      var record = records[j];
      if (!record.meal) continue;
      var statusClass = record.status || 'normal';
      var valueContainer = document.getElementById(record.meal + 'PostValue');
      if (valueContainer) {
        valueContainer.innerHTML =
          '<span class="glucose-value ' + statusClass + '" style="font-size:1.125rem;">' + record.value.toFixed(1) + '</span>';
      }
    }
  },

  displayExercise(records) {
    var summary = document.getElementById('exerciseSummary');
    var countEl = document.getElementById('exerciseCount');
    var totalEl = document.getElementById('exerciseTotal');
    if (!summary) return;
    if (records.length === 0) {
      summary.innerHTML = '<span class="no-data">暂无运动记录</span>';
      if (countEl) countEl.textContent = '0';
      if (totalEl) totalEl.textContent = '0';
      return;
    }
    var totalDuration = 0;
    for (var i = 0; i < records.length; i++) {
      totalDuration += (records[i].duration || 0);
    }
    var emojiList = records.map(function(r) { return app.getExerciseEmoji(r.type); }).join(' ');
    summary.innerHTML = '<span>' + emojiList + ' ' + records.length + '次运动</span>';
    if (countEl) countEl.textContent = '' + records.length;
    if (totalEl) totalEl.textContent = '' + totalDuration;
  },

  // ==================== Glucose Input ====================
  openGlucoseInput(type) {
    this.currentGlucoseType = type;
    var modal = document.getElementById('glucoseModal');
    var title = document.getElementById('glucoseModalTitle');
    if (type === 'fasting') {
      title.textContent = '记录空腹血糖';
    } else {
      title.textContent = '记录餐后血糖';
    }
    document.getElementById('glucoseInput').value = '';
    document.getElementById('glucoseNote').value = '';
    document.getElementById('glucosePreview').innerHTML =
      '<span class="preview-label">状态:</span><span class="preview-status">--</span>';
    modal.classList.add('active');
  },

  openPostMealInput(mealType) {
    this.currentMealType = mealType;
    this.currentGlucoseType = 'post';
    var modal = document.getElementById('glucoseModal');
    var title = document.getElementById('glucoseModalTitle');
    title.textContent = this.getMealName(mealType) + '后血糖';
    document.getElementById('glucoseInput').value = '';
    document.getElementById('glucoseNote').value = '';
    document.getElementById('glucosePreview').innerHTML =
      '<span class="preview-label">状态:</span><span class="preview-status">--</span>';
    modal.classList.add('active');
  },

  updateGlucosePreview() {
    var input = document.getElementById('glucoseInput');
    var preview = document.getElementById('glucosePreview');
    if (!input || !preview) return;
    var value = parseFloat(input.value);
    if (isNaN(value)) {
      preview.innerHTML = '<span class="preview-label">状态:</span><span class="preview-status">--</span>';
      return;
    }
    var status = Store.getGlucoseStatus(value);
    var statusText = this.getStatusText(status);
    preview.innerHTML = '<span class="preview-label">状态:</span><span class="preview-status ' + status + '">' + statusText + '</span>';
  },

  async saveGlucose() {
    var input = document.getElementById('glucoseInput');
    var note = document.getElementById('glucoseNote').value;
    var value = parseFloat(input.value);
    if (isNaN(value) || value < 1 || value > 30) {
      this.showToast('请输入有效血糖值 (1-30 mmol/L)', 'error');
      return;
    }
    var type = this.currentGlucoseType === 'post' ? 'post_2h' : 'fasting';
    try {
      await Store.addGlucose({ type: type, value: value, meal: this.currentMealType || null, note: note });
      this.showToast('血糖记录已保存', 'success');
      this.closeModal('glucoseModal');
      await this.loadHomeData();
      if (this.currentTab === 'trends') {
        Charts.update(this.currentPeriod);
      }
    } catch (err) {
      console.error('Save glucose error:', err);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  // ==================== Meal Input ====================
  openMealInput(mealType) {
    this.currentMealType = mealType;
    var modal = document.getElementById('mealModal');
    var title = document.getElementById('mealModalTitle');
    title.textContent = '记录' + this.getMealName(mealType);
    document.getElementById('mealFoodsInput').value = '';
    document.getElementById('mealNote').value = '';
    modal.classList.add('active');
  },

  async saveMeal() {
    var foodsInput = document.getElementById('mealFoodsInput').value;
    var note = document.getElementById('mealNote').value;
    if (!foodsInput.trim()) {
      this.showToast('请输入食物内容', 'error');
      return;
    }
    var foods = foodsInput.split(/[,，]/).map(function(f) { return f.trim(); }).filter(function(f) { return f.length > 0; });
    try {
      await Store.addMeal({ meal: this.currentMealType, foods: foods, note: note });
      this.showToast('饮食记录已保存', 'success');
      this.closeModal('mealModal');
      await this.loadHomeData();
    } catch (err) {
      console.error('Save meal error:', err);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  // ==================== Exercise Input ====================
  openExerciseInput() {
    var modal = document.getElementById('exerciseModal');
    this.currentExerciseType = 'walking';
    this.currentIntensity = 'medium';
    document.querySelectorAll('.type-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.type === 'walking');
    });
    document.querySelectorAll('.intensity-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.intensity === 'medium');
    });
    document.getElementById('exerciseDuration').value = '';
    document.getElementById('exerciseNote').value = '';
    modal.classList.add('active');
  },

  selectExerciseType(type) {
    this.currentExerciseType = type;
    document.querySelectorAll('.type-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  },

  selectIntensity(intensity) {
    this.currentIntensity = intensity;
    document.querySelectorAll('.intensity-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.intensity === intensity);
    });
  },

  async saveExercise() {
    var durationEl = document.getElementById('exerciseDuration');
    var note = document.getElementById('exerciseNote').value;
    var duration = parseInt(durationEl.value);
    if (isNaN(duration) || duration <= 0) {
      this.showToast('请输入有效运动时长', 'error');
      return;
    }
    try {
      await Store.addExercise({ type: this.currentExerciseType, duration: duration, intensity: this.currentIntensity, note: note });
      this.showToast('运动记录已保存', 'success');
      this.closeModal('exerciseModal');
      await this.loadHomeData();
    } catch (err) {
      console.error('Save exercise error:', err);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  // ==================== Weight Input ====================
  openWeightInput() {
    document.getElementById('weightInput').value = '';
    document.getElementById('weightNote').value = '';
    document.getElementById('weightModal').classList.add('active');
  },

  async saveWeight() {
    var input = document.getElementById('weightInput');
    var note = document.getElementById('weightNote').value;
    var value = parseFloat(input.value);
    if (isNaN(value) || value < 20 || value > 300) {
      this.showToast('请输入有效体重 (20-300 kg)', 'error');
      return;
    }
    try {
      await Store.addWeight({ value: value, note: note });
      this.showToast('体重记录已保存', 'success');
      this.closeModal('weightModal');
      await this.loadHomeData();
    } catch (err) {
      console.error('Save weight error:', err);
      this.showToast('保存失败，请重试', 'error');
    }
  },

  // ==================== Camera/OCR ====================
  async openCamera(glucoseType, mealType) {
    this.currentGlucoseType = glucoseType;
    this.currentMealType = mealType || null;
    var modal = document.getElementById('cameraModal');
    modal.classList.add('active');

    // Reset OCR state
    var ocrResult = document.getElementById('ocrResult');
    if (ocrResult) ocrResult.style.display = 'none';
    var captureBtn = document.getElementById('captureBtn');
    if (captureBtn) captureBtn.style.display = 'inline-flex';
    var confirmBtn = document.getElementById('confirmOCRBtn');
    if (confirmBtn) confirmBtn.style.display = 'none';
    var retakeBtn = document.getElementById('retakeBtn');
    if (retakeBtn) retakeBtn.style.display = 'none';

    var result = await OCR.initCamera();
    if (!result || result.error) {
      var errMsg = (result && result.message) || '无法访问摄像头，请手动输入';
      this.showToast(errMsg, 'error');
      this.closeModal('cameraModal');
      return;
    }
  },

  handleOCRResult(value) {
    document.getElementById('ocrValue').textContent = value.toFixed(1);
    document.getElementById('ocrResult').style.display = 'block';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('confirmOCRBtn').style.display = 'inline-flex';
    document.getElementById('retakeBtn').style.display = 'inline-flex';
  },

  captureImage() {
    OCR.captureImage();
  },

  retakePhoto() {
    document.getElementById('ocrResult').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'inline-flex';
    document.getElementById('confirmOCRBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'none';
    OCR.stopCamera();
    this.openCamera(this.currentGlucoseType, this.currentMealType);
  },

  saveOCRGlucose() {
    var value = parseFloat(document.getElementById('ocrValue').textContent);
    if (!value || isNaN(value)) {
      this.showToast('无效血糖值', 'error');
      return;
    }
    var type = this.currentGlucoseType === 'post' ? 'post_2h' : 'fasting';
    var meal = this.currentMealType || null;
    var self = this;
    Store.addGlucose({ type: type, value: value, meal: meal, note: 'OCR识别' })
      .then(function() {
        self.showToast('血糖记录已保存（OCR）', 'success');
        self.closeModal('cameraModal');
        self.loadHomeData();
        if (self.currentTab === 'trends') {
          Charts.update(self.currentPeriod);
        }
      })
      .catch(function(err) {
        console.error('OCR save error:', err);
        self.showToast('保存失败', 'error');
      });
  },

  // ==================== Trends ====================
  switchPeriod(period) {
    this.currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.period === period);
    });
    Charts.update(period);
  },

  // ==================== Records ====================
  async loadRecordsData() {
    var filter = this.currentRecordFilter;
    var records = [];

    if (filter === 'all' || filter === 'fasting' || filter === 'post') {
      var glucoseRecords = await Store.getAll('glucose_records');
      for (var i = 0; i < glucoseRecords.length; i++) {
        var g = Object.assign({}, glucoseRecords[i]);
        g.recordType = 'glucose';
        records.push(g);
      }
    }
    if (filter === 'all' || filter === 'exercise') {
      var exerciseRecords = await Store.getAll('exercise_records');
      for (var j = 0; j < exerciseRecords.length; j++) {
        var e = Object.assign({}, exerciseRecords[j]);
        e.recordType = 'exercise';
        records.push(e);
      }
    }
    if (filter === 'all' || filter === 'meal') {
      var mealRecords = await Store.getAll('meal_records');
      for (var k = 0; k < mealRecords.length; k++) {
        var m = Object.assign({}, mealRecords[k]);
        m.recordType = 'meal';
        records.push(m);
      }
    }
    if (filter === 'all' || filter === 'weight') {
      var weightRecords = await Store.getAll('weight_records');
      for (var w = 0; w < weightRecords.length; w++) {
        var wt = Object.assign({}, weightRecords[w]);
        wt.recordType = 'weight';
        records.push(wt);
      }
    }

    records.sort(function(a, b) {
      var timeA = a.timestamp || a.date || '';
      var timeB = b.timestamp || b.date || '';
      return timeB.localeCompare(timeA);
    });

    this.displayRecords(records);
  },

  displayRecords(records) {
    var container = document.getElementById('recordsList');
    if (!container) return;
    if (records.length === 0) {
      container.innerHTML =
        '<div class="no-records"><span class="no-records-icon">📋</span><span>暂无记录</span></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < records.length; i++) {
      html += this.renderRecordItem(records[i]);
    }
    container.innerHTML = html;
  },

  renderRecordItem(record) {
    if (record.recordType === 'glucose') {
      var timeStr = this.formatTime(record.timestamp);
      return '<div class="record-item">' +
        '<div class="record-icon">📊</div>' +
        '<div class="record-info">' +
          '<span class="record-type">' + this.getGlucoseTypeLabel(record.type) + '</span>' +
          '<span class="record-time">' + timeStr + '</span>' +
        '</div>' +
        '<div class="record-value ' + (record.status || '') + '">' + record.value.toFixed(1) + '</div>' +
      '</div>';
    }
    if (record.recordType === 'meal') {
      var foodsPreview = '';
      if (record.foods && record.foods.length > 0) {
        var previewFoods = record.foods.slice(0, 2);
        foodsPreview = previewFoods.join(', ');
        if (record.foods.length > 2) foodsPreview += '...';
      }
      return '<div class="record-item">' +
        '<div class="record-icon">🍽️</div>' +
        '<div class="record-info">' +
          '<span class="record-type">' + this.getMealName(record.meal) + '</span>' +
          '<span class="record-time">' + (record.date || '') + '</span>' +
        '</div>' +
        '<div class="record-value" style="font-size:0.875rem;">' + foodsPreview + '</div>' +
      '</div>';
    }
    if (record.recordType === 'exercise') {
      return '<div class="record-item">' +
        '<div class="record-icon">' + this.getExerciseEmoji(record.type) + '</div>' +
        '<div class="record-info">' +
          '<span class="record-type">' + this.getExerciseName(record.type) + '</span>' +
          '<span class="record-time">' + this.formatTime(record.timestamp) + '</span>' +
        '</div>' +
        '<div class="record-value" style="font-size:0.875rem;">' + (record.duration || 0) + 'min</div>' +
      '</div>';
    }
    if (record.recordType === 'weight') {
      var wTimeStr = this.formatTime(record.timestamp);
      return '<div class="record-item">' +
        '<div class="record-icon">⚖️</div>' +
        '<div class="record-info">' +
          '<span class="record-type">体重</span>' +
          '<span class="record-time">' + wTimeStr + '</span>' +
        '</div>' +
        '<div class="record-value">' + record.value.toFixed(1) + ' kg</div>' +
      '</div>';
    }
    return '';
  },

  filterRecords(filter) {
    this.currentRecordFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.loadRecordsData();
  },

  // ==================== Tools Page ====================
  openGIPage() {
    var giSection = document.getElementById('giSearchSection');
    var reminderSection = document.getElementById('remindersSection');
    if (giSection) giSection.style.display = 'block';
    if (reminderSection) reminderSection.style.display = 'none';
    this.loadGIData();
  },

  openReminders() {
    var giSection = document.getElementById('giSearchSection');
    var reminderSection = document.getElementById('remindersSection');
    if (giSection) giSection.style.display = 'none';
    if (reminderSection) reminderSection.style.display = 'block';
    this.loadRemindersUI();
  },

  loadGIData(query) {
    query = query || '';
    var giList = document.getElementById('giList');
    if (!giList) return;
    var foods = GIData.search(query);
    var html = '';
    var limit = foods.length < 50 ? foods.length : 50;
    for (var i = 0; i < limit; i++) {
      var food = foods[i];
      var cat = GIData.getCategory(food.gi);
      html += '<div class="gi-item">' +
        '<span class="gi-name">' + food.name + '</span>' +
        '<span class="gi-value ' + cat + '">' + food.gi + '</span>' +
        '<span class="gi-gl">GL: ' + food.gl + '</span>' +
      '</div>';
    }
    giList.innerHTML = html;
  },

  searchGI(query) {
    this.loadGIData(query);
  },

  loadRemindersUI() {
    var reminders = Store.getReminders();
    var fastingToggle = document.getElementById('fastingReminderToggle');
    var fastingTime = document.getElementById('fastingTimeInput');
    var postToggle = document.getElementById('postReminderToggle');
    if (fastingToggle) fastingToggle.checked = reminders.fastingReminder.enabled;
    if (fastingTime) fastingTime.value = reminders.fastingReminder.time;
    if (postToggle) postToggle.checked = reminders.postMealReminder.enabled;
  },

  toggleReminder(type, enabled) {
    var reminders = Store.getReminders();
    if (type === 'fasting') {
      reminders.fastingReminder.enabled = enabled;
      if (enabled) {
        Notifications.scheduleFastingReminder(reminders.fastingReminder.time);
      } else {
        Notifications.clearReminder('fasting');
      }
    } else if (type === 'post') {
      reminders.postMealReminder.enabled = enabled;
    }
    Store.saveReminders(reminders);
  },

  updateReminderTime(type, time) {
    var reminders = Store.getReminders();
    if (type === 'fasting') {
      reminders.fastingReminder.time = time;
      if (reminders.fastingReminder.enabled) {
        Notifications.scheduleFastingReminder(time);
      }
    }
    Store.saveReminders(reminders);
  },

  // ==================== Export ====================
  exportData() {
    var self = this;
    Promise.all([
      Store.getAll('glucose_records'),
      Store.getAll('meal_records'),
      Store.getAll('exercise_records')
    ]).then(function(results) {
      var glucose = results[0];
      var meals = results[1];
      var exercise = results[2];
      var csv = '\uFEFF';
      csv += '=== 血糖记录 ===\n';
      csv += '日期,时间,类型,血糖值(mmol/L),状态,备注\n';
      for (var i = 0; i < glucose.length; i++) {
        var r = glucose[i];
        csv += r.date + ',' + self.formatTime(r.timestamp) + ',' + self.getGlucoseTypeLabel(r.type) + ',' + r.value + ',' + self.getStatusText(r.status) + ',' + (r.note || '') + '\n';
      }
      csv += '\n=== 饮食记录 ===\n';
      csv += '日期,餐次,食物,备注\n';
      for (var j = 0; j < meals.length; j++) {
        var mr = meals[j];
        var foodsStr = '';
        if (mr.foods) foodsStr = mr.foods.join('; ');
        csv += (mr.date || '') + ',' + self.getMealName(mr.meal) + ',' + foodsStr + ',' + (mr.note || '') + '\n';
      }
      csv += '\n=== 运动记录 ===\n';
      csv += '日期,时间,类型,时长(分钟),强度,备注\n';
      for (var k = 0; k < exercise.length; k++) {
        var er = exercise[k];
        csv += (er.date || '') + ',' + self.formatTime(er.timestamp) + ',' + self.getExerciseName(er.type) + ',' + (er.duration || 0) + ',' + (er.intensity || '') + ',' + (er.note || '') + '\n';
      }
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'BG_Tracking_Export_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      URL.revokeObjectURL(url);
      self.showToast('数据已导出', 'success');
    });
  },

  showAbout() {
    this.showToast('BG Tracking v1.0.0\n个人血糖追踪应用', 'success');
  },

  openQuickAdd() {
    this.openGlucoseInput('fasting');
  },

  // ==================== Modals ====================
  closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (modalId === 'cameraModal') {
      OCR.stopCamera();
    }
  },

  // ==================== Toast ====================
  showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    var msgEl = toast.querySelector('.toast-message');
    if (msgEl) msgEl.textContent = message;
    toast.className = 'toast';
    if (type) toast.classList.add(type);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
  },

  // ==================== Utility ====================
  getStatusText(status) {
    var texts = { 'normal': '正常', 'high': '偏高', 'very_high': '过高', 'low': '偏低' };
    return texts[status] || '--';
  },

  getGlucoseTypeLabel(type) {
    var labels = { 'fasting': '空腹', 'pre_meal': '餐前', 'post_1h': '餐后1h', 'post_2h': '餐后2h', 'bedtime': '睡前', 'random': '随机' };
    return labels[type] || type || '';
  },

  getMealName(meal) {
    var names = { 'breakfast': '早餐', 'lunch': '午餐', 'dinner': '晚餐' };
    return names[meal] || meal || '';
  },

  getExerciseName(type) {
    var names = { 'walking': '快走', 'running': '跑步', 'cycling': '骑行', 'swimming': '游泳', 'yoga': '瑜伽', 'strength': '力量训练', 'other': '其他' };
    return names[type] || type || '';
  },

  getExerciseEmoji(type) {
    var emojis = { 'walking': '🚶', 'running': '🏃', 'cycling': '🚴', 'swimming': '🏊', 'yoga': '🧘', 'strength': '💪', 'other': '🏋️' };
    return emojis[type] || '🏋️';
  },

  formatTime(isoString) {
    if (!isoString) return '';
    var d = new Date(isoString);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var hh = hours < 10 ? '0' + hours : '' + hours;
    var mm = minutes < 10 ? '0' + minutes : '' + minutes;
    return month + '/' + day + ' ' + hh + ':' + mm;
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  app.init();
});

// Handle glucose input live preview
document.addEventListener('DOMContentLoaded', function() {
  var glucoseInput = document.getElementById('glucoseInput');
  if (glucoseInput) {
    glucoseInput.addEventListener('input', function() {
      if (app && app.updateGlucosePreview) {
        app.updateGlucosePreview();
      }
    });
  }
});

window.app = app;
