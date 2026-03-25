/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/views/**/*.ejs', './src/public/js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          50: 'hsl(228, 100%, 97%)',
          100: 'hsl(228, 100%, 93%)',
          200: 'hsl(228, 100%, 85%)',
          300: 'hsl(228, 100%, 70%)',
          400: 'hsl(228, 100%, 50%)',
          500: 'hsl(228, 100%, 30%)',
          600: 'hsl(228, 100%, 20%)',
          700: 'hsl(228, 100%, 15%)',
          800: 'hsl(228, 100%, 11%)',
          900: 'hsl(228, 100%, 8%)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          50: 'hsl(80, 89%, 95%)',
          100: 'hsl(80, 89%, 85%)',
          200: 'hsl(80, 89%, 70%)',
          300: 'hsl(80, 89%, 55%)',
          400: 'hsl(80, 89%, 45%)',
          500: 'hsl(80, 89%, 40%)',
          600: 'hsl(80, 89%, 32%)',
          700: 'hsl(80, 89%, 25%)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        destructive: {
          DEFAULT: 'hsl(0, 84%, 60%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        success: {
          DEFAULT: 'hsl(142, 76%, 36%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        warning: {
          DEFAULT: 'hsl(38, 92%, 50%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        info: {
          DEFAULT: 'hsl(199, 89%, 48%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'brand': '0 4px 14px 0 hsla(228, 100%, 11%, 0.12)',
        'brand-lg': '0 10px 40px 0 hsla(228, 100%, 11%, 0.15)',
        'glow': '0 0 20px hsla(80, 89%, 40%, 0.3)',
        'glow-sm': '0 0 10px hsla(80, 89%, 40%, 0.2)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, hsl(228, 100%, 11%) 0%, hsl(228, 100%, 20%) 100%)',
        'gradient-accent': 'linear-gradient(135deg, hsl(80, 89%, 40%) 0%, hsl(80, 89%, 32%) 100%)',
        'gradient-hero': 'linear-gradient(135deg, hsl(228, 100%, 11%) 0%, hsl(228, 100%, 20%) 50%, hsl(80, 89%, 40%) 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
