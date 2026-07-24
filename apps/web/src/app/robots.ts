import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { PROTECTED_PREFIXES } from "@/lib/routes";



/**
 * The application itself is behind auth and has nothing to offer a crawler,
 * so it is excluded — both to keep private routes out of results and to keep
 * the crawl budget on pages that can actually rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Derived from the same list the middleware enforces, so the two
        // cannot drift apart.
        disallow: [...PROTECTED_PREFIXES, "/auth/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
