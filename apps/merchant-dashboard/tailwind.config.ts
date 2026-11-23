import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["Cairo", "system-ui", "sans-serif"],
      },
      colors: {
        // ===== Souqna Dark & Gold Design System =====
        souqna: {
          // Backgrounds
          base: "#07100F",        // Midnight Obsidian - main bg
          surface: "#0D1A18",     // Cards / panels
          card: "#122320",        // Elevated card surfaces
          border: "#1E3532",      // Subtle borders
          // Accents
          gold: "#F59E0B",        // Primary CTA & logo
          "gold-dark": "#D97706", // Hover state
          "gold-light": "#FCD34D",// Light gold
          emerald: "#10B981",     // Online / success states
          "emerald-dark": "#059669",
          red: "#EF4444",         // Error / cancelled
          "red-dark": "#DC2626",
          // Text
          "text-primary": "#F0F5F4",   // Primary headings
          "text-secondary": "#8FA8A5", // Muted labels
          "text-muted": "#4D7470",     // Placeholders
        },
      },
      backgroundImage: {
        "souqna-gradient": "linear-gradient(135deg, #07100F 0%, #0D1E1C 50%, #0A1917 100%)",
        "gold-gradient": "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        "emerald-gradient": "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        "card-glass": "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      },
      boxShadow: {
        "glass": "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "gold-glow": "0 0 24px rgba(245, 158, 11, 0.25)",
        "emerald-glow": "0 0 20px rgba(16, 185, 129, 0.2)",
        "card": "0 2px 16px rgba(0,0,0,0.3)",
        "nav-active": "0 2px 12px rgba(245, 158, 11, 0.3)",
      },
      animation: {
        "pulse-gold": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "fade-up": "fadeUp 0.4s ease-out",
      },
      keyframes: {
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
