import { ExportTranslator } from "../src/exports/export.translator";
import type { AiRouterService } from "../src/ai/routing/ai-router.service";
import { filenameFor, toHtml, type ExportDocument } from "../src/exports/export.renderers";

/**
 * Translation must be structure-preserving. A document that comes back with
 * its sections shuffled, its timings translated into words, or half its
 * content missing is worse than one that was never translated — the user
 * would only discover it after publishing.
 */
describe("ExportTranslator", () => {
  const baseDoc = (): ExportDocument => ({
    kind: "script",
    title: "The Attention Economy",
    subtitle: "How focus became a product",
    facts: [
      { label: "Style", value: "Interview" },
      { label: "Length", value: "24 min" },
      { label: "Words", value: "1,847" },
    ],
    sections: [
      { title: "Cold open", speaker: "HOST", content: "Welcome back.", notes: "Warm delivery" },
      { title: "Main", speaker: "GUEST", content: "Attention is finite.", notes: null },
    ],
    lists: [{ heading: "Sources", items: ["Herbert Simon, 1971"] }],
  });

  /** A router that echoes back each value with a marker, as a model would. */
  const fakeRouter = (
    transform: (values: Record<string, string>) => unknown,
    creditsPerCall = 4,
  ) => {
    const calls: string[][] = [];
    const router = {
      route: async ({ messages }: { messages: { role: string; content: string }[] }) => {
        const payload = JSON.parse(messages[messages.length - 1]!.content) as Record<
          string,
          string
        >;
        calls.push(Object.values(payload));
        return { text: JSON.stringify(transform(payload)), creditsSpent: creditsPerCall };
      },
    } as unknown as AiRouterService;
    return { router, calls };
  };

  it("translates every prose string and reports credits", async () => {
    const { router } = fakeRouter((values) =>
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `ES:${v}`])),
    );
    const { doc, creditsSpent } = await new ExportTranslator(router).translate(
      baseDoc(),
      "es",
      "org-1",
    );

    expect(doc.title).toBe("ES:The Attention Economy");
    expect(doc.subtitle).toBe("ES:How focus became a product");
    expect(doc.sections[0]!.content).toBe("ES:Welcome back.");
    expect(doc.sections[0]!.notes).toBe("ES:Warm delivery");
    expect(doc.lists![0]!.items[0]).toBe("ES:Herbert Simon, 1971");
    expect(creditsSpent).toBe(4);
  });

  it("sends unit phrases for translation but leaves bare numbers alone", async () => {
    const { router } = fakeRouter((values) =>
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `ES:${v}`])),
    );
    const { doc } = await new ExportTranslator(router).translate(baseDoc(), "es", "org-1");

    expect(doc.facts[0]!.label).toBe("ES:Style");
    expect(doc.facts[0]!.value).toBe("ES:Interview");
    // "24 min" carries a unit worth translating ("24 minutos"); "1,847" is a
    // bare number with no language in it, so sending it would be pure risk.
    expect(doc.facts[1]!.value).toBe("ES:24 min");
    expect(doc.facts[2]!.value).toBe("1,847");
  });

  it("preserves section order and count", async () => {
    const { router } = fakeRouter((values) =>
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `X:${v}`])),
    );
    const original = baseDoc();
    const { doc } = await new ExportTranslator(router).translate(original, "fr", "org-1");

    expect(doc.sections).toHaveLength(original.sections.length);
    expect(doc.sections[0]!.title).toBe("X:Cold open");
    expect(doc.sections[1]!.title).toBe("X:Main");
  });

  it("keeps the source text when the model returns an unusable shape", async () => {
    const { router } = fakeRouter(() => ({ nonsense: true }));
    const { doc, creditsSpent } = await new ExportTranslator(router).translate(
      baseDoc(),
      "de",
      "org-1",
    );

    // Untranslated but intact, and still charged: the provider call was made.
    expect(doc.title).toBe("The Attention Economy");
    expect(doc.sections[1]!.content).toBe("Attention is finite.");
    expect(creditsSpent).toBe(4);
  });

  it("falls back per string when only some keys come back", async () => {
    const { router } = fakeRouter((values) => ({ "0": `IT:${values["0"]}` }));
    const { doc } = await new ExportTranslator(router).translate(baseDoc(), "it", "org-1");

    expect(doc.title).toBe("IT:The Attention Economy");
    expect(doc.subtitle).toBe("How focus became a product");
  });

  it("batches long documents into several calls", async () => {
    const long = baseDoc();
    long.sections = Array.from({ length: 40 }, (_, i) => ({
      title: `Section ${i}`,
      speaker: "HOST",
      content: "x".repeat(400),
      notes: null,
    }));

    const { router, calls } = fakeRouter((values) =>
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `PT:${v}`])),
    );
    const { doc, creditsSpent } = await new ExportTranslator(router).translate(
      long,
      "pt",
      "org-1",
    );

    expect(calls.length).toBeGreaterThan(1);
    expect(creditsSpent).toBe(4 * calls.length);
    expect(doc.sections).toHaveLength(40);
    expect(doc.sections[39]!.title).toBe("PT:Section 39");
  });

  it("does not mutate the document it was given", async () => {
    const { router } = fakeRouter((values) =>
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, `JA:${v}`])),
    );
    const original = baseDoc();
    await new ExportTranslator(router).translate(original, "ja", "org-1");

    expect(original.title).toBe("The Attention Economy");
    expect(original.sections[0]!.content).toBe("Welcome back.");
  });

  it("skips the provider entirely when there is nothing to translate", async () => {
    const { router, calls } = fakeRouter((v) => v);
    const empty: ExportDocument = { kind: "outline", title: "", facts: [], sections: [] };
    const { creditsSpent } = await new ExportTranslator(router).translate(empty, "ur", "org-1");

    expect(calls).toHaveLength(0);
    expect(creditsSpent).toBe(0);
  });
});

/**
 * Filenames are how a user tells four exports of the same episode apart, so
 * they must carry the title and, when translated, the language — and must
 * survive titles written in any script.
 */
describe("filenameFor", () => {
  it("slugifies the title", () => {
    expect(filenameFor("Fitness Talk Pakistan", "markdown")).toBe("fitness-talk-pakistan.md");
  });

  it("appends the language when translated", () => {
    expect(filenameFor("Fitness Talk Pakistan", "markdown", "ur")).toBe(
      "fitness-talk-pakistan-ur.md",
    );
    expect(filenameFor("Fitness Talk", "html", "pt-BR")).toBe("fitness-talk-pt-br.html");
  });

  it("keeps non-Latin titles instead of erasing them", () => {
    // The old a-z0-9 rule reduced these to nothing, so every Urdu export
    // arrived with the same fallback name.
    expect(filenameFor("فٹنس ٹاک", "markdown")).toBe("فٹنس-ٹاک.md");
    expect(filenameFor("注意経済", "json", "ja")).toBe("注意経済-ja.json");
  });

  it("strips punctuation and keeps numbers", () => {
    expect(filenameFor("Why: attention — became 'the' product!", "markdown")).toBe(
      "why-attention-became-the-product.md",
    );
    expect(filenameFor("Episode 12 — 2026 Review", "markdown")).toBe("episode-12-2026-review.md");
  });

  it("truncates long titles without leaving a trailing separator", () => {
    // Translated titles run long in many languages; the slug is capped and
    // must not end mid-separator.
    const name = filenameFor(`${"a".repeat(58)} bcdefgh`, "markdown");
    expect(name).toBe(`${"a".repeat(58)}-b.md`);
    expect(name).not.toContain("-.");
  });

  it("falls back when a title has nothing usable", () => {
    expect(filenameFor("", "markdown")).toBe("podmind-export.md");
    expect(filenameFor("!!! ???", "markdown", "fr")).toBe("podmind-export-fr.md");
  });
});

/**
 * An Urdu script laid out left to right is close to unreadable, and a heading
 * repeated once per speaker turn buries the structure it is meant to show.
 */
describe("toHtml", () => {
  const doc = (over: Partial<ExportDocument> = {}): ExportDocument => ({
    kind: "script",
    title: "Test",
    facts: [],
    sections: [],
    ...over,
  });

  it("marks right-to-left languages", () => {
    expect(toHtml(doc({ language: "ur" }))).toContain('dir="rtl"');
    expect(toHtml(doc({ language: "ar" }))).toContain('dir="rtl"');
    expect(toHtml(doc({ language: "ps" }))).toContain('dir="rtl"');
  });

  it("leaves left-to-right languages alone", () => {
    expect(toHtml(doc({ language: "en" }))).toContain('dir="ltr"');
    expect(toHtml(doc({ language: "ja" }))).toContain('dir="ltr"');
  });

  it("declares the document language", () => {
    expect(toHtml(doc({ language: "ur" }))).toContain('lang="ur"');
    // No language recorded still produces a valid document.
    expect(toHtml(doc())).toContain('lang="en"');
  });

  it("prints a repeated section heading only once", () => {
    const html = toHtml(
      doc({
        sections: [
          { title: "Intro", content: "a", durationSeconds: 120 },
          { title: "Intro", speaker: "guest", content: "b", durationSeconds: 0 },
          { title: "Intro", speaker: "host", content: "c", durationSeconds: 0 },
        ],
      }),
    );
    expect(html.match(/Intro/g)).toHaveLength(1);
    // A rounded duration of zero is noise, not information.
    expect(html).not.toContain("0 min");
  });
});
