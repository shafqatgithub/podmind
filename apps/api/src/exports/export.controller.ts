import { Controller, Get, Header, Param, ParseUUIDPipe, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ExportService } from "./export.service";
import { ExportQueryDto } from "./dto/export.dto";
import { EXPORT_FORMATS } from "./export.renderers";

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
    this.send(res, await this.exports.exportScript(tenant, id, query.format));
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
    this.send(res, await this.exports.exportOutline(tenant, id, query.format));
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
    this.send(res, await this.exports.exportResearch(tenant, id, query.format));
  }

  private send(
    res: Response,
    file: { filename: string; mime: string; content: string },
  ): void {
    res
      .status(200)
      .setHeader("content-type", file.mime)
      // Quote the filename: titles legitimately contain spaces and commas.
      .setHeader("content-disposition", `attachment; filename="${file.filename}"`)
      .send(file.content);
  }
}
