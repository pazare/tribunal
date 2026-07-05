/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        tribunal: {
          bg: "#0a0c10",
          panel: "#12151c",
          border: "#252a36",
          gold: "#c9a962",
          mint: "#5eead4",
          rose: "#fb7185",
          sky: "#7dd3fc",
        },
      },
      animation: {
        slide: "slide 0.35s ease-out",
      },
      keyframes: {
        slide: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
    },
  },
  plugins: [],
};
