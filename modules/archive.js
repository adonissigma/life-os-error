import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'archive', group:'Tổng quan', groupOrder:1, order:4,
  icon:'🗄', label:'Lưu trữ',
  setup() {
    return {
      arcPeriod: 'month',
      arcAnchor: H.todayISO(),
      get db() { return this.$store.db; },
      fmt: H.fmt, todayISO: H.todayISO,

      range() {
        const a = new Date(this.arcAnchor);
        let s, e;
        if (this.arcPeriod === 'week') { const d=(a.getDay()+6)%7; s=new Date(a); s.setDate(a.getDate()-d); s.setHours(0,0,0,0); e=new Date(s); e.setDate(e.getDate()+7); }
        else if (this.arcPeriod === 'month') { s=new Date(a.getFullYear(),a.getMonth(),1); e=new Date(a.getFullYear(),a.getMonth()+1,1); }
        else if (this.arcPeriod === 'quarter') { const q=Math.floor(a.getMonth()/3); s=new Date(a.getFullYear(),q*3,1); e=new Date(a.getFullYear(),q*3+3,1); }
        else { s=new Date(a.getFullYear(),0,1); e=new Date(a.getFullYear()+1,0,1); }
        return { start: s, end: e };
      },
      label() { const r = this.range(); return H.fmtDate(r.start) + ' → ' + H.fmtDate(new Date(r.end-1)); },
      shift(dir) {
        const d = new Date(this.arcAnchor);
        if (this.arcPeriod === 'week') d.setDate(d.getDate() + dir*7);
        else if (this.arcPeriod === 'month') d.setMonth(d.getMonth() + dir);
        else if (this.arcPeriod === 'quarter') d.setMonth(d.getMonth() + dir*3);
        else d.setFullYear(d.getFullYear() + dir);
        this.arcAnchor = H.fmtDate(d);
      },
      inRange(s) { if (!s) return false; const r = this.range(); const d = new Date(s); return d >= r.start && d < r.end; },
      journals() { return this.db.journal.filter(j => this.inRange(j.date)).sort((a,b) => a.date.localeCompare(b.date)); },
      tasks() { return this.db.tasks.filter(t => t.done && this.inRange(t.completedAt || t.date || t.due)); },
      txs() { return this.db.transactions.filter(t => this.inRange(t.date)); },
      sleeps() { return this.db.health.sleep.filter(s => this.inRange(s.date)); },
      moods() { return this.db.health.mood.filter(m => this.inRange(m.date)); },
      habitCount(id) { return Object.keys(this.db.habitLogs[id]||{}).filter(d => this.inRange(d)).length; },
      habitTicks() { return this.db.habits.reduce((a,h) => a + this.habitCount(h.id), 0); },
      catColor: H.catColor,

      exportXLS() {
        const data = {
          label: this.label(), generatedAt: new Date().toISOString(),
          tasks: this.tasks().map(t => ({ ...t, categoryName: H.catName(t.categoryId) })),
          journal: this.journals(), transactions: this.txs(),
          habits: this.db.habits,
          habitLogs: Object.fromEntries(this.db.habits.map(h => [h.id, Object.keys(this.db.habitLogs[h.id]||{}).filter(d => this.inRange(d))])),
        };
        H.download(`archive-${this.arcPeriod}-${H.todayISO()}.xls`, LifeOS.exporter.toXLS(data), 'application/vnd.ms-excel');
      },
      exportDOC() {
        const data = { label: this.label(), generatedAt: new Date().toISOString(), journal: this.journals(), tasks: this.tasks(), transactions: this.txs() };
        H.download(`archive-${this.arcPeriod}-${H.todayISO()}.doc`, LifeOS.exporter.toDOC(data), 'application/msword');
      },

      get tpl() { return `
        <div class="page-head">
          <h1 class="page-title">🗄 Lưu trữ</h1>
          <div class="row">
            <select class="input" x-model="arcPeriod" style="max-width:160px">
              <option value="week">Tuần</option><option value="month">Tháng</option><option value="quarter">Quý</option><option value="year">Năm</option>
            </select>
            <button class="btn" @click="shift(-1)">◀</button>
            <span class="muted" x-text="label()"></span>
            <button class="btn" @click="shift(1)">▶</button>
            <button class="export-btn" @click="exportXLS()">📊 .xls</button>
            <button class="export-btn" @click="exportDOC()">📄 .doc</button>
          </div>
        </div>
        <div class="grid grid-4">
          <div class="card glass stat"><div class="stat-label">Task xong</div><div class="stat-value" x-text="tasks().length"></div></div>
          <div class="card glass stat"><div class="stat-label">Journal</div><div class="stat-value" x-text="journals().length"></div></div>
          <div class="card glass stat"><div class="stat-label">Giao dịch</div><div class="stat-value" x-text="txs().length"></div></div>
          <div class="card glass stat"><div class="stat-label">Habit ticks</div><div class="stat-value" x-text="habitTicks()"></div></div>
        </div>
        <div class="card glass">
          <div class="card-title">📓 Journal</div>
          <template x-for="j in journals()" :key="j.id">
            <div class="arc-entry"><div class="arc-entry-head"><span style="font-size:20px" x-text="j.mood"></span><b x-text="j.date"></b></div><p x-text="j.text"></p></div>
          </template>
          <p x-show="!journals().length" class="empty">Không có journal trong kỳ này.</p>
        </div>
        <div class="card glass">
          <div class="card-title">✅ Task</div>
          <template x-for="t in tasks()" :key="t.id">
            <div class="task"><div class="cat-dot" :style="'background:'+catColor(t.categoryId)"></div><span class="muted small" x-text="t.completedAt?.slice(0,10)||t.due||''"></span><span class="task-title" x-text="t.title"></span></div>
          </template>
        </div>
        <div class="card glass">
          <div class="card-title">💰 Giao dịch</div>
          <template x-for="tx in txs()" :key="tx.id">
            <div class="task"><span x-text="tx.type==='income'?'💵':'💸'"></span><span class="muted small" x-text="tx.date"></span><div class="task-body"><div class="task-title" x-text="tx.category||tx.note"></div></div><span :style="tx.type==='income'?'color:#34c759':'color:#ff3b30'" x-text="(tx.type==='income'?'+':'-')+fmt(tx.amount)"></span></div>
          </template>
        </div>`;
      },
    };
  },
});
