// ============================================================
// Life OS — KernelX build for Verse
// ============================================================

const DB_KEY = 'lifeos.db.v1';

const DEFAULT_DB = {
  settings: { theme: 'light', currency: 'VND', dailyBudget: 0 },
  profile: { name: '' },
  tasks: [],
  habits: [],
  habitLogs: {},       // { habitId: { 'YYYY-MM-DD': true } }
  journal: [],
  goals: [],
  wallets: [{ id: 'w1', name: 'Tiền mặt', balance: 0 }],
  transactions: [],
  health: { sleep: [], exercise: [], mood: [], water: {} },
};

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d) => d.toISOString().slice(0, 10);

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
      const day = (d.getDay() + 6) % 7; // T2 = 0
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

  gather(period, db) {
    const r = this.range(period);
    const out = {
      period, label: r.label,
      generatedAt: new Date().toISOString(),
      profile: db.profile,
      tasks: db.tasks.filter(t => this.inRange(t.created || t.due, r)),
      habits: db.habits,
      habitLogs: {},
      journal: db.journal.filter(j => this.inRange(j.date, r)),
      goals: db.goals,
      transactions: db.transactions.filter(t => this.inRange(t.date, r)),
      wallets: db.wallets,
      health: {
        sleep: db.health.sleep.filter(s => this.inRange(s.date, r)),
        exercise: db.health.exercise.filter(e => this.inRange(e.date, r)),
        mood: db.health.mood.filter(m => this.inRange(m.date, r)),
      },
    };
    // habit logs in range
    for (const hid in db.habitLogs) {
      const inRangeDays = Object.keys(db.habitLogs[hid]).filter(d => this.inRange(d, r));
      if (inRangeDays.length) out.habitLogs[hid] = inRangeDays;
    }
    return out;
  },

  stats(data) {
    const t = data.tasks;
    const done = t.filter(x => x.done).length;
    const income = data.transactions.filter(x => x.type === 'income').reduce((a,b) => a + (b.amount||0), 0);
    const expense = data.transactions.filter(x => x.type === 'expense').reduce((a,b) => a + (b.amount||0), 0);
    const sleepAvg = data.health.sleep.length
      ? (data.health.sleep.reduce((a,b) => a + (b.hours||0), 0) / data.health.sleep.length).toFixed(1)
      : '—';
    return { tasksTotal: t.length, tasksDone: done, income, expense, balance: income - expense, sleepAvg };
  },

  toJSON(data) { return JSON.stringify(data, null, 2); },

  toMarkdown(data) {
    const s = this.stats(data);
    let md = `# Life OS Report — ${data.label}\n\n`;
    md += `_Xuất lúc: ${new Date(data.generatedAt).toLocaleString('vi-VN')}_\n\n`;

    md += `## 📊 Tổng quan\n`;
    md += `- Task: **${s.tasksDone}/${s.tasksTotal}** hoàn thành\n`;
    md += `- Thu: **${s.income.toLocaleString()}** · Chi: **${s.expense.toLocaleString()}** · Chênh: **${s.balance.toLocaleString()}**\n`;
    md += `- Ngủ trung bình: **${s.sleepAvg}h**\n\n`;

    md += `## ✅ Tasks\n`;
    data.tasks.forEach(t => { md += `- [${t.done?'x':' '}] ${t.title}${t.due?' (due '+t.due+')':''}\n`; });
    md += '\n';

    md += `## 🔁 Habits\n`;
    data.habits.forEach(h => {
      const days = (data.habitLogs[h.id]||[]).length;
      md += `- ${h.icon||'🔁'} **${h.name}** — ${days} ngày trong kỳ\n`;
    });
    md += '\n';

    md += `## 📓 Journal\n`;
    data.journal.forEach(j => { md += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; });

    md += `## 🎯 Goals\n`;
    data.goals.forEach(g => { md += `- **${g.title}** — ${g.progress}%${g.deadline?' · deadline '+g.deadline:''}\n`; });
    md += '\n';

    md += `## 💰 Giao dịch\n`;
    data.transactions.forEach(t => {
      md += `- ${t.date} · ${t.type==='income'?'+':'-'}${t.amount.toLocaleString()} · ${t.category||''} ${t.note||''}\n`;
    });

    md += `\n## 🏃 Sức khỏe\n`;
    md += `### Giấc ngủ\n`;
    data.health.sleep.forEach(s => { md += `- ${s.date}: ${s.hours}h (chất lượng ${s.quality}/5)\n`; });
    md += `### Vận động\n`;
    data.health.exercise.forEach(e => { md += `- ${e.date}: ${e.type} — ${e.minutes} phút\n`; });
    md += `### Mood\n`;
    data.health.mood.forEach(m => { md += `- ${m.date}: ${m.mood}\n`; });

    return md;
  },

  toAI(period, data) {
    const s = this.stats(data);
    const periodName = { day:'hôm nay', week:'tuần này', month:'tháng này', quarter:'quý này', year:'năm nay', all:'toàn bộ' }[period] || period;

    let p = `Bạn là trợ lý phân tích cuộc sống cá nhân. Dưới đây là dữ liệu Life OS của tôi trong ${periodName} (${data.label}).\n\n`;
    p += `Hãy phân tích và trả về:\n`;
    p += `1. **Điểm sáng** — 3 điều tôi làm tốt\n`;
    p += `2. **Điểm tối / rủi ro** — 3 điều đáng lo\n`;
    p += `3. **Pattern** — mối liên hệ giữa ngủ / mood / năng suất / chi tiêu\n`;
    p += `4. **Đề xuất cụ thể** — 3-5 hành động cho kỳ tới (rõ ràng, đo lường được)\n`;
    p += `5. **Câu hỏi để tôi tự vấn** — 3 câu\n\n`;
    p += `Giọng điệu: thẳng thắn, không tâng bốc, không moralize. Tôi là người lớn, đưa insight thật.\n\n`;
    p += `---\n\n# DỮ LIỆU\n\n`;

    p += `## 📊 Tổng quan\n`;
    p += `- Task: ${s.tasksDone}/${s.tasksTotal} hoàn thành\n`;
    p += `- Thu: ${s.income.toLocaleString()} ${''} · Chi: ${s.expense.toLocaleString()} · Chênh lệch: ${s.balance.toLocaleString()}\n`;
    p += `- Ngủ trung bình: ${s.sleepAvg}h\n\n`;

    p += `## ✅ Tasks (${data.tasks.length})\n`;
    data.tasks.forEach(t => {
      p += `- [${t.done?'x':' '}] ${t.title}${t.due?' | due '+t.due:''} | P${t.priority||2}\n`;
    });

    p += `\n## 🔁 Habits\n`;
    data.habits.forEach(h => {
      const days = (data.habitLogs[h.id]||[]).length;
      p += `- ${h.name}: ${days} ngày\n`;
    });

    p += `\n## 📓 Journal (${data.journal.length} entries)\n`;
    data.journal.forEach(j => {
      p += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`;
    });

    p += `## 🎯 Goals\n`;
    data.goals.forEach(g => { p += `- ${g.title}: ${g.progress}%${g.deadline?' (deadline '+g.deadline+')':''}\n`; });

    p += `\n## 💰 Giao dịch (${data.transactions.length})\n`;
    data.transactions.forEach(t => {
      p += `- ${t.date} | ${t.type} | ${t.amount} | ${t.category||''} | ${t.note||''}\n`;
    });

    p += `\n## 🏃 Sức khỏe\n`;
    p += `### Ngủ\n`;
    data.health.sleep.forEach(x => { p += `- ${x.date}: ${x.hours}h / q${x.quality||'-'}\n`; });
    p += `### Vận động\n`;
    data.health.exercise.forEach(x => { p += `- ${x.date}: ${x.type} ${x.minutes}p\n`; });
    p += `### Mood\n`;
    data.health.mood.forEach(x => { p += `- ${x.date}: ${x.mood}\n`; });

    p += `\n---\n\nBây giờ, hãy phân tích giúp tôi.`;
    return p;
  },

  toCSV(data) {
    const rows = [['type','date','title/category','amount/value','note']];
    data.tasks.forEach(t => rows.push(['task', t.due||t.created||'', t.title, t.priority||2, t.done?'done':'']));
    data.transactions.forEach(t => rows.push(['transaction', t.date, t.category||'', t.amount, t.note||'']));
    data.journal.forEach(j => rows.push(['journal', j.date, j.mood||'', '', (j.text||'').slice(0,60)]));
    data.health.sleep.forEach(s => rows.push(['sleep', s.date, 'hours', s.hours, 'q'+s.quality]));
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
      return { ...JSON.parse(JSON.stringify(DEFAULT_DB)), ...parsed };
    } catch { return JSON.parse(JSON.stringify(DEFAULT_DB)); }
  },
  save(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { console.error(e); }
  },
};

// ============================================================
// ALPINE APP
// ============================================================
function lifeOS() {
  return {
    view: 'dashboard',
    search: '',
    showExport: false,
    showReview: false,
    exportPeriod: 'week',
    exportType: 'ai',
    exportPreview: '',
    copiedMsg: '',
    taskFilter: 'all',
    db: JSON.parse(JSON.stringify(DEFAULT_DB)),

    // forms
    newTask: { title: '', due: '', priority: 2 },
    newHabit: { name: '', icon: '🔁' },
    newJournal: { text: '', mood: '🙂' },
    newGoal: { title: '', deadline: '', category: '' },
    newTx: { type: 'expense', amount: null, category: '', note: '' },
    newSleep: { hours: null, quality: 4 },
    newEx: { type: '', minutes: null },

    nav: [
      { id:'dashboard', icon:'🏠', label:'Dashboard' },
      { id:'tasks', icon:'✅', label:'Tasks' },
      { id:'habits', icon:'🔁', label:'Habits' },
      { id:'journal', icon:'📓', label:'Journal' },
      { id:'goals', icon:'🎯', label:'Goals' },
      { id:'finance', icon:'💰', label:'Finance' },
      { id:'health', icon:'🏃', label:'Health' },
      { id:'settings', icon:'⚙️', label:'Settings' },
    ],

    // ---------- lifecycle ----------
    init() {
      this.db = Storage.load();
      document.body.classList.toggle('dark', this.db.settings.theme === 'dark');
      this.$watch('db', () => {
        Storage.save(this.db);
        document.body.classList.toggle('dark', this.db.settings.theme === 'dark');
      }, { deep: true });
      this.$watch('showExport', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportPeriod', () => this.refreshPreview());
      this.$watch('exportType', () => this.refreshPreview());

      // cmd+k focus search
      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          document.querySelector('.search')?.focus();
        }
      });
    },

    toggleTheme() {
      this.db.settings.theme = this.db.settings.theme === 'dark' ? 'light' : 'dark';
    },

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
      const q = this.search.toLowerCase();
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
      // if today not done, start from yesterday
      if (!log[fmtDate(d)]) d.setDate(d.getDate() - 1);
      while (log[fmtDate(d)]) { streak++; d.setDate(d.getDate() - 1); }
      return streak;
    },
    habitsDoneToday() {
      return this.db.habits.filter(h => this.isHabitDone(h.id)).length;
    },
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
      const q = this.search.toLowerCase();
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
      // update wallet
      if (this.db.wallets[0]) {
        this.db.wallets[0].balance += tx.type === 'income' ? tx.amount : -tx.amount;
      }
      this.newTx = { type:'expense', amount:null, category:'', note:'' };
    },
    deleteTx(id) {
      const tx = this.db.transactions.find(t => t.id === id);
      if (!tx) return;
      if (this.db.wallets[0]) {
        this.db.wallets[0].balance -= tx.type === 'income' ? tx.amount : -tx.amount;
      }
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
      this.db.health.sleep.unshift({
        id: uid(), date: todayISO(),
        hours: Number(this.newSleep.hours),
        quality: Number(this.newSleep.quality) || 3,
      });
      this.newSleep = { hours:null, quality:4 };
    },
    logExercise() {
      if (!this.newEx.type || !this.newEx.minutes) return;
      this.db.health.exercise.unshift({
        id: uid(), date: todayISO(),
        type: this.newEx.type, minutes: Number(this.newEx.minutes),
      });
      this.newEx = { type:'', minutes:null };
    },
    logMood(m) {
      const existing = this.db.health.mood.find(x => x.date === todayISO());
      if (existing) existing.mood = m;
      else this.db.health.mood.unshift({ id: uid(), date: todayISO(), mood: m });
    },
    todayMood() {
      const entry = this.db.health.mood.find(x => x.date === todayISO());
      return entry ? entry.mood : null;
    },
    waterToday() {
      const t = todayISO();
      return this.db.health.water[t] || 0;
    },
    addWater() {
      const t = todayISO();
      this.db.health.water[t] = (this.db.health.water[t] || 0) + 1;
    },

    // ---------- export ----------
    refreshPreview() {
      const data = Exporter.gather(this.exportPeriod, this.db);
      if (this.exportType === 'ai') this.exportPreview = Exporter.toAI(this.exportPeriod, data);
      else if (this.exportType === 'md') this.exportPreview = Exporter.toMarkdown(data);
      else if (this.exportType === 'json') this.exportPreview = Exporter.toJSON(data);
      else if (this.exportType === 'csv') this.exportPreview = Exporter.toCSV(data);
    },
    downloadExport() {
      const data = Exporter.gather(this.exportPeriod, this.db);
      const stamp = todayISO();
      if (this.exportType === 'ai') download(`ai-prompt-${this.exportPeriod}-${stamp}.txt`, Exporter.toAI(this.exportPeriod, data));
      else if (this.exportType === 'md') download(`report-${this.exportPeriod}-${stamp}.md`, Exporter.toMarkdown(data), 'text/markdown');
      else if (this.exportType === 'json') download(`data-${this.exportPeriod}-${stamp}.json`, Exporter.toJSON(data), 'application/json');
      else if (this.exportType === 'csv') download(`data-${this.exportPeriod}-${stamp}.csv`, Exporter.toCSV(data), 'text/csv');
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
          if (confirm('Ghi đè toàn bộ dữ liệu hiện tại bằng backup này?')) {
            this.db = { ...JSON.parse(JSON.stringify(DEFAULT_DB)), ...parsed };
          }
        } catch { alert('File không hợp lệ'); }
      };
      reader.readAsText(file);
    },
    resetAll() {
      if (confirm('Xoá TẤT CẢ dữ liệu? Không thể hoàn tác.')) {
        this.db = JSON.parse(JSON.stringify(DEFAULT_DB));
      }
    },
  };
}

window.lifeOS = lifeOS;
