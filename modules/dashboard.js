import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'dashboard', group:'Tổng quan', groupOrder:1, order:1,
  icon:'🏠', label:'Dashboard',
  setup() {
    return {
      get db() { return this.$store.db; },
      greeting: H.greeting, todayLabel: H.todayLabel,
      fmt: H.fmt, timeAgo: H.timeAgo,

      todayTasks() { const t = H.todayISO(); return this.db.tasks.filter(x => !x.done && (!x.due || x.due <= t)); },
      doneTodayTasks() { const t = H.todayISO(); return this.db.tasks.filter(x => x.done && x.completedAt?.slice(0,10) === t).length; },
      todayTimeline() { return this.db.tasks.filter(x => x.date === H.todayISO() && x.start && x.end).sort((a,b) => a.start.localeCompare(b.start)); },
      habitsDoneToday() { return this.db.habits.filter(h => this.isHabitDone(h.id)).length; },
      isHabitDone(id, d=H.todayISO()) { return !!this.db.habitLogs[id]?.[d]; },
      toggleHabit(id) { const l = this.db.habitLogs[id] ||= {}; if (l[H.todayISO()]) delete l[H.todayISO()]; else l[H.todayISO()] = true; },
      habitStreak(id) { const log = this.db.habitLogs[id]||{}; let s=0; const d=new Date(); if (!log[H.fmtDate(d)]) d.setDate(d.getDate()-1); while (log[H.fmtDate(d)]) { s++; d.setDate(d.getDate()-1); } return s; },
      spentToday() { return this.db.transactions.filter(t => t.type==='expense' && t.date===H.todayISO()).reduce((a,t)=>a+t.amount,0); },
      journalStreak() { const s = new Set(this.db.journal.map(j => j.date)); let n=0; const d=new Date(); if (!s.has(H.fmtDate(d))) d.setDate(d.getDate()-1); while (s.has(H.fmtDate(d))) { n++; d.setDate(d.getDate()-1); } return n; },
      catColor: H.catColor,

      get tpl() { return `
        <div class="page-head">
          <div><h1 class="page-title" x-text="greeting()"></h1><p class="page-sub" x-text="todayLabel()"></p></div>
          <button class="export-btn" @click="$root.openExport('all')">📤 Xuất</button>
        </div>
        <div class="grid grid-4">
          <div class="card glass stat"><div class="stat-label">Task hôm nay</div><div class="stat-value" x-text="todayTasks().length"></div><div class="stat-sub" x-text="doneTodayTasks()+' hoàn thành'"></div></div>
          <div class="card glass stat"><div class="stat-label">Habits</div><div class="stat-value" x-text="habitsDoneToday()+'/'+db.habits.length"></div><div class="stat-sub">đã tick</div></div>
          <div class="card glass stat"><div class="stat-label">Chi tiêu hôm nay</div><div class="stat-value" x-text="fmt(spentToday())"></div></div>
          <div class="card glass stat"><div class="stat-label">Streak viết</div><div class="stat-value" x-text="journalStreak()"></div><div class="stat-sub">ngày liên tiếp</div></div>
        </div>
        <div class="grid grid-2">
          <div class="card glass">
            <div class="card-title">📅 Timeline hôm nay</div>
            <template x-for="t in todayTimeline()" :key="t.id">
              <div class="task"><div class="cat-dot" :style="'background:'+catColor(t.categoryId)"></div><span class="muted small" x-text="t.start+'-'+t.end"></span><span class="task-title" x-text="t.title"></span></div>
            </template>
            <p x-show="!todayTimeline().length" class="empty">Chưa có block. Vào Timeline để thêm.</p>
          </div>
          <div class="card glass">
            <div class="card-title">🔁 Habits hôm nay</div>
            <template x-for="h in db.habits" :key="h.id">
              <div class="task" :class="{done: isHabitDone(h.id)}">
                <div class="checkbox" :class="{checked: isHabitDone(h.id)}" @click="toggleHabit(h.id)"><span x-show="isHabitDone(h.id)">✓</span></div>
                <span class="task-title" x-text="(h.icon||'')+' '+h.name"></span>
                <span class="badge" x-text="habitStreak(h.id)+'🔥'"></span>
              </div>
            </template>
          </div>
        </div>`;
      },
    };
  },
});
