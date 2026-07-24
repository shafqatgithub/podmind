import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/** POST /api/v1/topics/discover */
export class DiscoverTopicsDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(2, 300)
  niche!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  audience?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  country?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

export class ListDiscoveriesQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}

/** PATCH /api/v1/topics/:id — save or unsave a discovered topic. */
export class SaveTopicDto {
  @IsBoolean()
  is_saved!: boolean;
}
