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
        base: "#050508",
        surface: "rgba(255, 255, 255, 0.03)",
        "surface-hover": "rgba(255, 255, 255, 0.06)",
        elevated: "rgba(255, 255, 255, 0.05)",
        accent: "#2D9FFF",
        "accent-soft": "rgba(45, 159, 255, 0.12)",
        "accent-green": "#34D399",
        "text-primary": "#F0F0F5",
        "text-secondary": "#9CA3AF",
        "text-muted": "#6B7280",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      backdropBlur: {
        md: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
