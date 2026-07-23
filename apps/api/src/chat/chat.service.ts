import { Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import type { AiMessage } from "../ai/providers/provider.types";
import type { TenantContext } from "../tenancy/tenancy.service";
import { ChatRepository, type ConversationRow } from "./chat.repository";
import { KnowledgeService } from "../knowledge/knowledge.service";
import type {
  CreateConversationDto,
  ListConversationsQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from "./dto/chat.dto";

/**
 * How much prior conversation is replayed to the model. Chat is the cheapest
 * task in the catalogue, so the window is generous but bounded — an
 * unbounded history would grow cost and latency without bound.
 */
const HISTORY_TURNS = 20;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly repository: ChatRepository,
    private readonly router: AiRouterService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async createConversation(tenant: TenantContext, dto: CreateConversationDto) {
    if (dto.project_id) {
      await this.repository.assertProjectInTenant(tenant, dto.project_id);
    }
    return this.repository.createConversation(tenant, {
      projectId: dto.project_id ?? null,
      title: dto.title?.trim() || "New conversation",
    });
  }

  async listConversations(tenant: TenantContext, query: ListConversationsQueryDto) {
    const page = await this.repository.listConversations(tenant, query);
    return { items: page.items, next_cursor: page.nextCursor, has_more: page.hasMore };
  }

  async getConversation(tenant: TenantContext, id: string) {
    const conversation = await this.repository.findConversation(tenant, id);
    const messages = await this.repository.findMessages(id);
    return { ...conversation, messages };
  }

  async updateConversation(tenant: TenantContext, id: string, dto: UpdateConversationDto) {
    return this.repository.updateConversation(tenant, id, dto);
  }

  async deleteConversation(tenant: TenantContext, id: string) {
    await this.repository.deleteConversation(tenant, id);
    return { deleted: true };
  }

  /**
   * Send a turn and get the assistant's reply.
   *
   * The user message is stored first so the turn survives a failure, then
   * removed if no reply could be produced — the alternative is a conversation
   * containing a question that was never answered and never will be.
   */
  async sendMessage(tenant: TenantContext, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.repository.findConversation(tenant, conversationId);
    const history = await this.repository.findMessages(conversationId);

    const userMessage = await this.repository.addUserMessage(conversationId, dto.content);

    let routed;
    const startedAt = Date.now();
    try {
      routed = await this.router.route({
        organizationId: tenant.organizationId,
        task: "chat",
        messages: await this.buildMessages(tenant, conversation, history, dto.content),
        projectId: conversation.project_id,
        conversationId,
        maxTokens: 4000,
        temperature: 0.7,
        preferredProvider: dto.provider ?? null,
      });
    } catch (err) {
      await this.repository.deleteMessage(userMessage.id);
      throw err;
    }

    const assistantMessage = await this.repository.addAssistantMessage({
      conversationId,
      content: routed.text,
      provider: routed.provider,
      model: routed.model,
      promptTokens: routed.promptTokens,
      completionTokens: routed.completionTokens,
      estimatedCost: routed.estimatedCost,
      responseTimeMs: Date.now() - startedAt,
      parentMessageId: userMessage.id,
    });

    // Name the conversation from its first exchange, so the sidebar is
    // readable without asking the user to title anything.
    if (history.length === 0) {
      await this.repository.setTitle(conversationId, deriveTitle(dto.content));
    }

    return {
      user_message: userMessage,
      assistant_message: assistantMessage,
      credits_spent: routed.creditsSpent,
      provider: routed.provider,
      model: routed.model,
    };
  }


  /**
   * Streaming variant of sendMessage.
   *
   * Persistence happens after the stream closes rather than before, because
   * only then is the final text known. The user turn is still written first
   * so the conversation reads correctly if the connection drops mid-answer,
   * and it is removed if the stream fails before producing anything.
   */
  async *streamMessage(tenant: TenantContext, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.repository.findConversation(tenant, conversationId);
    const history = await this.repository.findMessages(conversationId);
    const userMessage = await this.repository.addUserMessage(conversationId, dto.content);

    const startedAt = Date.now();
    let text = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let model = "";
    let provider: string | null = null;

    try {
      const messages = await this.buildMessages(tenant, conversation, history, dto.content);

      for await (const event of this.router.routeStream({
        organizationId: tenant.organizationId,
        task: "chat",
        messages,
        projectId: conversation.project_id,
        conversationId,
        maxTokens: 4000,
        temperature: 0.7,
        preferredProvider: dto.provider ?? null,
      })) {
        if (event.type === "delta") {
          text += event.text;
          yield { type: "delta" as const, text: event.text };
        } else {
          promptTokens = event.promptTokens;
          completionTokens = event.completionTokens;
          model = event.model || model;
          provider = event.provider ?? provider;
        }
      }
    } catch (err) {
      // Nothing was delivered, so the user turn would sit alone with no reply.
      await this.repository.deleteMessage(userMessage.id);
      yield {
        type: "error" as const,
        message: err instanceof Error ? err.message : "The assistant could not reply.",
      };
      return;
    }

    const assistantMessage = await this.repository.addAssistantMessage({
      conversationId,
      content: text,
      // ai_messages.ai_provider is an enum column, so this must be the real
      // provider the Router used — never a placeholder.
      provider: provider ?? "openai",
      model,
      promptTokens,
      completionTokens,
      estimatedCost: 0,
      responseTimeMs: Date.now() - startedAt,
      parentMessageId: userMessage.id,
    });

    if (history.length === 0) {
      await this.repository.setTitle(conversationId, deriveTitle(dto.content));
    }

    yield {
      type: "done" as const,
      user_message_id: userMessage.id,
      assistant_message_id: assistantMessage.id,
      model,
    };
  }

  /**
   * Assemble the model input: system prompt with project context and
   * long-term memories, then the recent turns, then the new message.
   */
  private async buildMessages(
    tenant: TenantContext,
    conversation: ConversationRow,
    history: { role: string; content: string }[],
    newMessage: string,
  ): Promise<AiMessage[]> {
    const parts: string[] = [
      "You are PodMind AI, a podcast research and production assistant.",
      "Answer in Markdown. Be specific and practical — the person you are helping is preparing real episodes.",
      "Never invent statistics, sources or quotations. If you are unsure, say so plainly.",
    ];

    if (conversation.project_id) {
      const project = await this.repository.assertProjectInTenant(
        tenant,
        conversation.project_id,
      );
      const context = [
        `Project: ${project.title}`,
        project.podcast_name ? `Podcast: ${project.podcast_name}` : null,
        project.niche ? `Niche: ${project.niche}` : null,
        project.audience ? `Audience: ${project.audience}` : null,
        project.description ? `About: ${project.description}` : null,
      ].filter(Boolean);
      if (context.length) parts.push("Current project context:", ...context.map((c) => `- ${c}`));

      const research = await this.repository.findRecentResearch(conversation.project_id);
      if (research.length) {
        parts.push(
          "Research already completed for this project (reference it when relevant):",
          ...research.map((r) => `- ${r.title}${r.summary ? `: ${r.summary}` : ""}`),
        );
      }
    }

    // Retrieval-augmented: the most relevant passages from the user's own
    // uploaded documents, selected by the question being asked. Retrieval
    // never fails the turn — without embeddings configured it returns
    // nothing and the assistant answers from context alone.
    if (conversation.project_id) {
      const passages = await this.knowledge.retrieveForContext(
        tenant,
        conversation.project_id,
        newMessage,
      );
      if (passages.length) {
        parts.push(
          "Relevant passages from the user's own documents. Prefer these over general knowledge, and cite the document title when you use one:",
          ...passages.map((p) => `- [${p.document_title}] ${p.chunk_text}`),
        );
      }
    }

    const memories = await this.repository.findMemories(
      tenant,
      conversation.project_id,
    );
    if (memories.length) {
      parts.push(
        "What you remember about this user:",
        ...memories.map((m) => `- ${m.title ? `${m.title}: ` : ""}${m.content}`),
      );
    }

    const recent = history.slice(-HISTORY_TURNS);
    return [
      { role: "system", content: parts.join("\n") },
      ...recent.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user", content: newMessage },
    ];
  }
}

/** First line of the opening message, trimmed to a readable title. */
function deriveTitle(message: string): string {
  const firstLine = message.trim().split("\n")[0] ?? message.trim();
  const clean = firstLine.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "New conversation";
}
