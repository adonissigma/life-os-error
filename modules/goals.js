import { LifeOS } from '../core.js';
const H = LifeOS.helpers;
LifeOS.register({
  id:'goals', group:'Cá nhân', groupOrder:2, order:4, icon:'🏁', label:'Goals',
  setup() {
    return {
      newGoal: { title:'', deadline:'' },
      get db() { return this.$store.db; },
      add() { if (!this.newGoal.title.trim()) return; this.db.goals.push({ id:H.uid(), title:this.newGoal.title.trim(), deadline:this.newGoal.deadline||'', progress:0, created:new Date().toISOString() }); this.newGoal = { title:'', deadline:'' }; },
      del(id) { this.db.goals = this.db.goals.filter(g => g.id !== id); },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">🏁 Goals</h1></div>
        <div class="card glass"><div class="row">
          <input class="input" x-model="newGoal.title" placeholder="Mục tiêu..." />
          <input class="input" type="date" x-model="newGoal.deadline" style="max-width:180px" />
          <button class="btn primary" @click="add()">+ Thêm</button>
        </div></div>
        <div class="grid grid-2">
          <template x-for="g in db.goals" :key="g.id">
            <div class="card glass">
              <div class="row row-between"><div class="task-title" x-text="g.title"></div><button class="icon-btn" @click="del(g.id)">✕</button></div>
              <div class="progress"><div class="progress-fill" :style="'width:'+g.progress+'%'"></div></div>
              <input type="range" min="0" max="100" x-model.number="g.progress" style="width:100%;margin-top:8px" />
              <div class="muted small" x-text="g.progress+'%'+(g.deadline?' · '+g.deadline:'')"></div>
            </div>
          </template>
        </div>`;
      },
    };
  },
});
