import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";
import { SCRIPT_STYLES, SCRIPT_TONES, type ScriptStyle, type ScriptTone } from "../script.prompt";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";
import { OUTPUT_LANGUAGES } from "@podmind/types";

/** POST /api/v1/scripts */
export class CreateScriptDto {
  @IsUUID()
  project_id!: string;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  topic?: string;

  /** Write from an existing outline — the documented path. */
  @IsOptional()
  @IsUUID()
  outline_id?: string;

  @IsOptional()
  @IsIn(SCRIPT_STYLES)
  style?: ScriptStyle;

  @IsOptional()
  @IsIn(SCRIPT_TONES)
  tone?: ScriptTone;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  guest_name?: string;

  /**
   * Output language. Defaults to the source outline's language, then the
   * project's — writing a script in a language the outline is not in produces
   * a document that is half one language and half the other.
   */
  @IsOptional()
  @IsIn(OUTPUT_LANGUAGES.map((l) => l.code))
  language?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

/** GET /api/v1/scripts */
export class ListScriptsQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}
