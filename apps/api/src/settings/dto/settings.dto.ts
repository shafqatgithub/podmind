import { IsBoolean, IsIn, IsOptional, IsString, Length } from "class-validator";

export const LANGUAGES = ["en", "ur", "ar", "fr", "de", "es", "it", "pt", "hi", "tr"] as const;
export const TONES = [
  "professional",
  "friendly",
  "formal",
  "casual",
  "humorous",
  "motivational",
  "technical",
] as const;
export const THEMES = ["dark", "light", "system"] as const;
export const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;

/** PATCH /api/v1/settings/profile */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  full_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  job_title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  website?: string;

  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];

  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;
}

/** PATCH /api/v1/settings/preferences */
export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(THEMES)
  theme?: (typeof THEMES)[number];

  @IsOptional()
  @IsIn(AI_PROVIDERS)
  ai_provider?: (typeof AI_PROVIDERS)[number];

  @IsOptional()
  @IsIn(LANGUAGES)
  default_language?: (typeof LANGUAGES)[number];

  @IsOptional()
  @IsIn(TONES)
  writing_tone?: (typeof TONES)[number];

  @IsOptional()
  @IsBoolean()
  auto_save?: boolean;

  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  push_notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing_emails?: boolean;
}

/** PATCH /api/v1/settings/organization */
export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @IsOptional()
  @IsBoolean()
  allow_member_invites?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_public_projects?: boolean;

  @IsOptional()
  @IsIn(LANGUAGES)
  default_language?: (typeof LANGUAGES)[number];

  @IsOptional()
  @IsIn(AI_PROVIDERS)
  default_ai_provider?: (typeof AI_PROVIDERS)[number];
}
