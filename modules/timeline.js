import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'timeline', group:'Tổng quan', groupOrder:1, order:2,
  icon:'⏱', label:'Timeline',
  setup() {
    return {
      tlDate: H.todayISO(),
      hourHeight: 48,
      newBlock: { title:'', start:'08:00', end:'09:00', categoryId:'', note:'' },
      newCat: '',
      get db() { return this.$store.db; },
      catColor: H.catColor, catName: H.catName, fmtDate: H.fmtDate, todayISO: H.todayISO,
      shift(d, n) { return H.shiftDate(d, n); },

      addCategory() { if (!this.newCat.trim()) return; this.db.categories.push({ id: H.uid(), name: this.newCat.trim(), color: '#0a84ff' }); this.newCat = ''; },
      addBlock() {
        if (!this.newBlock.title.trim() || !this.newBlock.start || !this.newBlock.end) return;
        this.db.tasks.push({ id:H.uid(), title:this.newBlock.title.trim(), date:this.tlDate, due:this.tlDate, start:this.newBlock.start, end:this.newBlock.end, categoryId:this.newBlock.categoryId, note:this.newBlock.note||'', priority:2, done:false, created:new Date().toISOString() });
        this.newBlock = { title:'', start:'08:00', end:'09:00', categoryId:'', note:'' };
      },
      deleteBlock(id) { this.db.tasks = this.db.tasks.filter(t => t.id !== id); },
      editBlock(t) { const v = prompt('Sửa tên block:', t.title); if (v?.trim()) t.title = v.trim(); },
      forDate(d) { return this.db.tasks.filter(t => t.date === d && t.start && t.end).sort((a,b) => a.start.localeCompare(b.start)); },
      tlTop(t) { const [h,m] = t.start.split(':').map(Number); return (h + m/60) * this.hourHeight; },
      tlHeight(t) { const [sh,sm]=t.start.split(':').map(Number), [eh,em]=t.end.split(':').map(Number); return Math.max(24, (((eh*60+em)-(sh*60+sm))/60) * this.hourHeight); },
      overlaps(a,b) { return a.id !== b.id && !(a.end <= b.start || a.start >= b.end); },
      tlLeft(t) { const o = this.forDate(t.date).filter(x => this.overlaps(t,x)); if (o.length <= 1) return 0; return Math.round((o.findIndex(x => x.id === t.id) / o.length) * 100); },
      tlWidth(t) { const o = this.forDate(t.date).filter(x => this.overlaps(t,x)); if (o.length <= 1) return 100; return Math.round(100 / o.length) - 1; },

      exportICS() {
        const tasks = this.db.tasks.filter(t => t.date && t.start && t.end);
        H.download(`lifeos-${H.todayISO()}.ics`, LifeOS.exporter.toICS(tasks, this.db.categories), 'text/calendar');
      },
      exportSheet() {
        const tasks = this.forDate(this.tlDate);
        const tsv = LifeOS.exporter.toSheetsTSV(tasks, this.db.categories);
        H.download(`timeline-${this.tlDate}.tsv`, tsv, 'text/tab-separated-values');
        navigator.clipboard.writeText(tsv).catch(()=>{});
      },

      get tpl() { return `
        <div class="page-head">
          <div><h1 class="page-title">⏱ Timeline</h1><p class="page-sub">Xuất .ics để import vào Google Calendar</p></div>
          <div class="row">
            <button class="btn" @click="tlDate=shift(tlDate,-1)">◀</button>
            <input class="input" type="date" x-model="tlDate" style="max-width:170px" />
            <button class="btn" @click="tlDate=shift(tlDate,1)">▶</button>
            <button class="btn" @click="tlDate=todayISO()">Hôm nay</button>
            <button class="export-btn" @click="exportICS()">📅 .ics</button>
            <button class="export-btn" @click="exportSheet()">📊 Sheet</button>
          </div>
        </div>
        <div class="card glass">
          <div class="card-title">Categories</div>
          <div class="row">
            <template x-for="c in db.categories" :key="c.id">
              <div class="cat-chip" :style="'background:'+c.color+'22;border-color:'+c.color">
                <input type="color" x-model="c.color" class="cat-color" />
                <input class="cat-name" x-model="c.name" />
                <button class="icon-btn" @click="db.categories=db.categories.filter(x=>x.id!==c.id)">✕</button>
              </div>
            </template>
            <input class="input" x-model="newCat" @keydown.enter="addCategory()" placeholder="+ Category..." style="max-width:200px" />
          </div>
        </div>
        <div class="card glass">
          <div class="card-title">Thêm block</div>
          <div class="row">
            <input class="input" x-model="newBlock.title" placeholder="Việc..." style="flex:1" />
            <input class="input" type="time" x-model="newBlock.start" style="max-width:130px" />
            <input class="input" type="time" x-model="newBlock.end" style="max-width:130px" />
            <select class="input" x-model="newBlock.categoryId" style="max-width:160px">
              <option value="">— Category —</option>
              <template x-for="c in db.categories" :key="c.id"><option :value="c.id" x-text="c.name"></option></template>
            </select>
            <input class="input" x-model="newBlock.note" placeholder="Note" style="max-width:180px" />
            <button class="btn primary" @click="addBlock()">+ Block</button>
          </div>
        </div>
        <div class="card glass">
          <div class="timeline" :style="'height:'+(24*hourHeight)+'px'">
            <template x-for="h in 24" :key="h">
              <div class="tl-hour" :style="'top:'+((h-1)*hourHeight)+'px;height:'+hourHeight+'px'">
                <span class="tl-hour-label" x-text="String(h-1).padStart(2,'0')+':00'"></span>
              </div>
            </template>
            <template x-for="t in forDate(tlDate)" :key="t.id">
              <div class="tl-block" :style="'top:'+tlTop(t)+'px;height:'+tlHeight(t)+'px;left:'+tlLeft(t)+'%;width:'+tlWidth(t)+'%;background:'+catColor(t.categoryId)+'22;border-left:4px solid '+catColor(t.categoryId)" @click="editBlock(t)">
                <div class="tl-block-head"><span class="tl-block-time" x-text="t.start+' — '+t.end"></span><button class="icon-btn" @click.stop="deleteBlock(t.id)">✕</button></div>
                <div class="tl-block-title" x-text="t.title"></div>
                <div class="tl-block-note" x-show="t.note" x-text="t.note"></div>
                <div class="tl-block-cat" :style="'color:'+catColor(t.categoryId)" x-text="catName(t.categoryId)"></div>
              </div>
            </template>
          </div>
        </div>`;
      },
    };
  },
});
