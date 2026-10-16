import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';
window.Alpine = Alpine;

import { LifeOS, registerStores, DEFAULT_DB } from './core.js';

import './modules/dashboard.js';
import './modules/timeline.js';
import './modules/week.js';
import './modules/tasks.js';
import './modules/habits.js';
import './modules/journal.js';
import './modules/reviews.js';       // ← mới
import './modules/meals.js';         // ← mới
import './modules/learning.js';      // ← mới
import './modules/relationships.js'; // ← mới
import './modules/archive.js';
import './modules/goals.js';
import './modules/finance.js';
import './modules/health.js';
import './modules/vision.js';
import './modules/settings.js';

Alpine.data('lifeOS', () => ({
  view: 'dashboard',
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  showExport: false,
  exportPeriod: 'week', exportSection: 'all', exportType: 'ai',
  exportPreview: '', copiedMsg: '',
  paletteOpen: false, paletteQuery: '',

  get nav() { return LifeOS.groups(); },

  init() {
    document.body.classList.toggle('dark', this.$store.db.settings.theme === 'dark');
    this.$watch('$store.db.settings.theme', () => {
      document.body.classList.toggle('dark', this.$store.db.settings.theme === 'dark');
    });

    window.addEventListener('resize', () => { if (window.innerWidth < 900) this.sidebarOpen = false; });
    window.addEventListener('keydown', e => {
      const k = e.key?.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); this.openPalette(); }
      if ((e.metaKey || e.ctrlKey) && k === 'b') { e.preventDefault(); this.sidebarOpen = !this.sidebarOpen; }
      if (e.key === 'Escape') this.paletteOpen = false;
    });
  },

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; },
  toggleTheme() { this.$store.db.settings.theme = this.$store.db.settings.theme === 'dark' ? 'light' : 'dark'; },

  openPalette() {
    this.paletteOpen = true;
    this.paletteQuery = '';
    this.$nextTick(() => this.$refs.paletteInput?.focus());
  },

  cmds() {
    const list = [];
    LifeOS.modules.forEach(m => list.push({ id:'go_'+m.id, icon:m.icon, label:'Đi tới '+m.label, hint:'page', action:()=>{ this.view=m.id; } }));
    list.push({ id:'theme', icon:'🌙', label:'Đổi theme', hint:'ui', action:()=>this.toggleTheme() });
    list.push({ id:'export', icon:'📤', label:'Mở Export', hint:'data', action:()=>this.openExport('all') });
    list.push({ id:'backup', icon:'💾', label:'Backup JSON', hint:'data', action:()=>this.exportAll() });
    list.push({ id:'side', icon:'◀', label:'Ẩn/hiện sidebar', hint:'ui', action:()=>this.toggleSidebar() });
    return list;
  },
  filteredCmds() { const q = this.paletteQuery.toLowerCase().trim(); if (!q) return this.cmds(); return this.cmds().filter(c => c.label.toLowerCase().includes(q)); },
  runCmd(c) { if (!c) return; c.action?.(); this.paletteOpen = false; },

  // EXPORT — delegates to LifeOS.exporter
  openExport(section='all') { this.exportSection = section; this.showExport = true; this.refreshPreview(); },
  refreshPreview() {
    const data = LifeOS.exporter.gather(this.exportPeriod, this.exportSection, this.$store.db);
    const t = this.exportType;
    if (t === 'ai') this.exportPreview = LifeOS.exporter.toAI(this.exportPeriod, data);
    else if (t === 'md') this.exportPreview = LifeOS.exporter.toMarkdown(data);
    else if (t === 'json') this.exportPreview = LifeOS.exporter.toJSON(data);
    else if (t === 'csv') this.exportPreview = LifeOS.exporter.toCSV(data);
    else this.exportPreview = '(Bấm Tải để tạo file)';
  },
  downloadExport() {
    const data = LifeOS.exporter.gather(this.exportPeriod, this.exportSection, this.$store.db);
    const stamp = LifeOS.helpers.todayISO();
    const tag = `${this.exportSection}-${this.exportPeriod}-${stamp}`;
    const dl = LifeOS.helpers.download;
    const t = this.exportType;
    if (t === 'ai') dl(`ai-${tag}.txt`, LifeOS.exporter.toAI(this.exportPeriod, data));
    else if (t === 'md') dl(`report-${tag}.md`, LifeOS.exporter.toMarkdown(data), 'text/markdown');
    else if (t === 'json') dl(`data-${tag}.json`, LifeOS.exporter.toJSON(data), 'application/json');
    else if (t === 'csv') dl(`data-${tag}.csv`, LifeOS.exporter.toCSV(data), 'text/csv');
    else if (t === 'xls') dl(`data-${tag}.xls`, LifeOS.exporter.toXLS(data), 'application/vnd.ms-excel');
    else if (t === 'doc') dl(`data-${tag}.doc`, LifeOS.exporter.toDOC(data), 'application/msword');
  },
  async copyExport() {
    try { await navigator.clipboard.writeText(this.exportPreview); this.copiedMsg = '✓ Đã copy!'; setTimeout(()=>this.copiedMsg='',2000); }
    catch { this.copiedMsg = 'Không copy được'; }
  },

  exportAll() { LifeOS.helpers.download(`lifeos-backup-${LifeOS.helpers.todayISO()}.json`, JSON.stringify(this.$store.db, null, 2), 'application/json'); },
  importAll(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        if (confirm('Ghi đè toàn bộ?')) Object.assign(this.$store.db, LifeOS.deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), p));
      } catch { alert('File không hợp lệ'); }
    };
    r.readAsText(f);
  },
  resetAll() { if (confirm('Xoá toàn bộ dữ liệu?')) Object.assign(this.$store.db, JSON.parse(JSON.stringify(DEFAULT_DB))); },
}));

registerStores(Alpine);
Alpine.start();
