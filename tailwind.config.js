/** Tailwind v3. Two settings are load-bearing:
 *  - prefix 'sk-'          : no class name can collide with Squarespace's own CSS
 *  - preflight: false      : Squarespace ships its own reset; ours must not replace it
 *  Scoping under .sk-root is done in postcss/scope.js, not here.
 */
export default {
  prefix: 'sk-',
  corePlugins: { preflight: false },
  content: [
    './components/**/*.{html,js,json}',
    './src/**/*.js',
    './harness/**/*.html',
  ],
  theme: {
    extend: {
      // Semantic shadcn tokens, resolved from the CSS variables in src/tokens.css.
      // This is what makes pasted 21st.dev markup (bg-background, text-muted-foreground)
      // render with the client's colours instead of nothing.
      colors: {
        border: 'hsl(var(--sk-border) / <alpha-value>)',
        input: 'hsl(var(--sk-input) / <alpha-value>)',
        ring: 'hsl(var(--sk-ring) / <alpha-value>)',
        background: 'hsl(var(--sk-background) / <alpha-value>)',
        foreground: 'hsl(var(--sk-foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--sk-primary) / <alpha-value>)',
          foreground: 'hsl(var(--sk-primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--sk-secondary) / <alpha-value>)',
          foreground: 'hsl(var(--sk-secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--sk-muted) / <alpha-value>)',
          foreground: 'hsl(var(--sk-muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--sk-accent) / <alpha-value>)',
          foreground: 'hsl(var(--sk-accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--sk-destructive) / <alpha-value>)',
          foreground: 'hsl(var(--sk-destructive-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--sk-card) / <alpha-value>)',
          foreground: 'hsl(var(--sk-card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--sk-popover) / <alpha-value>)',
          foreground: 'hsl(var(--sk-popover-foreground) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--sk-radius)',
        md: 'calc(var(--sk-radius) - 2px)',
        sm: 'calc(var(--sk-radius) - 4px)',
      },
      fontFamily: {
        sans: 'var(--sk-font-sans)',
        heading: 'var(--sk-font-heading)',
      },
      keyframes: {
        'sk-marquee': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'sk-fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        marquee: 'sk-marquee var(--sk-marquee-duration, 30s) linear infinite',
        'fade-up': 'sk-fade-up .5s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
}
