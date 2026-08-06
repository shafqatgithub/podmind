import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ExportService } from "./export.service";
import { ExportQueryDto } from "./dto/export.dto";
import { EXPORT_FORMATS } from "./export.renderers";

/**
 * Build a Content-Disposition value that survives non-Latin filenames.
 *
 * HTTP header values are effectively ASCII, so an Urdu or Japanese filename
 * cannot be sent as-is — it arrives mangled, or Node rejects it outright.
 * RFC 6266 answers this with two parameters: a plain `filename` that old
 * clients understand, and a percent-encoded `filename*` that modern browsers
 * prefer. Sending both means every client saves something sensible, and
 * current ones save the real name.
 */
function contentDisposition(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : "";

  // Sanitise the stem only — stripping the whole name would take the
  // extension with it and hand the user a file their OS cannot open.
  const stripped = stem
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "")
    .replace(/^[-.\s]+|[-.\s]+$/g, "");

  // A stem reduced to a fragment ("ja" from an Urdu title plus its language
  // suffix) is not a name anyone can act on, so it gets a recognisable prefix
  // rather than standing alone.
  const safeStem = stripped.length >= 3 ? stripped : `podmind-export${stripped ? `-${stripped}` : ""}`;

  return `attachment; filename="${safeStem}${extension}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Export Center — /api/v1/exports
 *
 * These endpoints return the file itself rather than the usual envelope: a
 * download is the response body, and wrapping it would force the browser to
 * unwrap before saving.
 */
@Controller("exports")
export class ExportController {
  constructor(
    private readonly exports: ExportService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get("formats")
  formats() {
    return { formats: EXPORT_FORMATS };
  }

  @Get("scripts/:id")
  @Header("cache-control", "no-store")
  async script(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportScript(tenant, id, query.format, query.language));
  }

  @Get("outlines/:id")
  @Header("cache-control", "no-store")
  async outline(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportOutline(tenant, id, query.format, query.language));
  }

  @Get("seo/:id")
  @Header("cache-control", "no-store")
  async seo(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportSeo(tenant, id, query.format, query.language));
  }

  @Get("social/:id")
  @Header("cache-control", "no-store")
  async social(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportSocial(tenant, id, query.format, query.language));
  }

  @Get("topics/:id")
  @Header("cache-control", "no-store")
  async topics(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportTopics(tenant, id, query.format, query.language));
  }

  @Get("research/:id")
  @Header("cache-control", "no-store")
  async research(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    this.send(res, await this.exports.exportResearch(tenant, id, query.format, query.language));
  }

  private send(
    res: Response,
    file: { filename: string; mime: string; content: string },
  ): void {
    res
      .status(200)
      .setHeader("content-type", file.mime)
      .setHeader("content-disposition", contentDisposition(file.filename))
      .send(file.content);
  }
}
