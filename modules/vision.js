import { LifeOS } from '../core.js';
LifeOS.register({
  id:'vision', group:'Cá nhân', groupOrder:2, order:5, icon:'🧭', label:'Vision',
  setup() {
    return {
      get db() { return this.$store.db; },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">🧭 Vision</h1></div>
        <div class="card glass">
          <div class="card-title">Tầm nhìn</div>
          <textarea class="textarea" x-model="db.vision.statement" placeholder="Cuộc đời lý tưởng 5-10 năm tới..."></textarea>
          <div class="card-title" style="margin-top:14px">Sứ mệnh</div>
          <textarea class="textarea" x-model="db.vision.mission" rows="2"></textarea>
          <div class="card-title" style="margin-top:14px">Giá trị cốt lõi</div>
          <textarea class="textarea" x-model="db.vision.values" rows="3"></textarea>
        </div>
        <div class="card glass">
          <div class="card-title">🎡 Life Wheel</div>
          <div class="grid grid-3">
            <template x-for="w in db.vision.wheel" :key="w.key">
              <div>
                <div class="row row-between small"><span x-text="w.label"></span><span class="muted" x-text="w.score"></span></div>
                <input type="range" min="1" max="10" x-model.number="w.score" style="width:100%" />
              </div>
            </template>
          </div>
        </div>`;
      },
    };
  },
});
