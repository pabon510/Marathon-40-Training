import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./domain/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec4ff",
          400: "#59a4ff",
          500: "#3182f6",
          600: "#2064d9",
          700: "#1c4fae",
          800: "#1c458c",
          900: "#1c3c73",
        },
        safety: {
          block: "#b91c1c",
          warn: "#b45309",
          ok: "#15803d",
        },
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
