/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This makes Neue Haas Grotesk your default font across the whole app
        sans: ['"neue-haas-grotesk-display"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Optional: If you sync the text weight too, you can use font-text for small UI elements
        text: ['"neue-haas-grotesk-text"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}