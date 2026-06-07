/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50:  '#fdf2f4',
          100: '#fce7ea',
          200: '#f9d2d8',
          300: '#f4adb8',
          400: '#ec7f8f',
          500: '#e05269',
          600: '#cc3050',
          700: '#ac2141',
          800: '#8b1a33',
          900: '#7c1a2e',
          950: '#440a17',
        },
        gold: {
          50:  '#fdf9ed',
          100: '#f9f0cc',
          200: '#f3de8f',
          300: '#ecc84b',
          400: '#e5b427',
          500: '#d4981a',
          600: '#ba7614',
          700: '#985515',
          800: '#7d4318',
          900: '#693818',
          950: '#3c1c08',
        },
        cream: {
          50:  '#fdf8f0',
          100: '#faeede',
          200: '#f4d9b7',
          300: '#ecbe85',
          400: '#e29b52',
          500: '#da7e30',
          600: '#cc6526',
          700: '#a94f22',
          800: '#884023',
          900: '#6f3620',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
