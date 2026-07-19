import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export const RESEARCH_DEPTHS = ["quick", "standard", "deep"] as const;
export type ResearchDepthValue = (typeof RESEARCH_DEPTHS)[number];

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === "true" || value === "1";

/** POST /api/v1/research — start a research session. */
export class CreateResearchDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(3, 500)
  topic!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  objective?: string;

  @IsOptional()
  @IsIn(RESEARCH_DEPTHS)
  depth?: ResearchDepthValue;
}

/** GET /api/v1/research — list sessions. */
export class ListResearchQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @IsOptional()
  @IsIn(RESEARCH_DEPTHS)
  depth?: ResearchDepthValue;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  limit?: number;
}

/** POST /api/v1/research/:id/questions — ask a follow-up question. */
export class AskFollowUpDto {
  @IsString()
  @Length(3, 1000)
  question!: string;
}

/** PATCH /api/v1/research/:id */
export class UpdateResearchDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  is_archived?: boolean;
}
