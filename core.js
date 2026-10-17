// ============================================================
// Life OS — Core Kernel & Sync Engine
// ============================================================

// SUPABASE CREDENTIALS (Của Verse)
export const SUPABASE_URL = 'https://azoqslbeowrdcbcyqmle.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b3FzbGJlb3dyZGNiY3lxbWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODU5NzYsImV4cCI6MjEwNzc2MTk3Nn0.kX6VvmirUf4xJFDgz4hZIDB23RHdlJ07GNGUXxvZUe0';

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let syncTimeout;

export const DB_KEY = 'lifeos.db.v9';
export const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
export const todayISO = () => new Date().toISOString().slice(0,10);
export const fmtDate = d => d.toISOString().slice(0,10);

export const DEFAULT_DB = {
  settings: {
    theme: 'dark', currency: 'VND', dailyBudget: 0,
    glass: { blur: 40, opacity: 0.15, saturation: 200, dynamicIsland: true, bottomNav: true },
  },
  profile: { name:'' },
  categories: [
    { id:'c1', name:'Học tập', color:'#0a84ff' },
    { id:'c2', name:'Làm việc', color:'#ff9500' },
    { id:'c3', name:'Cá nhân', color:'#bf5af2' },
    { id:'c4', name:'Sức khỏe', color:'#34c759' },
    { id:'c5', name:'Giải trí', color:'#ff3b30' },
  ],
  tasks: [], habits: [], habitLogs: {}, journal: [], goals: [],
  vision: {}, wallets: [{ id: 'w1', name: 'Tiền mặt', balance: 0 }], transactions: [], health: { sleep: [], exercise: [], mood: [], water: {} }, reviews: []
};

export const deepMerge = (a, b) => {
  const o = { ...a };
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) o[k] = deepMerge(a[k], b[k]);
    else o[k] = b[k];
  }
  return o;
};

export const LifeOS = {
  modules: [],
  register(m) { this.modules.push(m); this.modules.sort((a,b) => (a.order ?? 99) - (b.order ?? 99)); },
  get(id) { return this.modules.find(m => m.id === id); },
  groups() {
    const g = {};
    this.modules.forEach(m => {
      if (m.group === '__hidden') return;
      if (!g[m.group]) g[m.group] = { group: m.group, order: m.groupOrder ?? 99, items: [] };
      g[m.group].items.push(m);
    });
    return Object.values(g).sort((a,b) => a.order - b.order);
  },
  deepMerge,
  client: supabase,
  user: null,

  // --- SYNC ENGINE ---
  async initSupabase(onAuthChange) {
    if (!this.client) return;
    const { data: { session } } = await this.client.auth.getSession();
    if (session) {
      this.user = session.user;
      onAuthChange(this.user);
      this.pullSync();
    }
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
    syncTimeout = setTimeout(() => this.pushSync(db), 1000);
  },
  async pushSync(db) {
    if (!this.user || !this.client) return;
    await this.client.from('profiles').upsert({ id: this.user.id, data: db, updated_at: new Date().toISOString() });
  },
  async pullSync() {
    if (!this.user || !this.client) return;
    const { data } = await this.client.from('profiles').select('data').eq('id', this.user.id).single();
    if (data && data.data) {
      const remote = data.data;
      const store = window.Alpine.store('db');
      Object.keys(remote).forEach(k => { if(remote[k] !== undefined) store[k] = remote[k]; });
    }
  },

  helpers: {
    uid, todayISO, fmtDate,
    fmt(n) { return (n || 0).toLocaleString('vi-VN') + ' ' + (window.Alpine?.store('db')?.settings?.currency || 'VND'); },
    catColor(id) { const c = window.Alpine?.store('db')?.categories?.find(x => x.id === id); return c ? c.color : '#8e8e93'; },
    catName(id) { const c = window.Alpine?.store('db')?.categories?.find(x => x.id === id); return c ? c.name : ''; },
    download(name, content, mime = 'text/plain') {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    },
    shiftDate(iso, days) { const d = new Date(iso); d.setDate(d.getDate() + days); return fmtDate(d); },
  },
  
  exporter: {} // (Giữ nguyên phần Exporter cũ của bạn ở đây nếu có, hoặc tôi có thể viết lại nếu cần)
};

export function registerStores(Alpine) {
  const raw = localStorage.getItem(DB_KEY);
  const loaded = raw ? deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULT_DB));
  Alpine.store('db', loaded);
  Alpine.effect(() => { localStorage.setItem(DB_KEY, JSON.stringify(Alpine.store('db'))); });
  LifeOS.modules.forEach(m => { Alpine.data('m_' + m.id, m.setup); });
}
