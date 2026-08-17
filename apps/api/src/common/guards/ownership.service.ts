import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import type { OrganizationRole } from "../../tenancy/tenancy.service";

/**
 * "You can change your own work; managers can change everyone's."
 *
 * The roles promised this and nothing enforced it, so a member could delete a
 * manager's script. Enforcing it needs the one thing a role check alone
 * cannot know: who made the record.
 *
 * The lookup lives here rather than in each repository. Spreading it would
 * mean fifteen near-identical checks, and the one that gets forgotten during
 * the next feature is the one that matters — a single table of routes can at
 * least be read in full and audited.
 *
 * Everything is keyed off the URL because that is what a guard sees. Any
 * route not listed is simply not scoped, which is the safe direction to fail:
 * a missing entry means the ordinary role rules still apply.
 */

/** Roles that may change anyone's work. */
const CAN_EDIT_ANY: OrganizationRole[] = ["owner", "admin", "manager"];

interface ScopedResource {
  table: string;
  /** Column holding the creator. Not consistent across the schema. */
  ownerColumn: string;
}

/**
 * URL segment to table. The first path segment after the version prefix
 * identifies the resource; nested paths (`knowledge/documents`) use both.
 */
const RESOURCES: Record<string, ScopedResource> = {
  projects: { table: "projects", ownerColumn: "owner_id" },
  research: { table: "research_sessions", ownerColumn: "created_by" },
  outlines: { table: "outlines", ownerColumn: "created_by" },
  scripts: { table: "scripts", ownerColumn: "created_by" },
  seo: { table: "seo_projects", ownerColumn: "created_by" },
  social: { table: "social_campaigns", ownerColumn: "created_by" },
  topics: { table: "topic_discoveries", ownerColumn: "created_by" },
  guests: { table: "guests", ownerColumn: "created_by" },
  "fact-checks": { table: "fact_checks", ownerColumn: "created_by" },
  calendar: { table: "content_calendar", ownerColumn: "created_by" },
  // knowledge_documents records no creator, so it cannot be scoped by one.
  // Left out deliberately rather than guessed at: a wrong column would throw
  // on every request to it.
  "chat/conversations": { table: "ai_conversations", ownerColumn: "user_id" },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class OwnershipService {
  private readonly logger = new Logger(OwnershipService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Refuse a change to someone else's record.
   *
   * Silent for roles that may edit anything, for routes with no record in
   * them (creating something new), and for resources not in the table above.
   */
  async assertCanModify(input: {
    path: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<void> {
    if (CAN_EDIT_ANY.includes(input.role)) return;

    const target = this.resolve(input.path);
    if (!target) return;

    const { rows } = await this.pool.query<{ owner: string | null }>(
      `select ${target.resource.ownerColumn} as owner
         from public.${target.resource.table} where id = $1`,
      [target.id],
    );

    const owner = rows[0]?.owner;
    // No row means the handler will return its own 404, which is a better
    // answer than a permission error about something that does not exist.
    if (owner === undefined) return;

    if (owner !== input.userId) {
      this.logger.warn(
        { user: input.userId, role: input.role, path: input.path },
        "blocked change to another member's record",
      );
      throw new ForbiddenException({
        code: "NOT_YOUR_RECORD",
        message:
          "This was created by someone else in your organization. Members can only change their own work — ask a manager, admin or owner.",
      });
    }
  }

  /** Pull the resource and record id out of a request path. */
  private resolve(path: string): { resource: ScopedResource; id: string } | null {
    const clean = path.split("?")[0] ?? "";
    const segments = clean.split("/").filter(Boolean);

    // Drop the `api/v1` prefix so the resource is always first.
    const start = segments.findIndex((s) => /^v\d+$/.test(s));
    const parts = start >= 0 ? segments.slice(start + 1) : segments;
    if (parts.length < 2) return null;

    // Two-segment resources first: "knowledge/documents/:id" must not be read
    // as the resource "knowledge".
    const nested = `${parts[0]}/${parts[1]}`;
    if (RESOURCES[nested] && parts[2] && UUID.test(parts[2])) {
      return { resource: RESOURCES[nested]!, id: parts[2] };
    }

    const resource = RESOURCES[parts[0]!];
    if (resource && parts[1] && UUID.test(parts[1])) {
      return { resource, id: parts[1] };
    }

    return null;
  }
}
