import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/** Where a planned episode is in the workflow. */
export const CALENDAR_STATUSES = [
  "planned",
  "researching",
  "recording",
  "editing",
  "published",
] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export class CreateEntryDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  topic?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  @IsDateString()
  scheduled_for!: string;

  @IsOptional()
  @IsDateString()
  publish_at?: string;

  @IsOptional()
  @IsUUID()
  guest_id?: string;
}

export class UpdateEntryDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  topic?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  scheduled_for?: string;

  @IsOptional()
  @IsDateString()
  publish_at?: string;

  @IsOptional()
  @IsUUID()
  guest_id?: string;

  @IsOptional()
  @IsIn(CALENDAR_STATUSES)
  status?: CalendarStatus;
}

export class ListEntriesQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  /** Inclusive window; defaults to the current month when omitted. */
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

class PlanItemDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  topic?: string;
}

/**
 * Schedule several episodes at once across a cadence, which is how a
 * podcaster actually plans — a month of slots, not one entry at a time.
 */
export class PlanScheduleDto {
  @IsUUID()
  project_id!: string;

  @IsDateString()
  start_date!: string;

  @IsIn(["weekly", "biweekly", "monthly"])
  cadence!: "weekly" | "biweekly" | "monthly";

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PlanItemDto)
  items!: PlanItemDto[];

  /** Days between recording and publishing, applied to every slot. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  publish_offset_days?: number;
}
