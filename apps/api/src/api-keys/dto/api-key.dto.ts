import { IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

/** Scopes a key may be granted. Mirrors the documented Public API surface. */
export const API_SCOPES = [
  "projects:read", "projects:write",
  "research:read", "research:write",
  "scripts:read", "scripts:write",
  "guests:read", "guests:write",
  "seo:read", "seo:write",
  "analytics:read",
  "exports:read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export class CreateApiKeyDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsOptional()
  @IsArray()
  @IsIn(API_SCOPES, { each: true })
  permissions?: ApiScope[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rate_limit_per_minute?: number;

  /** Days until the key expires; omitted means it does not expire. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  expires_in_days?: number;
}
