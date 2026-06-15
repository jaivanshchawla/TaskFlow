import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        accent: {
          DEFAULT: "var(--accent)",
          bright: "var(--accent-bright)",
        },
        status: {
          todo: "#64748b",
          in_progress: "#3b82f6",
          in_review: "#a855f7",
          done: "#10b981",
          cancelled: "#9ca3af",
        },
        priority: {
          urgent: "#ef4444",
          high: "#f97316",
          medium: "#eab308",
          low: "#94a3b8",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "pulse-urgent": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "float": "float 6s ease-in-out infinite",
        "float-reverse": "float 8s ease-in-out infinite reverse",
        "count-up": "countUp 0.5s ease-out forwards",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;