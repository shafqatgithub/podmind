import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

/** Mirrors the live `project_status` enum. */
export enum ProjectStatus {
  DRAFT = "draft",
  RESEARCH = "research",
  OUTLINE = "outline",
  WRITING = "writing",
  REVIEW = "review",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

/** Mirrors the live `project_visibility` enum. */
export enum ProjectVisibility {
  PRIVATE = "private",
  WORKSPACE = "workspace",
  ORGANIZATION = "organization",
  PUBLIC = "public",
}

/** Mirrors the live `language_code` enum. */
export enum LanguageCode {
  EN = "en", UR = "ur", AR = "ar", FR = "fr", DE = "de",
  ES = "es", IT = "it", PT = "pt", HI = "hi", TR = "tr",
}

export class CreateProjectDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsEnum(LanguageCode)
  language?: LanguageCode;

  @IsOptional() @IsString() @Length(0, 120) category?: string;
  @IsOptional() @IsString() @Length(0, 120) niche?: string;
  @IsOptional() @IsString() @Length(0, 500) audience?: string;
  @IsOptional() @IsString() @Length(0, 200) podcast_name?: string;
  /** Hex or token name from the brand palette. */
  @IsOptional() @IsString() @Length(0, 32) color?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @Length(0, 5000) description?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsEnum(ProjectVisibility) visibility?: ProjectVisibility;
  @IsOptional() @IsEnum(LanguageCode) language?: LanguageCode;
  @IsOptional() @IsString() @Length(0, 120) category?: string;
  @IsOptional() @IsString() @Length(0, 120) niche?: string;
  @IsOptional() @IsString() @Length(0, 500) audience?: string;
  @IsOptional() @IsString() @Length(0, 200) podcast_name?: string;
  @IsOptional() @IsString() @Length(0, 32) color?: string;
  @IsOptional() @IsBoolean() is_favorite?: boolean;
  @IsOptional() @IsBoolean() is_archived?: boolean;
}

export class ListProjectsQueryDto {
  @IsOptional() @IsString() @Length(1, 200) search?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @IsOptional() @IsUUID() workspace_id?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  favorites_only?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_archived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional() @IsString() cursor?: string;
}
