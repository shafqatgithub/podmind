import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "../social.prompt";
import { OUTPUT_LANGUAGES } from "@podmind/types";

export const TONES = [
  "professional", "friendly", "formal", "casual", "humorous", "motivational", "technical",
] as const;

/** POST /api/v1/social — generate a campaign of posts. */
export class CreateSocialDto {
  @IsUUID()
  project_id!: string;

  @IsOptional()
  @IsUUID()
  script_id?: string;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  topic?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(SOCIAL_PLATFORMS, { each: true })
  platforms!: SocialPlatform[];

  @IsOptional()
  @IsIn(TONES)
  tone?: (typeof TONES)[number];

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;

  /** Defaults to the source script's language, then the project's. */
  @IsOptional()
  @IsIn(OUTPUT_LANGUAGES.map((l) => l.code))
  language?: string;
}

export class ListSocialQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;
}
