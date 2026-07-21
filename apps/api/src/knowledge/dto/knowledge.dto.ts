import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

/** POST /api/v1/knowledge/documents — ingest pasted text. */
export class CreateDocumentDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(1, 300)
  title!: string;

  @IsString()
  @Length(20, 500000)
  content!: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  source_url?: string;
}

/** GET /api/v1/knowledge/documents?project_id= */
export class ListDocumentsQueryDto {
  @IsUUID()
  project_id!: string;
}

/** POST /api/v1/knowledge/search */
export class SearchKnowledgeDto {
  @IsUUID()
  project_id!: string;

  @IsString()
  @Length(2, 1000)
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  limit?: number;
}
