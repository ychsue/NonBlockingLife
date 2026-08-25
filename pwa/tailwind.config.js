/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        main: '#0f172a',
        darkblue: '#1e293b',
        lightblue: '#3b82f6',
        lightgray: '#f1f5f9',
      },
    },
  },
  plugins: [],
}
