import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#1a1a1a",
        "surface-2": "#242424",
        accent: "#25d366",
        "accent-dark": "#075e54",
        "border-subtle": "#2e2e2e",
      },
    },
  },
  plugins: [],
};

export default config;
