import type { Config } from "tailwindcss";

/**
 * PodMind Tailwind preset — implements 05-Design-System.md token structure:
 *   • Color scales: primary / success / warning / error 50–900, neutral 50–950
 *   • Semantic colors: background, surface, card, border, input, hover,
 *     active, disabled, focus, overlay
 *   • Typography: Inter with system fallbacks
 *   • Themes: dark (primary) + light, switchable — every color resolves
 *     through a CSS variable defined in styles.css, so theming is a
 *     variable swap, never a class rewrite.
 */

const scale = (name: string, steps: number[]) =>
  Object.fromEntries(steps.map((s) => [s, `hsl(var(--${name}-${s}) / <alpha-value>)`]));

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export const podmindPreset: Config = {
  darkMode: "class",
  content: [],
  theme: {
    extend: {
      colors: {
        primary: { ...scale("primary", STEPS), DEFAULT: "hsl(var(--primary-500) / <alpha-value>)" },
        success: { ...scale("success", STEPS), DEFAULT: "hsl(var(--success-500) / <alpha-value>)" },
        warning: { ...scale("warning", STEPS), DEFAULT: "hsl(var(--warning-500) / <alpha-value>)" },
        error: { ...scale("error", STEPS), DEFAULT: "hsl(var(--error-500) / <alpha-value>)" },
        neutral: scale("neutral", [...STEPS, 950]),
        purple: {
          ...scale("purple", [300, 400, 500, 600, 700]),
          DEFAULT: "hsl(var(--purple-500) / <alpha-value>)",
        },
        cyan: {
          ...scale("cyan", [300, 400, 500, 600]),
          DEFAULT: "hsl(var(--cyan-400) / <alpha-value>)",
        },
        // Semantic tokens (doc §6)
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        hover: "hsl(var(--hover) / <alpha-value>)",
        active: "hsl(var(--active) / <alpha-value>)",
        disabled: "hsl(var(--disabled) / <alpha-value>)",
        focus: "hsl(var(--focus) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        "secondary-foreground": "hsl(var(--secondary-foreground) / <alpha-value>)",
      },
      backgroundImage: {
        /* Owner gradients */
        "brand-gradient": "linear-gradient(135deg, #2D8CFF 0%, #7B3FF2 100%)",
        "hero-glow": "linear-gradient(90deg, #38BDF8 0%, #7B3FF2 50%, #A855F7 100%)",
      },
      boxShadow: {
        "glow-blue": "0 0 30px rgba(45,140,255,0.45)",
        "glow-purple": "0 0 30px rgba(123,63,242,0.45)",
        "soft": "0 8px 32px rgba(0,0,0,0.35)",
      },
      fontFamily: {
        display: ["'Space Grotesk Variable'", "'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        sans: ["'Inter Variable'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      keyframes: {
        level: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        aurora: {
          "0%, 100%": { opacity: "0.7", transform: "translateY(0) scale(1)" },
          "50%": { opacity: "1", transform: "translateY(12px) scale(1.06)" },
        },
      },
      animation: {
        level: "level 1.6s ease-in-out infinite",
        aurora: "aurora 9s ease-in-out infinite",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default podmindPreset;
