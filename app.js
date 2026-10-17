import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
window.Alpine = Alpine;
import { LifeOS, registerStores, DEFAULT_DB } from './core.js';

import './modules/dashboard.js';
import './modules/timeline.js';
import './modules/week.js';
import './modules/tasks.js';
import './modules/habits.js';
import './modules/journal.js';
import './modules/reviews.js';
import './modules/meals.js';
import './modules/learning.js';
import './modules/relationships.js';
import './modules/archive.js';
import './modules/goals.js';
import './modules/finance.js';
import './modules/health.js';
import './modules/vision.js';
import './modules/settings.js';
import './modules/auth.js';

Alpine.data('lifeOS', () => ({
  view: 'dashboard',
  sidebarOpen: window.innerWidth >= 900,
  showAuth: false,
  authEmail: '', authPass: '', user: null,
  diExpanded: false,
  
  get nav() { return LifeOS.groups(); },

  init() {
    document.body.classList.toggle('dark', this.$store.db.settings.theme === 'dark');
    this.$watch('$store.db.settings.theme', () => {
      document.body.classList.toggle('dark', this.$store.db.settings.theme === 'dark');
    });
    
    // Init Auth
    LifeOS.initSupabase((u) => { this.user = u; });
    this.$watch('$store.db', () => { LifeOS.queueSync(this.$store.db); }, { deep: true });

    // Apply Glass config
    this.$nextTick(() => { this.applyGlassVars(); });
    this.$watch('$store.db.settings.glass', () => { this.applyGlassVars(); }, { deep: true });

    window.addEventListener('resize', () => { if (window.innerWidth < 900) this.sidebarOpen = false; });
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') { e.preventDefault(); this.openPalette(); }
    });
  },

  applyGlassVars() {
    const g = this.$store.db.settings.glass;
    if (!g) return;
    const r = document.documentElement.style;
    r.setProperty('--glass-blur', g.blur + 'px');
    r.setProperty('--glass-opacity', g.opacity);
    r.setProperty('--glass-sat', g.saturation + '%');
  },

  // Auth Actions
  doLogin() { LifeOS.login(this.authEmail, this.authPass, () => { this.showAuth = false; }); },
  doSignup() { LifeOS.signup(this.authEmail, this.authPass); },
  doLogout() { LifeOS.logout(() => { this.user = null; }); },
  forceSync() { LifeOS.pushSync(this.$store.db); alert('Đã đẩy dữ liệu lên mây!'); },

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
  toggleTheme() { this.$store.db.settings.theme = this.$store.db.settings.theme === 'dark' ? 'light' : 'dark'; },
  openPalette() { /* Giữ nguyên logic palette cũ */ },
  
  // DI Helpers
  diCompactText() { return new Date().toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' }); },
  diGreeting() { return 'Chào ngày mới'; },
  diNextTask() { return 'Task tiếp theo...'; },
  diHabitsLine() { return 'Habits 0/0'; },

  bnItems() { return [
    { id:'dashboard', icon:'🏠', label:'Home' }, { id:'tasks', icon:'✅', label:'Task' },
    { id:'timeline', icon:'⏱', label:'Time' }, { id:'habits', icon:'🔁', label:'Habit' },
    { id:'journal', icon:'📓', label:'Log' }
  ];},
  bnIndex() { const idx = this.bnItems().findIndex(i => i.id === this.view); return idx < 0 ? 0 : idx; }
}));

registerStores(Alpine);
Alpine.start();
