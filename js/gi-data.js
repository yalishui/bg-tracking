// GI (Glycemic Index) Food Database
const GIData = {
  // Low GI foods (<=55)
  low: [
    { name: '樱桃', gi: 22, gl: 4, carbs: 16 },
    { name: '柚子', gi: 25, gl: 3, carbs: 11 },
    { name: '李子', gi: 24, gl: 5, carbs: 20 },
    { name: '苹果', gi: 36, gl: 5, carbs: 14 },
    { name: '梨', gi: 38, gl: 4, carbs: 11 },
    { name: '桃子', gi: 42, gl: 5, carbs: 12 },
    { name: '橙子', gi: 43, gl: 5, carbs: 12 },
    { name: '草莓', gi: 41, gl: 3, carbs: 8 },
    { name: '蓝莓', gi: 53, gl: 6, carbs: 14 },
    { name: '葡萄', gi: 59, gl: 11, carbs: 18 },
    { name: '奇异果', gi: 50, gl: 7, carbs: 15 },
    { name: '香蕉（生）', gi: 51, gl: 10, carbs: 23 },
    { name: '芒果', gi: 51, gl: 8, carbs: 17 },
    { name: '西瓜', gi: 76, gl: 8, carbs: 8 },
    { name: '全麦面包', gi: 51, gl: 9, carbs: 41 },
    { name: '黑麦面包', gi: 58, gl: 8, carbs: 48 },
    { name: '燕麦片', gi: 55, gl: 13, carbs: 60 },
    { name: '糙米', gi: 50, gl: 16, carbs: 77 },
    { name: '荞麦', gi: 54, gl: 17, carbs: 71 },
    { name: '意面（全麦）', gi: 42, gl: 16, carbs: 37 },
    { name: '意面（普通）', gi: 49, gl: 24, carbs: 75 },
    { name: '红豆', gi: 23, gl: 7, carbs: 63 },
    { name: '绿豆', gi: 27, gl: 11, carbs: 62 },
    { name: '鹰嘴豆', gi: 28, gl: 8, carbs: 27 },
    { name: '扁豆', gi: 32, gl: 12, carbs: 60 },
    { name: '黑豆', gi: 30, gl: 7, carbs: 24 },
    { name: '牛奶', gi: 27, gl: 3, carbs: 5 },
    { name: '酸奶（无糖）', gi: 36, gl: 3, carbs: 5 },
    { name: '豆奶', gi: 34, gl: 1, carbs: 2 },
    { name: '花生', gi: 14, gl: 1, carbs: 8 },
    { name: '杏仁', gi: 15, gl: 0, carbs: 3 },
    { name: '核桃', gi: 15, gl: 0, carbs: 3 },
    { name: '红薯（煮）', gi: 54, gl: 12, carbs: 20 },
    { name: '山药', gi: 51, gl: 11, carbs: 28 },
    { name: '芋头', gi: 53, gl: 13, carbs: 26 },
    { name: '玉米', gi: 52, gl: 18, carbs: 41 },
    { name: '胡萝卜（煮）', gi: 39, gl: 2, carbs: 8 },
    { name: '南瓜', gi: 75, gl: 3, carbs: 4 },
    { name: '西兰花', gi: 15, gl: 1, carbs: 7 },
    { name: '菠菜', gi: 15, gl: 1, carbs: 4 },
    { name: '番茄', gi: 15, gl: 1, carbs: 5 },
    { name: '黄瓜', gi: 15, gl: 1, carbs: 4 },
    { name: '蘑菇', gi: 15, gl: 0, carbs: 3 },
  ],

  // Medium GI foods (56-70)
  medium: [
    { name: '白米饭', gi: 73, gl: 30, carbs: 79 },
    { name: '白面包', gi: 75, gl: 10, carbs: 49 },
    { name: '馒头', gi: 65, gl: 26, carbs: 45 },
    { name: '面条（精制）', gi: 60, gl: 24, carbs: 75 },
    { name: '小米粥', gi: 61, gl: 18, carbs: 75 },
    { name: '玉米片', gi: 69, gl: 18, carbs: 84 },
    { name: '爆米花', gi: 65, gl: 7, carbs: 55 },
    { name: '土豆（煮）', gi: 78, gl: 14, carbs: 17 },
    { name: '土豆泥', gi: 73, gl: 11, carbs: 18 },
    { name: '薯条', gi: 63, gl: 16, carbs: 41 },
    { name: '胡萝卜（生）', gi: 71, gl: 3, carbs: 10 },
    { name: '甜菜', gi: 64, gl: 5, carbs: 10 },
    { name: '南瓜（煮）', gi: 64, gl: 3, carbs: 7 },
    { name: '葡萄干', gi: 64, gl: 28, carbs: 79 },
    { name: '香蕉（熟）', gi: 62, gl: 16, carbs: 27 },
    { name: '奇异果（熟）', gi: 58, gl: 9, carbs: 15 },
    { name: '哈密瓜', gi: 65, gl: 4, carbs: 8 },
    { name: '菠萝', gi: 66, gl: 10, carbs: 13 },
    { name: '无糖可乐', gi: 63, gl: 0, carbs: 0 },
  ],

  // High GI foods (>70)
  high: [
    { name: '葡萄糖', gi: 100, gl: 10, carbs: 100 },
    { name: '白砂糖', gi: 65, gl: 65, carbs: 100 },
    { name: '麦芽糖', gi: 105, gl: 72, carbs: 100 },
    { name: '蜂蜜', gi: 58, gl: 43, carbs: 82 },
    { name: '糯米饭', gi: 87, gl: 45, carbs: 78 },
    { name: '即食燕麦片', gi: 79, gl: 35, carbs: 66 },
    { name: '烙饼', gi: 80, gl: 33, carbs: 52 },
    { name: '油条', gi: 75, gl: 30, carbs: 51 },
    { name: '煎饼', gi: 85, gl: 38, carbs: 50 },
    { name: '土豆片', gi: 60, gl: 18, carbs: 53 },
    { name: '烤红薯', gi: 77, gl: 17, carbs: 25 },
    { name: '蒸红薯', gi: 63, gl: 17, carbs: 25 },
    { name: '西瓜', gi: 76, gl: 8, carbs: 8 },
    { name: '枣（干）', gi: 42, gl: 42, carbs: 75 },
    { name: '桂圆', gi: 53, gl: 44, carbs: 84 },
    { name: '荔枝', gi: 68, gl: 16, carbs: 17 },
    { name: '波萝', gi: 66, gl: 10, carbs: 13 },
  ]
};

// Convert to searchable array
GIData.getAll = function() {
  const all = [...this.low, ...this.medium, ...this.high];
  return all;
};

// Search function
GIData.search = function(query) {
  if (!query) return this.getAll();
  
  const q = query.toLowerCase();
  return this.getAll().filter(item => 
    item.name.toLowerCase().includes(q)
  );
};

// Get GI category
GIData.getCategory = function(gi) {
  if (gi <= 55) return 'low';
  if (gi <= 70) return 'medium';
  return 'high';
};

// Get category label
GIData.getCategoryLabel = function(category) {
  const labels = {
    low: '低GI',
    medium: '中GI',
    high: '高GI'
  };
  return labels[category] || '';
};

// Export for use
window.GIData = GIData;
