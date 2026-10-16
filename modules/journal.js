import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'journal', group:'Cá nhân', groupOrder:2, order:3,
  icon:'📓', label:'Journal',
  setup() {
    return {
      newJournal: { text:'', mood:'🙂', energy:5, weather:'', tags:'' },
      search: '',
      template: 'free',
      templates: {
        free: { label:'✍️ Tự do', prompt:'Hôm nay thế nào...' },
        gratitude: { label:'🙏 Biết ơn', prompt:'3 điều biết ơn hôm nay...' },
        awesome: { label:'✨ 3 điều tuyệt vời', prompt:'3 điều tuyệt vời hôm nay...' },
        learn: { label:'💡 Bài học', prompt:'1 điều học được hôm nay...' },
        improve: { label:'🎯 Cải thiện', prompt:'Ngày mai cải thiện gì...' },
      },
      promptSuggestions: [
        'Hôm nay bạn tự hào nhất về điều gì?',
        'Điều gì làm bạn cười hôm nay?',
        'Bạn đã giúp ai hôm nay?',
        'Điều gì làm bạn lo lắng? Vì sao?',
        'Nếu được làm lại hôm nay, bạn sẽ làm gì khác?',
        'Bạn đang biết ơn điều gì nhỏ bé?',
        'Cơ thể bạn cảm thấy thế nào?',
        'Bạn đang học được bài học gì?',
      ],
      get db() { return this.$store.db; },
      timeAgo: H.timeAgo, todayISO: H.todayISO,

      applyTemplate() {
        const t = this.templates[this.template];
        if (this.template === 'gratitude') this.newJournal.text = '1. \n2. \n3. ';
        else if (this.template === 'awesome') this.newJournal.text = '1. \n2. \n3. ';
        else if (this.template === 'learn') this.newJournal.text = 'Bài học hôm nay: ';
        else if (this.template === 'improve') this.newJournal.text = 'Ngày mai tôi sẽ: ';
      },
      suggestPrompt() {
        const p = this.promptSuggestions[Math.floor(Math.random()*this.promptSuggestions.length)];
        this.newJournal.text = (this.newJournal.text || '') + '\n\n' + p;
      },
      add() {
        if (!this.newJournal.text.trim()) return;
        const tags = (this.newJournal.tags||'').split(',').map(s => s.trim()).filter(Boolean);
        this.db.journal.unshift({
          id:H.uid(), date:H.todayISO(),
          mood:this.newJournal.mood,
          energy:Number(this.newJournal.energy)||5,
          weather:this.newJournal.weather || '',
          tags,
          template: this.template,
          text:this.newJournal.text.trim(),
          created:new Date().toISOString(),
        });
        this.newJournal = { text:'', mood:'🙂', energy:5, weather:'', tags:'' };
        this.template = 'free';
      },
      del(id) { this.db.journal = this.db.journal.filter(j => j.id !== id); },
      sorted() {
        let list = [...this.db.journal].sort((a,b) => b.created.localeCompare(a.created));
        if (this.search.trim()) {
          const q = this.search.toLowerCase();
          list = list.filter(j => j.text.toLowerCase().includes(q) || (j.tags||[]).some(t => t.toLowerCase().includes(q)));
        }
        return list;
      },
      heatmap() {
        // last 91 days (13 weeks)
        const days = [];
        const today = new Date();
        for (let i = 90; i >= 0; i--) {
          const d = new Date(today); d.setDate(today.getDate()-i);
          const date = H.fmtDate(d);
          const count = this.db.journal.filter(j => j.date === date).length;
          days.push({ date, count });
        }
        return days;
      },
      streak() {
        const s = new Set(this.db.journal.map(j => j.date)); let n=0; const d = new Date();
        if (!s.has(H.fmtDate(d))) d.setDate(d.getDate()-1);
        while (s.has(H.fmtDate(d))) { n++; d.setDate(d.getDate()-1); }
        return n;
      },

      get tpl() { return `
        <div class="page-head"><h1 class="page-title">📓 Journal</h1><button class="export-btn" @click="$root.openExport('journal')">📤 Xuất</button></div>

        <div class="grid grid-3">
          <div class="card glass stat"><div class="stat-label">Streak</div><div class="stat-value" x-text="streak()+'🔥'"></div></div>
          <div class="card glass stat"><div class="stat-label">Tổng entries</div><div class="stat-value" x-text="db.journal.length"></div></div>
          <div class="card glass stat"><div class="stat-label">Trung bình mood</div><div class="stat-value" x-text="db.journal.length ? '😊' : '—'"></div></div>
        </div>

        <div class="card glass">
          <div class="card-title">91 ngày qua</div>
          <div class="jheat">
            <template x-for="d in heatmap()" :key="d.date">
              <div class="jheat-cell" :class="'lvl-'+Math.min(4, d.count)" :title="d.date+' ('+d.count+')'"></div>
            </template>
          </div>
        </div>

        <div class="card glass">
          <div class="tabs" style="margin-bottom:12px">
            <template x-for="(t, k) in templates" :key="k">
              <button class="tab" :class="{active: template===k}" @click="template=k; applyTemplate()" x-text="t.label"></button>
            </template>
          </div>

          <textarea class="textarea" x-model="newJournal.text" :placeholder="templates[template].prompt"></textarea>

          <div class="row" style="margin-top:10px">
            <select class="input" x-model="newJournal.mood" style="max-width:150px">
              <option value="😄">😄 Vui</option><option value="🙂">🙂 Bình thường</option>
              <option value="😐">😐 Trung tính</option><option value="😔">😔 Buồn</option>
              <option value="😣">😣 Stress</option><option value="😡">😡 Giận</option>
              <option value="😴">😴 Mệt</option>
            </select>
            <div class="row" style="gap:6px">
              <span class="muted small">Năng lượng</span>
              <input type="range" min="1" max="10" x-model.number="newJournal.energy" style="width:100px" />
              <span class="muted small" x-text="newJournal.energy+'/10'"></span>
            </div>
            <select class="input" x-model="newJournal.weather" style="max-width:130px">
              <option value="">Thời tiết</option><option value="☀️">☀️ Nắng</option>
              <option value="🌧">🌧 Mưa</option><option value="☁️">☁️ Âm u</option>
              <option value="⛈">⛈ Bão</option><option value="🌫">🌫 Sương</option>
            </select>
            <input class="input" x-model="newJournal.tags" placeholder="Tags (cách nhau dấu phẩy)" style="max-width:220px" />
            <button class="btn" @click="suggestPrompt()">💡 Gợi ý</button>
            <button class="btn primary" @click="add()">Lưu</button>
          </div>
        </div>

        <div class="card glass">
          <input class="input" x-model="search" placeholder="🔍 Tìm trong journal..." />
        </div>

        <template x-for="j in sorted()" :key="j.id">
          <div class="card glass">
            <div class="row row-between">
              <div class="row" style="gap:12px">
                <span style="font-size:26px" x-text="j.mood"></span>
                <div>
                  <div class="task-title" x-text="j.date + (j.weather ? ' '+j.weather : '')"></div>
                  <div class="muted small">
                    <span x-text="timeAgo(j.created)"></span>
                    <span x-show="j.energy" x-text="' · ⚡'+j.energy+'/10'"></span>
                  </div>
                </div>
              </div>
              <button class="icon-btn" @click="del(j.id)">✕</button>
            </div>
            <p class="journal-body" x-text="j.text"></p>
            <div class="row" style="gap:6px;margin-top:8px" x-show="j.tags && j.tags.length">
              <template x-for="t in (j.tags||[])" :key="t">
                <span class="tag">#<span x-text="t"></span></span>
              </template>
            </div>
          </div>
        </template>`;
      },
    };
  },
});
