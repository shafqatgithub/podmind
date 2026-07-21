import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { KnowledgeService } from "./knowledge.service";
import {
  CreateDocumentDto,
  ListDocumentsQueryDto,
  SearchKnowledgeDto,
} from "./dto/knowledge.dto";

/** Knowledge Hub API — /api/v1/knowledge */
@Controller("knowledge")
export class KnowledgeController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Whether embeddings are configured, and what each operation costs. */
  @Get("status")
  status() {
    return this.knowledge.status();
  }

  @Get("documents")
  async list(@CurrentUser() user: AuthUser, @Query() query: ListDocumentsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.knowledge.listDocuments(tenant, query.project_id);
  }

  /** Ingest a document. Consumes AI credits. */
  @Post("documents")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.knowledge.createDocument(tenant, dto);
  }

  @Delete("documents/:id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.knowledge.deleteDocument(tenant, id);
  }

  /** Semantic search across the project's documents. Consumes AI credits. */
  @Post("search")
  async search(@CurrentUser() user: AuthUser, @Body() dto: SearchKnowledgeDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.knowledge.search(tenant, dto);
  }
}
