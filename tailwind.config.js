/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary palette — deep forest green (replaces burgundy everywhere)
        burgundy: {
          50:  '#f0f7f3',
          100: '#d7ece1',
          200: '#aed9c3',
          300: '#7cbea0',
          400: '#4ea07b',
          500: '#2e8462',
          600: '#1e6a4d',
          700: '#17543d',  // ← main nav / buttons
          800: '#124231',
          900: '#0d3225',
          950: '#071c14',
        },
        // Warm amber-gold accents
        gold: {
          50:  '#fdf8ec',
          100: '#f9edca',
          200: '#f2d891',
          300: '#eabd52',
          400: '#e4a827',
          500: '#d08f15',  // ← main gold
          600: '#b37210',
          700: '#915710',
          800: '#764413',
          900: '#623913',
        },
        // Warm parchment background
        cream: {
          50:  '#fdfaf4',
          100: '#f9f2e3',
          200: '#f2e3bf',
          300: '#e9ce94',
          400: '#dfb467',
          500: '#d59843',
        },
        // Forest green for explicit use
        forest: {
          50:  '#f0f7f3',
          500: '#2e8462',
          700: '#17543d',
          900: '#0d3225',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'Cambria', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-md':'0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'card-lg':'0 10px 30px 0 rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.08)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl':'1.25rem',
      },
      animation: {
        'fade-up':  'fadeUp 0.5s ease-out forwards',
        'fade-in':  'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
