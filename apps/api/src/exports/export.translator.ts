import { Injectable, Logger } from "@nestjs/common";
import { languageName } from "@podmind/types";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { ExportDocument } from "./export.renderers";

/**
 * Translate an export document without regenerating it.
 *
 * Re-running the generator in another language produces a *different*
 * episode — new angles, new examples, a different structure — which is the
 * wrong answer for someone who has already approved a script and simply wants
 * it in Spanish. Translating the finished document keeps the work intact and
 * costs a fraction of a fresh generation, because the model is rewriting
 * known text rather than inventing it.
 *
 * The document is flattened into a list of strings, translated, and put back
 * in place, so structure, ordering, timings and speaker turns survive exactly.
 * Non-prose values — durations, word counts — are never sent.
 */

/** Roughly the characters per batch; keeps each call well inside output limits. */
const BATCH_CHARS = 6_000;

/** Never send more than this per batch, however short the strings are. */
const BATCH_ITEMS = 60;

@Injectable()
export class ExportTranslator {
  private readonly logger = new Logger(ExportTranslator.name);

  constructor(private readonly router: AiRouterService) {}

  async translate(
    doc: ExportDocument,
    targetLanguage: string,
    organizationId: string,
  ): Promise<{ doc: ExportDocument; creditsSpent: number }> {
    this.logger.log({ message: "translating export", kind: doc.kind, to: targetLanguage });
    const strings: string[] = [];
    /** Records where each string came from, so it can be written back. */
    const restore: ((value: string) => void)[] = [];

    const collect = (value: string | null | undefined, put: (v: string) => void) => {
      if (typeof value !== "string" || !value.trim()) return;
      strings.push(value);
      restore.push(put);
    };

    // Shallow-clone the parts we mutate; the caller's document stays untouched.
    const next: ExportDocument = {
      ...doc,
      // The rendered document is now in the target language, and the renderer
      // reads this to set text direction.
      language: targetLanguage,
      facts: doc.facts.map((f) => ({ ...f })),
      intro: doc.intro?.map((i) => ({ ...i })),
      sections: doc.sections.map((s) => ({ ...s, bullets: s.bullets ? [...s.bullets] : undefined })),
      lists: doc.lists?.map((l) => ({ ...l, items: [...l.items] })),
    };

    collect(next.title, (v) => (next.title = v));
    collect(next.subtitle, (v) => (next.subtitle = v));

    for (const fact of next.facts) {
      collect(fact.label, (v) => (fact.label = v));
      // Values like "12 min" or "1,847" carry no language; translating them
      // risks turning a number into words.
      if (!/^[\d\s.,:%–-]+$/.test(fact.value)) collect(fact.value, (v) => (fact.value = v));
    }

    for (const block of next.intro ?? []) {
      collect(block.heading, (v) => (block.heading = v));
      collect(block.body, (v) => (block.body = v));
    }

    for (const section of next.sections) {
      collect(section.title, (v) => (section.title = v));
      collect(section.speaker, (v) => (section.speaker = v));
      collect(section.content, (v) => (section.content = v));
      collect(section.notes, (v) => (section.notes = v));
      section.bullets?.forEach((bullet, i) => {
        collect(bullet, (v) => {
          if (section.bullets) section.bullets[i] = v;
        });
      });
    }

    for (const list of next.lists ?? []) {
      collect(list.heading, (v) => (list.heading = v));
      list.items.forEach((item, i) => {
        collect(item, (v) => {
          list.items[i] = v;
        });
      });
    }

    if (strings.length === 0) return { doc: next, creditsSpent: 0 };

    const language = languageName(targetLanguage);
    let creditsSpent = 0;
    let index = 0;

    for (const batch of this.batch(strings)) {
      const translated = await this.translateBatch(batch, language, organizationId);
      creditsSpent += translated.creditsSpent;

      translated.values.forEach((value, i) => {
        const put = restore[index + i];
        if (put && typeof value === "string" && value.trim()) put(value);
      });
      index += batch.length;
    }

    this.logger.log({
      kind: doc.kind,
      language: targetLanguage,
      strings: strings.length,
      credits: creditsSpent,
    });

    return { doc: next, creditsSpent };
  }

  /** Split into batches small enough that a reply cannot be truncated. */
  private *batch(strings: string[]): Generator<string[]> {
    let current: string[] = [];
    let chars = 0;

    for (const value of strings) {
      // A single oversized string still goes alone rather than being dropped.
      if (current.length > 0 && (chars + value.length > BATCH_CHARS || current.length >= BATCH_ITEMS)) {
        yield current;
        current = [];
        chars = 0;
      }
      current.push(value);
      chars += value.length;
    }
    if (current.length > 0) yield current;
  }

  private async translateBatch(
    values: string[],
    language: string,
    organizationId: string,
  ): Promise<{ values: string[]; creditsSpent: number }> {
    const routed = await this.router.route({
      organizationId,
      task: "translation",
      jsonMode: true,
      temperature: 0.2,
      // Translations run longer than their source in most languages; the
      // headroom stops a long section being cut mid-sentence.
      maxTokens: 16_000,
      messages: [
        {
          role: "system",
          content: [
            `You are a professional translator working into ${language}.`,
            "You will receive a JSON object whose keys are numeric indices and",
            "whose values are strings from a podcast document.",
            `Translate every value into ${language}.`,
            "Rules:",
            `- Return a JSON object with exactly the same ${values.length} keys, translated values.`,
            "- Translate meaning and tone, not word for word. The result must read as if written by a native speaker.",
            "- Keep proper nouns, brand names, product names and people's names unchanged.",
            "- Preserve any markdown, punctuation and line breaks exactly as they appear.",
            "- Never merge, split, reorder, add or drop entries.",
            "- If a string is already in the target language, return it unchanged.",
            "- Return only the JSON array, with no commentary or code fences.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify(Object.fromEntries(values.map((v, i) => [String(i), v]))),
        },
      ],
    });

    // Keyed by index rather than a bare array: an object survives the shared
    // JSON extraction, and a missing key degrades to the original string
    // instead of shifting every later entry out of place.
    const parsed = BaseHttpProvider.extractJson(routed.text);
    if (!parsed) {
      this.logger.warn({ message: "translation batch was unparseable; keeping source text" });
      return { values, creditsSpent: routed.creditsSpent };
    }

    return {
      values: values.map((original, i) => {
        const candidate = parsed[String(i)];
        return typeof candidate === "string" && candidate.trim() ? candidate : original;
      }),
      creditsSpent: routed.creditsSpent,
    };
  }
}
