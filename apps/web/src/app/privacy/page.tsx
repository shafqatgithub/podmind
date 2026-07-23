import type { Metadata } from "next";
import { Fill, LegalPage, List, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PodMind AI handles your data.",
};

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <p className="rounded border border-warning-500/30 bg-warning-500/5 p-4 text-warning-200">
        This document describes how PodMind actually handles data, but it is not legal advice.
        Have it reviewed by a qualified lawyer in your jurisdiction, and replace every
        highlighted placeholder, before you rely on it.
      </p>

      <Section heading="Who we are">
        <p>
          PodMind AI (&ldquo;PodMind&rdquo;, &ldquo;we&rdquo;) is operated by{" "}
          <Fill>legal entity name</Fill>, <Fill>registered address</Fill>. For any privacy
          question, contact <Fill>privacy@yourdomain.com</Fill>.
        </p>
      </Section>

      <Section heading="What we collect">
        <List
          items={[
            <>
              <strong>Account details</strong> — your email address, and any name, company,
              role, country or timezone you choose to add in Settings.
            </>,
            <>
              <strong>Content you create</strong> — projects, research, outlines, scripts,
              guest briefings, chat messages and any documents you upload to the Knowledge Hub.
            </>,
            <>
              <strong>Usage records</strong> — which AI features you used, when, how many
              tokens were consumed and whether the request succeeded. We keep these to meter
              credits and to diagnose failures.
            </>,
            <>
              <strong>Audit events</strong> — a record of significant changes to your data, so
              you and we can see what happened to an account.
            </>,
          ]}
        />
        <p>
          We do not collect payment card details. When paid plans are enabled, our payment
          provider handles the card and we never see it.
        </p>
      </Section>

      <Section heading="How your content reaches AI models">
        <p>
          This is the part most worth understanding. When you run research, generate a script,
          check facts or chat, the relevant content — your prompt, your project context and,
          where applicable, passages retrieved from your Knowledge Hub — is sent to a
          third-party AI provider so it can produce the answer. Without this the product cannot
          function.
        </p>
        <p>
          Which provider receives it depends on the task and on availability. Today those
          providers are OpenAI, Anthropic and Google. You can pin a specific provider for most
          features, and Settings lets you set a preferred one.
        </p>
        <p>
          We send only what a request needs. We do not send your content to AI providers for any
          purpose other than producing your requested output, and we do not use your content to
          train our own models.
        </p>
      </Section>

      <Section heading="Sub-processors">
        <p>These are the third parties that process data on our behalf:</p>
        <List
          items={[
            <>
              <strong>Supabase</strong> — database, authentication and file storage.
            </>,
            <>
              <strong>Vercel</strong> — hosting for the web application.
            </>,
            <>
              <strong>Railway</strong> — hosting for the API.
            </>,
            <>
              <strong>OpenAI, Anthropic, Google</strong> — AI model providers, as described
              above.
            </>,
            <>
              <strong>
                <Fill>payment provider</Fill>
              </strong>{" "}
              — payments and invoicing, once paid plans are enabled.
            </>,
          ]}
        />
        <p>
          Each of these operates under its own privacy terms and may process data outside your
          country.
        </p>
      </Section>

      <Section heading="Why we are allowed to process it">
        <List
          items={[
            <>
              <strong>To provide the service</strong> — performing the contract you enter into
              when you create an account.
            </>,
            <>
              <strong>To keep it working and secure</strong> — our legitimate interest in
              diagnosing failures, preventing abuse and metering usage.
            </>,
            <>
              <strong>With your consent</strong> — for optional product emails, which you can
              turn off in Settings at any time.
            </>,
          ]}
        />
      </Section>

      <Section heading="How long we keep it">
        <p>
          Your content stays until you delete it or close your account. Deleting a project,
          document or conversation removes it from the application immediately; residual copies
          may persist in encrypted backups for up to <Fill>30</Fill> days before being
          overwritten. Usage and audit records are retained for <Fill>12</Fill> months so we can
          answer billing questions and investigate incidents.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, export or
          delete your personal data, to object to certain processing, or to complain to a data
          protection authority. You can edit or delete most data directly in the application;
          for anything else, contact us at <Fill>privacy@yourdomain.com</Fill> and we will
          respond within <Fill>30</Fill> days.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Access to your data is scoped to your organization at the database level, so one
          account cannot read another&apos;s content. Passwords are handled by our
          authentication provider and never stored by us. API keys you create are stored only as
          a hash — we cannot recover one, which is why the key is shown to you exactly once.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your personal data we will notify
          you and any required regulator without undue delay.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          PodMind is not intended for anyone under 16, and we do not knowingly collect data from
          children. If you believe a child has given us personal data, contact us and we will
          delete it.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          If we change this policy in a way that materially affects you, we will tell you before
          it takes effect — by email or in the application — rather than quietly updating the
          date at the top.
        </p>
      </Section>
    </LegalPage>
  );
}
