/** @type {import('tailwindcss').Config} */

// Wszystkie kolory marki czytane z CSS variables (src/styles/tokens.css).
// Tu tylko mapowanie na nazwy klas — wartości zmienia się w tokens.css.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix, steps) =>
  Object.fromEntries(steps.map((step) => [step, v(`${prefix}-${step}`)]));

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        biovlo: scale('biovlo', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        accent: { DEFAULT: v('accent-600'), ...scale('accent', [50, 100, 200, 400, 600, 700, 900]) },
        neutral: scale('neutral', [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),

        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), soft: v('warning-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },

        brand: {
          DEFAULT: v('brand'),
          hover: v('brand-hover'),
          soft: v('brand-soft'),
          strong: v('brand-strong'),
          contrast: v('brand-contrast'),
          // Kolory z logo — patrz tokens.css
          ink: v('brand-ink'),
          leaf: v('brand-leaf'),
          teal: v('brand-teal'),
          accent: v('brand-accent'),
          'accent-ink': v('brand-accent-ink'),
          cream: v('brand-cream'),
        },
        surface: { DEFAULT: v('surface'), muted: v('surface-muted'), sunken: v('surface-sunken') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), subtle: v('ink-subtle') },
      },
      // Osobne nazwy (ui-*), żeby nie zmieniać rounded-lg/xl używanych przez stare strony
      borderRadius: {
        'ui-sm': 'var(--radius-sm)',
        'ui-md': 'var(--radius-md)',
        'ui-lg': 'var(--radius-lg)',
        'ui-xl': 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--neutral-900) / 0.04), 0 1px 3px rgb(var(--neutral-900) / 0.06)',
        pop: '0 8px 24px rgb(var(--neutral-900) / 0.12), 0 2px 6px rgb(var(--neutral-900) / 0.06)',
      },
      spacing: {
        topbar: 'var(--shell-topbar-h)',
        sidebar: 'var(--shell-sidebar-w)',
        bottomnav: 'var(--shell-bottomnav-h)',
      },
      width: {
        sidebar: 'var(--shell-sidebar-w)',
      },
    },
  },
  plugins: [],
};
