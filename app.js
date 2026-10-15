// ============================================================
// Life OS — KernelX build v4 for Verse
// ============================================================
const DB_KEY = 'lifeos.db.v4';
const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
const todayISO = () => new Date().toISOString().slice(0,10);
const fmtDate = (d) => d.toISOString().slice(0,10);

const DEFAULT_DB = {
  settings: { theme:'light', currency:'VND', dailyBudget:0 },
  profile: { name:'' },
  categories: [
    { id:'c1', name:'Học tập', color:'#0a84ff' },
    { id:'c2', name:'Làm việc', color:'#ff9500' },
    { id:'c3', name:'Cá nhân', color:'#bf5af2' },
    { id:'c4', name:'Sức khỏe', color:'#34c759' },
    { id:'c5', name:'Giải trí', color:'#ff3b30' },
  ],
  tasks: [], habits: [], habitLogs: {}, journal: [], goals: [],
  vision: { statement:'', mission:'', values:'', wheel:[
    {key:'career',label:'Sự nghiệp',score:5},{key:'finance',label:'Tài chính',score:5},
    {key:'health',label:'Sức khỏe',score:5},{key:'family',label:'Gia đình',score:5},
    {key:'friends',label:'Bạn bè',score:5},{key:'love',label:'Tình yêu',score:5},
    {key:'learning',label:'Học tập',score:5},{key:'spirit',label:'Tinh thần',score:5},
    {key:'fun',label:'Giải trí',score:5},{key:'contrib',label:'Đóng góp',score:5},
    {key:'env',label:'Môi trường',score:5},{key:'growth',label:'Phát triển',score:5},
  ], bucket:[] },
  wallets: [{ id:'w1', name:'Tiền mặt', balance:0 }],
  transactions: [],
  health: { sleep:[], exercise:[], mood:[], water:{} },
  reviews: [],
};

function download(name, content, mime='text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function deepMerge(base, over) {
  const out = { ...base };
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) out[k] = deepMerge(base[k], over[k]);
    else out[k] = over[k];
  }
  return out;
}

// ============================================================
// EXPORT ENGINE — adds XLS + DOC + ICS
// ============================================================
const Exporter = {
  range(period, ref = new Date()) {
    const d = new Date(ref);
    let start, end;
    if (period === 'day') { start = new Date(d.getFullYear(),d.getMonth(),d.getDate()); end = new Date(start); end.setDate(end.getDate()+1); }
    else if (period === 'week') { const day=(d.getDay()+6)%7; start=new Date(d); start.setDate(d.getDate()-day); start.setHours(0,0,0,0); end=new Date(start); end.setDate(end.getDate()+7); }
    else if (period === 'month') { start = new Date(d.getFullYear(),d.getMonth(),1); end = new Date(d.getFullYear(),d.getMonth()+1,1); }
    else if (period === 'quarter') { const q=Math.floor(d.getMonth()/3); start=new Date(d.getFullYear(),q*3,1); end=new Date(d.getFullYear(),q*3+3,1); }
    else if (period === 'year') { start=new Date(d.getFullYear(),0,1); end=new Date(d.getFullYear()+1,0,1); }
    else return { start: new Date(0), end: new Date(8640000000000000), label:'Toàn bộ' };
    return { start, end, label: `${fmtDate(start)} → ${fmtDate(new Date(end-1))}` };
  },
  inRange(dateStr, r) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= r.start && d < r.end;
  },
  gather(period, section, db) {
    const r = this.range(period);
    const out = { period, section, label: r.label, generatedAt: new Date().toISOString(), profile: db.profile };
    const want = s => section === 'all' || section === s;
    if (want('tasks'))    out.tasks = db.tasks.filter(t => this.inRange(t.created || t.due || t.date, r));
    if (want('journal'))  out.journal = db.journal.filter(j => this.inRange(j.date, r));
    if (want('finance'))  out.transactions = db.transactions.filter(t => this.inRange(t.date, r));
    if (want('health'))   out.health = { sleep: db.health.sleep.filter(s => this.inRange(s.date, r)), exercise: db.health.exercise.filter(e => this.inRange(e.date, r)), mood: db.health.mood.filter(m => this.inRange(m.date, r)) };
    if (want('habits'))   { out.habits = db.habits; out.habitLogs = {}; for (const hid in db.habitLogs) { const days = Object.keys(db.habitLogs[hid]).filter(d => this.inRange(d, r)); if (days.length) out.habitLogs[hid] = days; } }
    if (want('timeline')) out.timeline = db.tasks.filter(t => t.start && this.inRange(t.date, r));
    return out;
  },
  toJSON(data) { return JSON.stringify(data, null, 2); },
  toCSV(data) {
    const rows = [['type','date','title','value','note']];
    (data.tasks||[]).forEach(t => rows.push(['task', t.due||t.date||t.created||'', t.title, t.priority??2, t.done?'done':'']));
    (data.transactions||[]).forEach(t => rows.push(['transaction', t.date, t.category||'', t.amount, t.note||'']));
    (data.journal||[]).forEach(j => rows.push(['journal', j.date, j.mood||'', '', (j.text||'').slice(0,80)]));
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  },
  toMarkdown(data) {
    let md = `# Life OS Report — ${data.label}\n\n_Xuất: ${new Date(data.generatedAt).toLocaleString('vi-VN')}_\n\n`;
    if (data.tasks) { md += `## ✅ Tasks\n`; data.tasks.forEach(t => { md += `- [${t.done?'x':' '}] ${t.title}${t.due?' ('+t.due+')':''}\n`; }); md += '\n'; }
    if (data.journal) { md += `## 📓 Journal\n`; data.journal.forEach(j => { md += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; }); }
    if (data.transactions) { md += `## 💰 Giao dịch\n`; data.transactions.forEach(t => { md += `- ${t.date} · ${t.type==='income'?'+':'-'}${t.amount.toLocaleString()} · ${t.category||''}\n`; }); }
    return md;
  },
  toAI(period, data) {
    const periodName = { day:'hôm nay', week:'tuần này', month:'tháng này', quarter:'quý này', year:'năm nay', all:'toàn bộ' }[period] || period;
    let p = `Bạn là trợ lý phân tích cuộc sống cá nhân. Dữ liệu Life OS của tôi — ${periodName} (${data.label}).\n\n`;
    p += `Phân tích và trả về:\n1. **Điểm sáng** — 3 điều tốt\n2. **Điểm tối** — 3 điều đáng lo\n3. **Pattern** — liên hệ ngủ/mood/tiền/năng suất\n4. **Đề xuất** — 3-5 hành động cụ thể\n5. **Câu hỏi tự vấn** — 3 câu\n\nGiọng: thẳng thắn, không tâng bốc.\n\n---\n\n# DỮ LIỆU\n\n`;
    if (data.tasks) { p += `## ✅ Tasks (${data.tasks.length})\n`; data.tasks.forEach(t => { p += `- [${t.done?'x':' '}] ${t.title}${t.due?' | '+t.due:''}\n`; }); }
    if (data.timeline) { p += `## ⏱ Timeline\n`; data.timeline.forEach(t => { p += `- ${t.date} ${t.start}-${t.end}: ${t.title}\n`; }); }
    if (data.habits) { p += `## 🔁 Habits\n`; data.habits.forEach(h => { p += `- ${h.name}: ${(data.habitLogs[h.id]||[]).length} ngày\n`; }); }
    if (data.journal) { p += `## 📓 Journal\n`; data.journal.forEach(j => { p += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; }); }
    if (data.transactions) { p += `## 💰 Giao dịch\n`; data.transactions.forEach(t => { p += `- ${t.date} ${t.type} ${t.amount} ${t.category||''}\n`; }); }
    if (data.health) { p += `## 🏃 Sức khỏe\nNgủ: `; (data.health.sleep||[]).forEach(s => { p += `${s.date}=${s.hours}h `; }); p += `\nMood: `; (data.health.mood||[]).forEach(m => { p += `${m.date}=${m.mood} `; }); }
    p += `\n\n---\n\nBây giờ phân tích.`;
    return p;
  },

  // ---------- EXCEL (.xls via HTML table) ----------
  toXLS(data, title='Life OS') {
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial;font-size:11pt}th{background:#0a84ff;color:#fff;font-weight:bold}</style></head><body>`;
    html += `<h2>${esc(title)} — ${esc(data.label)}</h2>`;

    if (data.tasks?.length) {
      html += `<h3>Tasks</h3><table><tr><th>Ngày</th><th>Giờ</th><th>Tiêu đề</th><th>Category</th><th>Ưu tiên</th><th>Xong</th><th>Note</th></tr>`;
      data.tasks.forEach(t => html += `<tr><td>${esc(t.date||t.due||'')}</td><td>${esc((t.start||'')+(t.end?'-'+t.end:''))}</td><td>${esc(t.title)}</td><td>${esc(t.categoryName||'')}</td><td>P${t.priority??2}</td><td>${t.done?'✓':''}</td><td>${esc(t.note||'')}</td></tr>`);
      html += `</table>`;
    }
    if (data.journal?.length) {
      html += `<h3>Journal</h3><table><tr><th>Ngày</th><th>Mood</th><th>Nội dung</th></tr>`;
      data.journal.forEach(j => html += `<tr><td>${esc(j.date)}</td><td>${esc(j.mood||'')}</td><td>${esc(j.text).replace(/\n/g,'<br>')}</td></tr>`);
      html += `</table>`;
    }
    if (data.transactions?.length) {
      html += `<h3>Giao dịch</h3><table><tr><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Danh mục</th><th>Note</th></tr>`;
      data.transactions.forEach(t => html += `<tr><td>${esc(t.date)}</td><td>${t.type==='income'?'Thu':'Chi'}</td><td>${t.amount}</td><td>${esc(t.category||'')}</td><td>${esc(t.note||'')}</td></tr>`);
      html += `</table>`;
    }
    if (data.habits?.length) {
      html += `<h3>Habits</h3><table><tr><th>Habit</th><th>Số ngày</th></tr>`;
      data.habits.forEach(h => html += `<tr><td>${esc((h.icon||'') + ' ' + h.name)}</td><td>${(data.habitLogs[h.id]||[]).length}</td></tr>`);
      html += `</table>`;
    }
    if (data.health) {
      html += `<h3>Sức khỏe</h3><table><tr><th>Ngày</th><th>Ngủ (h)</th><th>Chất lượng</th><th>Mood</th></tr>`;
      const dates = new Set([...(data.health.sleep||[]).map(x=>x.date), ...(data.health.mood||[]).map(x=>x.date)]);
      [...dates].sort().forEach(d => {
        const s = (data.health.sleep||[]).find(x=>x.date===d) || {};
        const m = (data.health.mood||[]).find(x=>x.date===d) || {};
        html += `<tr><td>${d}</td><td>${s.hours||''}</td><td>${s.quality||''}</td><td>${esc(m.mood||'')}</td></tr>`;
      });
      html += `</table>`;
    }
    html += `</body></html>`;
    return html;
  },

  // ---------- WORD (.doc via HTML) ----------
  toDOC(data, title='Life OS') {
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Calibri,Arial;font-size:11pt;line-height:1.5}h1{color:#0a84ff}h2{color:#333;border-bottom:1px solid #ddd;padding-bottom:4px}h3{color:#555}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f0f0f5}</style></head><body>`;
    html += `<h1>${esc(title)} — Báo cáo</h1><p><b>Kỳ:</b> ${esc(data.label)}<br><b>Xuất lúc:</b> ${new Date(data.generatedAt).toLocaleString('vi-VN')}</p>`;
    if (data.journal?.length) {
      html += `<h2>📓 Journal</h2>`;
      data.journal.forEach(j => { html += `<h3>${esc(j.date)} ${esc(j.mood||'')}</h3><p>${esc(j.text).replace(/\n/g,'<br>')}</p>`; });
    }
    if (data.tasks?.length) {
      html += `<h2>✅ Tasks</h2><table><tr><th>Ngày</th><th>Tiêu đề</th><th>Trạng thái</th></tr>`;
      data.tasks.forEach(t => html += `<tr><td>${esc(t.date||t.due||'')}</td><td>${esc(t.title)}</td><td>${t.done?'Hoàn thành':'Chưa'}</td></tr>`);
      html += `</table>`;
    }
    if (data.transactions?.length) {
      html += `<h2>💰 Giao dịch</h2><table><tr><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Danh mục</th></tr>`;
      data.transactions.forEach(t => html += `<tr><td>${esc(t.date)}</td><td>${t.type==='income'?'Thu':'Chi'}</td><td>${t.amount.toLocaleString()}</td><td>${esc(t.category||'')}</td></tr>`);
      html += `</table>`;
    }
    html += `</body></html>`;
    return html;
  },

  // ---------- ICS for Google Calendar ----------
  toICS(tasks, categories) {
    const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');
    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LifeOS//KernelX//EN\r\nCALSCALE:GREGORIAN\r\n`;
    tasks.forEach(t => {
      if (!t.date || !t.start || !t.end) return;
      const dt = t.date.replace(/-/g,'');
      const st = t.start.replace(/:/g,'') + '00';
      const en = t.end.replace(/:/g,'') + '00';
      const cat = categories.find(c => c.id === t.categoryId);
      ics += `BEGIN:VEVENT\r\n`;
      ics += `UID:${t.id}@lifeos\r\n`;
      ics += `DTSTAMP:${dt}T${st}Z\r\n`;
      ics += `DTSTART;TZID=Asia/Ho_Chi_Minh:${dt}T${st}\r\n`;
      ics += `DTEND;TZID=Asia/Ho_Chi_Minh:${dt}T${en}\r\n`;
      ics += `SUMMARY:${esc(t.title)}\r\n`;
      if (t.note) ics += `DESCRIPTION:${esc(t.note)}\r\n`;
      if (cat) ics += `CATEGORIES:${esc(cat.name)}\r\n`;
      ics += `END:VEVENT\r\n`;
    });
    ics += `END:VCALENDAR`;
    return ics;
  },

  // ---------- Sheets TSV (paste direct into Google Sheets) ----------
  toSheetsTSV(tasks, categories) {
    const rows = [['Giờ','Tên công việc','Category','Màu','Note','Done']];
    tasks.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      rows.push([`${t.start||''}-${t.end||''}`, t.title, cat?.name||'', cat?.color||'', t.note||'', t.done?'✓':'']);
    });
    return rows.map(r => r.map(c => String(c).replace(/\t/g,' ')).join('\t')).join('\n');
  },
};

// ============================================================
// STORAGE
// ============================================================
const Storage = {
  load() { try { const r = localStorage.getItem(DB_KEY); if (!r) return JSON.parse(JSON.stringify(DEFAULT_DB)); return deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), JSON.parse(r)); } catch { return JSON.parse(JSON.stringify(DEFAULT_DB)); } },
  save(db) { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch(e) { console.error(e); } },
};

// ============================================================
// ALPINE APP
// ============================================================
function lifeOS() {
  return {
    view: 'dashboard',
    sidebarOpen: true,
    showExport: false,
    exportPeriod: 'week', exportSection: 'all', exportType: 'ai',
    exportPreview: '', copiedMsg: '',
    taskFilter: 'all',
    paletteOpen: false, paletteQuery: '',
    tlDate: todayISO(),
    hourHeight: 48,
    weekOffset: 0,
    htMonth: new Date().getMonth(), htYear: new Date().getFullYear(),
    arcPeriod: 'month', arcAnchor: todayISO(),
    db: JSON.parse(JSON.stringify(DEFAULT_DB)),

    newTask: { title:'', due:'', priority:2, categoryId:'' },
    newHabit: { name:'', icon:'🔁' },
    newJournal: { text:'', mood:'🙂' },
    newGoal: { title:'', deadline:'' },
    newTx: { type:'expense', amount:null, category:'', note:'' },
    newSleep: { hours:null, quality:4 },
    newEx: { type:'', minutes:null },
    newCat: '',
    newBlock: { title:'', start:'08:00', end:'09:00', categoryId:'', note:'' },

    monthsVN: [
      {v:0,l:'Tháng 1'},{v:1,l:'Tháng 2'},{v:2,l:'Tháng 3'},{v:3,l:'Tháng 4'},
      {v:4,l:'Tháng 5'},{v:5,l:'Tháng 6'},{v:6,l:'Tháng 7'},{v:7,l:'Tháng 8'},
      {v:8,l:'Tháng 9'},{v:9,l:'Tháng 10'},{v:10,l:'Tháng 11'},{v:11,l:'Tháng 12'},
    ],
    yearsRange: [],

    nav: [
      { group:'Tổng quan', items:[
        { id:'dashboard', icon:'🏠', label:'Dashboard' },
        { id:'week',      icon:'📅', label:'Tuần này' },
        { id:'timeline',  icon:'⏱', label:'Timeline' },
        { id:'archive',   icon:'🗄', label:'Lưu trữ' },
      ]},
      { group:'Cá nhân', items:[
        { id:'vision',  icon:'🧭', label:'Vision' },
        { id:'goals',   icon:'🏁', label:'Goals' },
        { id:'tasks',   icon:'✅', label:'Tasks' },
        { id:'habits',  icon:'🔁', label:'Habits' },
        { id:'journal', icon:'📓', label:'Journal' },
      ]},
      { group:'Cuộc sống', items:[
        { id:'finance', icon:'💰', label:'Finance' },
        { id:'health',  icon:'🏃', label:'Health' },
      ]},
      { group:'Hệ thống', items:[
        { id:'settings', icon:'⚙️', label:'Settings' },
      ]},
    ],

    commands: [],

    init() {
      this.db = Storage.load();
      document.body.classList.toggle('dark', this.db.settings.theme === 'dark');
      const y = new Date().getFullYear();
      for (let i = y-3; i <= y+2; i++) this.yearsRange.push(i);

      this.$watch('db', () => { Storage.save(this.db); document.body.classList.toggle('dark', this.db.settings.theme === 'dark'); }, { deep: true });
      this.$watch('showExport', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportPeriod', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportSection', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('exportType', () => { if (this.showExport) this.refreshPreview(); });
      this.$watch('paletteOpen', v => { if (v) this.$nextTick(() => this.$refs.paletteInput?.focus()); });

      if (window.innerWidth < 900) this.sidebarOpen = false;
      window.addEventListener('resize', () => { if (window.innerWidth < 900 && this.sidebarOpen) this.sidebarOpen = false; });

      window.addEventListener('keydown', e => {
        const k = e.key?.toLowerCase();
        if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); this.openPalette(); }
        if ((e.metaKey || e.ctrlKey) && k === 'b') { e.preventDefault(); this.toggleSidebar(); }
        if (e.key === 'Escape' && this.paletteOpen) this.paletteOpen = false;
      });

      this.buildCommands();
    },

    buildCommands() {
      const cmds = [];
      this.nav.forEach(g => g.items.forEach(it => cmds.push({ id:'go_'+it.id, icon:it.icon, label:'Đi tới '+it.label, hint:'page', action:()=>{ this.view=it.id; this.paletteOpen=false; } })));
      cmds.push({ id:'theme', icon:'🌙', label:'Đổi theme', hint:'ui', action:()=>{ this.toggleTheme(); this.paletteOpen=false; } });
      cmds.push({ id:'export', icon:'📤', label:'Mở Export', hint:'data', action:()=>{ this.openExport('all'); this.paletteOpen=false; } });
      cmds.push({ id:'backup', icon:'💾', label:'Tải backup JSON', hint:'data', action:()=>{ this.exportAll(); this.paletteOpen=false; } });
      this.commands = cmds;
    },
    filteredCommands() { const q=this.paletteQuery.toLowerCase().trim(); if(!q) return this.commands; return this.commands.filter(c => c.label.toLowerCase().includes(q)); },
    runPaletteAction(cmd) { if (!cmd) return; cmd.action(); this.paletteQuery=''; },
    openPalette() { this.paletteOpen = true; },
    toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
    toggleTheme() { this.db.settings.theme = this.db.settings.theme==='dark'?'light':'dark'; },

    // helpers
    greeting() { const h=new Date().getHours(), n=this.db.profile.name?', '+this.db.profile.name:''; if(h<12)return 'Chào buổi sáng'+n; if(h<18)return 'Chào buổi chiều'+n; return 'Chào buổi tối'+n; },
    todayLabel() { return new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); },
    timeAgo(iso) { const d=(Date.now()-new Date(iso))/1000; if(d<60)return'vừa xong'; if(d<3600)return Math.floor(d/60)+' phút trước'; if(d<86400)return Math.floor(d/3600)+' giờ trước'; return Math.floor(d/86400)+' ngày trước'; },
    fmt(n) { if(n==null||isNaN(n))return'0'; return new Intl.NumberFormat('vi-VN').format(n)+' '+(this.db.settings.currency||'VND'); },
    shiftDate(iso, days) { const d = new Date(iso); d.setDate(d.getDate()+days); return fmtDate(d); },

    catColor(id) { const c = this.db.categories.find(x => x.id === id); return c ? c.color : '#8e8e93'; },
    catName(id) { const c = this.db.categories.find(x => x.id === id); return c ? c.name : ''; },
    addCategory() { if (!this.newCat.trim()) return; this.db.categories.push({ id: uid(), name: this.newCat.trim(), color: '#0a84ff' }); this.newCat = ''; },

    // tasks
    addTask() {
      if (!this.newTask.title.trim()) return;
      this.db.tasks.unshift({ id: uid(), title: this.newTask.title.trim(), due: this.newTask.due||'', date: this.newTask.due||todayISO(), priority: this.newTask.priority??2, categoryId: this.newTask.categoryId||'', done:false, created: new Date().toISOString() });
      this.newTask = { title:'', due:'', priority:2, categoryId:'' };
    },
    toggleTask(t) { t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null; },
    deleteTask(id) { this.db.tasks = this.db.tasks.filter(t => t.id !== id); },
    todayTasks() { const today=todayISO(); return this.db.tasks.filter(t => !t.done && (!t.due||t.due<=today)); },
    doneTodayTasks() { const today=todayISO(); return this.db.tasks.filter(t => t.done && t.completedAt && t.completedAt.slice(0,10)===today).length; },
    filteredTasks() {
      const today=todayISO(), wE=new Date(); wE.setDate(wE.getDate()+7);
      let list = this.db.tasks;
      if (this.taskFilter==='today') list=list.filter(t => !t.done && (!t.due||t.due<=today));
      else if (this.taskFilter==='upcoming') list=list.filter(t => !t.done && t.due && t.due>today && new Date(t.due)<=wE);
      else if (this.taskFilter==='done') list=list.filter(t => t.done);
      return list;
    },
    tasksForDate(date) { return this.db.tasks.filter(t => (t.date === date) || (t.due === date)); },

    // timeline
    addBlock() {
      if (!this.newBlock.title.trim() || !this.newBlock.start || !this.newBlock.end) return;
      this.db.tasks.push({
        id: uid(), title: this.newBlock.title.trim(),
        date: this.tlDate, due: this.tlDate,
        start: this.newBlock.start, end: this.newBlock.end,
        categoryId: this.newBlock.categoryId, note: this.newBlock.note||'',
        priority: 2, done: false, created: new Date().toISOString(),
      });
      this.newBlock = { title:'', start:'08:00', end:'09:00', categoryId:'', note:'' };
    },
    deleteBlock(id) { this.db.tasks = this.db.tasks.filter(t => t.id !== id); },
    editBlock(t) {
      const newTitle = prompt('Sửa tên block:', t.title);
      if (newTitle !== null && newTitle.trim()) t.title = newTitle.trim();
    },
    todayTimeline() { return this.timelineFor(todayISO()); },
    timelineFor(date) { return this.db.tasks.filter(t => t.date === date && t.start && t.end).sort((a,b) => a.start.localeCompare(b.start)); },
    tlTop(t) { const [h,m] = t.start.split(':').map(Number); return ((h + m/60) * this.hourHeight); },
    tlHeight(t) {
      const [sh,sm] = t.start.split(':').map(Number);
      const [eh,em] = t.end.split(':').map(Number);
      const h = (eh*60+em) - (sh*60+sm);
      return Math.max(24, (h/60) * this.hourHeight);
    },
    tlLeft(t) {
      const overlapping = this.timelineFor(t.date).filter(x => this.overlaps(t,x));
      if (overlapping.length <= 1) return 0;
      const idx = overlapping.findIndex(x => x.id === t.id);
      return Math.round((idx / overlapping.length) * 100);
    },
    tlWidth(t) {
      const overlapping = this.timelineFor(t.date).filter(x => this.overlaps(t,x));
      if (overlapping.length <= 1) return 100;
      return Math.round(100 / overlapping.length) - 1;
    },
    overlaps(a,b) {
      if (a.id === b.id) return false;
      return !(a.end <= b.start || a.start >= b.end);
    },
    exportICS() {
      const tasks = this.db.tasks.filter(t => t.date && t.start && t.end);
      download(`lifeos-${todayISO()}.ics`, Exporter.toICS(tasks, this.db.categories), 'text/calendar');
    },
    exportTimelineSheet() {
      const tasks = this.timelineFor(this.tlDate);
      const tsv = Exporter.toSheetsTSV(tasks, this.db.categories);
      download(`timeline-${this.tlDate}.tsv`, tsv, 'text/tab-separated-values');
      // also copy to clipboard for instant paste into Sheets
      navigator.clipboard.writeText(tsv).catch(()=>{});
      this.copiedMsg = '✓ Đã tải + copy TSV — dán vào Google Sheets!';
      setTimeout(() => this.copiedMsg = '', 3000);
    },

    // weekly view
    weekDays() {
      const now = new Date();
      const day = (now.getDay()+6)%7;
      const monday = new Date(now); monday.setDate(now.getDate() - day + this.weekOffset*7);
      const names = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
      const out = [];
      for (let i=0;i<7;i++) {
        const d = new Date(monday); d.setDate(monday.getDate()+i);
        const date = fmtDate(d);
        const tasks = this.tasksForDate(date);
        const doneCount = tasks.filter(t => t.done).length + this.db.habits.filter(h => this.isHabitDone(h.id, date)).length;
        const totalCount = tasks.length + this.db.habits.length;
        out.push({ name: names[i], short: d.getDate()+'/'+(d.getMonth()+1), date, pct: totalCount ? Math.round(doneCount/totalCount*100) : 0 });
      }
      return out;
    },
    weekRangeLabel() {
      const days = this.weekDays();
      return days[0].date + ' → ' + days[6].date;
    },
    weekTasksTotal() { return this.weekDays().reduce((a,d) => a + this.tasksForDate(d.date).length, 0); },
    weekTasksDone() { return this.weekDays().reduce((a,d) => a + this.tasksForDate(d.date).filter(t => t.done).length, 0); },
    weekProgress() { const t = this.weekTasksTotal(); if(!t) return 0; return Math.round(this.weekTasksDone()/t*100); },
    exportWeekSheet() {
      const days = this.weekDays();
      const rows = [['Ngày','Task','Category','Done','Habit','Tick']];
      days.forEach(d => {
        this.tasksForDate(d.date).forEach(t => {
          const cat = this.db.categories.find(c => c.id === t.categoryId);
          rows.push([d.date, t.title, cat?.name||'', t.done?'✓':'', '', '']);
        });
        this.db.habits.forEach(h => rows.push([d.date, '', '', '', h.name, this.isHabitDone(h.id, d.date)?'✓':'']));
      });
      const tsv = rows.map(r => r.join('\t')).join('\n');
      download(`week-${days[0].date}.tsv`, tsv, 'text/tab-separated-values');
      navigator.clipboard.writeText(tsv).catch(()=>{});
      this.copiedMsg = '✓ Đã tải + copy!';
      setTimeout(() => this.copiedMsg = '', 3000);
    },

    // habits
    addHabit() { if (!this.newHabit.name.trim()) return; this.db.habits.push({ id: uid(), name: this.newHabit.name.trim(), icon: this.newHabit.icon||'🔁', created: new Date().toISOString() }); this.newHabit = { name:'', icon:'🔁' }; },
    deleteHabit(id) { this.db.habits = this.db.habits.filter(h => h.id !== id); delete this.db.habitLogs[id]; },
    isHabitDone(id, date = todayISO()) { return !!(this.db.habitLogs[id] && this.db.habitLogs[id][date]); },
    toggleHabit(id, date = todayISO()) { if (!this.db.habitLogs[id]) this.db.habitLogs[id] = {}; if (this.db.habitLogs[id][date]) delete this.db.habitLogs[id][date]; else this.db.habitLogs[id][date] = true; },
    habitStreak(id) { const log = this.db.habitLogs[id]||{}; let s = 0; const d = new Date(); if (!log[fmtDate(d)]) d.setDate(d.getDate()-1); while (log[fmtDate(d)]) { s++; d.setDate(d.getDate()-1); } return s; },
    habitsDoneToday() { return this.db.habits.filter(h => this.isHabitDone(h.id)).length; },
    htDays() { const n = new Date(this.htYear, this.htMonth+1, 0).getDate(); return Array.from({length:n}, (_,i) => i+1); },
    htDate(day) { return `${this.htYear}-${String(this.htMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; },
    habitMonthPct(id) { const days = this.htDays(); const done = days.filter(d => this.isHabitDone(id, this.htDate(d))).length; return Math.round(done/days.length*100); },
    htMonthPct() { if (!this.db.habits.length) return 0; const total = this.db.habits.reduce((a,h) => a + this.habitMonthPct(h.id), 0); return Math.round(total/this.db.habits.length); },
    htTotalTicks() { let c = 0; const days = this.htDays(); this.db.habits.forEach(h => days.forEach(d => { if (this.isHabitDone(h.id, this.htDate(d))) c++; })); return c; },
    exportHabitSheet() {
      const days = this.htDays();
      const header = ['Habit', ...days.map(d => d), '%'];
      const rows = [header];
      this.db.habits.forEach(h => {
        const row = [h.name, ...days.map(d => this.isHabitDone(h.id, this.htDate(d))?'✓':''), this.habitMonthPct(h.id)+'%'];
        rows.push(row);
      });
      const tsv = rows.map(r => r.join('\t')).join('\n');
      download(`habits-${this.htYear}-${this.htMonth+1}.tsv`, tsv, 'text/tab-separated-values');
      navigator.clipboard.writeText(tsv).catch(()=>{});
      this.copiedMsg = '✓ Đã tải + copy!';
      setTimeout(() => this.copiedMsg = '', 3000);
    },

    // journal
    addJournal() { if (!this.newJournal.text.trim()) return; this.db.journal.unshift({ id: uid(), date: todayISO(), mood: this.newJournal.mood, text: this.newJournal.text.trim(), created: new Date().toISOString() }); this.newJournal = { text:'', mood:'🙂' }; },
    deleteJournal(id) { this.db.journal = this.db.journal.filter(j => j.id !== id); },
    sortedJournal() { return [...this.db.journal].sort((a,b) => b.created.localeCompare(a.created)); },
    journalStreak() { const dates = new Set(this.db.journal.map(j => j.date)); let s = 0; const d = new Date(); if (!dates.has(fmtDate(d))) d.setDate(d.getDate()-1); while (dates.has(fmtDate(d))) { s++; d.setDate(d.getDate()-1); } return s; },

    // goals
    addGoal() { if (!this.newGoal.title.trim()) return; this.db.goals.push({ id: uid(), title: this.newGoal.title.trim(), deadline: this.newGoal.deadline||'', progress: 0, created: new Date().toISOString() }); this.newGoal = { title:'', deadline:'' }; },

    // finance
    addTx() { if (!this.newTx.amount) return; const tx = { id: uid(), type: this.newTx.type, amount: Number(this.newTx.amount), category: this.newTx.category||'', note: this.newTx.note||'', date: todayISO(), created: new Date().toISOString() }; this.db.transactions.unshift(tx); if (this.db.wallets[0]) this.db.wallets[0].balance += tx.type==='income'?tx.amount:-tx.amount; this.newTx = { type:'expense', amount:null, category:'', note:'' }; },
    deleteTx(id) { const tx = this.db.transactions.find(t => t.id === id); if (!tx) return; if (this.db.wallets[0]) this.db.wallets[0].balance -= tx.type==='income'?tx.amount:-tx.amount; this.db.transactions = this.db.transactions.filter(t => t.id !== id); },
    spentToday() { return this.db.transactions.filter(t => t.type==='expense' && t.date===todayISO()).reduce((a,t)=>a+t.amount,0); },

    // health
    logSleep() { if (!this.newSleep.hours) return; this.db.health.sleep.unshift({ id: uid(), date: todayISO(), hours: Number(this.newSleep.hours), quality: Number(this.newSleep.quality)||3 }); this.newSleep = { hours:null, quality:4 }; },
    logExercise() { if (!this.newEx.type || !this.newEx.minutes) return; this.db.health.exercise.unshift({ id: uid(), date: todayISO(), type: this.newEx.type, minutes: Number(this.newEx.minutes) }); this.newEx = { type:'', minutes:null }; },
    logMood(m) { const e = this.db.health.mood.find(x => x.date === todayISO()); if (e) e.mood = m; else this.db.health.mood.unshift({ id: uid(), date: todayISO(), mood: m }); },
    todayMood() { const e = this.db.health.mood.find(x => x.date === todayISO()); return e ? e.mood : null; },
    waterToday() { return this.db.health.water[todayISO()] || 0; },
    addWater() { const t = todayISO(); this.db.health.water[t] = (this.db.health.water[t]||0) + 1; },

    // archive
    arcRange() {
      const anchor = new Date(this.arcAnchor);
      let start, end;
      if (this.arcPeriod === 'week') { const day=(anchor.getDay()+6)%7; start=new Date(anchor); start.setDate(anchor.getDate()-day); start.setHours(0,0,0,0); end=new Date(start); end.setDate(end.getDate()+7); }
      else if (this.arcPeriod === 'month') { start = new Date(anchor.getFullYear(),anchor.getMonth(),1); end = new Date(anchor.getFullYear(),anchor.getMonth()+1,1); }
      else if (this.arcPeriod === 'quarter') { const q=Math.floor(anchor.getMonth()/3); start=new Date(anchor.getFullYear(),q*3,1); end=new Date(anchor.getFullYear(),q*3+3,1); }
      else { start = new Date(anchor.getFullYear(),0,1); end = new Date(anchor.getFullYear()+1,0,1); }
      return { start, end };
    },
    shiftArchive(dir) {
      const d = new Date(this.arcAnchor);
      if (this.arcPeriod === 'week') d.setDate(d.getDate() + dir*7);
      else if (this.arcPeriod === 'month') d.setMonth(d.getMonth() + dir);
      else if (this.arcPeriod === 'quarter') d.setMonth(d.getMonth() + dir*3);
      else d.setFullYear(d.getFullYear() + dir);
      this.arcAnchor = fmtDate(d);
    },
    arcLabel() { const r = this.arcRange(); return `${fmtDate(r.start)} → ${fmtDate(new Date(r.end-1))}`; },
    arcInRange(dateStr) { if (!dateStr) return false; const r = this.arcRange(); const d = new Date(dateStr); return d >= r.start && d < r.end; },
    arcJournal() { return this.db.journal.filter(j => this.arcInRange(j.date)).sort((a,b) => a.date.localeCompare(b.date)); },
    arcTasks() { return this.db.tasks.filter(t => t.done && this.arcInRange(t.completedAt || t.date || t.due)); },
    arcTasksDone() { return this.arcTasks().length; },
    arcTx() { return this.db.transactions.filter(t => this.arcInRange(t.date)); },
    arcSleep() { return this.db.health.sleep.filter(s => this.arcInRange(s.date)); },
    arcMood() { return this.db.health.mood.filter(m => this.arcInRange(m.date)); },
    arcHabitCount(id) { const log = this.db.habitLogs[id] || {}; return Object.keys(log).filter(d => this.arcInRange(d)).length; },
    arcHabitTicks() { let c = 0; this.db.habits.forEach(h => c += this.arcHabitCount(h.id)); return c; },

    exportArchiveXLS() {
      const data = {
        label: this.arcLabel(),
        generatedAt: new Date().toISOString(),
        tasks: this.arcTasks().map(t => ({ ...t, categoryName: this.catName(t.categoryId) })),
        journal: this.arcJournal(),
        transactions: this.arcTx(),
        habits: this.db.habits,
        habitLogs: Object.fromEntries(this.db.habits.map(h => [h.id, Object.keys(this.db.habitLogs[h.id]||{}).filter(d => this.arcInRange(d))])),
        health: { sleep: this.arcSleep(), mood: this.arcMood() },
      };
      download(`archive-${this.arcPeriod}-${todayISO()}.xls`, Exporter.toXLS(data), 'application/vnd.ms-excel');
    },
    exportArchiveDOC() {
      const data = { label: this.arcLabel(), generatedAt: new Date().toISOString(), journal: this.arcJournal(), tasks: this.arcTasks(), transactions: this.arcTx() };
      download(`archive-${this.arcPeriod}-${todayISO()}.doc`, Exporter.toDOC(data), 'application/msword');
    },

    // export modal
    openExport(section='all') { this.exportSection = section; this.showExport = true; this.refreshPreview(); },
    refreshPreview() {
      const data = Exporter.gather(this.exportPeriod, this.exportSection, this.db);
      let p = '';
      if (this.exportType === 'ai') p = Exporter.toAI(this.exportPeriod, data);
      else if (this.exportType === 'md') p = Exporter.toMarkdown(data);
      else if (this.exportType === 'json') p = Exporter.toJSON(data);
      else if (this.exportType === 'csv') p = Exporter.toCSV(data);
      else if (this.exportType === 'xls') p = '(Bấm Tải để tạo file Excel)';
      else if (this.exportType === 'doc') p = '(Bấm Tải để tạo file Word)';
      this.exportPreview = p;
    },
    downloadExport() {
      const data = Exporter.gather(this.exportPeriod, this.exportSection, this.db);
      const stamp = todayISO();
      const tag = `${this.exportSection}-${this.exportPeriod}-${stamp}`;
      if (this.exportType === 'ai') download(`ai-${tag}.txt`, Exporter.toAI(this.exportPeriod, data));
      else if (this.exportType === 'md') download(`report-${tag}.md`, Exporter.toMarkdown(data), 'text/markdown');
      else if (this.exportType === 'json') download(`data-${tag}.json`, Exporter.toJSON(data), 'application/json');
      else if (this.exportType === 'csv') download(`data-${tag}.csv`, Exporter.toCSV(data), 'text/csv');
      else if (this.exportType === 'xls') download(`data-${tag}.xls`, Exporter.toXLS(data), 'application/vnd.ms-excel');
      else if (this.exportType === 'doc') download(`data-${tag}.doc`, Exporter.toDOC(data), 'application/msword');
    },
    async copyExport() {
      try { await navigator.clipboard.writeText(this.exportPreview); this.copiedMsg = '✓ Đã copy!'; setTimeout(()=>this.copiedMsg='',2000); } catch { this.copiedMsg = 'Không copy được'; }
    },

    // backup
    exportAll() { download(`lifeos-backup-${todayISO()}.json`, JSON.stringify(this.db, null, 2), 'application/json'); },
    importAll(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const p = JSON.parse(r.result); if (confirm('Ghi đè toàn bộ?')) this.db = deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), p); } catch { alert('File không hợp lệ'); } }; r.readAsText(f); },
    resetAll() { if (confirm('Xoá toàn bộ dữ liệu?')) this.db = JSON.parse(JSON.stringify(DEFAULT_DB)); },
  };
}

window.lifeOS = lifeOS;
