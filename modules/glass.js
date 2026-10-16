// Glass system bootstrap — applies CSS vars on load, no module UI
import { LifeOS } from '../core.js';

LifeOS.register({
  id:'__glass', group:'__hidden', groupOrder:999, order:999,
  icon:'', label:'__glass',
  setup() {
    return {
      init() {
        const g = this.$store.db.settings?.glass;
        if (!g) return;
        const r = document.documentElement.style;
        r.setProperty('--glass-blur', g.blur + 'px');
        r.setProperty('--glass-opacity', g.opacity);
        r.setProperty('--glass-sat', g.saturation + '%');
        r.setProperty('--glass-border', g.border);

        // Watch for changes
        this.$watch('$store.db.settings.glass', () => {
          const g2 = this.$store.db.settings.glass;
          r.setProperty('--glass-blur', g2.blur + 'px');
          r.setProperty('--glass-opacity', g2.opacity);
          r.setProperty('--glass-sat', g2.saturation + '%');
          r.setProperty('--glass-border', g2.border);
        }, { deep: true });
      },
      get tpl() { return ''; },
    };
  },
});
