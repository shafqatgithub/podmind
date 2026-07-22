import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/**
 * POST /api/v1/fact-checks
 *
 * Exactly one source: a script, a research session, or pasted text.
 */
export class CreateFactCheckDto {
  @IsUUID()
  project_id!: string;

  @IsOptional()
  @IsUUID()
  script_id?: string;

  @IsOptional()
  @IsUUID()
  research_session_id?: string;

  @IsOptional()
  @IsString()
  @Length(50, 100000)
  text?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

export class ListFactChecksQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}
