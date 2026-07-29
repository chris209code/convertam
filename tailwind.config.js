/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--cvt-color-bg)',
        paper: 'var(--cvt-color-surface)',
        ink: 'var(--cvt-color-ink)',
        'ink-soft': 'var(--cvt-color-ink-muted)',
        'stamp-blue': 'var(--cvt-color-primary)',
        'stamp-amber': 'var(--cvt-color-warning)',
        success: 'var(--cvt-color-success)',
        error: 'var(--cvt-color-danger)',
      },
      borderRadius: {
        cvt: 'var(--cvt-radius-md)',
        'cvt-lg': 'var(--cvt-radius-lg)',
        'cvt-xl': 'var(--cvt-radius-xl)',
      },
      boxShadow: {
        cvt: 'var(--cvt-shadow-sm)',
        'cvt-md': 'var(--cvt-shadow-md)',
        'cvt-lg': 'var(--cvt-shadow-lg)',
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
