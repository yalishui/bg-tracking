// Charts Module
const Charts = {
  chart: null,
  currentPeriod: 'week',

  init() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '空腹血糖',
            data: [],
            borderColor: '#7CB342',
            backgroundColor: 'rgba(124, 179, 66, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: '餐后血糖',
            data: [],
            borderColor: '#FF8A65',
            backgroundColor: 'rgba(255, 138, 101, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#2D3748',
            titleColor: '#FFFFFF',
            bodyColor: '#FFFFFF',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#718096'
            }
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#718096'
            },
            suggestedMin: 3,
            suggestedMax: 12
          }
        }
      }
    });
  },

  async update(period) {
    this.currentPeriod = period;
    const today = new Date();
    let startDate, labels;
    
    if (period === 'week') {
      // Last 7 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      labels = this.getLast7Days(today);
    } else {
      // Last 30 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);
      labels = this.getLast30Days(today);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    // Fetch data
    const glucoseRecords = await Store.getGlucoseByRange(startDateStr, endDateStr);
    
    // Fill empty labels if not enough data
    const glucoseData = this.processGlucoseData(glucoseRecords, labels, period);
    
    // Update chart
    this.chart.data.labels = labels.displayLabels;
    this.chart.data.datasets[0].data = glucoseData.fasting;
    this.chart.data.datasets[1].data = glucoseData.post;
    this.chart.update();
    
    // Update stats
    this.updateStats(glucoseRecords);
  },

  getLast7Days(today) {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return {
      dates,
      displayLabels: dates.map(d => {
        const date = new Date(d);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      })
    };
  },

  getLast30Days(today) {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return {
      dates,
      displayLabels: dates.map((d, i) => {
        if (i % 5 === 0) {
          const date = new Date(d);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
        return '';
      })
    };
  },

  processGlucoseData(records, labels, period) {
    const fasting = [];
    const post = [];
    
    const fastingMap = {};
    const postMap = {};
    
    records.forEach(record => {
      if (record.type === 'fasting') {
        fastingMap[record.date] = record.value;
      } else if (['post_1h', 'post_2h'].includes(record.type)) {
        postMap[record.date] = record.value;
      }
    });
    
    labels.dates.forEach(date => {
      fasting.push(fastingMap[date] || null);
      post.push(postMap[date] || null);
    });
    
    return { fasting, post };
  },

  updateStats(records) {
    if (records.length === 0) {
      document.getElementById('avgValue').textContent = '--';
      document.getElementById('targetRate').textContent = '--';
      document.getElementById('maxValue').textContent = '--';
      document.getElementById('minValue').textContent = '--';
      return;
    }

    const values = records.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Calculate target rate (within 4.0-7.8 mmol/L)
    const inTarget = records.filter(r => r.value >= 4.0 && r.value <= 7.8).length;
    const targetRate = ((inTarget / records.length) * 100).toFixed(1);

    document.getElementById('avgValue').textContent = avg.toFixed(1);
    document.getElementById('targetRate').textContent = targetRate;
    document.getElementById('maxValue').textContent = max.toFixed(1);
    document.getElementById('minValue').textContent = min.toFixed(1);

    // Update meal gap and daily range stats
    this.updateMealStats(records);
  },

  async updateMealStats(glucoseRecords) {
    // Fetch meal records for postGlucoseId linking
    const startDate = glucoseRecords.length > 0 ? glucoseRecords[glucoseRecords.length - 1].date : null;
    const endDate = glucoseRecords.length > 0 ? glucoseRecords[0].date : null;
    if (!startDate || !endDate) {
      document.getElementById('mealGapValue').textContent = '--';
      document.getElementById('mealGapWeekly').textContent = '周均: --';
      document.getElementById('rangeValue').textContent = '--';
      document.getElementById('rangeWeekly').textContent = '周均: --';
      return;
    }

    const mealRecords = await Store.getByDateRange('meal_records', startDate, endDate);

    // Build map: glucoseId -> meal
    const glucoseToMeal = {};
    mealRecords.forEach(m => {
      if (m.postGlucoseId) glucoseToMeal[m.postGlucoseId] = m;
    });

    // Group glucose records by date
    const byDate = {};
    glucoseRecords.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });
    // Sort each day's records by timestamp
    Object.keys(byDate).forEach(d => {
      byDate[d].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    });

    const dates = Object.keys(byDate).sort();

    // ---- Metric A: Meal Gap (post - baseline) ----
    // breakfast: baseline = fasting; lunch/dinner: baseline = previous post-meal
    const dailyGaps = [];
    let prevPostValue = null;

    dates.forEach(date => {
      const dayRecords = byDate[date];
      let dayGapSum = 0;
      let gapCount = 0;
      let fastingVal = null;

      dayRecords.forEach(r => {
        if (r.type === 'fasting') fastingVal = r.value;
      });

      dayRecords.forEach(r => {
        if (r.type === 'post_1h' || r.type === 'post_2h') {
          const linkedMeal = glucoseToMeal[r.id];
          let baseline = prevPostValue; // default baseline: previous post-meal

          if (linkedMeal && linkedMeal.meal === 'breakfast' && fastingVal !== null) {
            baseline = fastingVal; // breakfast: use fasting as baseline
          }

          if (baseline !== null) {
            const gap = r.value - baseline;
            dayGapSum += gap;
            gapCount++;
          }
          prevPostValue = r.value; // update for next meal
        }
      });

      if (gapCount > 0) {
        dailyGaps.push(dayGapSum / gapCount);
      }
    });

    const dailyMealGap = dailyGaps.length > 0
      ? (dailyGaps.reduce((a, b) => a + b, 0) / dailyGaps.length).toFixed(1)
      : '--';
    const weeklyMealGap = dailyGaps.length > 0 ? dailyGaps.reduce((a, b) => a + b, 0) / dailyGaps.length : null;
    const weeklyMealGapStr = weeklyMealGap !== null ? '周均: ' + weeklyMealGap.toFixed(1) : '周均: --';

    document.getElementById('mealGapValue').textContent = dailyMealGap;
    document.getElementById('mealGapWeekly').textContent = weeklyMealGapStr;

    // ---- Metric B: Daily Range (max - min), weekly avg ----
    const dailyRanges = [];
    dates.forEach(date => {
      const dayRecords = byDate[date];
      if (dayRecords.length < 2) return;
      const vals = dayRecords.map(r => r.value);
      const dayMax = Math.max(...vals);
      const dayMin = Math.min(...vals);
      dailyRanges.push(dayMax - dayMin);
    });

    const dailyRange = dailyRanges.length > 0
      ? (dailyRanges.reduce((a, b) => a + b, 0) / dailyRanges.length).toFixed(1)
      : '--';
    const weeklyRange = dailyRanges.length > 0
      ? dailyRanges.reduce((a, b) => a + b, 0) / dailyRanges.length
      : null;
    const weeklyRangeStr = weeklyRange !== null ? '周均: ' + weeklyRange.toFixed(1) : '周均: --';

    document.getElementById('rangeValue').textContent = dailyRange;
    document.getElementById('rangeWeekly').textContent = weeklyRangeStr;
  }
};

window.Charts = Charts;
