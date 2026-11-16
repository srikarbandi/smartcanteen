import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette: deep forest green + warm off-white
        forest: {
          50: "#f1f6f2",
          100: "#dcebdf",
          200: "#bad7c1",
          300: "#8fbd9b",
          400: "#5f9b70",
          500: "#3f7d52",
          600: "#2f6340",
          700: "#274f35",
          800: "#1f3f2b",
          900: "#15291d",
        },
        cream: "#f7f5ef",
        parchment: "#efece3",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,41,29,0.06), 0 8px 24px rgba(21,41,29,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
