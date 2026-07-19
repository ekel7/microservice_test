// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [vue()],

  server: {
    host: true,
    port: 4321,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  },

  i18n: {
    locales: ["en", "es"],
    defaultLocale: "es",

    routing: {
      prefixDefaultLocale: false,
    },
  },
});