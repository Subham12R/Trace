import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#141414',
        border: '#1f1f1f',
        foreground: '#e5e5e5',
        muted: '#737373',
        accent: '#22c55e',
      },
    },
  },
  plugins: [],
}

export default config
