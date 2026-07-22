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
  kind: "script" | "outline" | "research";
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

  for (const section of doc.sections) {
    const heading = [escapeHtml(section.title ?? "Section")];
    if (section.speaker && section.speaker !== "host") {
      heading.push(`<span class="speaker">${escapeHtml(section.speaker)}</span>`);
    }
    if (section.durationSeconds) {
      heading.push(
        `<span class="minutes">${Math.round(section.durationSeconds / 60)} min</span>`,
      );
    }
    parts.push(`<section><h2>${heading.join(" ")}</h2>`);
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

  return `<!doctype html>
<html lang="en">
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

/** Safe, readable download filename. */
export function filenameFor(title: string, format: ExportFormat): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "podmind-export";
  return `${slug}.${FORMAT_META[format].extension}`;
}
