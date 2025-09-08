/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './core/**/*.{js,ts,jsx,tsx,mdx,astro}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        // Zimbabwe flag colors
        'zw-green': '#00A651',
        'zw-yellow': '#FDD116',
        'zw-red': '#EF3340',
        'zw-black': '#000000',
        'zw-white': '#FFFFFF',
        // Dark theme colors
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#2a2a2a',
        'text-primary': '#ffffff',
        'text-secondary': '#b8bcc8',
        'text-muted': '#6b7280',
      },
      fontFamily: {
        'heading': ['"Playfair Display"', 'serif'],
        'body': ['"Roboto"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
