import type { Metadata } from "next";
import { Fill, LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When PodMind AI refunds a payment, and how to ask.",
};

export default function Page() {
  return (
    <LegalPage title="Refund Policy" updated="July 2026">
      <p className="rounded border border-warning-500/30 bg-warning-500/5 p-4 text-warning-200">
        This policy reflects how PodMind actually works, but it is not legal advice. Have it
        reviewed by a qualified lawyer, and replace every highlighted placeholder, before you
        rely on it.
      </p>

      <Section heading="The short version">
        <p>
          You have <strong>14 days</strong> from a payment to ask for a refund. If you have
          used less than <strong>20%</strong> of that period&apos;s credits, we refund in full,
          no questions asked. If you have used more, we will still look at it — see below.
        </p>
      </Section>

      <Section heading="Full refund">
        <p>You get a full refund when you ask within 14 days of the charge and either:</p>
        <List
          items={[
            "You have used less than 20% of the credits included in that billing period, or",
            "The service was substantially unavailable for a prolonged period during it, or",
            "You were charged in error — a duplicate payment, or a renewal after you cancelled.",
          ]}
        />
        <p>
          A billing error is refunded whenever we find it, in or out of the 14-day window. That
          is our mistake, not your deadline.
        </p>
      </Section>

      <Section heading="Partial refund">
        <p>
          Past 20% usage but inside 14 days, we refund the unused portion. The reason is
          simple: credits spend real money with AI providers the moment a request runs, and we
          cannot get that back. Refunding it in full would mean charging other customers for
          work already delivered to one.
        </p>
        <p>
          You can see exactly what you have used in Billing, so this is never a number we
          assert and you have to take on trust.
        </p>
      </Section>

      <Section heading="When we will not refund">
        <List
          items={[
            "Requests after 14 days, unless it is a billing error on our side.",
            "A period whose credits are substantially spent — that work was done and paid for.",
            "Accounts suspended for breaching the Terms of Service.",
            "Dissatisfaction with AI output quality alone, where the service worked as described. Our Terms are explicit that output is a draft requiring review, and the free plan exists so you can judge the quality before paying.",
          ]}
        />
      </Section>

      <Section heading="Failed AI requests are refunded automatically">
        <p>
          This is worth stating separately because it is not a policy you have to invoke.
          Credits are charged when a request starts, and returned automatically if every
          provider fails to produce a result. You do not lose credits to our outages, and you
          do not need to ask. Refunded credits appear in the Billing ledger.
        </p>
      </Section>

      <Section heading="Cancelling">
        <p>
          Cancelling stops the next renewal. You keep access, and any remaining credits, until
          the end of the period you have already paid for — we do not cut access off on the day
          you cancel. Unused credits do not carry into a new period or convert to cash.
        </p>
      </Section>

      <Section heading="How to ask">
        <p>
          Email <Fill>support@yourdomain.com</Fill> from the address on the account, and say
          which payment you mean. We reply within <Fill>2 business days</Fill> and, once
          approved, the refund is issued to the original payment method. Your bank usually
          takes a further <Fill>5–10</Fill> business days to show it.
        </p>
        <p>
          Payments are processed by our payment provider, so a refund is issued through them
          and may appear on your statement under their name.
        </p>
      </Section>

      <Section heading="Chargebacks">
        <p>
          Please contact us before raising a chargeback with your bank. A chargeback suspends
          the account automatically while it is investigated, which usually costs you access to
          work you still want. Almost everything is faster to settle by email.
        </p>
      </Section>
    </LegalPage>
  );
}
