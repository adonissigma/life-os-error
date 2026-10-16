import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id:'reviews', group:'Cá nhân', groupOrder:2, order:6,
  icon:'📊', label:'Reviews',
  setup() {
    return {
      reviewType: 'weekly',
      answers: {},
      filter: 'all',
      get db() { return this.$store.db; },
      timeAgo: H.timeAgo,

      prompts: {
        daily: {
          label: '🌙 Daily Review',
          questions: [
            'Hôm nay thế nào? (mood, cảm xúc chính)',
            'Đã làm được gì? (3 điều)',
            'Chưa làm được gì?',
            'Ngày mai ưu tiên gì?',
            'Một điều biết ơn hôm nay?',
          ],
        },
        weekly: {
          label: '📅 Weekly Review',
          questions: [
            'Điểm sáng trong tuần?',
            'Điểm tối / thất vọng?',
            'Task hoàn thành / tồn đọng?',
            'Habit nào giữ, nào bỏ?',
            'Tiền tiêu tuần này — có hợp lý không?',
            'Sức khỏe tuần này (ngủ, tập, mood)?',
            'Mục tiêu tuần sau?',
            '1 bài học lớn nhất?',
          ],
        },
        monthly: {
          label: '📆 Monthly Review',
          questions: [
            'So với tháng trước — điều gì tiến, điều gì lùi?',
            'Life Wheel cập nhật (nan nào cao/thấp)?',
            'OKR / Goal tiến độ?',
            'Tài chính tháng — thu/chi/net?',
            'Tháng tới cần điều chỉnh gì?',
          ],
        },
        quarterly: {
          label: '🗓 Quarterly Review',
          questions: [
            'Nhìn lại quý — 3 điều tự hào?',
            '3 điều chưa đạt?',
            'OKR cần điều chỉnh?',
            'Kế hoạch quý tới — ưu tiên gì?',
          ],
        },
        yearly: {
          label: '🎊 Yearly Review',
          questions: [
            'Tổng kết năm — 1 đoạn văn?',
            'Top 10 khoảnh khắc đáng nhớ?',
            'Bài học lớn nhất?',
            'Điều gì bạn muốn làm khác đi năm sau?',
            'Mục tiêu năm tới (3-5 cái)?',
          ],
        },
      },

      current() { return this.prompts[this.reviewType]; },
      keyOf(i) { return this.reviewType + '_' + i; },
      getAnswer(i) { return this.answers[this.keyOf(i)] || ''; },
      setAnswer(i, v) { this.answers[this.keyOf(i)] = v; },

      save() {
        const q = this.current().questions;
        const filled = q.map((_, i) => this.getAnswer(i));
        if (!filled.some(a => a.trim())) return;
        const review = {
          id: H.uid(),
          type: this.reviewType,
          date: H.todayISO(),
          created: new Date().toISOString(),
          answers: q.map((qq, i) => ({ q: qq, a: filled[i] })),
        };
        if (!this.db.reviews) this.db.reviews = [];
        this.db.reviews.unshift(review);
        this.answers = {};
      },
      del(id) { this.db.reviews = this.db.reviews.filter(r => r.id !== id); },
      list() {
        const all = this.db.reviews || [];
        if (this.filter === 'all') return all;
        return all.filter(r => r.type === this.filter);
      },
      exportReview(r) {
        const cat = this.prompts[r.type]?.label || r.type;
        let md = `# ${cat} — ${r.date}\n\n`;
        r.answers.forEach(a => { md += `**${a.q}**\n${a.a}\n\n`; });
        H.download(`review-${r.type}-${r.date}.md`, md, 'text/markdown');
      },

      get tpl() { return `
        <div class="page-head">
          <h1 class="page-title">📊 Reviews định kỳ</h1>
        </div>

        <div class="card glass">
          <div class="card-title">Tạo review</div>
          <div class="tabs" style="margin-bottom:14px">
            <template x-for="(p, k) in prompts" :key="k">
              <button class="tab" :class="{active: reviewType===k}" @click="reviewType=k" x-text="p.label"></button>
            </template>
          </div>

          <template x-for="(q, i) in current().questions" :key="i">
            <div style="margin-bottom:14px">
              <div class="muted small" style="margin-bottom:6px" x-text="(i+1)+'. '+q"></div>
              <textarea class="textarea" rows="3" :value="getAnswer(i)" @input="setAnswer(i, $event.target.value)"></textarea>
            </div>
          </template>

          <div class="row">
            <button class="btn primary" @click="save()">💾 Lưu review</button>
            <button class="btn" @click="answers={}">Xoá nháp</button>
          </div>
        </div>

        <div class="card glass">
          <div class="row row-between">
            <div class="card-title" style="margin:0">📜 Review đã lưu (${(db.reviews||[]).length})</div>
            <div class="tabs">
              <button class="tab" :class="{active: filter==='all'}" @click="filter='all'">Tất cả</button>
              <button class="tab" :class="{active: filter==='daily'}" @click="filter='daily'">Daily</button>
              <button class="tab" :class="{active: filter==='weekly'}" @click="filter='weekly'">Weekly</button>
              <button class="tab" :class="{active: filter==='monthly'}" @click="filter='monthly'">Monthly</button>
              <button class="tab" :class="{active: filter==='quarterly'}" @click="filter='quarterly'">Q</button>
              <button class="tab" :class="{active: filter==='yearly'}" @click="filter='yearly'">Year</button>
            </div>
          </div>

          <template x-for="r in list()" :key="r.id">
            <div class="arc-entry">
              <div class="row row-between">
                <div>
                  <b x-text="(prompts[r.type]?.label || r.type) + ' · ' + r.date"></b>
                  <span class="muted small" style="margin-left:8px" x-text="timeAgo(r.created)"></span>
                </div>
                <div class="row">
                  <button class="icon-btn" @click="exportReview(r)">📤</button>
                  <button class="icon-btn" @click="del(r.id)">✕</button>
                </div>
              </div>
              <template x-for="(a, i) in r.answers" :key="i">
                <div style="margin-top:8px">
                  <div class="muted small" x-text="a.q"></div>
                  <div x-text="a.a" style="white-space:pre-wrap"></div>
                </div>
              </template>
            </div>
          </template>
          <p x-show="!list().length" class="empty">Chưa có review nào. Tạo cái đầu tiên ở trên.</p>
        </div>`;
      },
    };
  },
});
