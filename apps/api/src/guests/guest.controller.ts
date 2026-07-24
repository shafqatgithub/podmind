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
import { GuestService } from "./guest.service";
import {
  CreateGuestDto,
  CreateGuestManualDto,
  CreateGuestNoteDto,
  DiscoverGuestsDto,
  ListGuestsQueryDto,
  ListSuggestionsQueryDto,
  PromoteSuggestionDto,
} from "./dto/guest.dto";

/** Guest Intelligence — /api/v1/guests */
@Controller("guests")
export class GuestController {
  constructor(
    private readonly guests: GuestService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Research a person with AI. Consumes credits. */
  @Post()
  async research(@CurrentUser() user: AuthUser, @Body() dto: CreateGuestDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.research(tenant, dto);
  }

  /** Whether discovery can run, so the UI can explain why not. */
  @Get("discovery-status")
  status() {
    return { search_available: this.guests.searchAvailable() };
  }

  /** Find candidate guests for a topic. Leads, not full briefings. */
  @Post("discover")
  async discover(@CurrentUser() user: AuthUser, @Body() dto: DiscoverGuestsDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.discover(tenant, dto);
  }

  @Get("suggestions")
  async listSuggestions(
    @CurrentUser() user: AuthUser,
    @Query() query: ListSuggestionsQueryDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.listSuggestions(tenant, query.project_id, query.topic);
  }

  /** Turn a lead into a full briefing. Consumes credits. */
  @Post("suggestions/:id/promote")
  async promote(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PromoteSuggestionDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.promote(tenant, id, dto.provider);
  }

  /** Add a guest by hand — no AI, no credits. */
  @Post("manual")
  async createManual(@CurrentUser() user: AuthUser, @Body() dto: CreateGuestManualDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.createManual(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListGuestsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.list(tenant, query);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.findOne(tenant, id);
  }

  @Post(":id/notes")
  async addNote(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateGuestNoteDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.addNote(tenant, id, dto.note);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.guests.remove(tenant, id);
  }
}
