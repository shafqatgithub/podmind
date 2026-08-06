/**
 * Export renderers — 11-Feature-Specifications MODULE 12.
 *
 * Every format is produced here from plain data, with no template engine and
 * no headless browser: an export must never be able to fail for a reason
 * unrelated to the content being exported.
 */

export const EXPORT_FORMATS = ["markdown", "txt", "html", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const FORMAT_META: Record<ExportFormat, { extension: string; mime: string }> = {
  markdown: { extension: "md", mime: "text/markdown; charset=utf-8" },
  txt: { extension: "txt", mime: "text/plain; charset=utf-8" },
  html: { extension: "html", mime: "text/html; charset=utf-8" },
  json: { extension: "json", mime: "application/json; charset=utf-8" },
};

export interface ExportSection {
  title: string | null;
  speaker?: string | null;
  content: string;
  notes?: string | null;
  durationSeconds?: number | null;
  bullets?: string[];
}

export interface ExportDocument {
  kind: "script" | "outline" | "research" | "seo" | "social" | "topics";
  /** Language the body is written in — drives `lang` and text direction. */
  language?: string | null;
  title: string;
  subtitle?: string | null;
  /** Shown under the title: duration, word count, style and so on. */
  facts: { label: string; value: string }[];
  intro?: { heading: string; body: string }[];
  sections: ExportSection[];
  /** Trailing lists such as sources, questions or editing notes. */
  lists?: { heading: string; items: string[] }[];
}

/* ----------------------------------------------------------- markdown */

export function toMarkdown(doc: ExportDocument): string {
  const out: string[] = [`# ${doc.title}`, ""];
  if (doc.subtitle) out.push(`_${doc.subtitle}_`, "");
  if (doc.facts.length) {
    out.push(doc.facts.map((f) => `**${f.label}:** ${f.value}`).join(" · "), "");
  }

  for (const block of doc.intro ?? []) {
    out.push(`## ${block.heading}`, "", block.body, "");
  }

  for (const section of doc.sections) {
    const heading = [section.title ?? "Section"];
    if (section.speaker && section.speaker !== "host") {
      heading.push(`(${section.speaker})`);
    }
    if (section.durationSeconds) {
      heading.push(`— ${Math.round(section.durationSeconds / 60)} min`);
    }
    out.push(`## ${heading.join(" ")}`, "");
    if (section.content) out.push(section.content, "");
    for (const bullet of section.bullets ?? []) out.push(`- ${bullet}`);
    if (section.bullets?.length) out.push("");
    if (section.notes) out.push(`> ${section.notes}`, "");
  }

  for (const list of doc.lists ?? []) {
    if (!list.items.length) continue;
    out.push(`## ${list.heading}`, "");
    for (const item of list.items) out.push(`- ${item}`);
    out.push("");
  }

  return out.join("\n").trimEnd() + "\n";
}

/* ---------------------------------------------------------------- txt */

export function toText(doc: ExportDocument): string {
  const rule = "=".repeat(Math.min(doc.title.length, 60));
  const out: string[] = [doc.title, rule, ""];
  if (doc.subtitle) out.push(doc.subtitle, "");
  if (doc.facts.length) {
    out.push(doc.facts.map((f) => `${f.label}: ${f.value}`).join("  |  "), "");
  }

  for (const block of doc.intro ?? []) {
    out.push(block.heading.toUpperCase(), "", block.body, "");
  }

  for (const section of doc.sections) {
    const parts = [section.title ?? "Section"];
    if (section.speaker && section.speaker !== "host") parts.push(`[${section.speaker}]`);
    out.push(parts.join(" ").toUpperCase(), "-".repeat(40), "");
    if (section.content) out.push(section.content, "");
    for (const bullet of section.bullets ?? []) out.push(`  * ${bullet}`);
    if (section.bullets?.length) out.push("");
    if (section.notes) out.push(`(${section.notes})`, "");
  }

  for (const list of doc.lists ?? []) {
    if (!list.items.length) continue;
    out.push(list.heading.toUpperCase(), "-".repeat(40), "");
    for (const item of list.items) out.push(`  * ${item}`);
    out.push("");
  }

  return out.join("\n").trimEnd() + "\n";
}

/* --------------------------------------------------------------- html */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Print-ready HTML.
 *
 * Deliberately light: serif body at a readable size, page-break rules that
 * keep a section heading with its text, and no colour that costs ink. Opened
 * in a browser this prints to PDF cleanly, which is the fastest honest route
 * to a PDF without shipping a rendering engine.
 */
/**
 * Scripts written right to left. Declaring `dir` matters more than it looks:
 * without it a browser lays Urdu or Arabic out left to right, breaking
 * punctuation placement and line order.
 */
const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "ps", "sd", "yi", "ug", "dv"]);

function directionFor(language: string | null | undefined): "rtl" | "ltr" {
  if (!language) return "ltr";
  return RTL_LANGUAGES.has(language.toLowerCase().split("-")[0] ?? "") ? "rtl" : "ltr";
}

export function toHtml(doc: ExportDocument): string {
  const parts: string[] = [];

  parts.push(`<h1>${escapeHtml(doc.title)}</h1>`);
  if (doc.subtitle) parts.push(`<p class="subtitle">${escapeHtml(doc.subtitle)}</p>`);
  if (doc.facts.length) {
    parts.push(
      `<p class="facts">${doc.facts
        .map((f) => `<strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}`)
        .join(" &middot; ")}</p>`,
    );
  }

  for (const block of doc.intro ?? []) {
    parts.push(
      `<section><h2>${escapeHtml(block.heading)}</h2><p>${escapeHtml(block.body)}</p></section>`,
    );
  }

  // Scripts split one outline beat across several turns, all carrying the same
  // title. Printing it each time produced the same heading four times over,
  // each labelled "0 min"; the heading now appears once, when it changes.
  let lastHeading: string | null = null;

  for (const section of doc.sections) {
    const title = section.title ?? "Section";
    const isNewHeading = title !== lastHeading;
    lastHeading = title;

    const heading: string[] = [];
    if (isNewHeading) heading.push(escapeHtml(title));
    if (section.speaker && section.speaker !== "host") {
      heading.push(`<span class="speaker">${escapeHtml(section.speaker)}</span>`);
    }
    // A rounded duration of zero says nothing; only real timings are shown.
    const minutes = section.durationSeconds ? Math.round(section.durationSeconds / 60) : 0;
    if (minutes > 0) {
      heading.push(`<span class="minutes">${minutes} min</span>`);
    }
    parts.push(`<section>${heading.length ? `<h2>${heading.join(" ")}</h2>` : ""}`);
    if (section.content) {
      parts.push(
        section.content
          .split(/\n{2,}/)
          .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
          .join(""),
      );
    }
    if (section.bullets?.length) {
      parts.push(`<ul>${section.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`);
    }
    if (section.notes) parts.push(`<p class="note">${escapeHtml(section.notes)}</p>`);
    parts.push(`</section>`);
  }

  for (const list of doc.lists ?? []) {
    if (!list.items.length) continue;
    parts.push(
      `<section><h2>${escapeHtml(list.heading)}</h2><ul>${list.items
        .map((i) => `<li>${escapeHtml(i)}</li>`)
        .join("")}</ul></section>`,
    );
  }

  const language = doc.language ?? "en";
  const direction = directionFor(doc.language);

  return `<!doctype html>
<html lang="${escapeHtml(language)}" dir="${direction}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.title)}</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt; line-height: 1.6; color: #111;
    max-width: 42rem; margin: 3rem auto; padding: 0 1.5rem; background: #fff;
  }
  h1 { font-size: 22pt; line-height: 1.25; margin: 0 0 .5rem; }
  h2 { font-size: 13pt; margin: 2rem 0 .5rem; page-break-after: avoid; }
  .subtitle { font-style: italic; color: #444; margin: 0 0 1rem; }
  .facts { font-size: 10pt; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 1rem; }
  .speaker { font-variant: small-caps; font-weight: normal; color: #555; }
  .minutes { font-weight: normal; font-size: 10pt; color: #777; }
  .note { border-left: 2px solid #ccc; padding-left: .75rem; color: #555; font-style: italic; }
  ul { padding-left: 1.25rem; }
  li { margin: .25rem 0; }
  section { page-break-inside: auto; }
  @media print {
    body { margin: 0; max-width: none; font-size: 11pt; }
    h2 { page-break-after: avoid; }
    p, li { orphans: 2; widows: 2; }
  }
</style>
</head>
<body>
${parts.join("\n")}
<footer style="margin-top:3rem;padding-top:1rem;border-top:1px solid #ddd;font-size:9pt;color:#777;">
Generated by PodMind AI
</footer>
</body>
</html>
`;
}

/* --------------------------------------------------------------- json */

export function toJson(doc: ExportDocument): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

export function render(doc: ExportDocument, format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return toMarkdown(doc);
    case "txt":
      return toText(doc);
    case "html":
      return toHtml(doc);
    case "json":
      return toJson(doc);
  }
}

/**
 * Safe, readable download filename.
 *
 * Built from the document's own title so a folder of exports can be read at a
 * glance, with the language appended when the file was translated — someone
 * shipping the same episode in four languages ends up with four
 * distinguishable files rather than four copies of one name.
 *
 * Unicode letters are kept rather than stripped. The previous rule allowed
 * only a-z0-9, which quietly erased every character of an Urdu or Japanese
 * title and left the fallback name behind, so exactly the users who most
 * needed to tell their files apart got identical ones.
 */
export function filenameFor(
  title: string,
  format: ExportFormat,
  /** BCP-47 code of the language the file was translated into, if any. */
  language?: string | null,
): string {
  const slug =
    title
      .toLowerCase()
      // Keep letters and numbers from any script; everything else separates.
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "podmind-export";

  const suffix = language ? `-${language.toLowerCase()}` : "";
  return `${slug}${suffix}.${FORMAT_META[format].extension}`;
}
