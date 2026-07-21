import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ChatService } from "./chat.service";
import {
  CreateConversationDto,
  ListConversationsQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from "./dto/chat.dto";

/** AI Chat API — /api/v1/chat */
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post("conversations")
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateConversationDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.createConversation(tenant, dto);
  }

  @Get("conversations")
  async list(@CurrentUser() user: AuthUser, @Query() query: ListConversationsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.listConversations(tenant, query);
  }

  @Get("conversations/:id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.getConversation(tenant, id);
  }

  @Patch("conversations/:id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.updateConversation(tenant, id, dto);
  }

  @Delete("conversations/:id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.deleteConversation(tenant, id);
  }

  /** Send a turn. Consumes AI credits. */
  @Post("conversations/:id/messages")
  async send(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.chat.sendMessage(tenant, id, dto);
  }
}
