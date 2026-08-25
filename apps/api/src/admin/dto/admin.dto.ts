import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class UpsertFlagDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rollout_percentage?: number;
}

export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsString()
  @Length(1, 2000)
  message!: string;

  @IsOptional()
  @IsIn(["info", "warning", "critical"])
  severity?: string;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  ends_at?: string;
}

export class SetActiveDto {
  @IsBoolean()
  is_active!: boolean;
}

export class UpdateTicketDto {
  @IsIn(["open", "pending", "resolved", "closed"])
  status!: string;
}

export class UsageQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  days?: number;
}

export class UsersQueryDto {
  @IsOptional()
  @IsString()
  @Length(0, 200)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  offset?: number;
}

export class SetAccessDto {
  @IsBoolean()
  is_active!: boolean;
}

export class AdjustCreditsDto {
  /** Positive grants credits, negative deducts. Never zero. */
  @IsInt()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class UpdateOrgDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsIn(["free", "starter", "pro", "business", "enterprise"])
  subscription_plan?: string;
}
