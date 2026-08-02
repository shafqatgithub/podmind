import { IsIn, IsOptional } from "class-validator";
import { OUTPUT_LANGUAGES } from "@podmind/types";
import { EXPORT_FORMATS, type ExportFormat } from "../export.renderers";

export class ExportQueryDto {
  @IsIn(EXPORT_FORMATS)
  format!: ExportFormat;

  /**
   * Translate the document into this language before rendering.
   *
   * Omit it to export exactly what is stored. Supplying it costs credits,
   * because translating is an AI call — so it is opt-in rather than a default
   * derived from the project's language.
   */
  @IsOptional()
  @IsIn(OUTPUT_LANGUAGES.map((l) => l.code))
  language?: string;
}
