// @ts-check

import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://fiftyshades.esison.dev',
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
