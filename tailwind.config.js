/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f3efe2',
        paper: '#fffefb',
        ink: '#1c2333',
        'ink-soft': '#5b6275',
        'stamp-blue': '#3a63b8',
        'stamp-amber': '#e2962c',
        success: '#2f8f5b',
        error: '#c84f3a',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
    },
  },
  plugins: [],
};
