import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'week', group:'Tổng quan', groupOrder:1, order:3,
  icon:'📅', label:'Tuần này',
  setup() {
    return {
      weekOffset: 0,
      get db() { return this.$store.db; },
      catColor: H.catColor,

      days() {
        const now = new Date();
        const day = (now.getDay()+6)%7;
        const mon = new Date(now); mon.setDate(now.getDate() - day + this.weekOffset*7);
        const names = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
        const out = [];
        for (let i=0;i<7;i++) {
          const d = new Date(mon); d.setDate(mon.getDate()+i);
          const date = H.fmtDate(d);
          const tasks = this.db.tasks.filter(t => t.date === date || t.due === date);
          const done = tasks.filter(t => t.done).length + this.db.habits.filter(h => this.isHabitDone(h.id, date)).length;
          const total = tasks.length + this.db.habits.length;
          out.push({ name:names[i], short:d.getDate()+'/'+(d.getMonth()+1), date, pct: total ? Math.round(done/total*100) : 0 });
        }
        return out;
      },
      rangeLabel() { const d = this.days(); return d[0].date + ' → ' + d[6].date; },
      tasksFor(date) { return this.db.tasks.filter(t => (t.date === date) || (t.due === date)); },
      toggleTask(t) { t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null; },
      isHabitDone(id, d=H.todayISO()) { return !!this.db.habitLogs[id]?.[d]; },
      toggleHabit(id, d) { const l = this.db.habitLogs[id] ||= {}; if (l[d]) delete l[d]; else l[d] = true; },
      weekTotal() { return this.days().reduce((a,d) => a + this.tasksFor(d.date).length, 0); },
      weekDone() { return this.days().reduce((a,d) => a + this.tasksFor(d.date).filter(t=>t.done).length, 0); },
      weekProgress() { const t = this.weekTotal(); return t ? Math.round(this.weekDone()/t*100) : 0; },
      exportSheet() {
        const rows = [['Ngày','Task','Category','Done','Habit','Tick']];
        this.days().forEach(d => {
          this.tasksFor(d.date).forEach(t => rows.push([d.date, t.title, this.db.categories.find(c => c.id === t.categoryId)?.name || '', t.done?'✓':'', '', '']));
          this.db.habits.forEach(h => rows.push([d.date, '', '', '', h.name, this.isHabitDone(h.id, d.date)?'✓':'']));
        });
        const tsv = rows.map(r => r.join('\t')).join('\n');
        H.download(`week-${this.days()[0].date}.tsv`, tsv, 'text/tab-separated-values');
        navigator.clipboard.writeText(tsv).catch(()=>{});
      },

      get tpl() { return `
        <div class="page-head">
          <div><h1 class="page-title">📅 Tuần</h1><p class="page-sub" x-text="rangeLabel()"></p></div>
          <div class="row">
            <button class="btn" @click="weekOffset--">◀</button>
            <button class="btn" @click="weekOffset=0">Tuần này</button>
            <button class="btn" @click="weekOffset++">▶</button>
            <button class="export-btn" @click="exportSheet()">📊 Xuất</button>
          </div>
        </div>
        <div class="card glass">
          <div class="card-title">Tiến độ tuần</div>
          <div class="progress"><div class="progress-fill" :style="'width:'+weekProgress()+'%'"></div></div>
          <div class="row row-between small muted" style="margin-top:6px"><span x-text="weekProgress()+'%'"></span><span x-text="weekDone()+'/'+weekTotal()"></span></div>
        </div>
        <div class="week-grid">
          <template x-for="d in days()" :key="d.date">
            <div class="week-col card glass">
              <div class="week-col-head">
                <div class="week-col-day" x-text="d.name"></div>
                <div class="week-col-date" x-text="d.short"></div>
                <div class="week-col-pct" x-text="d.pct+'%'"></div>
              </div>
              <template x-for="t in tasksFor(d.date)" :key="t.id">
                <div class="week-task" :class="{done:t.done}" @click="toggleTask(t)" :style="'border-left:3px solid '+catColor(t.categoryId)"><span x-text="t.title"></span></div>
              </template>
              <template x-for="h in db.habits" :key="h.id">
                <div class="week-habit" :class="{on: isHabitDone(h.id, d.date)}" @click="toggleHabit(h.id, d.date)"><span x-text="(h.icon||'·')+' '+h.name"></span></div>
              </template>
            </div>
          </template>
        </div>`;
      },
    };
  },
});
