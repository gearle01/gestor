/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        azuri: {
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#007fff',
          600: '#0066cc',
          700: '#004c99',
          800: '#003366',
          900: '#001933',
        }
      }
    },
  },
  plugins: [],
}