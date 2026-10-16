import { LifeOS } from '../core.js';
LifeOS.register({
  id:'settings', group:'Hệ thống', groupOrder:9, order:1, icon:'⚙️', label:'Settings',
  setup() {
    return {
      get db() { return this.$store.db; },
      exportAll() { LifeOS.helpers.download(`lifeos-backup-${LifeOS.helpers.todayISO()}.json`, JSON.stringify(this.db, null, 2), 'application/json'); },
      importAll(e) {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => { try { const p = JSON.parse(r.result); if (confirm('Ghi đè?')) Object.assign(this.db, LifeOS.deepMerge(JSON.parse(JSON.stringify(this.db)), p)); } catch { alert('File lỗi'); } };
        r.readAsText(f);
      },
      resetAll() { if (confirm('Xoá toàn bộ?')) location.reload(); },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">⚙️ Settings</h1></div>
        <div class="card glass"><div class="card-title">Hồ sơ</div><div class="row">
          <input class="input" x-model="db.profile.name" placeholder="Tên" />
          <input class="input" x-model="db.settings.currency" placeholder="Tiền tệ" style="max-width:160px" />
          <input class="input" type="number" x-model.number="db.settings.dailyBudget" placeholder="Ngân sách/ngày" />
        </div></div>
        <div class="card glass"><div class="card-title">Backup & Restore</div><div class="row">
          <button class="btn" @click="exportAll()">💾 Tải backup JSON</button>
          <label class="btn">📂 Import<input type="file" accept="application/json" @change="importAll($event)" style="display:none" /></label>
          <button class="btn" style="color:#ff3b30" @click="resetAll()">🗑 Xoá</button>
        </div></div>`;
      },
    };
  },
});
