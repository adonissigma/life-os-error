// ============================================================
// Life OS — KernelX build for Verse
// ============================================================

const DB_KEY = 'lifeos.db.v2';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d.toISOString().slice(0, 10);

const DEFAULT_DB = {
  settings: { theme: 'light', currency: 'VND', dailyBudget: 0 },
  profile: { name: '' },
  tasks: [],
  habits: [],
  habitLogs: {},
  journal: [],
  goals: [],
  vision: {
    statement: '', mission: '', values: '',
    wheel: [
      { key:'career',   label:'Sự nghiệp',   score: 5 },
      { key:'finance',  label:'Tài chính',   score: 5 },
      { key:'health',   label:'Sức khỏe',    score: 5 },
      { key:'family',   label:'Gia đình',    score: 5 },
      { key:'friends',  label:'Bạn bè',      score: 5 },
      { key:'love',     label:'Tình yêu',    score: 5 },
      { key:'learning', label:'Học tập',     score: 5 },
      { key:'spirit',   label:'Tinh thần',   score: 5 },
      { key:'fun',      label:'Giải trí',    score: 5 },
      { key:'contrib',  label:'Đóng góp',    score: 5 },
      { key:'env',      label:'Môi trường',  score: 5 },
      { key:'growth',   label:'Phát triển',  score: 5 },
    ],
    bucket: [],
  },
  wallets: [{ id: 'w1', name: 'Tiền mặt', balance: 0 }],
  transactions: [],
  health: { sleep: [], exercise: [], mood: [], water: {} },
  meals: { today: {}, recipes: [], groceries: [] },
  home: { chores: [], maintenance: [] },
  learning: { books: [], courses: [], cards: [] },
  creative: { ideas: [], media: [] },
  relationships: { contacts: [], gifts: [] },
  travel: { trips: [], packing: [] },
  reviews: [],
};

function download(name, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ============================================================
// EXPORT ENGINE
// ============================================================
const Exporter = {

  range(period, ref = new Date()) {
    const d = new Date(ref);
    let start, end;
    if (period === 'day') {
      start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      end = new Date(start); end.setDate(end.getDate() + 1);
    } else if (period === 'week') {
      const day = (d.getDay() + 6) % 7;
      start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0,0,0,0);
      end = new Date(start); end.setDate(end.getDate() + 7);
    } else if (period === 'month') {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    } else if (period === 'quarter') {
      const q = Math.floor(d.getMonth() / 3);
      start = new Date(d.getFullYear(), q * 3, 1);
      end = new Date(d.getFullYear(), q * 3 + 3, 1);
    } else if (period === 'year') {
      start = new Date(d.getFullYear(), 0, 1);
      end = new Date(d.getFullYear() + 1, 0, 1);
    } else {
      return { start: new Date(0), end: new Date(8640000000000000), label: 'Toàn bộ' };
    }
    return { start, end, label: `${fmtDate(start)} → ${fmtDate(new Date(end - 1))}` };
  },

  inRange(dateStr, r) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= r.start && d < r.end;
  },

  gather(period, section, db) {
    const r = this.range(period);
    const out = {
      period, section, label: r.label,
      generatedAt: new Date().toISOString(),
      profile: db.profile,
    };

    const want = (s) => section === 'all' || section === s;

    if (want('tasks'))     out.tasks     = db.tasks.filter(t => this.inRange(t.created || t.due, r));
    if (want('journal'))   out.journal   = db.journal.filter(j => this.inRange(j.date, r));
    if (want('finance'))   out.transactions = db.transactions.filter(t => this.inRange(t.date, r));
    if (want('health'))    out.health    = {
      sleep:    db.health.sleep.filter(s => this.inRange(s.date, r)),
      exercise: db.health.exercise.filter(e => this.inRange(e.date, r)),
      mood:     db.health.mood.filter(m => this.inRange(m.date, r)),
    };
    if (want('habits'))    {
      out.habits = db.habits;
      out.habitLogs = {};
      for (const hid in db.habitLogs) {
        const days = Object.keys(db.habitLogs[hid]).filter(d => this.inRange(d, r));
        if (days.length) out.habitLogs[hid] = days;
      }
    }
    if (want('goals'))     out.goals     = db.goals;
    if (want('vision'))    out.vision    = db.vision;
    if (want('meals'))     out.meals     = db.meals;
    if (want('home'))      out.home      = db.home;
    if (want('learning'))  out.learning  = db.learning;
    if (want('creative'))  out.creative  = db.creative;
    if (want('relationships')) out.relationships = db.relationships;
    if (want('travel'))    out.travel    = db.travel;
    if (want('reviews'))   out.reviews   = db.reviews.filter(rv => this.inRange(rv.date, r));
    if (section === 'all') {
      out.wallets = db.wallets;
    }
    return out;
  },

  stats(data) {
    const t = data.tasks || [];
    const done = t.filter(x => x.done).length;
    const tx = data.transactions || [];
    const income  = tx.filter(x => x.type === 'income').reduce((a,b) => a + (b.amount||0), 0);
    const expense = tx.filter(x => x.type === 'expense').reduce((a,b) => a + (b.amount||0), 0);
    const sleep = (data.health && data.health.sleep) || [];
    const sleepAvg = sleep.length
      ? (sleep.reduce((a,b) => a + (b.hours||0), 0) / sleep.length).toFixed(1)
      : '—';
    return { tasksTotal: t.length, tasksDone: done, income, expense, balance: income - expense, sleepAvg };
  },

  toJSON(data) { return JSON.stringify(data, null, 2); },

  toMarkdown(data) {
    const s = this.stats(data);
    let md = `# Life OS Report — ${data.label}\n\n`;
    md += `_Xuất: ${new Date(data.generatedAt).toLocaleString('vi-VN')}_\n\n`;

    md += `## 📊 Tổng quan\n`;
    md += `- Task: **${s.tasksDone}/${s.tasksTotal}**\n`;
    md += `- Thu: **${s.income.toLocaleString()}** · Chi: **${s.expense.toLocaleString()}** · Chênh: **${s.balance.toLocaleString()}**\n`;
    md += `- Ngủ trung bình: **${s.sleepAvg}h**\n\n`;

    if (data.tasks) {
      md += `## ✅ Tasks\n`;
      data.tasks.forEach(t => { md += `- [${t.done?'x':' '}] ${t.title}${t.due?' (due '+t.due+')':''}\n`; });
      md += '\n';
    }
    if (data.habits) {
      md += `## 🔁 Habits\n`;
      data.habits.forEach(h => {
        const days = (data.habitLogs[h.id]||[]).length;
        md += `- ${h.icon||'🔁'} **${h.name}** — ${days} ngày\n`;
      });
      md += '\n';
    }
    if (data.journal) {
      md += `## 📓 Journal\n`;
      data.journal.forEach(j => { md += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; });
    }
    if (data.goals) {
      md += `## 🏁 Goals\n`;
      data.goals.forEach(g => { md += `- **${g.title}** — ${g.progress}%${g.deadline?' · '+g.deadline:''}\n`; });
      md += '\n';
    }
    if (data.transactions) {
      md += `## 💰 Giao dịch\n`;
      data.transactions.forEach(t => {
        md += `- ${t.date} · ${t.type==='income'?'+':'-'}${t.amount.toLocaleString()} · ${t.category||''} ${t.note||''}\n`;
      });
      md += '\n';
    }
    if (data.health) {
      md += `## 🏃 Sức khỏe\n`;
      md += `### Ngủ\n`;
      (data.health.sleep||[]).forEach(s => { md += `- ${s.date}: ${s.hours}h (q${s.quality})\n`; });
      md += `### Vận động\n`;
      (data.health.exercise||[]).forEach(e => { md += `- ${e.date}: ${e.type} — ${e.minutes}p\n`; });
      md += `### Mood\n`;
      (data.health.mood||[]).forEach(m => { md += `- ${m.date}: ${m.mood}\n`; });
    }
    return md;
  },

  toAI(period, data) {
    const s = this.stats(data);
    const periodName = { day:'hôm nay', week:'tuần này', month:'tháng này', quarter:'quý này', year:'năm nay', all:'toàn bộ' }[period] || period;
    const sectionLabel = data.section === 'all' ? 'toàn bộ Life OS' : `mục ${data.section}`;

    let p = `Bạn là trợ lý phân tích cuộc sống cá nhân. Dưới đây là dữ liệu Life OS của tôi cho ${sectionLabel}, kỳ ${periodName} (${data.label}).\n\n`;
    p += `Hãy trả về:\n`;
    p += `1. **Điểm sáng** — 3 điều tôi làm tốt\n`;
    p += `2. **Điểm tối / rủi ro** — 3 điều đáng lo\n`;
    p += `3. **Pattern** — mối liên hệ giữa các chỉ số (ngủ, mood, tiền, năng suất)\n`;
    p += `4. **Đề xuất cụ thể** — 3-5 hành động cho kỳ tới\n`;
    p += `5. **Câu hỏi tự vấn** — 3 câu\n\n`;
    p += `Giọng: thẳng thắn, không tâng bốc, không moralize. Tôi là người lớn.\n\n---\n\n# DỮ LIỆU\n\n`;

    p += `## 📊 Tổng quan\n`;
    p += `- Task: ${s.tasksDone}/${s.tasksTotal} hoàn thành\n`;
    p += `- Thu: ${s.income.toLocaleString()} · Chi: ${s.expense.toLocaleString()} · Chênh: ${s.balance.toLocaleString()}\n`;
    p += `- Ngủ trung bình: ${s.sleepAvg}h\n\n`;

    if (data.tasks) {
      p += `## ✅ Tasks (${data.tasks.length})\n`;
      data.tasks.forEach(t => { p += `- [${t.done?'x':' '}] ${t.title}${t.due?' | due '+t.due:''} | P${t.priority??2}\n`; });
      p += '\n';
    }
    if (data.habits) {
      p += `## 🔁 Habits\n`;
      data.habits.forEach(h => {
        const days = (data.habitLogs[h.id]||[]).length;
        p += `- ${h.name}: ${days} ngày\n`;
      });
      p += '\n';
    }
    if (data.journal) {
      p += `## 📓 Journal (${data.journal.length})\n`;
      data.journal.forEach(j => { p += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; });
    }
    if (data.goals) {
      p += `## 🏁 Goals\n`;
      data.goals.forEach(g => { p += `- ${g.title}: ${g.progress}%${g.deadline?' (dl '+g.deadline+')':''}\n`; });
      p += '\n';
    }
    if (data.vision) {
      p += `## 🧭 Vision\n`;
      p += `Statement: ${data.vision.statement || '—'}\n`;
      p += `Mission: ${data.vision.mission || '—'}\n`;
      p += `Values: ${data.vision.values || '—'}\n`;
      if (data.vision.wheel) {
        p += `Life Wheel:\n`;
        data.vision.wheel.forEach(w => { p += `- ${w.label}: ${w.score}/10\n`; });
      }
      p += '\n';
    }
    if (data.transactions) {
      p += `## 💰 Giao dịch (${data.transactions.length})\n`;
      data.transactions.forEach(t => {
        p += `- ${t.date} | ${t.type} | ${t.amount} | ${t.category||''} | ${t.note||''}\n`;
      });
      p += '\n';
    }
    if (data.health) {
      p += `## 🏃 Sức khỏe\n`;
      p += `### Ngủ\n`;
      (data.health.sleep||[]).forEach(x => { p += `- ${x.date}: ${x.hours}h / q${x.quality||'-'}\n`; });
      p += `### Vận động\n`;
      (data.health.exercise||[]).forEach(x => { p += `- ${x.date}: ${x.type} ${x.minutes}p\n`; });
      p += `### Mood\n`;
      (data.health.mood||[]).forEach(x => { p += `- ${x.date}: ${x.mood}\n`; });
      p += '\n';
    }
    if (data.meals) {
      p += `## 🍱 Meals\n`;
      p += `Recipes: ${(data.meals.recipes||[]).length}\n`;
      p += `Groceries: ${(data.meals.groceries||[]).length}\n\n`;
    }
    if (data.learning) {
      p += `## 📚 Learning\n`;
      p += `Books: ${(data.learning.books||[]).length} · Courses: ${(data.learning.courses||[]).length} · Cards: ${(data.learning.cards||[]).length}\n\n`;
    }
    if (data.relationships) {
      p += `## 👥 Relationships\n`;
      (data.relationships.contacts||[]).forEach(c => { p += `- ${c.name} (${c.rel||'—'})${c.birthday?' 🎂'+c.birthday:''}\n`; });
      p += '\n';
    }
    if (data.travel) {
      p += `## ✈️ Travel\n`;
      (data.travel.trips||[]).forEach(t => { p += `- ${t.name} → ${t.dest} (${t.start} → ${t.end})\n`; });
      p += '\n';
    }
    if (data.reviews) {
      p += `## 📊 Reviews\n`;
      data.reviews.forEach(r => { p += `### ${r.type} · ${r.date}\n${JSON.stringify(r.answers)}\n\n`; });
    }

    p += `---\n\nBây giờ, phân tích giúp tôi.`;
    return p;
  },

  toCSV(data) {
    const rows = [['type','date','title/category','value','note']];
    (data.tasks||[]).forEach(t => rows.push(['task', t.due||t.created||'', t.title, t.priority??2, t.done?'done':'']));
    (data.transactions||[]).forEach(t => rows.push(['transaction', t.date, t.category||'', t.amount, t.note||'']));
    (data.journal||[]).forEach(j => rows.push(['journal', j.date, j.mood||'', '', (j.text||'').slice(0,80)]));
    if (data.health) {
      (data.health.sleep||[]).forEach(s => rows.push(['sleep', s.date, 'hours', s.hours, 'q'+s.quality]));
      (data.health.exercise||[]).forEach(e => rows.push(['exercise', e.date, e.type, e.minutes, '']));
    }
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  },
};

// ============================================================
// STORAGE
// ============================================================
const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB));
      const parsed = JSON.parse(raw);
      return deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), parsed);
    } catch { return JSON.parse(JSON.stringify(DEFAULT_DB)); }
  },
  save(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { console.error(e); }
  },
};

function deepMerge(base, over) {
  const out = { ...base };
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], over[k]);
    } else {
      out[k] = over[k];
    }
  }
  return out;
}

// ============================================================
// ALPINE APP
// ============================================================
function lifeOS() {
  return {
    view: 'dashboard',
    sidebarOpen: true,
    showExport: false,
    exportPeriod: 'week',
    exportSection: 'all',
    exportType: 'ai',
    exportPreview: '',
    copiedMsg: '',
    taskFilter: 'all',
    paletteOpen: false,
    paletteQuery: '',
    reviewType: 'weekly',
    reviewAnswers: {},
    db: JSON.parse(JSON.stringify(DEFAULT_DB)),

    newTask:     { title:'', due:'', priority:2 },
    newHabit:    { name:'', icon:'🔁' },
    newJournal:  { text:'', mood:'🙂' },
    newGoal:     { title:'', deadline:'', category:'' },
    newTx:       { type:'expense', amount:null, category:'', note:'' },
    newSleep:    { hours:null, quality:4 },
    newEx:       { type:'', minutes:null },
    newBucket:   { title:'', cat:'' },
    newMeal:     { breakfast:'', lunch:'', dinner:'' },
    newRecipe:   { name:'', ingredients:'' },
    newGrocery:  '',
    newChore:    { name:'', freq:'weekly' },
    newMaint:    { name:'', next:'' },
    newBook:     { title:'', author:'', status:'want' },
    newCourse:   { title:'', platform:'' },
    newCard:     { q:'', a:'' },
    newIdea:     { text:'', tag:'' },
    newMedia:    { title:'', status:'watchlist' },
    newContact:  { name:'', rel:'', birthday:'' },
    newGift:     { for:'', idea:'' },
    newTrip:     { name:'', dest:'', start:'', end:'' },
    newPack:     '',

    reviewPrompts: {
      daily: {
        title: '🌙 Daily Review',
        questions: ['Hôm nay thế nào?', 'Đã làm được gì?', 'Chưa làm được gì?', 'Ngày mai ưu tiên gì?'],
      },
      weekly: {
        title: '📅 Weekly Review',
        questions: ['Điểm sáng / điểm tối trong tuần?', 'Task hoàn thành / tồn đọng?', 'Habit nào giữ, nào bỏ?', 'Tiền tiêu tuần này?', 'Sức khỏe tuần này?', 'Mục tiêu tuần sau?', '1 bài học lớn?'],
      },
      monthly: {
        title: '📆 Monthly Review',
        questions: ['So với tháng trước thế nào?', 'Life Wheel cập nhật ra sao?', 'OKR tiến độ?', 'Tài chính tháng?', 'Điều chỉnh mục tiêu gì?'],
      },
      quarterly: {
        title: '🗓 Quarterly Review',
        questions: ['Nhìn lại quý vừa qua?', 'Điều chỉnh OKR?', 'Kế hoạch quý tới?'],
      },
      yearly: {
        title: '🎊 Yearly Review',
        questions: ['Tổng kết năm?', 'Top 10 khoảnh khắc?', 'Bài học lớn?', 'Mục tiêu năm tới?'],
      },
    },

    nav: [
      { group: 'Tổng quan', items: [
        { id:'dashboard', icon:'🏠', label:'Dashboard' },
        { id:'reviews',   icon:'📊', label:'Reviews' },
        { id:'analytics', icon:'📈', label:'Analytics' },
      ]},
      { group: 'Cá nhân', items: [
        { id:'vision',  icon:'🧭', label:'Vision' },
        { id:'goals',   icon:'🏁', label:'Goals' },
        { id:'tasks',   icon:'✅', label:'Tasks' },
        { id:'habits',  icon:'🔁', label:'Habits' },
        { id:'journal', icon:'📓', label:'Journal' },
      ]},
      { group: 'Cuộc sống', items: [
        { id:'finance', icon:'💰', label:'Finance' },
        { id:'health',  icon:'🏃', label:'Health' },
        { id:'meals',   icon:'🍱', label:'Meals' },
        { id:'home',    icon:'🏠', label:'Home' },
      ]},
      { group: 'Phát triển', items: [
        { id:'learning',      icon:'📚', label:'Learning' },
        { id:'creative',      icon:'🎨', label:'Creative' },
        { id:'relationships', icon:'👥', label:'Relationships' },
        { id:'travel',        icon:'✈️', label:'Travel' },
      ]},
      { group: 'Hệ thống', items: [
        { id:'automation', icon:'🤖', label:'AI & Export' },
        { id:'settings',   icon:'⚙️', label:'Settings' },
      ]},
    ],

    commands: [],

    // ---------- lifecycle ----------
    init() {
      this.db = Storage.load();
      document.body.classList.toggle('dark', this.db.settings.theme === 'dark');

      this.$watch('db', () => {
        Storage.save(this.db);
        document.body.classList.toggle('dark', this.db.settings.theme === 'dark');
      }, { deep: true });

      this.$watch('showExport', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportPeriod', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportSection', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportType', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('paletteOpen', (v) => { if (v) this.$nextTick(() => this.$refs.paletteInput?.focus()); });

      // Auto open sidebar on desktop
      if (window.innerWidth < 900) this.sidebarOpen = false;
      window.addEventListener('resize', () => {
        if (window.innerWidth < 900 && this.sidebarOpen) this.sidebarOpen = false;
      });

      // Keyboard: Ctrl+K / Cmd+K / Win+K
      window.addEventListener('keydown', (e) => {
        const k = e.key?.toLowerCase();
        if ((e.metaKey || e.ctrlKey) && k === 'k') {
          e.preventDefault();
          this.openPalette();
        }
        if ((e.metaKey || e.ctrlKey) && k === 'b') {
          e.preventDefault();
          this.toggleSidebar();
        }
        if (e.key === 'Escape' && this.paletteOpen) this.paletteOpen = false;
      });

      this.buildCommands();
    },

    buildCommands() {
      const cmds = [];
      this.nav.forEach(g => g.items.forEach(it => {
        cmds.push({ id: 'go_' + it.id, icon: it.icon, label: 'Đi tới ' + it.label, hint: 'page', action: () => { this.view = it.id; this.paletteOpen = false; } });
      }));
      cmds.push({ id:'theme',  icon:'🌙', label:'Đổi theme sáng/tối',  hint: 'ui',   action: () => { this.toggleTheme(); this.paletteOpen = false; } });
      cmds.push({ id:'export', icon:'📤', label:'Mở Export',            hint: 'data', action: () => { this.openExport('all'); this.paletteOpen = false; } });
      cmds.push({ id:'backup', icon:'💾', label:'Tải backup JSON',      hint: 'data', action: () => { this.exportAll(); this.paletteOpen = false; } });
      cmds.push({ id:'side',   icon:'◀',  label:'Ẩn/hiện sidebar',      hint: 'ui',   action: () => { this.toggleSidebar(); this.paletteOpen = false; } });
      this.commands = cmds;
    },

    filteredCommands() {
      const q = this.paletteQuery.toLowerCase().trim();
      if (!q) return this.commands;
      return this.commands.filter(c => c.label.toLowerCase().includes(q) || c.hint.includes(q));
    },

    runPaletteAction(cmd) {
      if (!cmd) return;
      cmd.action();
      this.paletteQuery = '';
    },

    openPalette() { this.paletteOpen = true; },

    toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
    toggleTheme() {
      this.db.settings.theme = this.db.settings.theme === 'dark' ? 'light' : 'dark';
    },

    // ---------- helpers ----------
    greeting() {
      const h = new Date().getHours();
      const name = this.db.profile.name ? ', ' + this.db.profile.name : '';
      if (h < 12) return 'Chào buổi sáng' + name;
      if (h < 18) return 'Chào buổi chiều' + name;
      return 'Chào buổi tối' + name;
    },
    todayLabel() {
      return new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    },
    timeAgo(iso) {
      const diff = (Date.now() - new Date(iso)) / 1000;
      if (diff < 60) return 'vừa xong';
      if (diff < 3600) return Math.floor(diff/60) + ' phút trước';
      if (diff < 86400) return Math.floor(diff/3600) + ' giờ trước';
      return Math.floor(diff/86400) + ' ngày trước';
    },
    fmt(n) {
      if (n == null || isNaN(n)) return '0';
      const cur = this.db.settings.currency || 'VND';
      return new Intl.NumberFormat('vi-VN').format(n) + ' ' + cur;
    },

    // ---------- tasks ----------
    addTask() {
      if (!this.newTask.title.trim()) return;
      this.db.tasks.unshift({
        id: uid(), title: this.newTask.title.trim(),
        due: this.newTask.due || '', priority: this.newTask.priority ?? 2,
        done: false, created: new Date().toISOString(),
      });
      this.newTask = { title:'', due:'', priority:2 };
    },
    toggleTask(t) {
      t.done = !t.done;
      t.completedAt = t.done ? new Date().toISOString() : null;
    },
    deleteTask(id) { this.db.tasks = this.db.tasks.filter(t => t.id !== id); },
    todayTasks() {
      const today = todayISO();
      return this.db.tasks.filter(t => !t.done && (!t.due || t.due <= today));
    },
    doneTodayTasks() {
      const today = todayISO();
      return this.db.tasks.filter(t => t.done && t.completedAt && t.completedAt.slice(0,10) === today).length;
    },
    filteredTasks() {
      const today = todayISO();
      const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate()+7);
      const q = (this.search || '').toLowerCase();
      let list = this.db.tasks;
      if (q) list = list.filter(t => t.title.toLowerCase().includes(q));
      if (this.taskFilter === 'today') list = list.filter(t => !t.done && (!t.due || t.due <= today));
      else if (this.taskFilter === 'upcoming') list = list.filter(t => !t.done && t.due && t.due > today && new Date(t.due) <= weekEnd);
      else if (this.taskFilter === 'done') list = list.filter(t => t.done);
      return list;
    },

    // ---------- habits ----------
    addHabit() {
      if (!this.newHabit.name.trim()) return;
      this.db.habits.push({ id: uid(), name: this.newHabit.name.trim(), icon: this.newHabit.icon || '🔁', created: new Date().toISOString() });
      this.newHabit = { name:'', icon:'🔁' };
    },
    deleteHabit(id) {
      this.db.habits = this.db.habits.filter(h => h.id !== id);
      delete this.db.habitLogs[id];
    },
    isHabitDone(id, date = todayISO()) {
      return !!(this.db.habitLogs[id] && this.db.habitLogs[id][date]);
    },
    toggleHabit(id, date = todayISO()) {
      if (!this.db.habitLogs[id]) this.db.habitLogs[id] = {};
      if (this.db.habitLogs[id][date]) delete this.db.habitLogs[id][date];
      else this.db.habitLogs[id][date] = true;
    },
    habitStreak(id) {
      const log = this.db.habitLogs[id] || {};
      let streak = 0;
      const d = new Date();
      if (!log[fmtDate(d)]) d.setDate(d.getDate() - 1);
      while (log[fmtDate(d)]) { streak++; d.setDate(d.getDate() - 1); }
      return streak;
    },
    habitsDoneToday() { return this.db.habits.filter(h => this.isHabitDone(h.id)).length; },
    last30Days() {
      const arr = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        arr.push(fmtDate(d));
      }
      return arr;
    },

    // ---------- journal ----------
    addJournal() {
      if (!this.newJournal.text.trim()) return;
      this.db.journal.unshift({
        id: uid(), date: todayISO(), mood: this.newJournal.mood,
        text: this.newJournal.text.trim(), created: new Date().toISOString(),
      });
      this.newJournal = { text:'', mood:'🙂' };
    },
    deleteJournal(id) { this.db.journal = this.db.journal.filter(j => j.id !== id); },
    sortedJournal() {
      const q = (this.search || '').toLowerCase();
      let list = [...this.db.journal].sort((a,b) => b.created.localeCompare(a.created));
      if (q) list = list.filter(j => j.text.toLowerCase().includes(q));
      return list;
    },
    journalStreak() {
      const dates = new Set(this.db.journal.map(j => j.date));
      let streak = 0;
      const d = new Date();
      if (!dates.has(fmtDate(d))) d.setDate(d.getDate() - 1);
      while (dates.has(fmtDate(d))) { streak++; d.setDate(d.getDate() - 1); }
      return streak;
    },

    // ---------- goals ----------
    addGoal() {
      if (!this.newGoal.title.trim()) return;
      this.db.goals.push({
        id: uid(), title: this.newGoal.title.trim(),
        deadline: this.newGoal.deadline || '', category: this.newGoal.category || '',
        progress: 0, created: new Date().toISOString(),
      });
      this.newGoal = { title:'', deadline:'', category:'' };
    },
    deleteGoal(id) { this.db.goals = this.db.goals.filter(g => g.id !== id); },

    // ---------- vision ----------
    addBucket() {
      if (!this.newBucket.title.trim()) return;
      this.db.vision.bucket.push({ id: uid(), title: this.newBucket.title.trim(), cat: this.newBucket.cat || '', done: false });
      this.newBucket = { title:'', cat:'' };
    },

    // ---------- finance ----------
    totalBalance() { return this.db.wallets.reduce((a,w) => a + (w.balance||0), 0); },
    addTx() {
      if (!this.newTx.amount) return;
      const tx = {
        id: uid(), type: this.newTx.type,
        amount: Number(this.newTx.amount),
        category: this.newTx.category || '', note: this.newTx.note || '',
        date: todayISO(), created: new Date().toISOString(),
      };
      this.db.transactions.unshift(tx);
      if (this.db.wallets[0]) this.db.wallets[0].balance += tx.type === 'income' ? tx.amount : -tx.amount;
      this.newTx = { type:'expense', amount:null, category:'', note:'' };
    },
    deleteTx(id) {
      const tx = this.db.transactions.find(t => t.id === id);
      if (!tx) return;
      if (this.db.wallets[0]) this.db.wallets[0].balance -= tx.type === 'income' ? tx.amount : -tx.amount;
      this.db.transactions = this.db.transactions.filter(t => t.id !== id);
    },
    spentToday() {
      return this.db.transactions
        .filter(t => t.type === 'expense' && t.date === todayISO())
        .reduce((a,t) => a + t.amount, 0);
    },

    // ---------- health ----------
    logSleep() {
      if (!this.newSleep.hours) return;
      this.db.health.sleep.unshift({ id: uid(), date: todayISO(), hours: Number(this.newSleep.hours), quality: Number(this.newSleep.quality) || 3 });
      this.newSleep = { hours:null, quality:4 };
    },
    logExercise() {
      if (!this.newEx.type || !this.newEx.minutes) return;
      this.db.health.exercise.unshift({ id: uid(), date: todayISO(), type: this.newEx.type, minutes: Number(this.newEx.minutes) });
      this.newEx = { type:'', minutes:null };
    },
    logMood(m) {
      const existing = this.db.health.mood.find(x => x.date === todayISO());
      if (existing) existing.mood = m;
      else this.db.health.mood.unshift({ id: uid(), date: todayISO(), mood: m });
    },
    todayMood() {
      const e = this.db.health.mood.find(x => x.date === todayISO());
      return e ? e.mood : null;
    },
    waterToday() { return this.db.health.water[todayISO()] || 0; },
    addWater() {
      const t = todayISO();
      this.db.health.water[t] = (this.db.health.water[t] || 0) + 1;
    },
    avgSleep() {
      const s = this.db.health.sleep.slice(0, 30);
      if (!s.length) return '—';
      return (s.reduce((a,b) => a + b.hours, 0) / s.length).toFixed(1);
    },

    // ---------- meals ----------
    saveMeal(slot, val) {
      if (!this.db.meals.today) this.db.meals.today = {};
      this.db.meals.today[slot] = val;
    },
    addRecipe() {
      if (!this.newRecipe.name.trim()) return;
      this.db.meals.recipes.push({ id: uid(), name: this.newRecipe.name.trim(), ingredients: this.newRecipe.ingredients || '' });
      this.newRecipe = { name:'', ingredients:'' };
    },
    addGrocery() {
      if (!this.newGrocery.trim()) return;
      this.db.meals.groceries.push({ id: uid(), name: this.newGrocery.trim(), done: false });
      this.newGrocery = '';
    },

    // ---------- home ----------
    addChore() {
      if (!this.newChore.name.trim()) return;
      this.db.home.chores.push({ id: uid(), name: this.newChore.name.trim(), freq: this.newChore.freq, doneToday: false });
      this.newChore = { name:'', freq:'weekly' };
    },
    addMaint() {
      if (!this.newMaint.name.trim()) return;
      this.db.home.maintenance.push({ id: uid(), name: this.newMaint.name.trim(), next: this.newMaint.next || '' });
      this.newMaint = { name:'', next:'' };
    },

    // ---------- learning ----------
    addBook() {
      if (!this.newBook.title.trim()) return;
      this.db.learning.books.push({ id: uid(), ...this.newBook });
      this.newBook = { title:'', author:'', status:'want' };
    },
    addCourse() {
      if (!this.newCourse.title.trim()) return;
      this.db.learning.courses.push({ id: uid(), ...this.newCourse });
      this.newCourse = { title:'', platform:'' };
    },
    addCard() {
      if (!this.newCard.q.trim()) return;
      this.db.learning.cards.push({ id: uid(), q: this.newCard.q.trim(), a: this.newCard.a || '' });
      this.newCard = { q:'', a:'' };
    },

    // ---------- creative ----------
    addIdea() {
      if (!this.newIdea.text.trim()) return;
      this.db.creative.ideas.push({ id: uid(), text: this.newIdea.text.trim(), tag: this.newIdea.tag || '' });
      this.newIdea = { text:'', tag:'' };
    },
    addMedia() {
      if (!this.newMedia.title.trim()) return;
      this.db.creative.media.push({ id: uid(), title: this.newMedia.title.trim(), status: this.newMedia.status });
      this.newMedia = { title:'', status:'watchlist' };
    },

    // ---------- relationships ----------
    addContact() {
      if (!this.newContact.name.trim()) return;
      this.db.relationships.contacts.push({ id: uid(), ...this.newContact });
      this.newContact = { name:'', rel:'', birthday:'' };
    },
    addGift() {
      if (!this.newGift.idea.trim()) return;
      this.db.relationships.gifts.push({ id: uid(), for: this.newGift.for || '', idea: this.newGift.idea.trim() });
      this.newGift = { for:'', idea:'' };
    },

    // ---------- travel ----------
    addTrip() {
      if (!this.newTrip.name.trim()) return;
      this.db.travel.trips.push({ id: uid(), ...this.newTrip });
      this.newTrip = { name:'', dest:'', start:'', end:'' };
    },
    addPack() {
      if (!this.newPack.trim()) return;
      this.db.travel.packing.push({ id: uid(), name: this.newPack.trim(), done: false });
      this.newPack = '';
    },

    // ---------- reviews ----------
    saveReview() {
      const answers = this.reviewPrompts[this.reviewType].questions.map((_, i) => this.reviewAnswers[this.reviewType + '_' + i] || '');
      this.db.reviews.unshift({ id: uid(), type: this.reviewType, date: todayISO(), answers, created: new Date().toISOString() });
      this.reviewAnswers = {};
    },

    // ---------- analytics ----------
    spendingByCategory() {
      const map = {};
      this.db.transactions.filter(t => t.type === 'expense').forEach(t => {
        const c = t.category || 'Khác';
        map[c] = (map[c] || 0) + t.amount;
      });
      const arr = Object.entries(map).map(([name, total]) => ({ name, total }));
      const max = Math.max(1, ...arr.map(a => a.total));
      return arr.sort((a,b) => b.total - a.total).map(a => ({ ...a, pct: Math.round(a.total / max * 100) }));
    },

    // ---------- export ----------
    openExport(section = 'all') {
      this.exportSection = section;
      this.showExport = true;
      this.refreshPreview();
    },
    refreshPreview() {
      const data = Exporter.gather(this.exportPeriod, this.exportSection, this.db);
      if (this.exportType === 'ai') this.exportPreview = Exporter.toAI(this.exportPeriod, data);
      else if (this.exportType === 'md') this.exportPreview = Exporter.toMarkdown(data);
      else if (this.exportType === 'json') this.exportPreview = Exporter.toJSON(data);
      else if (this.exportType === 'csv') this.exportPreview = Exporter.toCSV(data);
    },
    downloadExport() {
      const data = Exporter.gather(this.exportPeriod, this.exportSection, this.db);
      const stamp = todayISO();
      const tag = `${this.exportSection}-${this.exportPeriod}-${stamp}`;
      if (this.exportType === 'ai') download(`ai-prompt-${tag}.txt`, Exporter.toAI(this.exportPeriod, data));
      else if (this.exportType === 'md') download(`report-${tag}.md`, Exporter.toMarkdown(data), 'text/markdown');
      else if (this.exportType === 'json') download(`data-${tag}.json`, Exporter.toJSON(data), 'application/json');
      else if (this.exportType === 'csv') download(`data-${tag}.csv`, Exporter.toCSV(data), 'text/csv');
    },
    async copyExport() {
      try {
        await navigator.clipboard.writeText(this.exportPreview);
        this.copiedMsg = '✓ Đã copy!';
        setTimeout(() => this.copiedMsg = '', 2000);
      } catch {
        this.copiedMsg = 'Không copy được, hãy tự chọn';
      }
    },
    async copyQuickAI() {
      const data = Exporter.gather(this.exportPeriod, 'all', this.db);
      const text = Exporter.toAI(this.exportPeriod, data);
      try {
        await navigator.clipboard.writeText(text);
        this.copiedMsg = '✓ Đã copy prompt AI! Dán vào ChatGPT/Claude/Gemini.';
        setTimeout(() => this.copiedMsg = '', 4000);
      } catch {
        this.copiedMsg = 'Không copy được';
      }
    },

    // ---------- backup ----------
    exportAll() {
      download(`lifeos-backup-${todayISO()}.json`, JSON.stringify(this.db, null, 2), 'application/json');
    },
    importAll(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (confirm('Ghi đè toàn bộ dữ liệu hiện tại?')) {
            this.db = deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), parsed);
          }
        } catch { alert('File không hợp lệ'); }
      };
      reader.readAsText(file);
    },
    resetAll() {
      if (confirm('Xoá TẤT CẢ dữ liệu? Không hoàn tác được.')) {
        this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
      }
    },
  };
}

window.lifeOS = lifeOS;
