import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id:'settings', group:'Hệ thống', groupOrder:9, order:1,
  icon:'⚙️', label:'Settings',
  setup() {
    return {
      get db() { return this.$store.db; },
      get g() { return this.db.settings.glass; },

      applyGlass() {
        const r = document.documentElement.style;
        r.setProperty('--glass-blur', this.g.blur + 'px');
        r.setProperty('--glass-opacity', this.g.opacity);
        r.setProperty('--glass-sat', this.g.saturation + '%');
        r.setProperty('--glass-border', this.g.border);
      },

      exportAll() {
        H.download(`lifeos-backup-${H.todayISO()}.json`, JSON.stringify(this.db, null, 2), 'application/json');
      },
      importAll(e) {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const p = JSON.parse(r.result);
            if (confirm('Ghi đè toàn bộ?')) {
              Object.assign(this.db, LifeOS.deepMerge(JSON.parse(JSON.stringify(this.db)), p));
              this.applyGlass();
            }
          } catch { alert('File lỗi'); }
        };
        r.readAsText(f);
      },
      resetAll() {
        if (confirm('Xoá toàn bộ dữ liệu?')) {
          localStorage.clear();
          location.reload();
        }
      },

      get tpl() { return `
        <div class="page-head"><h1 class="page-title">⚙️ Settings</h1></div>

        <div class="card glass">
          <div class="card-title">Hồ sơ</div>
          <div class="row">
            <input class="input" x-model="db.profile.name" placeholder="Tên" />
            <input class="input" x-model="db.settings.currency" placeholder="Tiền tệ" style="max-width:160px" />
            <input class="input" type="number" x-model.number="db.settings.dailyBudget" placeholder="Ngân sách/ngày" />
          </div>
        </div>

        <div class="card glass">
          <div class="card-title">🧊 Liquid Glass</div>

          <div style="margin-bottom:16px">
            <div class="row row-between small">
              <span>Độ mờ nền (Blur)</span>
              <span class="muted" x-text="g.blur+'px'"></span>
            </div>
            <input class="ios-range" type="range" min="0" max="80" step="1" x-model.number="g.blur" @input="applyGlass()" />
          </div>

          <div style="margin-bottom:16px">
            <div class="row row-between small">
              <span>Độ trong suốt (Opacity)</span>
              <span class="muted" x-text="Math.round(g.opacity*100)+'%'"></span>
            </div>
            <input class="ios-range" type="range" min="0" max="1" step="0.01" x-model.number="g.opacity" @input="applyGlass()" />
          </div>

          <div style="margin-bottom:16px">
            <div class="row row-between small">
              <span>Độ bão hoà (Saturation)</span>
              <span class="muted" x-text="g.saturation+'%'"></span>
            </div>
            <input class="ios-range" type="range" min="100" max="300" step="5" x-model.number="g.saturation" @input="applyGlass()" />
          </div>

          <div style="margin-bottom:16px">
            <div class="row row-between small">
              <span>Độ đậm viền</span>
              <span class="muted" x-text="Math.round(g.border*100)+'%'"></span>
            </div>
            <input class="ios-range" type="range" min="0" max="1" step="0.05" x-model.number="g.border" @input="applyGlass()" />
          </div>

          <div class="row" style="margin-top:12px;gap:20px">
            <label class="row" style="gap:8px;cursor:pointer">
              <input type="checkbox" x-model="g.dynamicIsland" />
              <span>Dynamic Island</span>
            </label>
            <label class="row" style="gap:8px;cursor:pointer">
              <input type="checkbox" x-model="g.bottomNav" />
              <span>Bottom Nav (mobile)</span>
            </label>
            <label class="row" style="gap:8px;cursor:pointer">
              <input type="checkbox" x-model="g.highlight" />
              <span>Specular Highlight</span>
            </label>
          </div>

          <div class="row" style="margin-top:16px">
            <button class="btn" @click="g = {blur:30,opacity:0.55,saturation:180,border:0.6,dynamicIsland:true,bottomNav:true,highlight:true}; applyGlass()">↺ Mặc định</button>
            <button class="btn" @click="g = {blur:0,opacity:0.9,saturation:100,border:0.2,dynamicIsland:true,bottomNav:true,highlight:false}; applyGlass()">Solid Mode</button>
            <button class="btn primary" @click="g = {blur:50,opacity:0.35,saturation:200,border:0.8,dynamicIsland:true,bottomNav:true,highlight:true}; applyGlass()">🧊 Ultra Liquid</button>
          </div>
        </div>

        <div class="card glass">
          <div class="card-title">Giao diện</div>
          <button class="btn" @click="$root.toggleTheme()">
            <span x-text="db.settings.theme==='dark' ? '☀️ Chuyển sáng' : '🌙 Chuyển tối'"></span>
          </button>
        </div>

        <div class="card glass">
          <div class="card-title">Backup & Restore</div>
          <div class="row">
            <button class="btn" @click="exportAll()">💾 Tải backup JSON</button>
            <label class="btn">📂 Import<input type="file" accept="application/json" @change="importAll($event)" style="display:none" /></label>
            <button class="btn" style="color:#ff3b30" @click="resetAll()">🗑 Xoá toàn bộ</button>
          </div>
        </div>`;
      },
    };
  },
});
