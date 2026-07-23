import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";
import { SELECTABLE_PROVIDERS, type SelectableProvider } from "../../research/dto/research.dto";

/** POST /api/v1/guests — research a person and save the briefing. */
export class CreateGuestDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(2, 200)
  full_name!: string;

  /** Disambiguating hints: company, role, a profile URL. */
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  context?: string;

  @IsOptional()
  @IsIn(SELECTABLE_PROVIDERS)
  provider?: SelectableProvider;
}

/** POST /api/v1/guests/manual — add a guest without an AI run. */
export class CreateGuestManualDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(2, 200)
  full_name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 300)
  headline?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  job_title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 320)
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  website_url?: string;
}

export class ListGuestsQueryDto {
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  limit?: number;
}

/** POST /api/v1/guests/:id/notes */
export class CreateGuestNoteDto {
  @IsString()
  @Length(1, 5000)
  note!: string;
}
