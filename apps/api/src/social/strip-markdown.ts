/**
 * Strip markdown from text destined for a social platform.
 *
 * None of these platforms render markdown, so a model that reaches for
 * `*   **Bold point:**` produces exactly that on the page — asterisks and all.
 * The prompt asks for plain text, but prompts are guidance and this is a
 * guarantee: whatever comes back, nothing with markup in it reaches a post.
 *
 * Emphasis is unwrapped rather than deleted, because the words inside it are
 * the point. List markers become a bullet character, which platforms show
 * correctly and which reads as intended.
 */
export function stripMarkdown(input: string): string {
  let text = input;

  // Fenced and inline code — keep the contents, drop the fences.
  text = text.replace(/```[a-z]*\n?/gi, "").replace(/`([^`]+)`/g, "$1");

  // Links and images: keep the label, and the URL when it adds something.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) =>
    url.startsWith("http") ? `${label} ${url}` : label,
  );

  // Emphasis: ***x***, **x**, *x*, __x__, _x_ — unwrap, keep the text.
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,!?):]|$)/g, "$1$2");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?):]|$)/g, "$1$2");

  // Strikethrough.
  text = text.replace(/~~([^~]+)~~/g, "$1");

  text = text
    .split("\n")
    .map((line) => {
      // Headings become plain lines; a "###" in a post is noise.
      let out = line.replace(/^\s{0,3}#{1,6}\s+/, "");
      // Blockquotes.
      out = out.replace(/^\s{0,3}>\s?/, "");
      // Bullet markers, including the "*   " the model favours. A line that is
      // only dashes is a horizontal rule and goes entirely.
      if (/^\s*[-*_]{3,}\s*$/.test(out)) return "";
      out = out.replace(/^\s*[-*+]\s+/, "• ");
      // Numbered lists keep their numbers; they carry order.
      out = out.replace(/^\s*(\d+)[.)]\s+/, "$1. ");
      return out.trimEnd();
    })
    .join("\n");

  // Any stray emphasis characters the patterns above could not pair up.
  text = text.replace(/\*+/g, "");

  // Collapse the runs of blank lines that stripping tends to leave behind.
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
