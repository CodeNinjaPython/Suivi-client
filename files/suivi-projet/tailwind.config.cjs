// Config Tailwind — pages bleues (index, suivi, admin). Build local, CSS commité.
const colors = {
  bg: '#07090c', 'bg-soft': '#0e1218', surface: '#12161d',
  ink: '#f4f1ec', 'ink-soft': '#a3a8b2', 'ink-muted': '#6b7280',
  accent: '#3b9bff', 'accent-soft': '#9ecbff',
  studio: { black: '#0a0a0a', charcoal: '#141414', gold: '#c9a24a', goldglow: 'rgba(201,162,74,0.4)', cream: '#efe8d8', muted: '#6b6b6b', border: '#2a2a2a' },
};
module.exports = {
  content: ['./public/index.html', './public/suivi.html', './public/admin.html'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
        serif: ['"Playfair Display"', 'serif'],
      },
      maxWidth: { content: '1280px' },
    },
  },
};
