import { HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";

/** 402 with the documented error code so clients can open the top-up flow. */
export class InsufficientCreditsException extends HttpException {
  constructor(required: number, available: number) {
    super(
      {
        code: "INSUFFICIENT_CREDITS",
        message: "Not enough AI credits for this request",
        details: { required, available },
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * AI credit metering against the live schema:
 *   ai_credit_balances      — cached balance per organization
 *   ai_credit_transactions  — append-only ledger
 *
 * Balance arithmetic is owned by the database: the documented trigger
 * `update_ai_credit_usage` applies every 'usage' row to the balance, so this
 * service inserts a positive-amount ledger entry and never touches
 * `available_credits` itself for spends (doing both would double-apply).
 *
 * Consumption still locks the balance row (`FOR UPDATE`) inside the same
 * transaction, so concurrent requests cannot read a stale balance and
 * double-spend.
 */
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getBalance(organizationId: string): Promise<number> {
    const { rows } = await this.pool.query<{ available_credits: number }>(
      `select available_credits from public.ai_credit_balances where organization_id = $1`,
      [organizationId],
    );
    return rows[0]?.available_credits ?? 0;
  }

  /**
   * Atomically spend credits. Returns the ledger transaction id so a failed
   * AI call can be refunded against it.
   */
  async consume(
    organizationId: string,
    amount: number,
    description: string,
    /** Optional `ai_requests.id` this spend belongs to (FK). */
    relatedRequest?: string,
  ): Promise<string> {
    if (amount <= 0) throw new Error("consume() requires a positive amount");

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<{ available_credits: number }>(
        `select available_credits
           from public.ai_credit_balances
          where organization_id = $1
          for update`,
        [organizationId],
      );

      const available = rows[0]?.available_credits ?? 0;
      if (available < amount) {
        await client.query("rollback");
        throw new InsufficientCreditsException(amount, available);
      }

      // Positive amount + type 'usage': the trigger debits the balance.
      const { rows: tx } = await client.query<{ id: string }>(
        `insert into public.ai_credit_transactions
             (organization_id, amount, transaction_type, description, related_request)
         values ($1, $2, 'usage', $3, $4)
         returning id`,
        [organizationId, amount, description, relatedRequest ?? null],
      );

      await client.query("commit");
      return tx[0]!.id;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Compensating entry when the AI call fails after credits were spent.
   * The usage trigger only fires for 'usage' rows, so refunds credit the
   * balance explicitly here.
   */
  async refund(
    organizationId: string,
    amount: number,
    description: string,
    relatedRequest?: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `update public.ai_credit_balances
            set available_credits = available_credits + $2,
                used_credits      = greatest(coalesce(used_credits, 0) - $2, 0),
                updated_at        = now()
          where organization_id = $1`,
        [organizationId, amount],
      );
      await client.query(
        `insert into public.ai_credit_transactions
             (organization_id, amount, transaction_type, description, related_request)
         values ($1, $2, 'refund', $3, $4)`,
        [organizationId, amount, description, relatedRequest ?? null],
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      this.logger.error({ organizationId, amount, err }, "credit refund failed");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Ensure a balance row exists (called on organization provisioning). */
  async ensureBalance(organizationId: string, startingCredits = 0): Promise<void> {
    await this.pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, $2, 0, 0)
       on conflict (organization_id) do nothing`,
      [organizationId, startingCredits],
    );
  }
}
