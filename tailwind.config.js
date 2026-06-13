// tailwind.config.js
module.exports = {
  content: [
    "./*.html",                    // Root HTML files
    "./views/**/*.ejs",            // EJS templates (typical Express structure)
    "./**/*.{html,ejs,js}",    // Any nested EJS files
    "./public/**/*.html",          // Public HTML assets
    "./**/*.ejs",                  // Recursive EJS scan (all folders)
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ED1B24',
          dark: '#C9171F',
          light: '#FEE2E3',
          ultraLight: '#FFF5F5',
        },
        'bg-soft': '#FDFDFC',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.7s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at 10% 20%, rgba(237,27,36,0.03) 0%, rgba(255,255,255,0) 70%)',
      }
    }
  },
  plugins: [],
}