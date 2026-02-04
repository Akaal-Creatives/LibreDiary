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
            // Sage Green Theme - Light Mode
            primary: '#6B8F71',
            secondary: '#5C635C',
            success: '#5A9A6B',
            info: '#5A8A9A',
            danger: '#C45C5C',
            warning: '#C4973B',
            background: '#F6F8F6',
            'background-primary': '#FFFFFF',
            'background-secondary': '#F6F8F6',
            'surface-variant': '#E2E8E2',
            textPrimary: '#2C2F2C',
            textInverted: '#FFFFFF',
          },
          dark: {
            // Sage Green Theme - Dark Mode (Forest at dusk)
            primary: '#88B08E',
            secondary: '#9CA69C',
            success: '#7AB888',
            info: '#7ABAD4',
            danger: '#D47777',
            warning: '#D4A74B',
            background: '#161917',
            'background-primary': '#1E2220',
            'background-secondary': '#161917',
            'surface-variant': '#2E3430',
            textPrimary: '#E4E8E4',
            textInverted: '#161917',
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
