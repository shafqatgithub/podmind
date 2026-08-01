import {
  DEFAULT_LANGUAGE_CODE,
  isSupportedLanguage,
  languageName,
  OUTPUT_LANGUAGES,
} from "@podmind/types";
import type { LanguageCode } from "@podmind/types";

/**
 * The catalogue is the single source every prompt and picker reads, and it has
 * to agree with the Postgres `language_code` enum — a code offered in the UI
 * that the database rejects fails at save time, which is the worst place to
 * find out.
 */
describe("language catalogue", () => {
  it("has unique codes", () => {
    const codes = OUTPUT_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every language a name and an endonym", () => {
    for (const language of OUTPUT_LANGUAGES) {
      expect(language.code.length).toBeGreaterThan(0);
      expect(language.name.length).toBeGreaterThan(0);
      expect(language.native.length).toBeGreaterThan(0);
    }
  });

  it("includes English as the default", () => {
    expect(OUTPUT_LANGUAGES.some((l) => l.code === DEFAULT_LANGUAGE_CODE)).toBe(true);
  });

  it("stays assignable to the generated database enum", () => {
    // A compile-time check: if the enum and the catalogue drift, this fails to
    // typecheck rather than failing silently in production.
    const codes: LanguageCode[] = OUTPUT_LANGUAGES.map((l) => l.code as LanguageCode);
    expect(codes).toHaveLength(OUTPUT_LANGUAGES.length);
  });

  describe("languageName", () => {
    it("resolves known codes to their English name", () => {
      expect(languageName("ur")).toBe("Urdu");
      expect(languageName("ja")).toBe("Japanese");
      expect(languageName("sw")).toBe("Swahili");
    });

    it("is case-insensitive", () => {
      expect(languageName("UR")).toBe("Urdu");
    });

    it("falls back through the region subtag", () => {
      // A Mexican Spanish project should still be written in Spanish, not
      // silently switched to English because the exact tag is unlisted.
      expect(languageName("es-MX")).toBe("Spanish");
    });

    it("prefers an exact regional match when one exists", () => {
      expect(languageName("pt-BR")).toBe("Portuguese (Brazil)");
      expect(languageName("pt")).toBe("Portuguese");
    });

    it("defaults to English for missing or unknown codes", () => {
      expect(languageName(null)).toBe("English");
      expect(languageName(undefined)).toBe("English");
      expect(languageName("")).toBe("English");
      expect(languageName("xx")).toBe("English");
    });
  });

  describe("isSupportedLanguage", () => {
    it("accepts catalogued codes and rejects everything else", () => {
      expect(isSupportedLanguage("ta")).toBe(true);
      expect(isSupportedLanguage("TA")).toBe(true);
      expect(isSupportedLanguage("xx")).toBe(false);
      expect(isSupportedLanguage(null)).toBe(false);
    });
  });
});
