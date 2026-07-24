import type { Metadata } from "next";
import { Fill, LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The agreement between you and PodMind AI.",
};

export default function Page() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <p className="rounded border border-warning-500/30 bg-warning-500/5 p-4 text-warning-200">
        These terms describe how PodMind actually operates, but they are not legal advice. Have
        them reviewed by a qualified lawyer in your jurisdiction, and replace every highlighted
        placeholder, before you rely on them.
      </p>

      <Section heading="The agreement">
        <p>
          These terms are between you and <Fill>legal entity name</Fill> (&ldquo;PodMind&rdquo;,
          &ldquo;we&rdquo;). By creating an account you accept them. If you are agreeing on
          behalf of a company, you confirm you may bind it.
        </p>
      </Section>

      <Section heading="What PodMind does">
        <p>
          PodMind helps you research and produce podcast episodes using AI: research briefings,
          guest preparation, outlines, scripts, fact checks, SEO and social copy, and a
          project-aware assistant.
        </p>
      </Section>

      <Section heading="AI output — read this one">
        <p>
          Everything PodMind generates is a draft produced by an AI model. Models can be
          confidently wrong. They can misattribute a quote, state a statistic that does not
          exist, or describe a person inaccurately.
        </p>
        <p>
          We design against this — the research and guest prompts forbid inventing sources or
          statistics, uncertainty is surfaced rather than hidden, and the Fact Checker exists
          precisely because output needs checking — but none of that makes the output verified.
        </p>
        <p>
          <strong>
            You are responsible for what you publish or broadcast. Verify facts, quotations and
            anything said about a real person before it reaches your audience.
          </strong>{" "}
          We provide the tool; the editorial judgement is yours.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          You keep ownership of everything you upload and everything PodMind generates for you.
          You grant us only the licence needed to run the service: to store your content, and to
          transmit it to the AI providers described in our{" "}
          <a href="/privacy" className="text-primary-400 hover:text-primary-300">
            Privacy Policy
          </a>{" "}
          so they can produce your requested output.
        </p>
        <p>
          You confirm you have the right to upload what you upload, and that doing so does not
          infringe anyone else&apos;s rights.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You may not use PodMind to:</p>
        <List
          items={[
            "Create content that is unlawful, defamatory, harassing, or that infringes someone else's rights.",
            "Generate false or misleading claims about a real person, presented as fact.",
            "Attempt to access another customer's data, or to probe, scan or overload the service.",
            "Resell or redistribute the AI capabilities as a competing service.",
            "Circumvent credit limits, rate limits or any other technical restriction.",
          ]}
        />
        <p>
          We may suspend an account that breaches these terms. Where it is reasonable to do so,
          we will tell you why and give you a chance to put it right first.
        </p>
      </Section>

      <Section heading="Accounts and API keys">
        <p>
          You are responsible for activity under your account and for keeping your credentials
          safe. API keys you create carry your organization&apos;s access — treat them as
          secrets, scope them narrowly, and revoke any key you believe has leaked. We store only
          a hash of each key and cannot recover one for you.
        </p>
      </Section>

      <Section heading="Credits, plans and payment">
        <p>
          AI features consume credits. Each feature has a fixed credit cost shown before you
          run it. Credits are consumed when a request is made and refunded automatically if
          every provider fails to produce a result.
        </p>
        <p>
          Plan credits are granted for a billing period and do not roll over unless the plan
          says otherwise. Subscriptions renew automatically until cancelled; cancelling stops
          the next renewal and you keep access until the end of the period you have paid for.
        </p>
        <p>
          Prices are shown before purchase. Refunds are handled under our{" "}
          <a href="/refunds" className="text-primary-400 hover:text-primary-300">
            Refund Policy
          </a>
          .
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We work to keep PodMind available, but we do not promise uninterrupted service. The
          product depends on third-party AI providers, and those providers have outages, rate
          limits and their own restrictions. PodMind falls back across providers where it can;
          when none is available, a request fails and its credits are refunded.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the extent the law allows, PodMind is provided as-is, and we are not liable for
          indirect or consequential loss, lost profits, lost audience, or reputational harm —
          including harm arising from publishing AI output that turned out to be inaccurate.
          Our total liability in any twelve-month period is limited to what you paid us in that
          period.
        </p>
        <p>Nothing here excludes liability that cannot lawfully be excluded.</p>
      </Section>

      <Section heading="Ending the agreement">
        <p>
          You can close your account at any time. You can export your work before you do —
          scripts, outlines and research all support export. We may terminate an account for a
          serious or repeated breach of these terms, or if we stop offering the service, in
          which case we will give reasonable notice and a window to export your work.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms. If a change materially affects your rights we will notify
          you before it takes effect, and continuing to use PodMind afterwards means you accept
          the updated terms.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of <Fill>jurisdiction</Fill>, and the courts of{" "}
          <Fill>jurisdiction</Fill> have exclusive jurisdiction over any dispute.
        </p>
        <p>
          Questions? <Fill>legal@yourdomain.com</Fill>
        </p>
      </Section>
    </LegalPage>
  );
}
