/** @type {import('tailwindcss').Config} */
// JAZ Chocolate design system — tokens transcribed from the brand
// "Design System Analysis": warm off-white canvas, aged-gold foil accent,
// serif-led bilingual voice (Canela→Fraunces, Greta Arabic→IBM Plex Sans Arabic,
// Gotham→Montserrat), RTL-first.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand & accent — aged gold, used like gold foil
        // Brand accent reads from CSS variables so the owner's "Identity &
        // appearance" section can retheme the whole system at runtime.
        primary: 'rgb(var(--brand-primary) / <alpha-value>)',
        'primary-hover': 'rgb(var(--brand-primary-hover) / <alpha-value>)',
        'primary-bright': 'rgb(var(--brand-primary-bright) / <alpha-value>)',
        'on-primary': '#2a1a12',

        // Ink
        ink: '#241712',
        'ink-muted': '#6e6258',
        'ink-subtle': '#9a8f84',
        'ink-on-dark': '#f3eee5',
        'ink-on-dark-muted': '#c9beb0',

        // Surface — light (default)
        canvas: '#f3eee5',
        'canvas-cool': '#f2f2f2',
        'surface-1': '#ffffff',
        'surface-2': '#fbf8f2',
        hairline: '#e6dfd3',
        'hairline-strong': '#d2c7b4',

        // Surface — dark (hero & footer)
        'canvas-dark': '#17120f',
        'surface-dark-1': '#221913',
        chocolate: '#3b241a',
        'hairline-dark': '#3a2c22',

        // Secondary brand
        'brand-green': '#355c4b',
        'brand-blue': '#365766',
        'photographic-dark': '#233039',

        // Semantic
        success: '#355c4b',
        danger: '#b5403b',
        'on-danger': '#ffffff',
        overlay: '#17120f',

        // Per-flavor accent layer (product/art surfaces only)
        'flavor-milk': '#b89b6e',
        'flavor-lavender': '#9c8bbe',
        'flavor-rose': '#8e2f55',
        'flavor-jasmine': '#c8bbb1',
        'flavor-papaya': '#d0c6b5',
      },
      fontFamily: {
        // 'SaudiRiyal' first: it only carries the ﷼ (U+FDFC) glyph, so every other
        // character falls through to the real families below.
        // Canela (Latin) + Greta Arabic — one continuous editorial voice
        serif: ['SaudiRiyal', 'Fraunces', 'IBM Plex Sans Arabic', 'Georgia', 'serif'],
        // Gotham — function: labels, data, buttons
        sans: ['SaudiRiyal', 'Montserrat', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        arabic: ['SaudiRiyal', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['72px', { lineHeight: '1.08', letterSpacing: '-1.5px', fontWeight: '400' }],
        'display-lg': ['52px', { lineHeight: '1.12', letterSpacing: '-1px', fontWeight: '400' }],
        'display-md': ['38px', { lineHeight: '1.18', letterSpacing: '-0.6px', fontWeight: '500' }],
        headline: ['28px', { lineHeight: '1.25', letterSpacing: '-0.4px', fontWeight: '500' }],
        'card-title': ['22px', { lineHeight: '1.3', letterSpacing: '-0.2px', fontWeight: '500' }],
        subhead: ['20px', { lineHeight: '1.45', letterSpacing: '0', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.62', letterSpacing: '0' }],
        body: ['16px', { lineHeight: '1.62', letterSpacing: '0' }],
        'body-sm': ['14px', { lineHeight: '1.55', letterSpacing: '0' }],
        data: ['13px', { lineHeight: '1.5', letterSpacing: '0.2px' }],
        caption: ['12px', { lineHeight: '1.4', letterSpacing: '0.2px' }],
        button: ['14px', { lineHeight: '1.2', letterSpacing: '0.6px', fontWeight: '500' }],
        eyebrow: ['12px', { lineHeight: '1.3', letterSpacing: '1.5px', fontWeight: '600' }],
        'section-number': ['28px', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '500' }],
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        xxl: '64px',
        section: '120px',
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
        pill: '9999px',
      },
      maxWidth: {
        content: '1200px',
        wide: '1440px',
        prose: '680px',
      },
      boxShadow: {
        // Soft, warm, low — the diffused studio light, never a hard UI drop shadow
        soft: '0 8px 32px rgba(36,23,18,0.08)',
        'soft-lg': '0 18px 48px rgba(36,23,18,0.12)',
        lift: '0 2px 12px rgba(36,23,18,0.05)',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.8s ease both',
        'scale-in': 'scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
}
