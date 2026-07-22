import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";
import { OUTLINE_STYLES, type OutlineStyle } from "../outline.prompt";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/** POST /api/v1/outlines */
export class CreateOutlineDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(3, 500)
  topic!: string;

  @IsOptional()
  @IsIn(OUTLINE_STYLES)
  style?: OutlineStyle;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  duration_minutes?: number;

  /** Build on an existing research session. */
  @IsOptional()
  @IsUUID()
  research_session_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  guest_name?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

/** GET /api/v1/outlines */
export class ListOutlinesQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}
