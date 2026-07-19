import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PodMind AI — Research Less. Create More.",
    template: "%s · PodMind AI",
  },
  description:
    "The AI-powered podcast platform: research, guests, outlines, scripts, SEO and publishing — in minutes instead of hours.",
};

export const viewport: Viewport = {
  themeColor: "#050816",
};

/**
 * Theme bootstrap runs before hydration so the correct theme paints on
 * first frame (no flash). Dark is the primary theme (05-Design-System §4);
 * the user's choice persists in localStorage under "podmind-theme".
 */
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("podmind-theme");
    var theme = t === "light" || t === "dark" ? t : "dark";
    document.documentElement.classList.add(theme);
  } catch (_) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
