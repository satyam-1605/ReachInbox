import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Figma green accent
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        // Orange badge for scheduled emails
        scheduled: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f9fafb",
          muted: "#f3f4f6",
        },
        border: {
          DEFAULT: "#e5e7eb",
          subtle: "#f3f4f6",
        },
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
