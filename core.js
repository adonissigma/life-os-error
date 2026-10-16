// Life OS kernel — store, storage, exporter, helpers, module registry
export const DB_KEY = 'lifeos.db.v5';
export const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
export const todayISO = () => new Date().toISOString().slice(0,10);
export const fmtDate = d => d.toISOString().slice(0,10);

export const DEFAULT_DB = {
  settings: {
  theme: 'light', currency: 'VND', dailyBudget: 0,
  glass: {
    blur: 30,          // backdrop-filter blur px
    opacity: 0.55,     // tint strength 0..1
    saturation: 180,   // backdrop-filter saturate %
    border: 0.6,       // border alpha
    dynamicIsland: true,
    bottomNav: true,
    highlight: true,
  },
},
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

export const deepMerge = (a, b) => {
  const o = { ...a };
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = deepMerge(a[k], b[k]);
    else o[k] = b[k];
  }
  return o;
};

export const LifeOS = {
  modules: [],
  register(m) { this.modules.push(m); this.modules.sort((a,b) => (a.order ?? 99) - (b.order ?? 99)); },
  get(id) { return this.modules.find(m => m.id === id); },
  groups() {
    const g = {};
    this.modules.forEach(m => {
      if (!g[m.group]) g[m.group] = { group: m.group, order: m.groupOrder ?? 99, items: [] };
      g[m.group].items.push(m);
    });
    return Object.values(g).sort((a,b) => a.order - b.order);
  },
  deepMerge,
  helpers: {
    uid, todayISO, fmtDate,
    fmt(n) {
      if (n == null || isNaN(n)) return '0';
      const cur = window.Alpine?.store('db')?.settings?.currency || 'VND';
      return new Intl.NumberFormat('vi-VN').format(n) + ' ' + cur;
    },
    catColor(id) { const c = window.Alpine?.store('db')?.categories?.find(x => x.id === id); return c ? c.color : '#8e8e93'; },
    catName(id) { const c = window.Alpine?.store('db')?.categories?.find(x => x.id === id); return c ? c.name : ''; },
    download(name, content, mime='text/plain') {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    shiftDate(iso, days) { const d = new Date(iso); d.setDate(d.getDate()+days); return fmtDate(d); },
    timeAgo(iso) { const d = (Date.now()-new Date(iso))/1000; if (d<60) return 'vừa xong'; if (d<3600) return Math.floor(d/60)+' phút trước'; if (d<86400) return Math.floor(d/3600)+' giờ trước'; return Math.floor(d/86400)+' ngày trước'; },
    greeting() { const h=new Date().getHours(), n=window.Alpine?.store('db')?.profile?.name?', '+window.Alpine.store('db').profile.name:''; return h<12?'Chào buổi sáng'+n : h<18?'Chào buổi chiều'+n : 'Chào buổi tối'+n; },
    todayLabel() { return new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); },
  },
  exporter: null, // filled below
};

// ============ EXPORTER ============
LifeOS.exporter = {
  range(period, ref = new Date()) {
    const d = new Date(ref); let start, end;
    if (period === 'day') { start = new Date(d.getFullYear(),d.getMonth(),d.getDate()); end = new Date(start); end.setDate(end.getDate()+1); }
    else if (period === 'week') { const day=(d.getDay()+6)%7; start=new Date(d); start.setDate(d.getDate()-day); start.setHours(0,0,0,0); end=new Date(start); end.setDate(end.getDate()+7); }
    else if (period === 'month') { start = new Date(d.getFullYear(),d.getMonth(),1); end = new Date(d.getFullYear(),d.getMonth()+1,1); }
    else if (period === 'quarter') { const q=Math.floor(d.getMonth()/3); start=new Date(d.getFullYear(),q*3,1); end=new Date(d.getFullYear(),q*3+3,1); }
    else if (period === 'year') { start = new Date(d.getFullYear(),0,1); end = new Date(d.getFullYear()+1,0,1); }
    else return { start: new Date(0), end: new Date(8640000000000000), label:'Toàn bộ' };
    return { start, end, label: `${fmtDate(start)} → ${fmtDate(new Date(end-1))}` };
  },
  inRange(dateStr, r) { if (!dateStr) return false; const d = new Date(dateStr); return d >= r.start && d < r.end; },
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
  toJSON(d) { return JSON.stringify(d, null, 2); },
  toCSV(d) {
    const rows = [['type','date','title','value','note']];
    (d.tasks||[]).forEach(t => rows.push(['task', t.due||t.date||t.created||'', t.title, t.priority??2, t.done?'done':'']));
    (d.transactions||[]).forEach(t => rows.push(['transaction', t.date, t.category||'', t.amount, t.note||'']));
    (d.journal||[]).forEach(j => rows.push(['journal', j.date, j.mood||'', '', (j.text||'').slice(0,80)]));
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  },
  toMarkdown(d) {
    let md = `# Life OS — ${d.label}\n\n_${new Date(d.generatedAt).toLocaleString('vi-VN')}_\n\n`;
    if (d.tasks) { md += `## ✅ Tasks\n`; d.tasks.forEach(t => { md += `- [${t.done?'x':' '}] ${t.title}${t.due?' ('+t.due+')':''}\n`; }); md += '\n'; }
    if (d.journal) { md += `## 📓 Journal\n`; d.journal.forEach(j => { md += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; }); }
    if (d.transactions) { md += `## 💰 Giao dịch\n`; d.transactions.forEach(t => { md += `- ${t.date} · ${t.type==='income'?'+':'-'}${t.amount.toLocaleString()} · ${t.category||''}\n`; }); }
    return md;
  },
  toAI(period, d) {
    const pn = { day:'hôm nay', week:'tuần này', month:'tháng này', quarter:'quý này', year:'năm nay', all:'toàn bộ' }[period] || period;
    let p = `Bạn là trợ lý phân tích cuộc sống cá nhân. Dữ liệu Life OS của tôi — ${pn} (${d.label}).\n\n`;
    p += `Phân tích và trả về:\n1. **Điểm sáng** — 3 điều tốt\n2. **Điểm tối** — 3 điều đáng lo\n3. **Pattern** — liên hệ ngủ/mood/tiền/năng suất\n4. **Đề xuất** — 3-5 hành động cụ thể\n5. **Câu hỏi tự vấn** — 3 câu\n\nGiọng: thẳng thắn, không tâng bốc.\n\n---\n\n# DỮ LIỆU\n\n`;
    if (d.tasks) { p += `## ✅ Tasks (${d.tasks.length})\n`; d.tasks.forEach(t => { p += `- [${t.done?'x':' '}] ${t.title}${t.due?' | '+t.due:''}\n`; }); }
    if (d.timeline) { p += `## ⏱ Timeline\n`; d.timeline.forEach(t => { p += `- ${t.date} ${t.start}-${t.end}: ${t.title}\n`; }); }
    if (d.habits) { p += `## 🔁 Habits\n`; d.habits.forEach(h => { p += `- ${h.name}: ${(d.habitLogs[h.id]||[]).length} ngày\n`; }); }
    if (d.journal) { p += `## 📓 Journal\n`; d.journal.forEach(j => { p += `### ${j.date} ${j.mood||''}\n${j.text}\n\n`; }); }
    if (d.transactions) { p += `## 💰 Giao dịch\n`; d.transactions.forEach(t => { p += `- ${t.date} ${t.type} ${t.amount} ${t.category||''}\n`; }); }
    if (d.health) { p += `## 🏃 Sức khỏe\nNgủ: `; (d.health.sleep||[]).forEach(s => { p += `${s.date}=${s.hours}h `; }); p += `\nMood: `; (d.health.mood||[]).forEach(m => { p += `${m.date}=${m.mood} `; }); }
    p += `\n\n---\n\nBây giờ phân tích.`;
    return p;
  },
  toXLS(d, title='Life OS') {
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><style>table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px;font-family:Arial}th{background:#0a84ff;color:#fff}</style></head><body>`;
    html += `<h2>${esc(title)} — ${esc(d.label)}</h2>`;
    if (d.tasks?.length) { html += `<h3>Tasks</h3><table><tr><th>Ngày</th><th>Giờ</th><th>Tiêu đề</th><th>Ưu tiên</th><th>Xong</th><th>Note</th></tr>`; d.tasks.forEach(t => html += `<tr><td>${esc(t.date||t.due||'')}</td><td>${esc((t.start||'')+(t.end?'-'+t.end:''))}</td><td>${esc(t.title)}</td><td>P${t.priority??2}</td><td>${t.done?'✓':''}</td><td>${esc(t.note||'')}</td></tr>`); html += `</table>`; }
    if (d.journal?.length) { html += `<h3>Journal</h3><table><tr><th>Ngày</th><th>Mood</th><th>Nội dung</th></tr>`; d.journal.forEach(j => html += `<tr><td>${esc(j.date)}</td><td>${esc(j.mood||'')}</td><td>${esc(j.text).replace(/\n/g,'<br>')}</td></tr>`); html += `</table>`; }
    if (d.transactions?.length) { html += `<h3>Giao dịch</h3><table><tr><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Danh mục</th></tr>`; d.transactions.forEach(t => html += `<tr><td>${esc(t.date)}</td><td>${t.type==='income'?'Thu':'Chi'}</td><td>${t.amount}</td><td>${esc(t.category||'')}</td></tr>`); html += `</table>`; }
    if (d.habits?.length) { html += `<h3>Habits</h3><table><tr><th>Habit</th><th>Số ngày</th></tr>`; d.habits.forEach(h => html += `<tr><td>${esc((h.icon||'') + ' ' + h.name)}</td><td>${(d.habitLogs[h.id]||[]).length}</td></tr>`); html += `</table>`; }
    html += `</body></html>`;
    return html;
  },
  toDOC(d, title='Life OS') {
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Calibri,Arial}h1{color:#0a84ff}h2{color:#333;border-bottom:1px solid #ddd}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px}th{background:#f0f0f5}</style></head><body>`;
    html += `<h1>${esc(title)}</h1><p><b>Kỳ:</b> ${esc(d.label)}<br><b>Xuất:</b> ${new Date(d.generatedAt).toLocaleString('vi-VN')}</p>`;
    if (d.journal?.length) { html += `<h2>📓 Journal</h2>`; d.journal.forEach(j => { html += `<h3>${esc(j.date)} ${esc(j.mood||'')}</h3><p>${esc(j.text).replace(/\n/g,'<br>')}</p>`; }); }
    if (d.tasks?.length) { html += `<h2>✅ Tasks</h2><table><tr><th>Ngày</th><th>Tiêu đề</th><th>Xong</th></tr>`; d.tasks.forEach(t => html += `<tr><td>${esc(t.date||t.due||'')}</td><td>${esc(t.title)}</td><td>${t.done?'✓':''}</td></tr>`); html += `</table>`; }
    if (d.transactions?.length) { html += `<h2>💰 Giao dịch</h2><table><tr><th>Ngày</th><th>Loại</th><th>Số tiền</th></tr>`; d.transactions.forEach(t => html += `<tr><td>${esc(t.date)}</td><td>${t.type==='income'?'Thu':'Chi'}</td><td>${t.amount.toLocaleString()}</td></tr>`); html += `</table>`; }
    html += `</body></html>`;
    return html;
  },
  toICS(tasks, cats) {
    const esc = s => String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');
    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LifeOS//KernelX//EN\r\nCALSCALE:GREGORIAN\r\n`;
    tasks.forEach(t => {
      if (!t.date || !t.start || !t.end) return;
      const dt = t.date.replace(/-/g,'');
      const st = t.start.replace(/:/g,'') + '00';
      const en = t.end.replace(/:/g,'') + '00';
      const cat = cats.find(c => c.id === t.categoryId);
      ics += `BEGIN:VEVENT\r\nUID:${t.id}@lifeos\r\nDTSTAMP:${dt}T${st}Z\r\nDTSTART;TZID=Asia/Ho_Chi_Minh:${dt}T${st}\r\nDTEND;TZID=Asia/Ho_Chi_Minh:${dt}T${en}\r\nSUMMARY:${esc(t.title)}\r\n`;
      if (t.note) ics += `DESCRIPTION:${esc(t.note)}\r\n`;
      if (cat) ics += `CATEGORIES:${esc(cat.name)}\r\n`;
      ics += `END:VEVENT\r\n`;
    });
    ics += `END:VCALENDAR`;
    return ics;
  },
  toSheetsTSV(tasks, cats) {
    const rows = [['Giờ','Tên công việc','Category','Màu','Note','Done']];
    tasks.forEach(t => {
      const cat = cats.find(c => c.id === t.categoryId);
      rows.push([`${t.start||''}-${t.end||''}`, t.title, cat?.name||'', cat?.color||'', t.note||'', t.done?'✓':'']);
    });
    return rows.map(r => r.map(c => String(c).replace(/\t/g,' ')).join('\t')).join('\n');
  },
};

// ============ REGISTER STORES ============
export function registerStores(Alpine) {
  const raw = localStorage.getItem(DB_KEY);
  const loaded = raw ? deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULT_DB));
  Alpine.store('db', loaded);

  // deep reactive save
  Alpine.effect(() => {
    const snap = JSON.stringify(Alpine.store('db'));
    localStorage.setItem(DB_KEY, snap);
  });

  // register each module's Alpine.data
  LifeOS.modules.forEach(m => {
    Alpine.data('m_' + m.id, m.setup);
  });
}
