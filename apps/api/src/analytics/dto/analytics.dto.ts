import { IsIn, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

/** Windows the dashboard offers. Bounded so a query cannot scan everything. */
export const ANALYTICS_WINDOWS = [7, 30, 90] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

export class AnalyticsQueryDto {
  @IsOptional()
  @IsIn(ANALYTICS_WINDOWS)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  days?: AnalyticsWindow;
}
