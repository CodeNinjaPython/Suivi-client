/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        noir:        "#0B0A08",
        charbon:     "#14110C",
        "charbon-2": "#1C1810",
        or:          "#C9A24A",
        "or-clair":  "#E6CD93",
        creme:       "#EFE8D8",
        sable:       "#8C8473",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "serif"],
        sans:    ['"DM Sans"', "sans-serif"],
        mono:    ['"DM Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
