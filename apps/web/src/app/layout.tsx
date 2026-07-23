import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * metadataBase makes the relative OG paths absolute. Without it, a shared
 * link renders with no image at all — crawlers cannot resolve "/og.png".
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://podmind-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PodMind AI — Research Less. Create More.",
    template: "%s · PodMind AI",
  },
  description:
    "The AI-powered podcast platform: research, guests, outlines, scripts, SEO and publishing — in minutes instead of hours.",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "PodMind AI",
    title: "PodMind AI — Research Less. Create More.",
    description:
      "Turn a topic into an episode package: research, guests, outlines, scripts, fact checks, SEO and social.",
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PodMind AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PodMind AI — Research Less. Create More.",
    description:
      "Turn a topic into an episode package: research, guests, outlines, scripts, fact checks, SEO and social.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
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
