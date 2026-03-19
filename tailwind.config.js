/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cority: {
          red: '#E3001B',
          'red-dark': '#B8001A',
          orange: '#D35F0B',
          green: '#49763E',
          navy: '#060015',
        },
        border: {
          subtle: '#D9D8D6',
        },
      },
      fontFamily: {
        sans: ['Fakt Pro', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        blond: '350',
      },
      letterSpacing: {
        eyebrow: '1.38px',
        tag: '0.97px',
      },
      borderRadius: {
        tag: '6.25px',
      },
    },
  },
  plugins: [],
}
