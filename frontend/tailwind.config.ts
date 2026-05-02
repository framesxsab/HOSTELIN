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
        // Void Console palette
        primary: "#a3e635",
        "primary-muted": "#65a30d",
        "primary-glow": "rgba(163, 230, 53, 0.12)",
        void: "#030712",
        "void-surface": "#0a1120",
        "void-panel": "#111827",
        "void-elevated": "#1a2332",
        "void-border": "#1e293b",
        "void-border-light": "#334155",
        accent: "#f59e0b",
        "accent-muted": "#b45309",
        "text-primary": "#e2e8f0",
        "text-secondary": "#94a3b8",
        "text-muted": "#64748b",
        "text-dim": "#475569",
        danger: "#ef4444",
        "danger-muted": "#991b1b",
        info: "#38bdf8",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
