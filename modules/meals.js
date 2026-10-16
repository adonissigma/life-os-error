import { LifeOS } from '../core.js';
const H = LifeOS.helpers;

LifeOS.register({
  id:'meals', group:'Cuộc sống', groupOrder:3, order:3,
  icon:'🍱', label:'Meals',
  setup() {
    return {
      tab: 'plan',
      weekOffset: 0,
      mealSlots: ['breakfast','lunch','snack','dinner'],
      slotLabels: { breakfast:'🌅 Sáng', lunch:'🍱 Trưa', snack:'☕ Xế', dinner:'🌙 Tối' },
      newRecipe: { name:'', ingredients:'', steps:'', servings:2, kcal:0, cost:0, tags:'' },
      newGrocery: { name:'', qty:'', price:0, area:'rau' },
      areas: [
        { v:'rau', l:'🥬 Rau củ' },{ v:'thit', l:'🥩 Thịt cá' },{ v:'sua', l:'🥛 Sữa' },
        { v:'kho', l:'🍚 Khô/gia vị' },{ v:'trai', l:'🍎 Trái cây' },{ v:'khac', l:'📦 Khác' },
      ],
      newInv: { name:'', qty:'', expires:'' },
      newNutrition: { kcal:0, protein:0, carb:0, fat:0 },
      get db() { return this.$store.db; },
      todayISO: H.todayISO, fmt: H.fmt, fmtDate: H.fmtDate,

      ensureMeals() {
        if (!this.db.meals) this.db.meals = {};
        if (!this.db.meals.plan) this.db.meals.plan = {};
        if (!this.db.meals.recipes) this.db.meals.recipes = [];
        if (!this.db.meals.groceries) this.db.meals.groceries = [];
        if (!this.db.meals.inventory) this.db.meals.inventory = [];
        if (!this.db.meals.nutrition) this.db.meals.nutrition = {};
      },
      init() { this.ensureMeals(); },

      // ─── week plan ───
      days() {
        const now = new Date();
        const day = (now.getDay()+6)%7;
        const mon = new Date(now); mon.setDate(now.getDate() - day + this.weekOffset*7);
        const names = ['T2','T3','T4','T5','T6','T7','CN'];
        const out = [];
        for (let i=0;i<7;i++) {
          const d = new Date(mon); d.setDate(mon.getDate()+i);
          out.push({ name:names[i], date: H.fmtDate(d), short:d.getDate()+'/'+(d.getMonth()+1) });
        }
        return out;
      },
      getMeal(date, slot) { this.ensureMeals(); return this.db.meals.plan[date + '_' + slot] || ''; },
      setMeal(date, slot, v) { this.ensureMeals(); if (v) this.db.meals.plan[date + '_' + slot] = v; else delete this.db.meals.plan[date + '_' + slot]; },

      // ─── recipes ───
      addRecipe() {
        if (!this.newRecipe.name.trim()) return;
        this.db.meals.recipes.push({ id: H.uid(), ...this.newRecipe, times: 0, last: null, rating: 0 });
        this.newRecipe = { name:'', ingredients:'', steps:'', servings:2, kcal:0, cost:0, tags:'' };
      },
      delRecipe(id) { this.db.meals.recipes = this.db.meals.recipes.filter(r => r.id !== id); },
      cookRecipe(r) { r.times = (r.times||0) + 1; r.last = H.todayISO(); },
      rateRecipe(r, n) { r.rating = n; },

      // ─── groceries ───
      addGrocery() {
        if (!this.newGrocery.name.trim()) return;
        this.db.meals.groceries.push({ id: H.uid(), ...this.newGrocery, done: false });
        this.newGrocery = { name:'', qty:'', price:0, area:'rau' };
      },
      toggleGrocery(g) { g.done = !g.done; },
      delGrocery(id) { this.db.meals.groceries = this.db.meals.groceries.filter(g => g.id !== id); },
      clearDoneGroceries() { this.db.meals.groceries = this.db.meals.groceries.filter(g => !g.done); },
      groceriesByArea() {
        const g = this.db.meals.groceries || [];
        const out = {};
        this.areas.forEach(a => { out[a.v] = { ...a, items: g.filter(x => x.area === a.v) }; });
        return out;
      },
      groceryCost() { return (this.db.meals.groceries || []).filter(g => !g.done).reduce((a,g) => a + (Number(g.price)||0), 0); },

      // ─── inventory ───
      addInv() {
        if (!this.newInv.name.trim()) return;
        this.db.meals.inventory.push({ id: H.uid(), ...this.newInv, added: H.todayISO() });
        this.newInv = { name:'', qty:'', expires:'' };
      },
      delInv(id) { this.db.meals.inventory = this.db.meals.inventory.filter(i => i.id !== id); },
      expiringSoon() {
        const today = new Date();
        return (this.db.meals.inventory || []).filter(i => {
          if (!i.expires) return false;
          const d = new Date(i.expires);
          const diff = (d - today) / 86400000;
          return diff <= 3;
        }).sort((a,b) => (a.expires||'').localeCompare(b.expires||''));
      },

      // ─── nutrition ───
      nutritionToday() { return this.db.meals.nutrition[H.todayISO()] || { kcal:0, protein:0, carb:0, fat:0 }; },
      logNutrition() {
        const t = H.todayISO();
        const n = this.nutritionToday();
        this.db.meals.nutrition[t] = {
          kcal: n.kcal + Number(this.newNutrition.kcal||0),
          protein: n.protein + Number(this.newNutrition.protein||0),
          carb: n.carb + Number(this.newNutrition.carb||0),
          fat: n.fat + Number(this.newNutrition.fat||0),
        };
        this.newNutrition = { kcal:0, protein:0, carb:0, fat:0 };
      },

      // ─── export ───
      exportGroceries() {
        const rows = [['Khu vực','Tên','SL','Giá','Đã mua']];
        (this.db.meals.groceries||[]).forEach(g => {
          const a = this.areas.find(x => x.v === g.area)?.l || g.area;
          rows.push([a, g.name, g.qty||'', g.price||0, g.done?'✓':'']);
        });
        const tsv = rows.map(r => r.join('\t')).join('\n');
        H.download(`groceries-${H.todayISO()}.tsv`, tsv, 'text/tab-separated-values');
        navigator.clipboard.writeText(tsv).catch(()=>{});
      },
      exportPlan() {
        const rows = [['Ngày','Sáng','Trưa','Xế','Tối']];
        this.days().forEach(d => rows.push([d.date, this.getMeal(d.date,'breakfast'), this.getMeal(d.date,'lunch'), this.getMeal(d.date,'snack'), this.getMeal(d.date,'dinner')]));
        const tsv = rows.map(r => r.join('\t')).join('\n');
        H.download(`meal-plan-${this.days()[0].date}.tsv`, tsv, 'text/tab-separated-values');
        navigator.clipboard.writeText(tsv).catch(()=>{});
      },

      get tpl() { return `
        <div class="page-head">
          <h1 class="page-title">🍱 Meals & Nutrition</h1>
        </div>

        <div class="tabs" style="margin-bottom:16px">
          <button class="tab" :class="{active: tab==='plan'}" @click="tab='plan'">📅 Thực đơn</button>
          <button class="tab" :class="{active: tab==='recipes'}" @click="tab='recipes'">📖 Công thức</button>
          <button class="tab" :class="{active: tab==='grocery'}" @click="tab='grocery'">🛒 Đi chợ</button>
          <button class="tab" :class="{active: tab==='inv'}" @click="tab='inv'">📦 Kho</button>
          <button class="tab" :class="{active: tab==='nutri'}" @click="tab='nutri'">🥗 Dinh dưỡng</button>
        </div>

        <div x-show="tab==='plan'">
          <div class="card glass">
            <div class="row row-between" style="margin-bottom:12px">
              <div class="card-title" style="margin:0">Tuần ${weekOffset===0?'này':''}</div>
              <div class="row">
                <button class="btn" @click="weekOffset--">◀</button>
                <button class="btn" @click="weekOffset=0">Tuần này</button>
                <button class="btn" @click="weekOffset++">▶</button>
                <button class="export-btn" @click="exportPlan()">📊 Xuất</button>
              </div>
            </div>
            <div style="overflow-x:auto">
              <table class="meal-table">
                <thead><tr><th></th><template x-for="s in mealSlots" :key="s"><th x-text="slotLabels[s]"></th></template></tr></thead>
                <tbody>
                  <template x-for="d in days()" :key="d.date">
                    <tr>
                      <td class="meal-day"><b x-text="d.name"></b><div class="muted small" x-text="d.short"></div></td>
                      <template x-for="s in mealSlots" :key="s">
                        <td><input class="meal-input" :value="getMeal(d.date, s)" @change="setMeal(d.date, s, $event.target.value)" placeholder="—" /></td>
                      </template>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div x-show="tab==='recipes'">
          <div class="card glass">
            <div class="row">
              <input class="input" x-model="newRecipe.name" placeholder="Tên món" style="flex:1" />
              <input class="input" x-model="newRecipe.ingredients" placeholder="Nguyên liệu (cách nhau dấu phẩy)" style="flex:2" />
              <input class="input" type="number" x-model.number="newRecipe.servings" placeholder="Khẩu phần" style="max-width:110px" />
              <input class="input" type="number" x-model.number="newRecipe.kcal" placeholder="Kcal" style="max-width:100px" />
              <input class="input" type="number" x-model.number="newRecipe.cost" placeholder="Chi phí" style="max-width:120px" />
              <input class="input" x-model="newRecipe.tags" placeholder="Tag" style="max-width:150px" />
              <button class="btn primary" @click="addRecipe()">+ Thêm</button>
            </div>
          </div>
          <div class="grid grid-2">
            <template x-for="r in db.meals.recipes" :key="r.id">
              <div class="card glass">
                <div class="row row-between">
                  <div><div class="task-title" x-text="r.name"></div></div>
                  <button class="icon-btn" @click="delRecipe(r.id)">✕</button>
                </div>
                <div class="muted small" style="margin-top:6px" x-text="r.ingredients"></div>
                <div class="muted small" x-show="r.steps" style="margin-top:6px;white-space:pre-wrap" x-text="r.steps"></div>
                <div class="row small" style="margin-top:10px;gap:14px">
                  <span x-show="r.servings">🍽 <span x-text="r.servings+' người'"></span></span>
                  <span x-show="r.kcal">🔥 <span x-text="r.kcal+' kcal'"></span></span>
                  <span x-show="r.cost">💰 <span x-text="r.cost.toLocaleString()"></span></span>
                  <span x-show="r.times">🔁 <span x-text="r.times+' lần'"></span></span>
                </div>
                <div class="row" style="margin-top:10px">
                  <button class="btn" @click="cookRecipe(r)">👨‍🍳 Đã nấu</button>
                  <div class="row" style="gap:2px">
                    <template x-for="n in 5" :key="n">
                      <span class="star" :class="{on: n <= (r.rating||0)}" @click="rateRecipe(r, n)">★</span>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <p x-show="!db.meals.recipes.length" class="empty">Chưa có công thức nào.</p>
        </div>

        <div x-show="tab==='grocery'">
          <div class="card glass">
            <div class="row">
              <input class="input" x-model="newGrocery.name" placeholder="Món cần mua" />
              <input class="input" x-model="newGrocery.qty" placeholder="SL" style="max-width:100px" />
              <input class="input" type="number" x-model.number="newGrocery.price" placeholder="Giá" style="max-width:130px" />
              <select class="input" x-model="newGrocery.area" style="max-width:160px">
                <template x-for="a in areas" :key="a.v"><option :value="a.v" x-text="a.l"></option></template>
              </select>
              <button class="btn primary" @click="addGrocery()">+ Thêm</button>
              <button class="btn" @click="clearDoneGroceries()">🧹 Xoá đã mua</button>
              <button class="export-btn" @click="exportGroceries()">📊 Xuất</button>
            </div>
            <div class="muted small" style="margin-top:8px">Tổng dự kiến: <b x-text="groceryCost().toLocaleString()+' đ'"></b></div>
          </div>

          <template x-for="(a, k) in groceriesByArea()" :key="k">
            <div class="card glass" x-show="a.items.length">
              <div class="card-title" x-text="a.l"></div>
              <template x-for="g in a.items" :key="g.id">
                <div class="task" :class="{done:g.done}">
                  <div class="checkbox" :class="{checked:g.done}" @click="toggleGrocery(g)"><span x-show="g.done">✓</span></div>
                  <span class="task-title" x-text="g.name"></span>
                  <span class="muted small" x-text="g.qty"></span>
                  <span class="muted small" x-show="g.price" x-text="'· '+g.price.toLocaleString()+'đ'"></span>
                  <button class="icon-btn" @click="delGrocery(g.id)">✕</button>
                </div>
              </template>
            </div>
          </template>
        </div>

        <div x-show="tab==='inv'">
          <div class="card glass">
            <div class="row">
              <input class="input" x-model="newInv.name" placeholder="Tên (VD: Sữa tươi)" />
              <input class="input" x-model="newInv.qty" placeholder="Số lượng" style="max-width:150px" />
              <input class="input" type="date" x-model="newInv.expires" style="max-width:180px" />
              <button class="btn primary" @click="addInv()">+ Thêm</button>
            </div>
          </div>

          <div class="card glass" x-show="expiringSoon().length" style="border-left:4px solid #ff3b30">
            <div class="card-title" style="color:#ff3b30">⚠️ Sắp hết hạn (≤ 3 ngày)</div>
            <template x-for="i in expiringSoon()" :key="i.id">
              <div class="task">
                <span>⏰</span>
                <div class="task-body"><div class="task-title" x-text="i.name"></div><div class="muted small" x-text="i.qty + ' · HSD: '+i.expires"></div></div>
              </div>
            </template>
          </div>

          <div class="card glass">
            <div class="card-title">Kho thực phẩm</div>
            <template x-for="i in db.meals.inventory" :key="i.id">
              <div class="task">
                <span>📦</span>
                <div class="task-body"><div class="task-title" x-text="i.name"></div><div class="muted small" x-text="(i.qty||'')+(i.expires?' · HSD '+i.expires:'')"></div></div>
                <button class="icon-btn" @click="delInv(i.id)">✕</button>
              </div>
            </template>
            <p x-show="!db.meals.inventory.length" class="empty">Chưa có gì trong kho.</p>
          </div>
        </div>

        <div x-show="tab==='nutri'">
          <div class="grid grid-4">
            <div class="card glass stat"><div class="stat-label">Kcal hôm nay</div><div class="stat-value" x-text="nutritionToday().kcal"></div></div>
            <div class="card glass stat"><div class="stat-label">Protein</div><div class="stat-value" x-text="nutritionToday().protein+'g'"></div></div>
            <div class="card glass stat"><div class="stat-label">Carb</div><div class="stat-value" x-text="nutritionToday().carb+'g'"></div></div>
            <div class="card glass stat"><div class="stat-label">Fat</div><div class="stat-value" x-text="nutritionToday().fat+'g'"></div></div>
          </div>
          <div class="card glass">
            <div class="card-title">Log thêm</div>
            <div class="row">
              <input class="input" type="number" x-model.number="newNutrition.kcal" placeholder="Kcal" />
              <input class="input" type="number" x-model.number="newNutrition.protein" placeholder="Protein (g)" />
              <input class="input" type="number" x-model.number="newNutrition.carb" placeholder="Carb (g)" />
              <input class="input" type="number" x-model.number="newNutrition.fat" placeholder="Fat (g)" />
              <button class="btn primary" @click="logNutrition()">+ Log</button>
            </div>
          </div>
        </div>`;
      },
    };
  },
});
