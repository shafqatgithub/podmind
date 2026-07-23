import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export const NOTIFICATION_TYPES = [
  "system", "project", "research", "billing", "security", "announcement", "marketing",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const toBool = ({ value }: { value: unknown }) => value === true || value === "true" || value === "1";

export class ListNotificationsQueryDto {
  @IsOptional()
  @IsIn(NOTIFICATION_TYPES)
  type?: NotificationType;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  unread_only?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  limit?: number;
}

/** PATCH /api/v1/notifications/preferences */
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  email_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  push_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  in_app_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  marketing_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(toBool)
  quiet_hours_enabled?: boolean;

  @IsOptional()
  @IsString()
  quiet_start?: string;

  @IsOptional()
  @IsString()
  quiet_end?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
