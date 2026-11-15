/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safe: {
          dark: '#0b1118',
          card: '#131c27',
          cardHover: '#182433',
          border: '#1f2e40',
          borderLight: '#2a3e56',
          muted: '#8ca0b8',
          text: '#f1f5f9',
          red: '#dc2626',
          redMuted: 'rgba(220, 38, 38, 0.15)',
          amber: '#d97706',
          amberMuted: 'rgba(217, 119, 6, 0.15)',
          emerald: '#059669',
          emeraldMuted: 'rgba(5, 150, 105, 0.15)',
          blue: '#2563eb',
          blueMuted: 'rgba(37, 99, 235, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
