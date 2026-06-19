/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        desk: '#181d27',
        'desk-2': '#1f2531',
        paper: '#f7f4ec',
        ink: '#1c2333',
        'ink-soft': '#4a5066',
        'stamp-blue': '#5b8def',
        'stamp-amber': '#f0a93b',
        success: '#4fae74',
        error: '#e2664f',
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
