import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { OUTPUT_LANGUAGES } from "@podmind/types";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/**
 * Steps the orchestrator can run, in the only order that makes sense:
 * each one consumes what the previous produced.
 */
export const PIPELINE_STEPS = ["research", "outline", "script", "seo", "social"] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export class CreateRunDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(3, 500)
  topic!: string;

  /** Which steps to run. Order is fixed by the pipeline, not by this array. */
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PIPELINE_STEPS, { each: true })
  steps!: PipelineStep[];

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  duration_minutes?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  guest_name?: string;

  /**
   * Output language for the whole run. Defaults to the project's.
   *
   * Set here rather than per step: a pipeline that researched in Urdu and
   * wrote the script in English would produce an episode nobody can use.
   */
  @IsOptional()
  @IsIn(OUTPUT_LANGUAGES.map((l) => l.code))
  language?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

export class ListRunsQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
