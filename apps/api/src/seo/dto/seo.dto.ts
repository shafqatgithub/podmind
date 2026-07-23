import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/** POST /api/v1/seo — generate metadata for an episode. */
export class CreateSeoDto {
  @IsUUID()
  project_id!: string;

  /** Optional script to describe; otherwise the topic alone is used. */
  @IsOptional()
  @IsUUID()
  script_id?: string;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  topic?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  target_keyword?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  target_country?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

export class ListSeoQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}

/** PATCH /api/v1/seo/:id/selection — pick the title/description to publish. */
export class SelectSeoDto {
  @IsOptional()
  @IsUUID()
  title_id?: string;

  @IsOptional()
  @IsUUID()
  description_id?: string;
}
