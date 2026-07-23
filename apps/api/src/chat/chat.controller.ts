import {
  Body,
  HttpCode,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
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
  /**
   * Streaming reply — /api/v1/chat/conversations/:id/messages/stream
   *
   * Server-Sent Events rather than WebSockets: the traffic is one-directional
   * and short-lived, so a socket would be machinery without a purpose.
   *
   * The response is written directly instead of returning a value, because
   * the global envelope interceptor would buffer the whole answer and defeat
   * the point of streaming it.
   */
  @Post("conversations/:id/messages/stream")
  @HttpCode(200)
  async streamMessage(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    const tenant = await this.tenancy.resolve(user.id);

    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache, no-transform");
    res.setHeader("connection", "keep-alive");
    // Proxies that buffer would hold the whole answer and deliver it at once.
    res.setHeader("x-accel-buffering", "no");
    res.flushHeaders();

    const send = (payload: unknown) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // If the reader goes away there is no one left to stream to.
    let closed = false;
    res.on("close", () => {
      closed = true;
    });

    try {
      for await (const event of this.chat.streamMessage(tenant, id, dto)) {
        if (closed) break;
        send(event);
      }
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : "The assistant could not reply.",
      });
    } finally {
      if (!closed) res.end();
    }
  }

}
