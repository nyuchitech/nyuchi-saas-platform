// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Marketing site configuration - separate from main dashboard
export default defineConfig({
  // Cloudflare adapter for Workers deployment
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      configPath: '../../workers/marketing/wrangler.toml',
    },
    imageService: 'compile',
  }),
  
  // Tailwind for styling
  integrations: [
    tailwind({
      configFile: './src/marketing/tailwind.config.mjs',
    })
  ],
  
  // Hybrid output for Workers deployment with some static pages
  output: 'hybrid',
  
  // Marketing site specific settings
  srcDir: './src/marketing',
  publicDir: './public',
  outDir: './dist-marketing',
  
  // Base configuration
  base: '/',
  trailingSlash: 'ignore',
  
  // Build configuration
  build: {
    assets: 'assets',
    format: 'file', // Generate .html files for better SEO
  },
  
  // Server configuration for development
  server: {
    port: 4322, // Different port from main app
    host: true
  },
  
  // No redirects needed - pages are at root level
  
  // SEO and performance optimizations
  compressHTML: true,
  scopedStyleStrategy: 'attribute',
  
  // Vite configuration for marketing assets
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Optimize for marketing site
          manualChunks: {
            vendor: ['astro'],
          },
        },
      },
    },
    css: {
      devSourcemap: true,
    },
  },
  
  // Marketing site metadata
  site: 'https://www.nyuchi.com',
  
  // Remove experimental features for now
});