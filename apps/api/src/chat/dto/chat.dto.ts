import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === "true" || value === "1";

/** POST /api/v1/chat/conversations */
export class CreateConversationDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;
}

/** POST /api/v1/chat/conversations/:id/messages */
export class SendMessageDto {
  @IsString()
  @Length(1, 20000)
  content!: string;

  /** Preferred provider, hoisted in the route plan (fallback still applies). */
  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

/** GET /api/v1/chat/conversations */
export class ListConversationsQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  include_archived?: boolean;

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

/** PATCH /api/v1/chat/conversations/:id */
export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  is_pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(toBoolean)
  is_archived?: boolean;
}
