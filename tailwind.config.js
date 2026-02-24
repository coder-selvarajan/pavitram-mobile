/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff2ee',
          100: '#ffe0d5',
          200: '#ffbfaa',
          300: '#ff9470',
          400: '#ff6035',
          500: '#ff4500',
          600: '#e03b00',
          700: '#bb2f00',
          800: '#992800',
          900: '#7a2000',
        },
      },
    },
  },
  plugins: [],
};
