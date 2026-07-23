import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export const MEMORY_TYPES = [
  "fact", "preference", "context", "instruction", "summary", "insight",
] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

/** POST /api/v1/memory */
export class CreateMemoryDto {
  @IsIn(MEMORY_TYPES)
  memory_type!: MemoryType;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 5000)
  content!: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  /** 1 (background) to 10 (always apply). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  importance?: number;
}

export class UpdateMemoryDto {
  @IsOptional()
  @IsIn(MEMORY_TYPES)
  memory_type?: MemoryType;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  importance?: number;
}

export class ListMemoryQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsIn(MEMORY_TYPES)
  memory_type?: MemoryType;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === "true" || value === "1")
  include_expired?: boolean;
}
