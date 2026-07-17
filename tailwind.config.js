/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef0fe',
          100: '#dce0fd',
          200: '#b9c1fb',
          300: '#96a2f6',
          400: '#7c80f0',
          500: '#5b5fe8',
          600: '#4145c9',
          700: '#3538a3',
          800: '#2b2d80',
          900: '#22245e',
        },
        dark: {
          bg: '#0A0A0A',
          card: '#141414',
          border: '#252525',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
        light: {
          bg: '#F1F0EC',
          card: '#FFFFFF',
          border: '#E7E6E1',
          text: '#1A1A1A',
          muted: '#A0A0A8',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
