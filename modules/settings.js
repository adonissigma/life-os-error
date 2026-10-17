import { LifeOS } from '../core.js';
LifeOS.register({
  id:'settings', group:'Hệ thống', groupOrder:9, order:1, icon:'⚙️', label:'Settings',
  setup() {
    return {
      get db() { return this.$store.db; },
      get g() { return this.db.settings.glass; },
      get tpl() { return `
        <div class="mac-inspector glass">
          <div style="display:flex;justify-content:space-between;margin-bottom:24px">
            <h2 style="margin:0;font-size:16px;">Inspector</h2>
            <span style="font-size:12px;color:#888">Edited</span>
          </div>
          
          <div class="inspector-title">Color</div>
          <div class="inspector-row">
            <span>Opacity</span>
            <input class="inspector-slider" type="range" min="0" max="1" step="0.01" x-model.number="g.opacity" @input="$root.applyGlassVars()" />
            <span x-text="Math.round(g.opacity*100)+'%'" style="width:30px;text-align:right"></span>
          </div>

          <div class="inspector-title" style="margin-top:24px">Liquid Glass</div>
          <div class="inspector-row">
            <span>Mode</span>
            <div style="font-size:12px;opacity:0.6">Individual</div>
          </div>
          <div class="inspector-row">
            <span>Blur</span>
            <input class="inspector-slider" type="range" min="0" max="80" x-model.number="g.blur" @input="$root.applyGlassVars()" />
            <span x-text="g.blur+'%'" style="width:30px;text-align:right"></span>
          </div>
          
          <div class="inspector-row" style="margin-top:12px">
            <span>Specular Highlight</span>
            <div class="ios-toggle on"></div>
          </div>

          <div class="inspector-title" style="margin-top:24px">Account & Sync</div>
          <button class="btn" style="width:100%;margin-bottom:8px" @click="$root.showAuth=true">☁️ Sync Account</button>
          <button class="btn" style="width:100%;color:#ff453a" @click="if(confirm('Xoá?')) localStorage.clear();location.reload()">Reset Data</button>
        </div>`;
      }
    };
  }
});
