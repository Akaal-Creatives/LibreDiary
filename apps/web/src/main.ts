import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuestic, createIconsConfig } from 'vuestic-ui';
import 'vuestic-ui/css';

import App from './App.vue';
import router from './router';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(
  createVuestic({
    config: {
      colors: {
        presets: {
          light: {
            primary: '#6366f1',
            secondary: '#64748b',
            success: '#22c55e',
            info: '#3b82f6',
            danger: '#ef4444',
            warning: '#f59e0b',
            background: '#ffffff',
            'background-secondary': '#f8fafc',
            'surface-variant': '#e2e8f0',
          },
          dark: {
            primary: '#818cf8',
            secondary: '#94a3b8',
            success: '#4ade80',
            info: '#60a5fa',
            danger: '#f87171',
            warning: '#fbbf24',
            background: '#0f172a',
            'background-secondary': '#1e293b',
            'surface-variant': '#334155',
          },
        },
      },
      icons: createIconsConfig({
        aliases: [],
        fonts: [],
      }),
    },
  })
);

app.mount('#app');
