// Config Tailwind — page client "Mariage" (suivi-mariage).
// Palette ivoire / or reprise du site de mariage (fond papier clair, encre
// brun chaud, or + vin). Polices auto-hébergées (voir fonts-mariage.css) :
// LEMON MILK (sans), Copperplate Gothic (display), Pretty Dahlia (script), FcoFlares.
const colors = {
  // tokens sémantiques (compat avec le reste du projet)
  bg: '#f7f7f7', 'bg-soft': '#ffffff', surface: '#ffffff',
  ink: '#2d2418', 'ink-soft': '#6f5b40', 'ink-muted': '#9b8664',
  accent: '#b88b36', 'accent-soft': '#f0d28a',
  // palette dédiée mariage
  mariage: {
    paper: '#f7f7f7', papersoft: '#ffffff', paperwarm: '#efefef',
    ink: '#2d2418', inksoft: '#6f5b40', muted: '#9b8664',
    gold: '#b88b36', golddeep: '#7b5618', goldhi: '#f0d28a',
    wine: '#572b2e',
    border: 'rgba(45,36,24,0.14)', borderstrong: 'rgba(123,86,24,0.32)',
  },
};
module.exports = {
  content: ['./public/suivi-mariage.html'],
  // La page mariage est stylée en CSS vanilla (bloc <style> inline) et ne dépend
  // plus de Tailwind que pour ces 2 utilitaires, dont `flex` est ajouté par JS au
  // bouton livraison (donc invisible au scan du HTML → à garder explicitement).
  safelist: ['flex', 'hidden'],
  theme: {
    extend: {
      colors,
      fontFamily: {
        sans: ['"LEMON MILK"', 'system-ui', 'sans-serif'],
        read: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Copperplate Gothic"', 'serif'],
        serif: ['"Copperplate Gothic"', 'serif'],
        script: ['"Pretty Dahlia"', 'cursive'],
        flare: ['"FcoFlares"', 'serif'],
      },
    },
  },
};
