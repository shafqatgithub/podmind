import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { KnowledgeService } from "./knowledge.service";
import { DocumentExtractor, MAX_UPLOAD_BYTES } from "./document-extractor";

/**
 * The subset of Multer's file shape this endpoint uses.
 *
 * Declared here rather than pulling in the global Express.Multer namespace,
 * which needs an ambient type reference that has to be kept in step with the
 * build — four fields are not worth that.
 */
interface UploadedDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
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
    private readonly extractor: DocumentExtractor,
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

  /**
   * Upload a file instead of pasting.
   *
   * Text is extracted here and handed to the same ingestion path, so an
   * uploaded PDF and pasted text end up identical downstream — one chunking
   * and embedding route to maintain, and one behaviour to reason about.
   */
  @Post("documents/upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedDocument | undefined,
    @Body() body: { project_id?: string; title?: string },
  ) {
    if (!file) {
      throw new BadRequestException({ code: "INVALID_REQUEST", message: "No file was uploaded" });
    }
    if (!body.project_id) {
      throw new BadRequestException({ code: "INVALID_REQUEST", message: "project_id is required" });
    }

    const tenant = await this.tenancy.resolve(user.id);
    const content = await this.extractor.extract(file);

    return this.knowledge.createDocument(tenant, {
      project_id: body.project_id,
      // The filename is a better default title than anything derived from the
      // text, and the host can rename it later.
      title: (body.title?.trim() || file.originalname.replace(/\.[^.]+$/, "")).slice(0, 300),
      content,
    });
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
