import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        sidebar: {
          DEFAULT: '#14171F',
          foreground: '#E5E7EB',
          active: '#1F2430',
          border: '#2A2F3D',
        },
        surface: {
          DEFAULT: '#F5F6F8',
          card: '#FFFFFF',
        },
        accent: {
          mint: '#D9F2E6',
          'mint-foreground': '#0F7A4E',
          lavender: '#E7E3F7',
          'lavender-foreground': '#5B4B9A',
        },
        status: {
          completed: '#0F7A4E',
          'completed-bg': '#D9F2E6',
          progress: '#B45309',
          'progress-bg': '#FEF3C7',
          blocked: '#B42318',
          'blocked-bg': '#FEE2E2',
          neutral: '#6B7280',
          'neutral-bg': '#F3F4F6',
          'info': '#1D4ED8',
          'info-bg': '#DBEAFE',
        },
        primary: {
          DEFAULT: '#16a34a',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      borderRadius: {
        card: '0.875rem',
        xl: '0.875rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)',
        'card-hover': '0 4px 6px -1px rgba(16, 24, 40, 0.1), 0 2px 4px -1px rgba(16, 24, 40, 0.06)',
        'dropdown': '0 4px 6px -2px rgba(16, 24, 40, 0.05), 0 10px 15px -3px rgba(16, 24, 40, 0.1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
