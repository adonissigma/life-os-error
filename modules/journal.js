import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'journal', group:'Cá nhân', groupOrder:2, order:3,
  icon:'📓', label:'Journal',
  setup() {
    return {
      newJournal: { text:'', mood:'🙂' },
      get db() { return this.$store.db; },
      timeAgo: H.timeAgo,
      add() { if (!this.newJournal.text.trim()) return; this.db.journal.unshift({ id:H.uid(), date:H.todayISO(), mood:this.newJournal.mood, text:this.newJournal.text.trim(), created:new Date().toISOString() }); this.newJournal = { text:'', mood:'🙂' }; },
      del(id) { this.db.journal = this.db.journal.filter(j => j.id !== id); },
      sorted() { return [...this.db.journal].sort((a,b) => b.created.localeCompare(a.created)); },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">📓 Journal</h1><button class="export-btn" @click="$root.openExport('journal')">📤 Xuất</button></div>
        <div class="card glass">
          <textarea class="textarea" x-model="newJournal.text" placeholder="Hôm nay thế nào..."></textarea>
          <div class="row" style="margin-top:10px">
            <select class="input" x-model="newJournal.mood" style="max-width:200px">
              <option value="😄">😄 Vui</option><option value="🙂">🙂 Bình thường</option>
              <option value="😐">😐 Trung tính</option><option value="😔">😔 Buồn</option><option value="😣">😣 Stress</option>
            </select>
            <button class="btn primary" @click="add()">Lưu</button>
          </div>
        </div>
        <template x-for="j in sorted()" :key="j.id">
          <div class="card glass">
            <div class="row row-between">
              <div class="row" style="gap:10px"><span style="font-size:22px" x-text="j.mood"></span><div><div class="task-title" x-text="j.date"></div><div class="muted small" x-text="timeAgo(j.created)"></div></div></div>
              <button class="icon-btn" @click="del(j.id)">✕</button>
            </div>
            <p class="journal-body" x-text="j.text"></p>
          </div>
        </template>`;
      },
    };
  },
});
