import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'tasks', group:'Cá nhân', groupOrder:2, order:1,
  icon:'✅', label:'Tasks',
  setup() {
    return {
      taskFilter: 'all',
      newTask: { title:'', due:'', priority:2, categoryId:'' },
      get db() { return this.$store.db; },
      todayISO: H.todayISO, catColor: H.catColor,

      addTask() {
        if (!this.newTask.title.trim()) return;
        this.db.tasks.unshift({ id:H.uid(), title:this.newTask.title.trim(), due:this.newTask.due||'', date:this.newTask.due||H.todayISO(), priority:this.newTask.priority??2, categoryId:this.newTask.categoryId||'', done:false, created:new Date().toISOString() });
        this.newTask = { title:'', due:'', priority:2, categoryId:'' };
      },
      toggleTask(t) { t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null; },
      deleteTask(id) { this.db.tasks = this.db.tasks.filter(t => t.id !== id); },
      filtered() {
        const today = H.todayISO();
        const wE = new Date(); wE.setDate(wE.getDate()+7);
        let list = this.db.tasks;
        if (this.taskFilter === 'today') list = list.filter(t => !t.done && (!t.due || t.due <= today));
        else if (this.taskFilter === 'upcoming') list = list.filter(t => !t.done && t.due && t.due > today && new Date(t.due) <= wE);
        else if (this.taskFilter === 'done') list = list.filter(t => t.done);
        return list;
      },

      get tpl() { return `
        <div class="page-head">
          <h1 class="page-title">✅ Tasks</h1>
          <button class="export-btn" @click="$root.openExport('tasks')">📤 Xuất</button>
        </div>
        <div class="card glass">
          <div class="row">
            <input class="input" x-model="newTask.title" @keydown.enter="addTask()" placeholder="Task mới... (Enter)" />
            <input class="input" type="date" x-model="newTask.due" style="max-width:180px" />
            <select class="input" x-model.number="newTask.priority" style="max-width:150px">
              <option :value="0">P0 — Khẩn</option><option :value="1">P1 — Cao</option>
              <option :value="2">P2 — Trung</option><option :value="3">P3 — Thấp</option>
            </select>
            <select class="input" x-model="newTask.categoryId" style="max-width:180px">
              <option value="">— Category —</option>
              <template x-for="c in db.categories" :key="c.id"><option :value="c.id" x-text="c.name"></option></template>
            </select>
            <button class="btn primary" @click="addTask()">+ Thêm</button>
          </div>
        </div>
        <div class="card glass">
          <div class="row row-between">
            <div class="tabs">
              <button class="tab" :class="{active: taskFilter==='all'}" @click="taskFilter='all'">Tất cả</button>
              <button class="tab" :class="{active: taskFilter==='today'}" @click="taskFilter='today'">Hôm nay</button>
              <button class="tab" :class="{active: taskFilter==='upcoming'}" @click="taskFilter='upcoming'">7 ngày tới</button>
              <button class="tab" :class="{active: taskFilter==='done'}" @click="taskFilter='done'">Đã xong</button>
            </div>
            <span class="muted small" x-text="filtered().length+' task'"></span>
          </div>
          <template x-for="t in filtered()" :key="t.id">
            <div class="task" :class="{done:t.done}">
              <div class="checkbox" :class="{checked:t.done}" @click="toggleTask(t)"><span x-show="t.done">✓</span></div>
              <div class="cat-dot" :style="'background:'+catColor(t.categoryId)"></div>
              <div class="task-body">
                <div class="task-title" x-text="t.title"></div>
                <div class="task-meta">
                  <span x-show="t.due" x-text="'📅 '+t.due"></span>
                  <span x-show="t.start" x-text="'⏱ '+t.start+'-'+t.end"></span>
                  <span class="prio" :data-p="t.priority" x-text="'P'+t.priority"></span>
                </div>
              </div>
              <button class="icon-btn" @click="deleteTask(t.id)">✕</button>
            </div>
          </template>
        </div>`;
      },
    };
  },
});
