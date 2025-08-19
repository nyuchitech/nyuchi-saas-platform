// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    mode: 'directory',
    platformProxy: {
      enabled: true
    }
  }),
  vite: {
    plugins: [tailwindcss()]
  },
  output: 'hybrid',
  experimental: {
    assets: true
  }
});
