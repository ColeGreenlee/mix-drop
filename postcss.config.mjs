// Only load Tailwind PostCSS in non-test environments
const config = {
  plugins: process.env.NODE_ENV === "test" ? [] : ["@tailwindcss/postcss"],
};

export default config;
