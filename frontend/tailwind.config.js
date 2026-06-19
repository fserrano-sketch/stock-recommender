/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#060d1a', 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
        brand: { DEFAULT: '#38bdf8', dark: '#0284c7', glow: '#7dd3fc' },
        accent: { purple: '#a78bfa', pink: '#f472b6', green: '#34d399', orange: '#fb923c' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.5s ease-out',
        'gradient': 'gradient 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'number-up': 'numberUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' },
          to: { boxShadow: '0 0 40px rgba(56, 189, 248, 0.6), 0 0 80px rgba(56, 189, 248, 0.2)' },
        },
        numberUp: { from: { opacity: 0, transform: 'translateY(10px) scale(0.9)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
      },
      backdropBlur: { xs: '2px' },
      backgroundSize: { '300%': '300%' },
    },
  },
  plugins: [],
}
