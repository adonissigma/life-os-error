import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id:'relationships', group:'Phát triển', groupOrder:4, order:2,
  icon:'👥', label:'Relationships',
  setup() {
    return {
      tab: 'contacts',
      newContact: { name:'', rel:'', birthday:'', phone:'', email:'', note:'', freq:'', circle:'friend' },
      newGift: { for:'', idea:'', budget:0, date:'' },
      newInteract: { contactId:'', type:'call', note:'' },
      circles: [
        { v:'inner', l:'💎 Inner circle' },
        { v:'friend', l:'👥 Bạn bè' },
        { v:'family', l:'🏠 Gia đình' },
        { v:'work', l:'💼 Công việc' },
        { v:'acquaintance', l:'👋 Quen biết' },
      ],
      get db() { return this.$store.db; },
      todayISO: H.todayISO,

      ensure() {
        if (!this.db.relationships) this.db.relationships = { contacts: [], gifts: [], interactions: [] };
        const R = this.db.relationships;
        if (!R.contacts) R.contacts = [];
        if (!R.gifts) R.gifts = [];
        if (!R.interactions) R.interactions = [];
      },
      init() { this.ensure(); },

      addContact() {
        if (!this.newContact.name.trim()) return;
        this.db.relationships.contacts.push({ id:H.uid(), ...this.newContact, created:new Date().toISOString() });
        this.newContact = { name:'', rel:'', birthday:'', phone:'', email:'', note:'', freq:'', circle:'friend' };
      },
      delContact(id) {
        this.db.relationships.contacts = this.db.relationships.contacts.filter(c => c.id !== id);
        this.db.relationships.interactions = this.db.relationships.interactions.filter(i => i.contactId !== id);
      },

      lastInteraction(id) {
        const list = this.db.relationships.interactions.filter(i => i.contactId === id).sort((a,b) => b.date.localeCompare(a.date));
        return list[0];
      },
      logInteraction() {
        if (!this.newInteract.contactId) return;
        this.db.relationships.interactions.push({ id:H.uid(), ...this.newInteract, date: H.todayISO() });
        this.newInteract = { contactId:'', type:'call', note:'' };
      },
      interactionsFor(id) { return this.db.relationships.interactions.filter(i => i.contactId === id).sort((a,b) => b.date.localeCompare(a.date)); },

      upcomingBirthdays() {
        const today = new Date();
        const out = [];
        this.db.relationships.contacts.forEach(c => {
          if (!c.birthday) return;
          const bd = new Date(c.birthday);
          const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          let next = thisYear;
          if (next < today) next = new Date(today.getFullYear()+1, bd.getMonth(), bd.getDate());
          const days = Math.round((next - today) / 86400000);
          if (days <= 30) out.push({ contact: c, days, date: H.fmtDate(next) });
        });
        return out.sort((a,b) => a.days - b.days);
      },

      overdueContacts() {
        const today = new Date();
        return this.db.relationships.contacts.filter(c => {
          if (!c.freq) return false;
          const freqDays = { daily:1, weekly:7, biweekly:14, monthly:30, quarterly:90 }[c.freq];
          if (!freqDays) return false;
          const last = this.lastInteraction(c.id);
          if (!last) return true;
          const days = Math.round((today - new Date(last.date)) / 86400000);
          return days > freqDays;
        });
      },

      addGift() {
        if (!this.newGift.idea.trim()) return;
        this.db.relationships.gifts.push({ id:H.uid(), ...this.newGift, given: false });
        this.newGift = { for:'', idea:'', budget:0, date:'' };
      },
      delGift(id) { this.db.relationships.gifts = this.db.relationships.gifts.filter(g => g.id !== id); },

      get tpl() { return `
        <div class="page-head"><h1 class="page-title">👥 Relationships</h1></div>

        <div class="tabs" style="margin-bottom:16px">
          <button class="tab" :class="{active: tab==='contacts'}" @click="tab='contacts'">📇 Danh bạ</button>
          <button class="tab" :class="{active: tab==='birthday'}" @click="tab='birthday'">🎂 Sinh nhật</button>
          <button class="tab" :class="{active: tab==='gifts'}" @click="tab='gifts'">🎁 Quà tặng</button>
          <button class="tab" :class="{active: tab==='log'}" @click="tab='log'">📞 Tương tác</button>
        </div>

        <div x-show="tab==='contacts'">
          <div class="card glass"><div class="row">
            <input class="input" x-model="newContact.name" placeholder="Tên" style="flex:1" />
            <input class="input" x-model="newContact.rel" placeholder="Quan hệ (chị gái, sếp...)" style="max-width:180px" />
            <input class="input" type="date" x-model="newContact.birthday" style="max-width:180px" />
            <input class="input" x-model="newContact.phone" placeholder="SĐT" style="max-width:150px" />
            <select class="input" x-model="newContact.circle" style="max-width:160px">
              <template x-for="c in circles" :key="c.v"><option :value="c.v" x-text="c.l"></option></template>
            </select>
            <select class="input" x-model="newContact.freq" style="max-width:150px">
              <option value="">Tần suất LH</option><option value="weekly">Hàng tuần</option>
              <option value="biweekly">2 tuần</option><option value="monthly">Hàng tháng</option>
              <option value="quarterly">Hàng quý</option>
            </select>
            <input class="input" x-model="newContact.note" placeholder="Note (sở thích, dị ứng...)" style="flex:1" />
            <button class="btn primary" @click="addContact()">+ Thêm</button>
          </div></div>

          <div class="card glass" x-show="overdueContacts().length" style="border-left:4px solid #ff9500">
            <div class="card-title" style="color:#ff9500">⏰ Lâu chưa liên lạc</div>
            <template x-for="c in overdueContacts()" :key="c.id">
              <div class="task">
                <span>📞</span>
                <div class="task-body"><div class="task-title" x-text="c.name"></div><div class="muted small" x-text="'Lần cuối: '+ (lastInteraction(c.id)?.date || 'chưa từng')"></div></div>
              </div>
            </template>
          </div>

          <template x-for="circle in circles" :key="circle.v">
            <div class="card glass" x-show="db.relationships.contacts.filter(c=>c.circle===circle.v).length">
              <div class="card-title" x-text="circle.l"></div>
              <template x-for="c in db.relationships.contacts.filter(c=>c.circle===circle.v)" :key="c.id">
                <div class="task">
                  <span>👤</span>
                  <div class="task-body">
                    <div class="task-title" x-text="c.name + (c.rel ? ' · '+c.rel : '')"></div>
                    <div class="muted small">
                      <span x-show="c.phone" x-text="'📱 '+c.phone+' '"></span>
                      <span x-show="c.birthday" x-text="'🎂 '+c.birthday+' '"></span>
                      <span x-show="c.note" x-text="'· '+c.note"></span>
                    </div>
                  </div>
                  <button class="icon-btn" @click="delContact(c.id)">✕</button>
                </div>
              </template>
            </div>
          </template>
        </div>

        <div x-show="tab==='birthday'">
          <div class="card glass">
            <div class="card-title">🎂 Sinh nhật sắp tới (30 ngày)</div>
            <template x-for="b in upcomingBirthdays()" :key="b.contact.id">
              <div class="task">
                <span>🎂</span>
                <div class="task-body">
                  <div class="task-title" x-text="b.contact.name"></div>
                  <div class="muted small" x-text="b.date + (b.days===0?' · HÔM NAY!':' · còn '+b.days+' ngày')"></div>
                </div>
              </div>
            </template>
            <p x-show="!upcomingBirthdays().length" class="empty">Không có sinh nhật nào trong 30 ngày tới.</p>
          </div>
        </div>

        <div x-show="tab==='gifts'">
          <div class="card glass"><div class="row">
            <input class="input" x-model="newGift.for" placeholder="Cho ai" style="max-width:180px" />
            <input class="input" x-model="newGift.idea" placeholder="Ý tưởng quà" style="flex:1" />
            <input class="input" type="number" x-model.number="newGift.budget" placeholder="Ngân sách" style="max-width:130px" />
            <input class="input" type="date" x-model="newGift.date" style="max-width:180px" />
            <button class="btn primary" @click="addGift()">+ Thêm</button>
          </div></div>
          <div class="card glass">
            <template x-for="g in db.relationships.gifts" :key="g.id">
              <div class="task" :class="{done: g.given}">
                <div class="checkbox" :class="{checked:g.given}" @click="g.given = !g.given"><span x-show="g.given">✓</span></div>
                <span>🎁</span>
                <div class="task-body">
                  <div class="task-title" x-text="g.idea"></div>
                  <div class="muted small" x-text="g.for + (g.budget ? ' · '+g.budget.toLocaleString()+'đ' : '') + (g.date ? ' · '+g.date : '')"></div>
                </div>
                <button class="icon-btn" @click="delGift(g.id)">✕</button>
              </div>
            </template>
            <p x-show="!db.relationships.gifts.length" class="empty">Chưa có ý tưởng quà nào.</p>
          </div>
        </div>

        <div x-show="tab==='log'">
          <div class="card glass">
            <div class="card-title">Log tương tác</div>
            <div class="row">
              <select class="input" x-model="newInteract.contactId" style="max-width:200px">
                <option value="">Chọn người...</option>
                <template x-for="c in db.relationships.contacts" :key="c.id"><option :value="c.id" x-text="c.name"></option></template>
              </select>
              <select class="input" x-model="newInteract.type" style="max-width:150px">
                <option value="call">📞 Gọi</option><option value="meet">🤝 Gặp mặt</option>
                <option value="message">💬 Nhắn</option><option value="gift">🎁 Tặng quà</option>
              </select>
              <input class="input" x-model="newInteract.note" placeholder="Ghi chú" style="flex:1" />
              <button class="btn primary" @click="logInteraction()">+ Log</button>
            </div>
          </div>
          <div class="card glass">
            <div class="card-title">Lịch sử</div>
            <template x-for="i in db.relationships.interactions.slice().reverse().slice(0,50)" :key="i.id">
              <div class="task">
                <span x-text="i.type==='call'?'📞':i.type==='meet'?'🤝':i.type==='gift'?'🎁':'💬'"></span>
                <div class="task-body">
                  <div class="task-title" x-text="db.relationships.contacts.find(c=>c.id===i.contactId)?.name || '—'"></div>
                  <div class="muted small" x-text="i.date + (i.note ? ' · '+i.note : '')"></div>
                </div>
              </div>
            </template>
          </div>
        </div>`;
      },
    };
  },
});
