import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        panel: "#111111",
        graphite: "#2c2c2e",
        imessage: "#0b84ff",
        ampm: "#ff3b30",
        lime: "#d4ff3a",
      },
      fontFamily: {
        chat: [
          "SF Pro Text",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 48px rgba(212, 255, 58, 0.08)",
        phone: "0 24px 80px rgba(0, 0, 0, 0.55)",
      },
    },
  },
  plugins: [],
};

export default config;
