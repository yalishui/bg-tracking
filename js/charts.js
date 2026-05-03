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
  }
};

window.Charts = Charts;
