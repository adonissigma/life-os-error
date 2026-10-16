import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id:'learning', group:'Phát triển', groupOrder:4, order:1,
  icon:'📚', label:'Learning',
  setup() {
    return {
      tab: 'books',
      newBook: { title:'', author:'', pages:0, status:'want' },
      newCourse: { title:'', platform:'', cost:0, url:'' },
      newSkill: { name:'', current:1, target:10 },
      newCard: { q:'', a:'', deck:'' },
      review: { cardId:'', revealed:false },
      get db() { return this.$store.db; },
      todayISO: H.todayISO,

      ensure() {
        if (!this.db.learning) this.db.learning = {};
        const L = this.db.learning;
        if (!L.books) L.books = [];
        if (!L.courses) L.courses = [];
        if (!L.skills) L.skills = [];
        if (!L.cards) L.cards = [];
        if (!L.notes) L.notes = [];
      },
      init() { this.ensure(); },

      // ─── books ───
      addBook() {
        if (!this.newBook.title.trim()) return;
        this.db.learning.books.push({ id:H.uid(), ...this.newBook, pages:Number(this.newBook.pages)||0, current:0, rating:0, quotes:[], created:new Date().toISOString() });
        this.newBook = { title:'', author:'', pages:0, status:'want' };
      },
      delBook(id) { this.db.learning.books = this.db.learning.books.filter(b => b.id !== id); },
      setBookStatus(b, s) { b.status = s; if (s === 'done') b.finished = H.todayISO(); },
      bookPct(b) { return b.pages ? Math.round((b.current||0)/b.pages*100) : 0; },
      addQuote(b) {
        const q = prompt('Quote hay:');
        if (q?.trim()) { b.quotes = b.quotes || []; b.quotes.push(q.trim()); }
      },

      // ─── courses ───
      addCourse() {
        if (!this.newCourse.title.trim()) return;
        this.db.learning.courses.push({ id:H.uid(), ...this.newCourse, progress:0, created:new Date().toISOString() });
        this.newCourse = { title:'', platform:'', cost:0, url:'' };
      },
      delCourse(id) { this.db.learning.courses = this.db.learning.courses.filter(c => c.id !== id); },

      // ─── skills ───
      addSkill() {
        if (!this.newSkill.name.trim()) return;
        this.db.learning.skills.push({ id:H.uid(), ...this.newSkill, history:[] });
        this.newSkill = { name:'', current:1, target:10 };
      },
      delSkill(id) { this.db.learning.skills = this.db.learning.skills.filter(s => s.id !== id); },
      logSkill(s) { s.history = s.history || []; s.history.push({ date: H.todayISO(), level: s.current }); },

      // ─── flashcards SRS ───
      addCard() {
        if (!this.newCard.q.trim() || !this.newCard.a.trim()) return;
        this.db.learning.cards.push({ id:H.uid(), q:this.newCard.q.trim(), a:this.newCard.a.trim(), deck:this.newCard.deck||'misc', ease:2.5, interval:0, due: H.todayISO(), reps:0 });
        this.newCard = { q:'', a:'', deck:'' };
      },
      delCard(id) { this.db.learning.cards = this.db.learning.cards.filter(c => c.id !== id); },
      dueCards() {
        const today = H.todayISO();
        return this.db.learning.cards.filter(c => !c.due || c.due <= today);
      },
      startReview() {
        const due = this.dueCards();
        if (!due.length) { alert('Không có thẻ nào đến hạn 🎉'); return; }
        this.review = { cardId: due[0].id, revealed: false };
      },
      currentCard() { return this.db.learning.cards.find(c => c.id === this.review.cardId); },
      gradeCard(quality) {
        const card = this.currentCard();
        if (!card) return;
        const q = Math.max(0, Math.min(5, quality)); // 0..5
        if (q < 3) { card.interval = 1; card.ease = Math.max(1.3, card.ease - 0.2); }
        else if (q === 3) { card.interval = Math.max(1, card.interval * 1.2); }
        else if (q === 4) { card.interval = Math.max(1, card.interval * card.ease); }
        else { card.interval = Math.max(2, card.interval * card.ease * 1.3); }
        if (card.reps === 0) card.interval = 1;
        if (card.reps === 1) card.interval = q >= 3 ? 4 : 1;
        card.reps = (card.reps||0) + 1;
        const d = new Date(); d.setDate(d.getDate() + Math.round(card.interval));
        card.due = H.fmtDate(d);
        // next card
        const due = this.dueCards().filter(c => c.id !== card.id);
        if (due.length) this.review = { cardId: due[0].id, revealed: false };
        else { this.review = { cardId:'', revealed:false }; alert('Xong! Quay lại sau nhé.'); }
      },

      get tpl() { return `
        <div class="page-head"><h1 class="page-title">📚 Learning</h1></div>

        <div class="tabs" style="margin-bottom:16px">
          <button class="tab" :class="{active: tab==='books'}" @click="tab='books'">📖 Sách</button>
          <button class="tab" :class="{active: tab==='courses'}" @click="tab='courses'">🎓 Khóa học</button>
          <button class="tab" :class="{active: tab==='skills'}" @click="tab='skills'">⚡ Kỹ năng</button>
          <button class="tab" :class="{active: tab==='cards'}" @click="tab='cards'">🧠 Flashcards</button>
        </div>

        <div x-show="tab==='books'">
          <div class="card glass"><div class="row">
            <input class="input" x-model="newBook.title" placeholder="Tên sách" style="flex:1" />
            <input class="input" x-model="newBook.author" placeholder="Tác giả" style="max-width:180px" />
            <input class="input" type="number" x-model.number="newBook.pages" placeholder="Trang" style="max-width:100px" />
            <select class="input" x-model="newBook.status" style="max-width:150px">
              <option value="want">Muốn đọc</option><option value="reading">Đang đọc</option>
              <option value="done">Đã đọc</option><option value="dropped">Bỏ dở</option>
            </select>
            <button class="btn primary" @click="addBook()">+ Thêm</button>
          </div></div>

          <div class="grid grid-2">
            <template x-for="b in db.learning.books" :key="b.id">
              <div class="card glass">
                <div class="row row-between">
                  <div><div class="task-title" x-text="b.title"></div><div class="muted small" x-text="b.author"></div></div>
                  <div class="row">
                    <select class="input" style="max-width:130px" :value="b.status" @change="setBookStatus(b, $event.target.value)">
                      <option value="want">Muốn đọc</option><option value="reading">Đang đọc</option>
                      <option value="done">Đã đọc</option><option value="dropped">Bỏ dở</option>
                    </select>
                    <button class="icon-btn" @click="delBook(b.id)">✕</button>
                  </div>
                </div>
                <div x-show="b.pages" style="margin-top:10px">
                  <div class="progress"><div class="progress-fill" :style="'width:'+bookPct(b)+'%'"></div></div>
                  <div class="row" style="margin-top:6px;gap:8px">
                    <input class="input" type="number" x-model.number="b.current" :max="b.pages" style="max-width:100px" />
                    <span class="muted small" x-text="'/ '+b.pages+' trang · '+bookPct(b)+'%'"></span>
                  </div>
                </div>
                <div class="row" style="margin-top:10px">
                  <button class="btn" @click="addQuote(b)">💬 Thêm quote</button>
                  <div class="row" style="gap:2px">
                    <template x-for="n in 5" :key="n"><span class="star" :class="{on:n<=(b.rating||0)}" @click="b.rating=n">★</span></template>
                  </div>
                </div>
                <template x-for="(q, i) in (b.quotes||[])" :key="i">
                  <div class="muted small" style="margin-top:6px;font-style:italic" x-text="'“'+q+'”'"></div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <div x-show="tab==='courses'">
          <div class="card glass"><div class="row">
            <input class="input" x-model="newCourse.title" placeholder="Khóa học" style="flex:1" />
            <input class="input" x-model="newCourse.platform" placeholder="Nền tảng" style="max-width:180px" />
            <input class="input" type="number" x-model.number="newCourse.cost" placeholder="Chi phí" style="max-width:130px" />
            <button class="btn primary" @click="addCourse()">+ Thêm</button>
          </div></div>
          <div class="grid grid-2">
            <template x-for="c in db.learning.courses" :key="c.id">
              <div class="card glass">
                <div class="row row-between">
                  <div><div class="task-title" x-text="c.title"></div><div class="muted small" x-text="c.platform"></div></div>
                  <button class="icon-btn" @click="delCourse(c.id)">✕</button>
                </div>
                <div class="progress"><div class="progress-fill" :style="'width:'+(c.progress||0)+'%'"></div></div>
                <input type="range" min="0" max="100" x-model.number="c.progress" style="width:100%;margin-top:8px" />
                <div class="muted small" x-text="(c.progress||0)+'%'+(c.cost?' · '+c.cost.toLocaleString()+'đ':'')"></div>
              </div>
            </template>
          </div>
        </div>

        <div x-show="tab==='skills'">
          <div class="card glass"><div class="row">
            <input class="input" x-model="newSkill.name" placeholder="Kỹ năng" style="flex:1" />
            <input class="input" type="number" min="1" max="10" x-model.number="newSkill.current" placeholder="Hiện tại" style="max-width:120px" />
            <input class="input" type="number" min="1" max="10" x-model.number="newSkill.target" placeholder="Mục tiêu" style="max-width:120px" />
            <button class="btn primary" @click="addSkill()">+ Thêm</button>
          </div></div>
          <div class="grid grid-2">
            <template x-for="s in db.learning.skills" :key="s.id">
              <div class="card glass">
                <div class="row row-between">
                  <div class="task-title" x-text="s.name"></div>
                  <button class="icon-btn" @click="delSkill(s.id)">✕</button>
                </div>
                <div class="row" style="gap:14px;margin-top:8px">
                  <div><div class="muted small">Hiện tại</div><b x-text="s.current+'/10'"></b></div>
                  <div><div class="muted small">Mục tiêu</div><b x-text="s.target+'/10'"></b></div>
                  <div><div class="muted small">Tiến độ</div><b x-text="Math.round(s.current/s.target*100)+'%'"></b></div>
                </div>
                <div class="progress"><div class="progress-fill" :style="'width:'+Math.round(s.current/s.target*100)+'%'"></div></div>
                <div class="row" style="margin-top:10px">
                  <input type="range" min="1" max="10" x-model.number="s.current" style="flex:1" />
                  <button class="btn" @click="logSkill(s)">📌 Log level</button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div x-show="tab==='cards'">
          <div class="grid grid-3">
            <div class="card glass stat"><div class="stat-label">Tổng thẻ</div><div class="stat-value" x-text="db.learning.cards.length"></div></div>
            <div class="card glass stat"><div class="stat-label">Đến hạn</div><div class="stat-value" x-text="dueCards().length"></div></div>
            <div class="card glass stat"><div class="stat-label">Đã ôn (thẻ)</div><div class="stat-value" x-text="db.learning.cards.filter(c=>c.reps>0).length"></div></div>
          </div>

          <div class="card glass">
            <div class="row row-between">
              <div class="card-title" style="margin:0">Ôn tập</div>
              <button class="btn primary" @click="startReview()" x-show="!review.cardId">▶ Bắt đầu</button>
            </div>
            <template x-if="review.cardId">
              <div style="margin-top:16px">
                <div class="flashcard">
                  <div class="flashcard-q" x-text="currentCard()?.q"></div>
                  <div class="flashcard-a" x-show="review.revealed" x-text="currentCard()?.a"></div>
                </div>
                <div class="row" style="margin-top:14px" x-show="!review.revealed">
                  <button class="btn primary" @click="review.revealed=true">Hiện đáp án</button>
                </div>
                <div class="row" style="margin-top:14px" x-show="review.revealed">
                  <button class="btn" @click="gradeCard(1)">❌ Again</button>
                  <button class="btn" @click="gradeCard(3)">😐 Hard</button>
                  <button class="btn" @click="gradeCard(4)">🙂 Good</button>
                  <button class="btn primary" @click="gradeCard(5)">😄 Easy</button>
                </div>
              </div>
            </template>
          </div>

          <div class="card glass">
            <div class="card-title">Thêm thẻ</div>
            <div class="row">
              <input class="input" x-model="newCard.q" placeholder="Câu hỏi" style="flex:1" />
              <input class="input" x-model="newCard.a" placeholder="Đáp án" style="flex:1" />
              <input class="input" x-model="newCard.deck" placeholder="Bộ thẻ" style="max-width:150px" />
              <button class="btn primary" @click="addCard()">+ Thêm</button>
            </div>
          </div>

          <div class="card glass">
            <div class="card-title">Tất cả thẻ</div>
            <template x-for="c in db.learning.cards" :key="c.id">
              <div class="task">
                <div class="task-body">
                  <div class="task-title" x-text="c.q"></div>
                  <div class="muted small" x-text="'→ '+c.a+' · due '+c.due+' · '+c.reps+' lần'"></div>
                </div>
                <button class="icon-btn" @click="delCard(c.id)">✕</button>
              </div>
            </template>
          </div>
        </div>`;
      },
    };
  },
});
