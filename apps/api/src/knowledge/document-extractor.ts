import { BadRequestException, Injectable, Logger } from "@nestjs/common";

/**
 * Turn an uploaded file into plain text.
 *
 * The Knowledge Hub only accepted pasted text, which meant anyone with a PDF
 * of their own research had to open it, select all, and paste — for a
 * fifty-page report that is enough friction to skip the feature entirely.
 *
 * Parsers are loaded on demand rather than at boot: they are heavy, most
 * requests never touch them, and a missing optional dependency should degrade
 * one upload rather than stop the API from starting.
 */

/** Refuse anything larger; the limit is about ingestion cost, not storage. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Below this, a "successful" parse almost certainly found nothing usable. */
const MIN_USEFUL_CHARS = 20;

const PLAIN_TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
]);

@Injectable()
export class DocumentExtractor {
  private readonly logger = new Logger(DocumentExtractor.name);

  async extract(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): Promise<string> {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `That file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB. Split it or paste the part you need.`,
      });
    }

    const name = file.originalname.toLowerCase();
    const text = await this.extractByType(file, name);
    const cleaned = normalise(text);

    if (cleaned.length < MIN_USEFUL_CHARS) {
      throw new BadRequestException({
        code: "NO_TEXT_FOUND",
        message: name.endsWith(".pdf")
          ? "No text could be read from that PDF. Scanned PDFs are images — paste the text instead."
          : "That file didn't contain any readable text.",
      });
    }

    return cleaned;
  }

  private async extractByType(
    file: { buffer: Buffer; mimetype: string },
    name: string,
  ): Promise<string> {
    // Extension first: browsers report inconsistent MIME types, and the name
    // is what the person actually chose.
    if (name.endsWith(".pdf") || file.mimetype === "application/pdf") {
      return this.extractPdf(file.buffer);
    }

    if (
      name.endsWith(".docx") ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return this.extractDocx(file.buffer);
    }

    if (
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".markdown") ||
      name.endsWith(".csv") ||
      name.endsWith(".json") ||
      name.endsWith(".srt") ||
      name.endsWith(".vtt") ||
      PLAIN_TEXT_TYPES.has(file.mimetype)
    ) {
      return file.buffer.toString("utf8");
    }

    if (name.endsWith(".doc")) {
      throw new BadRequestException({
        code: "UNSUPPORTED_FILE",
        message: "Old .doc files aren't supported. Save it as .docx or PDF and try again.",
      });
    }

    throw new BadRequestException({
      code: "UNSUPPORTED_FILE",
      message: "Upload a PDF, Word document, or a text file — or paste the text instead.",
    });
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // pdf-parse v2 is class-based; the v1 call-the-default-export form is
    // gone. The instance holds a worker, so it is always destroyed.
    let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | null =
      null;
    try {
      const { PDFParse } = (await import("pdf-parse")) as unknown as {
        PDFParse: new (options: { data: Buffer }) => {
          getText: () => Promise<{ text: string }>;
          destroy: () => Promise<void>;
        };
      };
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    } catch (err) {
      this.logger.warn({
        message: "pdf extraction failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw new BadRequestException({
        code: "PARSE_FAILED",
        message: "That PDF couldn't be read. It may be encrypted or scanned — paste the text instead.",
      });
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const mammoth = (await import("mammoth")) as {
        extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      this.logger.warn({
        message: "docx extraction failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw new BadRequestException({
        code: "PARSE_FAILED",
        message: "That Word document couldn't be read. Save it as PDF and try again.",
      });
    }
  }
}

/**
 * Tidy extracted text before it is chunked.
 *
 * PDF extraction in particular leaves ragged whitespace and page-break runs;
 * left alone, those become chunk boundaries and split sentences in half,
 * which is exactly the kind of noise that makes retrieval look unreliable.
 */
function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // Soft-hyphenated line breaks from justified PDF text.
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
