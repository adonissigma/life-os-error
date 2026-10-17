// DÁN ĐOẠN NÀY LÊN ĐẦU FILE core.js
export const SUPABASE_URL = 'DÁN_URL_CỦA_BẠN_VÀO_ĐÂY'; 
export const SUPABASE_KEY = 'DÁN_ANON_KEY_CỦA_BẠN_VÀO_ĐÂY';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let syncTimeout;

export const DB_KEY = 'lifeos.db.v8';
export const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
export const todayISO = () => new Date().toISOString().slice(0,10);
export const fmtDate = d => d.toISOString().slice(0,10);

export const DEFAULT_DB = {
  settings: {
    theme: 'dark', currency: 'VND', dailyBudget: 0,
    glass: { blur: 40, opacity: 0.25, saturation: 200, dynamicIsland: true, bottomNav: true }, // Mới: siêu trong suốt
  },
  profile: { name:'' }, categories: [], tasks: [], habits: [], habitLogs: {}, journal: [], goals: [], vision: {}, wallets: [], transactions: [], health: {}, reviews: []
};

// ... (Giữ nguyên phần deepMerge, LifeOS.register, Exporter) ...

// Thêm phần Sync vào cuối file, trước registerStores
export const LifeOS = {
  // ... (Giữ nguyên các hàm cũ của LifeOS) ...
  modules: [],
  register(m) { this.modules.push(m); this.modules.sort((a,b) => (a.order ?? 99) - (b.order ?? 99)); },
  groups() { 
    const g = {};
    this.modules.forEach(m => {
      if (m.group === '__hidden') return;
      if (!g[m.group]) g[m.group] = { group: m.group, order: m.groupOrder ?? 99, items: [] };
      g[m.group].items.push(m);
    });
    return Object.values(g).sort((a,b) => a.order - b.order);
  },
  
  // --- SYNC ENGINE ---
  client: supabase,
  user: null,
  
  async initSupabase(onAuthChange) {
    if (!this.client) return;
    
    // Check session
    const { data: { session } } = await this.client.auth.getSession();
    if (session) {
      this.user = session.user;
      onAuthChange(this.user);
      this.pullSync();
    }

    // Listen to changes
    this.client.auth.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
      onAuthChange(this.user);
      if (event === 'SIGNED_IN') this.pullSync();
    });
  },

  async login(email, pass, cb) {
    const { error } = await this.client.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message); else cb();
  },
  async signup(email, pass) {
    const { error } = await this.client.auth.signUp({ email, password: pass });
    if (error) alert(error.message); else alert('Đăng ký thành công, hãy kiểm tra email!');
  },
  async logout(cb) {
    await this.client.auth.signOut();
    cb();
  },

  queueSync(db) {
    if (!this.user) return;
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => this.pushSync(db), 1000); // Debounce 1s
  },

  async pushSync(db) {
    if (!this.user || !this.client) return;
    await this.client.from('profiles').upsert({ 
      id: this.user.id, 
      data: db, 
      updated_at: new Date().toISOString() 
    });
  },

  async pullSync() {
    if (!this.user || !this.client) return;
    const { data, error } = await this.client.from('profiles').select('data').eq('id', this.user.id).single();
    if (data && data.data) {
      // Merge data từ cloud vào local nếu cloud mới hơn (giả lập)
      const remoteDb = data.data;
      window.Alpine.store('db').settings = remoteDb.settings || window.Alpine.store('db').settings;
      window.Alpine.store('db').tasks = remoteDb.tasks || [];
      window.Alpine.store('db').journal = remoteDb.journal || [];
      window.Alpine.store('db').habits = remoteDb.habits || [];
      window.Alpine.store('db').habitLogs = remoteDb.habitLogs || {};
      window.Alpine.store('db').transactions = remoteDb.transactions || [];
      // ... (Map các trường khác nếu cần)
    }
  }
};
