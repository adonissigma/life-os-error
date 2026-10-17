import { LifeOS } from '../core.js';
LifeOS.register({
  id:'settings', group:'Hệ thống', groupOrder:9, order:1, icon:'⚙️', label:'Settings',
  setup() {
    return {
      get db() { return this.$store.db; },
      get g() { return this.db.settings.glass; },
      applyGlass() {
        const r = document.documentElement.style;
        r.setProperty('--glass-blur', this.g.blur + 'px');
        r.setProperty('--glass-opacity', this.g.opacity);
        r.setProperty('--glass-sat', this.g.saturation + '%');
      },
      get tpl() { return `
        <div class="mac-inspector glass">
          <h2 style="margin-top:0;font-size:16px;">Inspector</h2>
          
          <div class="inspector-section">
            <div class="inspector-title">Liquid Glass</div>
            <div class="inspector-row">
              <span>Mode</span>
              <div style="font-size:11px;opacity:0.6">Individual</div>
            </div>
            <div class="inspector-row">
              <span>Specular</span>
              <div class="ios-toggle on"></div>
            </div>
            <div class="inspector-row">
              <span>Blur</span>
              <input class="inspector-slider" type="range" min="0" max="80" x-model.number="g.blur" @input="applyGlass()" />
              <span x-text="g.blur+'%'" style="width:30px;text-align:right"></span>
            </div>
            <div class="inspector-row">
              <span>Translucency</span>
              <input class="inspector-slider" type="range" min="0" max="1" step="0.01" x-model.number="g.opacity" @input="applyGlass()" />
              <span x-text="Math.round(g.opacity*100)+'%'" style="width:30px;text-align:right"></span>
            </div>
            <div class="inspector-row">
              <span>Darkness</span>
              <input class="inspector-slider" type="range" min="0" max="100" value="42" />
            </div>
          </div>

          <div class="inspector-section">
            <div class="inspector-title">Account & Sync</div>
            <button class="btn" style="width:100%;margin-bottom:8px" @click="$root.showAuth=true">☁️ Đăng nhập / Sync</button>
            <button class="btn" style="width:100%" @click="exportAll()">💾 Backup JSON</button>
          </div>
          
          <div class="inspector-section">
            <div class="inspector-title">Reset</div>
            <button class="btn" style="width:100%;color:#ff453a" @click="resetAll()">Reset All Data</button>
          </div>
        </div>`;
      },
      exportAll() { LifeOS.helpers.download(`lifeos-backup.json`, JSON.stringify(this.db, null, 2), 'application/json'); },
      resetAll() { if(confirm('Xoá toàn bộ?')) { localStorage.clear(); location.reload(); } }
    };
  }
});
