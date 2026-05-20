/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0B0E14",
          card: "#121722",
          border: "#1E2638",
          text: "#F3F4F6",
          primary: "#06F3D8", // Neon Cyan/Teal
          primaryGlow: "rgba(6, 243, 216, 0.4)",
          emerald: "#10B981",
          emeraldGlow: "rgba(16, 185, 129, 0.4)",
          rose: "#F43F5E",
          roseGlow: "rgba(244, 63, 94, 0.4)",
          gold: "#F59E0B",
          goldGlow: "rgba(245, 158, 11, 0.4)",
          muted: "#9CA3AF"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Courier New", "Courier", "monospace"],
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6, 243, 216, 0.2), 0 0 10px rgba(6, 243, 216, 0.1)' },
          '100%': { boxShadow: '0 0 15px rgba(6, 243, 216, 0.5), 0 0 30px rgba(6, 243, 216, 0.2)' }
        }
      }
    },
  },
  plugins: [],
}
