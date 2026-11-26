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
        souqna: {
          base: "#07100F",        // Midnight Obsidian - main bg
          surface: "#0D1A18",     // Cards / panels
          card: "#122320",        // Elevated card surfaces
          border: "#1E3532",      // Subtle borders
          gold: "#F59E0B",        // Primary CTA & logo
          "gold-dark": "#D97706", // Hover state
          "gold-light": "#FCD34D",// Light gold
          emerald: "#10B981",     // Online / success states
          "emerald-dark": "#059669",
          red: "#EF4444",         // Error / cancelled
          "red-dark": "#DC2626",
          blue: "#3B82F6",        // In-transit / info
          purple: "#8B5CF6",      // Special / VIP
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
      },
    },
  },
  plugins: [],
};

export default config;
