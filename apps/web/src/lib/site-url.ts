/**
 * The canonical public URL of this deployment.
 *
 * Normalised rather than used raw, because NEXT_PUBLIC_SITE_URL is typed by
 * hand into a dashboard and "podmindai.com" without a scheme is the obvious
 * thing to write. Passed straight to `new URL()` that throws, and because
 * metadataBase is evaluated during page-data collection, it took down the
 * entire production build — a whole deploy lost to a missing "https://".
 *
 * A value that is merely imperfect should not be fatal, so this repairs what
 * it can and falls back when it cannot.
 */

const FALLBACK = "https://podmindai.com";

function normalise(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return FALLBACK;

  // A bare host is the common mistake; assume https rather than failing.
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withScheme);
    // `new URL` is lenient — "https://!!!" parses happily — so the hostname
    // is checked separately. Anything that is not a plausible domain or
    // localhost would otherwise produce a working build serving broken links.
    const host = url.hostname;
    const looksLikeDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host);
    const isLocal = host === "localhost";
    if (!looksLikeDomain && !isLocal) return FALLBACK;

    // Trailing slashes would double up when concatenated into paths.
    return url.origin;
  } catch {
    return FALLBACK;
  }
}

export const SITE_URL = normalise(process.env.NEXT_PUBLIC_SITE_URL);
