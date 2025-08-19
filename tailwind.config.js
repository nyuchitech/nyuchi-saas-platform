/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/*/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/*/components/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      }
    },
  },
  plugins: [],
}
