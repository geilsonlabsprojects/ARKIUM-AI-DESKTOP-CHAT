/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Arkium brand colors
        arkium: {
          50: "#f0f4ff",
          100: "#e0e8ff",
          200: "#c7d4ff",
          300: "#a4b8ff",
          400: "#7a91ff",
          500: "#5562ff",
          600: "#3d3ef7",
          700: "#3228e3",
          800: "#2a20b8",
          900: "#261e91",
          950: "#171256",
        },
        // Dark theme backgrounds
        dark: {
          50: "#1a1b2e",
          100: "#16213e",
          200: "#0f3460",
          300: "#533483",
        },
        surface: {
          0: "#09090b",
          1: "#111113",
          2: "#18181b",
          3: "#1e1e21",
          4: "#242427",
          5: "#2a2a2e",
        },
        border: {
          1: "#27272a",
          2: "#3f3f46",
          3: "#52525b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
        "thinking": "thinking 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        thinking: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
