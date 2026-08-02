import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        canvas: "#F8F8F8",
        surface: "#FFFFFF",

        ink: {
          DEFAULT: "#111111",
          soft: "#5B5B5B",
          faint: "#9A9A9A",
        },

        line: "#ECECEC",

        brand: {
          50: "#FFF4ED",
          100: "#FFE6D5",
          200: "#FFC9A8",
          300: "#FFA466",
          400: "#FF7A30",
          500: "#FF5A1F",
          600: "#F0430D",
          700: "#C7330A",
          800: "#9E290F",
          900: "#7A2210",
        },

        success: {
          DEFAULT: "#1C9A6C",
          bg: "#E9F8F1",
        },

        warning: {
          DEFAULT: "#C08A00",
          bg: "#FCF3DA",
        },

        danger: {
          DEFAULT: "#D8391E",
          bg: "#FCEBE7",
        },

        info: {
          DEFAULT: "#2563EB",
          bg: "#EAF1FE",
        },
      },

      borderRadius: {
        xl: "18px",
        "2xl": "22px",
        "3xl": "24px",
      },

      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],

        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],

        mono: [
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },

      boxShadow: {
        soft:
          "0 1px 2px rgba(17,17,17,0.04), 0 8px 24px -12px rgba(17,17,17,0.08)",

        card:
          "0 1px 1px rgba(17,17,17,0.03), 0 2px 8px rgba(17,17,17,0.04)",

        lift:
          "0 12px 32px -8px rgba(17,17,17,0.14)",

        glow:
          "0 8px 24px -6px rgba(255,90,31,0.35)",
      },

      keyframes: {
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(4px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "flame-pulse": {
          "0%,100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.65",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
      },

      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "flame-pulse": "flame-pulse 2.4s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },

  plugins: [],
};

export default config;