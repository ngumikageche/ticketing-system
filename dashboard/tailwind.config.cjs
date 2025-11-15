/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',   // blue used for active menu
        urgent: '#ef4444',
        high: '#f97316',
        medium: '#f59e0b',
        low: '#10b981',
      },
    },
  },
  plugins: [],
}
