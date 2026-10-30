/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: Object.fromEntries(
        [...Object.keys(require('./src/design/palette.json')), 'onAccent'].map((key) => [
          key,
          `rgb(var(--vc-${key}) / <alpha-value>)`,
        ]),
      ),
      fontSize: { xs: ['var(--vc-small)', '1.5'], base: ['var(--vc-base)', '1.5'] },
      fontFamily: {
        sans: ['DMSans_400Regular'],
        medium: ['DMSans_500Medium'],
        semibold: ['DMSans_600SemiBold'],
        bold: ['DMSans_700Bold'],
        display: ['DMSans_800ExtraBold'],
        italic: ['DMSans_500Medium'],
      },
      borderRadius: { card: '20px' },
    },
  },
  plugins: [],
};
