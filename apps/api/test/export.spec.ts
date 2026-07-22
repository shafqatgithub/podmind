import {
  filenameFor,
  render,
  toHtml,
  toJson,
  toMarkdown,
  toText,
  type ExportDocument,
} from "../src/exports/export.renderers";

const DOC: ExportDocument = {
  kind: "script",
  title: "Why Attention Is the Real Currency",
  subtitle: "A conversational look at the attention economy",
  facts: [
    { label: "Style", value: "interview" },
    { label: "Length", value: "28 min" },
  ],
  intro: [{ heading: "Summary", body: "Attention became the product." }],
  sections: [
    {
      title: "Cold open",
      speaker: "host",
      content: "You checked your phone before you finished this sentence.",
      notes: "Pause after the hook.",
      durationSeconds: 180,
    },
    {
      title: "Guest answers",
      speaker: "guest",
      content: "Listen for how they describe the trade-off.",
      notes: null,
      durationSeconds: 600,
    },
    {
      title: "Talking points",
      content: "",
      bullets: ["Ad-funded media", "Engagement metrics"],
    },
  ],
  lists: [
    { heading: "Verify before recording", items: ["Confirm the 58% figure"] },
    { heading: "Empty list", items: [] },
  ],
};

describe("Export renderers", () => {
  describe("markdown", () => {
    const md = toMarkdown(DOC);

    it("renders a heading hierarchy with facts and sections", () => {
      expect(md).toContain("# Why Attention Is the Real Currency");
      expect(md).toContain("**Style:** interview");
      expect(md).toContain("## Summary");
      expect(md).toContain("## Cold open");
      expect(md).toContain("- Ad-funded media");
    });

    it("marks a non-host speaker and keeps notes as quotes", () => {
      expect(md).toContain("## Guest answers (guest)");
      // The host is the default voice; labelling it would be noise.
      expect(md).not.toContain("(host)");
      expect(md).toContain("> Pause after the hook.");
    });

    it("omits empty lists rather than leaving a bare heading", () => {
      expect(md).toContain("## Verify before recording");
      expect(md).not.toContain("## Empty list");
    });
  });

  describe("text", () => {
    const txt = toText(DOC);

    it("renders a plain layout with no markup", () => {
      expect(txt).toContain("Why Attention Is the Real Currency");
      expect(txt).toContain("COLD OPEN");
      expect(txt).toContain("  * Ad-funded media");
      expect(txt).not.toContain("**");
      expect(txt).not.toContain("<");
    });
  });

  describe("html", () => {
    const html = toHtml(DOC);

    it("produces a complete printable document", () => {
      expect(html.startsWith("<!doctype html>")).toBe(true);
      expect(html).toContain("<title>Why Attention Is the Real Currency</title>");
      // Print rules are the whole point: this is the PDF route.
      expect(html).toContain("@media print");
      expect(html).toContain("page-break-after: avoid");
    });

    it("escapes content so a title or line cannot inject markup", () => {
      const hostile = toHtml({
        ...DOC,
        title: `Attention & <script>alert("x")</script>`,
        sections: [{ title: "S", content: `<img src=x onerror="alert(1)">` }],
      });

      expect(hostile).not.toContain("<script>alert");
      expect(hostile).not.toContain("<img src=x");
      expect(hostile).toContain("&lt;script&gt;");
      expect(hostile).toContain("Attention &amp;");
    });

    it("splits paragraphs on blank lines", () => {
      const html2 = toHtml({
        ...DOC,
        sections: [{ title: "S", content: "First para.\n\nSecond para." }],
      });
      expect(html2).toContain("<p>First para.</p>");
      expect(html2).toContain("<p>Second para.</p>");
    });
  });

  describe("json", () => {
    it("round-trips the document", () => {
      expect(JSON.parse(toJson(DOC))).toEqual(DOC);
    });
  });

  describe("dispatch and filenames", () => {
    it("renders each format through one entry point", () => {
      expect(render(DOC, "markdown")).toContain("# Why");
      expect(render(DOC, "html")).toContain("<!doctype");
      expect(render(DOC, "txt")).not.toContain("<");
      expect(() => JSON.parse(render(DOC, "json"))).not.toThrow();
    });

    it("builds a safe filename from the title", () => {
      expect(filenameFor("Why Attention Is the Real Currency", "markdown")).toBe(
        "why-attention-is-the-real-currency.md",
      );
      // Punctuation and non-latin titles must not produce a broken filename.
      expect(filenameFor("Ep #3: Attention/Focus!", "txt")).toBe("ep-3-attention-focus.txt");
      expect(filenameFor("توجہ", "html")).toBe("podmind-export.html");
    });

    it("keeps the filename bounded", () => {
      expect(filenameFor("a".repeat(200), "txt").length).toBeLessThanOrEqual(64);
    });
  });
});
