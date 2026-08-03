import { createClient } from "@/lib/supabase/client";

export const EXPORT_FORMATS = [
  { value: "markdown", label: "Markdown", hint: "For Notion, Obsidian, GitHub" },
  { value: "html", label: "HTML / PDF", hint: "Opens in a browser — print to PDF" },
  { value: "txt", label: "Plain text", hint: "Works anywhere" },
  { value: "json", label: "JSON", hint: "For your own tooling" },
] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number]["value"];
export type ExportKind = "scripts" | "outlines" | "research" | "seo";

/**
 * Download an export.
 *
 * These endpoints return the file itself rather than the API envelope, so
 * this bypasses the normal client: it fetches the blob, then hands it to the
 * browser under the filename the server chose.
 */
export async function downloadExport(
  kind: ExportKind,
  id: string,
  format: ExportFormat,
  /** Translate into this language before downloading. Costs credits. */
  language?: string,
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) throw new Error("The PodMind API URL is not configured yet.");

  const supabase = createClient();
  const {
    data: { session },
  } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

  const query = new URLSearchParams({ format });
  if (language) query.set("language", language);

  const response = await fetch(
    `${base}/api/v1/exports/${kind}/${id}?${query.toString()}`,
    {
      headers: session?.access_token
        ? { authorization: `Bearer ${session.access_token}` }
        : {},
    },
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404 ? "That item no longer exists." : "The export failed.",
    );
  }

  // Prefer the server's filename; it already handles punctuation and length.
  //
  // Read `filename*` first: it carries the real, percent-encoded name, while
  // the plain `filename` is an ASCII-only fallback for old clients. Reading
  // only the fallback would throw away every non-Latin title — precisely the
  // ones a user exporting into Urdu or Japanese needs to tell apart.
  const disposition = response.headers.get("content-disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/.exec(disposition)?.[1];

  let filename = plain ?? `podmind-export.${format === "markdown" ? "md" : format}`;
  if (encoded) {
    try {
      filename = decodeURIComponent(encoded);
    } catch {
      // Malformed encoding: the ASCII fallback is still a working name.
    }
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the click has taken effect.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
