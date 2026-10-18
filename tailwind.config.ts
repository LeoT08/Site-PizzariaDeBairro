import type { Config } from 'tailwindcss'

// Cores de pizzaria de bairro: o vermelho do molho, o verde do manjericão,
// o dourado da borda assada e o papel manteiga da caixa.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        papel: '#FFFFFF',
        manteiga: '#F7F2E8',
        tinta: { DEFAULT: '#1B3A2A', soft: '#3D5A4A' },
        oregano: { DEFAULT: '#5E6E57', light: '#A7B3A0' },
        molho: { DEFAULT: '#C62A1F', dark: '#A11F16', wash: '#FCEBE9' },
        borda: { DEFAULT: '#E3A63E', wash: '#FCF3E1' },
        manjericao: { DEFAULT: '#2E7D4F', wash: '#E8F3EC' },
        linha: '#E6E2D8',
      },
      fontFamily: {
        display: ['"Alfa Slab One"', 'Georgia', 'serif'],
        sans: ['Rubik', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 4vw + 0.6rem, 4.25rem)', { lineHeight: '1.02', letterSpacing: '-0.01em' }],
        'display-lg': ['clamp(1.875rem, 2.6vw + 0.9rem, 3rem)', { lineHeight: '1.08' }],
        'display-md': ['clamp(1.375rem, 1.2vw + 0.9rem, 1.875rem)', { lineHeight: '1.15' }],
      },
      maxWidth: { prose: '62ch' },
      backgroundImage: {
        // toalha xadrez, usada só em faixas finas
        xadrez:
          'repeating-conic-gradient(#C62A1F 0% 25%, #FFFFFF 0% 50%)',
      },
    },
  },
  plugins: [],
} satisfies Config
