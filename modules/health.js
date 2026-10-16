import { LifeOS } from '../core.js';
const H = LifeOS.helpers;
LifeOS.register({
  id:'health', group:'Cuộc sống', groupOrder:3, order:2, icon:'🏃', label:'Health',
  setup() {
    return {
      newSleep: { hours:null, quality:4 },
      newEx: { type:'', minutes:null },
      get db() { return this.$store.db; },
      todayISO: H.todayISO,
      logSleep() { if (!this.newSleep.hours) return; this.db.health.sleep.unshift({ id:H.uid(), date:H.todayISO(), hours:Number(this.newSleep.hours), quality:Number(this.newSleep.quality)||3 }); this.newSleep = { hours:null, quality:4 }; },
      logEx() { if (!this.newEx.type || !this.newEx.minutes) return; this.db.health.exercise.unshift({ id:H.uid(), date:H.todayISO(), type:this.newEx.type, minutes:Number(this.newEx.minutes) }); this.newEx = { type:'', minutes:null }; },
      logMood(m) { const e = this.db.health.mood.find(x => x.date === H.todayISO()); if (e) e.mood = m; else this.db.health.mood.unshift({ id:H.uid(), date:H.todayISO(), mood:m }); },
      todayMood() { return this.db.health.mood.find(x => x.date === H.todayISO())?.mood || null; },
      water() { return this.db.health.water[H.todayISO()] || 0; },
      addWater() { const t = H.todayISO(); this.db.health.water[t] = (this.db.health.water[t]||0) + 1; },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">🏃 Health</h1><button class="export-btn" @click="$root.openExport('health')">📤 Xuất</button></div>
        <div class="grid grid-2">
          <div class="card glass"><div class="card-title">😴 Ngủ</div><div class="row">
            <input class="input" type="number" step="0.5" x-model.number="newSleep.hours" placeholder="Giờ" />
            <input class="input" type="number" min="1" max="5" x-model.number="newSleep.quality" placeholder="Q 1-5" />
            <button class="btn primary" @click="logSleep()">Lưu</button>
          </div></div>
          <div class="card glass"><div class="card-title">💧 Nước</div><div class="stat-value" x-text="water()+' / 8'"></div><button class="btn primary" @click="addWater()">+ 1 ly</button></div>
          <div class="card glass"><div class="card-title">🏋️ Vận động</div><div class="row">
            <input class="input" x-model="newEx.type" placeholder="Loại" />
            <input class="input" type="number" x-model.number="newEx.minutes" placeholder="Phút" />
            <button class="btn primary" @click="logEx()">Lưu</button>
          </div></div>
          <div class="card glass"><div class="card-title">😊 Mood</div><div class="row">
            <template x-for="m in ['😄','🙂','😐','😔','😣']" :key="m">
              <button class="mood-btn" :class="{active: todayMood()===m}" @click="logMood(m)" x-text="m"></button>
            </template>
          </div></div>
        </div>`;
      },
    };
  },
});
