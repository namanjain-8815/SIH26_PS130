import type { Config } from 'tailwindcss';

// Design tokens per IMPLEMENTATION_PLAN.md §8 / AGENT_INITIAL_PROMPT.md:
// dark left sidebar, light gray canvas, white rounded-2xl cards with a soft
// shadow, two pastel accents (mint / lavender) used sparingly for highlight
// cards only, status always a labeled badge — never color alone. No
// gradients, no glassmorphism.
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#14171F',
          foreground: '#E5E7EB',
          active: '#1F2430',
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
          progress: '#B45309',
          blocked: '#B42318',
          neutral: '#6B7280',
        },
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
