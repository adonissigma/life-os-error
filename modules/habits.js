import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'habits', group:'Cá nhân', groupOrder:2, order:2,
  icon:'🔁', label:'Habits',
  setup() {
    return {
      htMonth: new Date().getMonth(),
      htYear: new Date().getFullYear(),
      newHabit: { name:'', icon:'🔁' },
      months: [
        {v:0,l:'Tháng 1'},{v:1,l:'Tháng 2'},{v:2,l:'Tháng 3'},{v:3,l:'Tháng 4'},
        {v:4,l:'Tháng 5'},{v:5,l:'Tháng 6'},{v:6,l:'Tháng 7'},{v:7,l:'Tháng 8'},
        {v:8,l:'Tháng 9'},{v:9,l:'Tháng 10'},{v:10,l:'Tháng 11'},{v:11,l:'Tháng 12'},
      ],
      get years() { const y=new Date().getFullYear(); const a=[]; for (let i=y-3;i<=y+2;i++) a.push(i); return a; },
      get db() { return this.$store.db; },
      todayISO: H.todayISO,

      addHabit() { if (!this.newHabit.name.trim()) return; this.db.habits.push({ id:H.uid(), name:this.newHabit.name.trim(), icon:this.newHabit.icon||'🔁', created:new Date().toISOString() }); this.newHabit = { name:'', icon:'🔁' }; },
      deleteHabit(id) { this.db.habits = this.db.habits.filter(h => h.id !== id); delete this.db.habitLogs[id]; },
      isDone(id, d=H.todayISO()) { return !!this.db.habitLogs[id]?.[d]; },
      toggle(id, d=H.todayISO()) { const l = this.db.habitLogs[id] ||= {}; if (l[d]) delete l[d]; else l[d] = true; },
      streak(id) { const log = this.db.habitLogs[id]||{}; let s=0; const d=new Date(); if (!log[H.fmtDate(d)]) d.setDate(d.getDate()-1); while (log[H.fmtDate(d)]) { s++; d.setDate(d.getDate()-1); } return s; },
      days() { const n = new Date(this.htYear, this.htMonth+1, 0).getDate(); return Array.from({length:n}, (_,i) => i+1); },
      date(day) { return `${this.htYear}-${String(this.htMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; },
      monthPct(id) { const ds = this.days(); return Math.round(ds.filter(d => this.isDone(id, this.date(d))).length / ds.length * 100); },
      totalPct() { if (!this.db.habits.length) return 0; return Math.round(this.db.habits.reduce((a,h) => a + this.monthPct(h.id), 0) / this.db.habits.length); },
      totalTicks() { let c=0; const ds = this.days(); this.db.habits.forEach(h => ds.forEach(d => { if (this.isDone(h.id, this.date(d))) c++; })); return c; },
      exportSheet() {
        const ds = this.days();
        const rows = [['Habit', ...ds.map(String), '%']];
        this.db.habits.forEach(h => rows.push([h.name, ...ds.map(d => this.isDone(h.id, this.date(d))?'✓':''), this.monthPct(h.id)+'%']));
        const tsv = rows.map(r => r.join('\t')).join('\n');
        H.download(`habits-${this.htYear}-${this.htMonth+1}.tsv`, tsv, 'text/tab-separated-values');
        navigator.clipboard.writeText(tsv).catch(()=>{});
      },

      get tpl() { return `
        <div class="page-head">
          <h1 class="page-title">🔁 Habit Tracker</h1>
          <div class="row">
            <select class="input" x-model.number="htMonth" style="max-width:130px"><template x-for="m in months" :key="m.v"><option :value="m.v" x-text="m.l"></option></template></select>
            <select class="input" x-model.number="htYear" style="max-width:110px"><template x-for="y in years" :key="y"><option :value="y" x-text="y"></option></template></select>
            <button class="export-btn" @click="exportSheet()">📊 Xuất Excel</button>
          </div>
        </div>
        <div class="card glass">
          <div class="row">
            <input class="input" x-model="newHabit.name" @keydown.enter="addHabit()" placeholder="Habit mới..." />
            <input class="input" x-model="newHabit.icon" placeholder="Icon" style="max-width:100px" />
            <button class="btn primary" @click="addHabit()">+ Thêm</button>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="card glass stat"><div class="stat-label">Hoàn thành tháng</div><div class="stat-value" x-text="totalPct()+'%'"></div></div>
          <div class="card glass stat"><div class="stat-label">Tổng lần tick</div><div class="stat-value" x-text="totalTicks()"></div></div>
        </div>
        <div class="card glass" style="overflow-x:auto">
          <table class="ht-table">
            <thead><tr><th class="ht-habit-col">Habit</th><template x-for="d in days()" :key="d"><th class="ht-day-head" x-text="d"></th></template><th>%</th></tr></thead>
            <tbody>
              <template x-for="h in db.habits" :key="h.id">
                <tr>
                  <td class="ht-habit-col"><span x-text="(h.icon||'')+' '+h.name"></span><button class="icon-btn" @click="deleteHabit(h.id)">✕</button></td>
                  <template x-for="d in days()" :key="d"><td class="ht-cell" :class="{on: isDone(h.id, date(d))}" @click="toggle(h.id, date(d))"></td></template>
                  <td class="ht-pct" x-text="monthPct(h.id)+'%'"></td>
                </tr>
              </template>
            </tbody>
          </table>
          <p x-show="!db.habits.length" class="empty">Chưa có habit.</p>
        </div>`;
      },
    };
  },
});
