import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7ad957",
        "background-light": "#f8faf4",
        "background-dark": "#0b110c",
        "neutral-dark": "#1a2218",
        "accent-dark": "#31402f",
        "surface-dark": "#101710",
        "border-dark": "#243221",
        "terminal-gray": "#223126",
        "terminal-accent": "#1a251b",
        "accent-amber": "#fb923c",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
