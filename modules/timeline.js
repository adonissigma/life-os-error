import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id: 'timeline', group:'Tổng quan', groupOrder:1, order:2,
  icon:'⏱', label:'Timeline',
  setup() {
    return {
      tlDate: H.todayISO(),
      hourHeight: 60, // Cao hơn để dễ đọc
      get db() { return this.$store.db; },
      catColor: H.catColor, catName: H.catName, todayISO: H.todayISO,
      
      shift(d, n) { return H.shiftDate(d, n); },
      forDate(d) { return this.db.tasks.filter(t => t.date === d && t.start && t.end).sort((a,b) => a.start.localeCompare(b.start)); },
      
      tlTop(t) { const [h,m] = t.start.split(':').map(Number); return (h + m/60) * this.hourHeight + 20; },
      tlHeight(t) { const [sh,sm]=t.start.split(':').map(Number), [eh,em]=t.end.split(':').map(Number); return Math.max(24, (((eh*60+em)-(sh*60+sm))/60) * this.hourHeight); },

      // COPY FEATURE
      copyFromDate(sourceDate) {
        const blocks = this.db.tasks.filter(t => t.date === sourceDate && t.start && t.end);
        if (!blocks.length) { alert('Ngày nguồn không có block nào!'); return; }
        
        blocks.forEach(b => {
          this.db.tasks.push({
            ...b, id: H.uid(), date: this.tlDate, done: false, completedAt: null
          });
        });
        alert(`Đã copy ${blocks.length} blocks sang ngày ${this.tlDate}`);
      },
      
      copyYesterday() {
        const yes = new Date(this.tlDate); yes.setDate(yes.getDate() - 1);
        this.copyFromDate(H.fmtDate(yes));
      },

      get tpl() { return `
        <div class="page-head" style="margin-bottom:20px">
          <div>
            <h1 class="page-title">⏱ Timeline</h1>
          </div>
          <div class="row">
            <button class="btn" @click="tlDate=shift(tlDate,-1)">◀</button>
            <input class="input" type="date" x-model="tlDate" style="max-width:160px;background:rgba(0,0,0,0.2);color:#fff" />
            <button class="btn" @click="tlDate=shift(tlDate,1)">▶</button>
            <button class="btn primary" @click="copyYesterday()">📋 Copy hôm qua</button>
          </div>
        </div>

        <div class="card glass" style="padding:20px">
          <div class="timeline-split">
            <!-- TIME AXIS -->
            <div class="time-axis">
              <template x-for="h in 24" :key="h">
                <div class="time-label" x-text="String(h-1).padStart(2,'0')+':00'"></div>
              </template>
            </div>
            
            <!-- BLOCKS -->
            <div class="blocks-container" :style="'height:'+(24*hourHeight)+'px'">
              <template x-for="t in forDate(tlDate)" :key="t.id">
                <div class="tl-block" 
                     :style="'top:'+tlTop(t)+'px;height:'+tlHeight(t)+'px;border-left-color:'+catColor(t.categoryId)+';background:'+catColor(t.categoryId)+'33'">
                  <div style="display:flex;justify-content:space-between">
                    <span style="font-size:12px;opacity:0.8" x-text="t.start+' - '+t.end"></span>
                    <span style="font-size:11px;font-weight:600" :style="'color:'+catColor(t.categoryId)" x-text="catName(t.categoryId)"></span>
                  </div>
                  <div style="font-weight:700;font-size:15px;margin-top:4px" x-text="t.title"></div>
                </div>
              </template>
            </div>
          </div>
        </div>`;
      },
    };
  },
});
