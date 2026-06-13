/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        oman: {
          green: '#006B3F',
          'green-light': '#00A65A',
          gold: '#C8A84B',
          red: '#DB0000',
        },
        primary: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0',
          300: '#6ee7b7', 400: '#34d399', 500: '#10b981',
          600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
        latin: ['Inter', 'sans-serif']
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  },
  plugins: []
};
