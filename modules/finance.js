import { LifeOS } from '../core.js';
const H = LifeOS.helpers;
LifeOS.register({
  id:'finance', group:'Cuộc sống', groupOrder:3, order:1, icon:'💰', label:'Finance',
  setup() {
    return {
      newTx: { type:'expense', amount:null, category:'', note:'' },
      get db() { return this.$store.db; },
      fmt: H.fmt,
      add() {
        if (!this.newTx.amount) return;
        const tx = { id:H.uid(), type:this.newTx.type, amount:Number(this.newTx.amount), category:this.newTx.category||'', note:this.newTx.note||'', date:H.todayISO(), created:new Date().toISOString() };
        this.db.transactions.unshift(tx);
        if (this.db.wallets[0]) this.db.wallets[0].balance += tx.type==='income'?tx.amount:-tx.amount;
        this.newTx = { type:'expense', amount:null, category:'', note:'' };
      },
      del(id) {
        const tx = this.db.transactions.find(t => t.id === id); if (!tx) return;
        if (this.db.wallets[0]) this.db.wallets[0].balance -= tx.type==='income'?tx.amount:-tx.amount;
        this.db.transactions = this.db.transactions.filter(t => t.id !== id);
      },
      get tpl() { return `
        <div class="page-head"><h1 class="page-title">💰 Finance</h1><button class="export-btn" @click="$root.openExport('finance')">📤 Xuất</button></div>
        <div class="grid grid-3">
          <template x-for="w in db.wallets" :key="w.id">
            <div class="card glass stat"><div class="stat-label" x-text="w.name"></div><div class="stat-value" x-text="fmt(w.balance)"></div></div>
          </template>
        </div>
        <div class="card glass"><div class="row">
          <select class="input" x-model="newTx.type" style="max-width:130px"><option value="expense">Chi</option><option value="income">Thu</option></select>
          <input class="input" type="number" x-model.number="newTx.amount" placeholder="Số tiền" />
          <input class="input" x-model="newTx.category" placeholder="Danh mục" />
          <input class="input" x-model="newTx.note" placeholder="Ghi chú" />
          <button class="btn primary" @click="add()">+ Thêm</button>
        </div></div>
        <div class="card glass">
          <template x-for="tx in db.transactions.slice(0,30)" :key="tx.id">
            <div class="task">
              <span x-text="tx.type==='income'?'💵':'💸'"></span>
              <div class="task-body"><div class="task-title" x-text="tx.category||tx.note"></div><div class="muted small" x-text="tx.date"></div></div>
              <span :style="tx.type==='income'?'color:#34c759':'color:#ff3b30'" x-text="(tx.type==='income'?'+':'-')+fmt(tx.amount)"></span>
              <button class="icon-btn" @click="del(tx.id)">✕</button>
            </div>
          </template>
        </div>`;
      },
    };
  },
});
