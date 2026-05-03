# BG Tracking — 血糖追踪应用规格说明

> **版本:** 1.0 (May 3, 2026)
> **作者:** AC
> **用途:** 个人血糖健康管理

---

## 1. 概念与愿景

一款简洁、温暖的个人血糖追踪工具。不是冰冷的医疗设备，而是一位贴心的日常健康伙伴。界面采用柔和的渐变和圆润的卡片，让每天记录血糖成为一种轻松的自我关怀仪式。数据可视化清晰直观，帮助用户一眼看懂趋势，掌握自己的健康主动权。

---

## 2. 设计语言

### 美学方向
**"温暖数字健康"** — 结合医疗专业感与生活化的柔和设计。避免过于冷硬的医院风格，用温暖的色彩和流畅的动画传递关怀。

### 配色方案
```
Primary:     #4A90A4  (治愈蓝 — 平静、专业)
Secondary:   #7CB342  (健康绿 — 血糖正常)
Accent:      #FF8A65  (温暖橙 — 警示/餐后)
Warning:     #EF5350  (提醒红 — 高血糖)
Low:         #42A5F5  (低血糖蓝)
Background:  #F5F7FA  (浅灰白)
Surface:     #FFFFFF  (纯白卡片)
Text:        #2D3748  (深灰文字)
Text-light:  #718096  (次要文字)
```

### 血糖状态颜色
- **正常范围 (4.0-7.8 mmol/L)**: 绿色 `#7CB342`
- **偏高 (>7.8 mmol/L)**: 橙色 `#FF8A65`
- **过高 (>11.0 mmol/L)**: 红色 `#EF5350`
- **偏低 (<4.0 mmol/L)**: 蓝色 `#42A5F5`

### 字体
- **主字体:** "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif
- **数字:** "DIN Alternate", "Roboto Mono", monospace (血糖数值用等宽字体)

### 空间系统
- 基础单位: 8px
- 卡片圆角: 16px
- 按钮圆角: 12px (大) / 8px (小)
- 页面内边距: 16px (移动端)
- 卡片间距: 12px

### 动效哲学
- **进入:** fade-in + slide-up, 300ms ease-out
- **数字变化:** 计数器动画, 400ms
- **页面切换:** 横向滑动, 250ms ease-in-out
- **按钮反馈:** scale(0.97) + 轻微阴影变化
- **图表:** 数据点依次出现, 50ms stagger

---

## 3. 布局与结构

### 导航
底部 Tab 导航（4个主入口）：
1. **首页** — 今日概览 + 快速记录
2. **趋势** — 周/月血糖曲线 + 统计
3. **记录** — 历史记录列表 + 筛选
4. **工具** — GI查询 + 设置

### 页面结构

#### 首页 (Home)
```
┌─────────────────────────┐
│  日期选择器 + 星期显示    │
├─────────────────────────┤
│  ╭─────────────────────╮ │
│  │  空腹血糖             │ │
│  │  [数值输入] [拍照识别] │ │
│  │  ● 正常 / ○ 偏高 / ○ 偏低│ │
│  ╰─────────────────────╯ │
├─────────────────────────┤
│  早餐/午餐/晚餐 三个卡片   │
│  ┌────────┬────────┐     │
│  │饮食记录 │餐后血糖│     │
│  │   🍳   │ 6.2   │     │
│  └────────┴────────┘     │
├─────────────────────────┤
│  今日运动 ╭───────────╮   │
│          │ 快走 30min │   │
│          ╰───────────╯   │
├─────────────────────────┤
│  [添加记录按钮 FAB]       │
└─────────────────────────┘
```

#### 趋势页 (Trends)
- 周视图折线图（7天）
- 月视图折线图（30天）
- 统计卡片：平均值、达标率、波动幅度
- 饮食关联分析（可选）

#### 记录页 (Records)
- 按日期分组的历史列表
- 每条记录显示：时间、类型、血糖值、关联饮食
- 支持按类型筛选（空腹/餐前/餐后/运动）
- 点击可查看详情/编辑

#### 工具页 (Tools)
- **GI 查询：** 搜索食物 + GI值列表
- **提醒设置：** 每日空腹/餐后提醒时间
- **目标设置：** 血糖正常范围设定
- **数据导出：** CSV/JSON 导出
- **关于：** 版本信息

---

## 4. 功能与交互

### 4.1 血糖记录
**输入方式：**
- 手动键盘输入（mmol/L，精度0.1）
- 拍照识别（调用设备相机，OCR识别血糖仪数值）
- 快速选择常用值

**血糖类型：**
- 空腹血糖（早餐前）
- 餐前血糖（午餐/晚餐前）
- 餐后1h血糖
- 餐后2h血糖
- 睡前血糖
- 随机血糖

**交互细节：**
- 输入时实时显示血糖状态颜色
- 保存后显示确认动画（心形脉冲）
- 支持补录历史记录

### 4.2 饮食记录
**每餐记录内容：**
- 食物名称 + 份量
- 碳水化合物估算（可选）
- 关联的餐后血糖（自动关联）

**食物库：**
- 预置常见食物GI/碳水数据
- 支持自定义添加食物
- 快速选择常用食物组合

### 4.3 运动记录
**运动类型：**
- 快走、跑步、骑行、游泳、瑜伽、力量训练等
- 自定义运动名称
- 时长（分钟）
- 强度（低/中/高）

### 4.4 GI 查询
**数据源：**
- 预置 100+ 常见食物GI值
- 低GI (<55)、中GI (55-70)、高GI (>70) 分类
- 支持搜索

**显示信息：**
- 食物名称
- GI值
- GL（血糖负荷）
- 碳水含量（每100g）

### 4.5 提醒功能
**提醒类型：**
- 空腹血糖测量提醒（可设定时间）
- 餐后血糖测量提醒（用餐后1h/2h自动提示）
- 每日运动目标提醒

**实现方式：**
- 浏览器 Notification API
- PWA 后台推送（如果支持）
- 显示在首页醒目位置

### 4.6 数据可视化
**周曲线：**
- X轴：日期
- Y轴：血糖值 (mmol/L)
- 多条线：空腹、餐后1h、餐后2h
- 正常范围背景色带

**月曲线：**
- 简化版折线图
- 点击可看单日详情

**统计指标：**
- 平均值（空腹/餐后）
- 达标率（正常范围内比例）
- 最高/最低值
- 波动幅度（标准差）

### 4.7 拍照识别血糖
**流程：**
1. 点击拍照按钮
2. 打开设备相机
3. 拍摄血糖仪屏幕
4. 使用 Tesseract.js 进行 OCR
5. 提取数值，填充输入框
6. 用户确认/修改

**优化：**
- 引导框帮助对准
- 支持手动框选数字区域
- 显示识别置信度

---

## 5. 组件清单

### 5.1 血糖值卡片 (GlucoseCard)
- 显示数值（大号数字）
- 血糖状态指示色条
- 记录时间
- 关联标签（空腹/餐后等）
- **状态：** 空（未记录）/ 已记录 / 异常高 / 异常低

### 5.2 餐次卡片 (MealCard)
- 餐次名称 + 图标（🍳🥗🍽️）
- 饮食预览（食物标签）
- 餐后血糖值
- 状态：未记录 / 已记录 / 餐后血糖异常

### 5.3 记录项 (RecordItem)
- 时间 + 类型图标
- 主值（血糖/运动时长）
- 副信息（食物、运动类型）
- 血糖状态色点

### 5.4 趋势图表 (TrendChart)
- Chart.js 折线图
- 可切换周/月视图
- 可切换血糖类型
- 触摸查看单点数据

### 5.5 GI 列表项 (GIfoodItem)
- 食物名称
- GI值 + 颜色标识
- GL值（次要）
- 添加到饮食记录按钮

### 5.6 底部导航 (TabBar)
- 4个Tab + 图标
- 当前Tab高亮
- 轻微放大动画

### 5.7 浮动按钮 (FAB)
- 快速添加记录
- 点击展开选项（血糖/饮食/运动）
- 底部弹出选择菜单

### 5.8 提醒提示 (ReminderBadge)
- 首页顶部提醒指示
- 点击查看今日待测项目

---

## 6. 技术方案

### 架构
**PWA (Progressive Web App)**
- 单页应用 (SPA)
- Service Worker 离线支持
- Web App Manifest 可安装到主屏
- 移动端优先响应式设计

### 技术栈
- **前端框架:** Vanilla JS (轻量、零依赖)
- **样式:** CSS3 + CSS Variables
- **图表:** Chart.js 4.x
- **OCR:** Tesseract.js (浏览器端)
- **存储:** LocalStorage + IndexedDB (大量历史数据)
- **构建:** 无需构建，直接浏览器运行

### 数据模型

```javascript
// 血糖记录
{
  id: "uuid",
  type: "fasting" | "pre_meal" | "post_1h" | "post_2h" | "bedtime" | "random",
  value: 5.6,  // mmol/L
  unit: "mmol/L",
  status: "normal" | "high" | "low" | "very_high",
  timestamp: "2026-05-03T07:30:00",
  date: "2026-05-03",
  meal: "breakfast" | "lunch" | "dinner" | null,
  photo: "base64_string" | null,
  note: "string"
}

// 饮食记录
{
  id: "uuid",
  date: "2026-05-03",
  meal: "breakfast" | "lunch" | "dinner",
  foods: [
    { name: "全麦面包", gi: 50, carbs: 30, portion: "2片" }
  ],
  glucoseId: "linked_glucose_id" | null,  // 关联餐后血糖
  note: "string"
}

// 运动记录
{
  id: "uuid",
  date: "2026-05-03",
  type: "walking" | "running" | "cycling" | "swimming" | "yoga" | "strength" | "other",
  customName: "string",
  duration: 30,  // 分钟
  intensity: "low" | "medium" | "high",
  timestamp: "2026-05-03T18:00:00",
  note: "string"
}

// GI 食物库
{
  name: "白米饭",
  nameEn: "White Rice",
  gi: 73,
  gl: 30,
  carbs: 100,  // per 100g
  category: "主食"
}

// 提醒设置
{
  fastingReminder: { enabled: true, time: "07:00" },
  postMealReminder: { enabled: true, offset: 120 },  // 饭后120分钟
  exerciseReminder: { enabled: false, time: "18:00" }
}

// 用户设置
{
  unit: "mmol/L",
  targetRange: { min: 4.0, max: 7.8 },
  personalInfo: { name: "", age: 0 }
}
```

### 存储结构
```
LocalStorage:
  - bg_settings: 用户设置
  - bg_reminders: 提醒配置
  - bg_foods_custom: 自定义食物

IndexedDB (bg_tracking_db):
  - glucose_records: 血糖记录
  - meal_records: 饮食记录
  - exercise_records: 运动记录
```

### 文件结构
```
/Users/ac/WorkBuddy/bg-tracking/
├── index.html          # 主入口
├── manifest.json       # PWA清单
├── sw.js               # Service Worker
├── css/
│   └── style.css       # 所有样式
├── js/
│   ├── app.js          # 主应用逻辑
│   ├── router.js       # 简单路由
│   ├── store.js        # 数据存储 (LocalStorage + IndexedDB)
│   ├── charts.js       # 图表渲染
│   ├── ocr.js          # 拍照识别
│   ├── gi-data.js      # GI食物库
│   └── notifications.js # 提醒功能
├── icons/              # PWA图标
└── SPEC.md             # 本文档
```

### 第三方资源
- Chart.js: https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js
- Tesseract.js: https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js
- Google Fonts: Noto Sans SC

---

## 7. 实现优先级

### P0 — MVP (核心)
1. 血糖记录（手动输入）
2. 今日概览首页
3. 历史记录列表
4. 趋势图表（周）
5. LocalStorage 数据持久化

### P1 — 完善
1. 饮食记录
2. 运动记录
3. GI 查询
4. 月趋势图表
5. 数据导出

### P2 — 增强
1. 拍照识别血糖
2. 提醒功能
3. 统计指标
4. PWA 安装提示

### P3 — 未来
1. 饮食照片上传
2. 趋势预测
3. 报告生成（周报/月报）
4. 多语言支持

---

## 8. 里程碑

- [ ] **M1:** 基础框架 + 首页 + 血糖记录 → May 3, 2026
- [ ] **M2:** 趋势图表 + 历史记录 → May 4, 2026
- [ ] **M3:** 饮食/运动追踪 + GI查询 → May 5, 2026
- [ ] **M4:** 拍照识别 + 提醒 → May 6, 2026
- [ ] **M5:** PWA 优化 + 测试 → May 7, 2026
