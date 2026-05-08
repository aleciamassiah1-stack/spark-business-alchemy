import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Æther Wealth" },
      { name: "description", content: "How Æther Wealth collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — Æther Wealth" },
      { property: "og:description", content: "How Æther Wealth collects, uses and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: May 8, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/85">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. What We Collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Account data:</strong> name, email, phone number, password hash.</li>
              <li><strong>Financial data:</strong> account balances, transactions, holdings, valuations — fetched via Plaid when you link an institution.</li>
              <li><strong>Documents:</strong> insurance policies, estate plans, beneficiary forms you upload.</li>
              <li><strong>Usage data:</strong> device type, IP address, page views (for security and product improvement).</li>
              <li><strong>Billing data:</strong> handled by Stripe — we never see your full card number.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. How We Use It</h2>
            <p>
              We use your data to operate the Service, present your dashboard, generate AI
              summaries you request, send transactional emails, prevent fraud, and comply with
              law. We do not sell your personal data. We do not use your financial data to train
              third-party AI models.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Sharing</h2>
            <p>We share data only with:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li><strong>Plaid</strong> — to fetch your linked accounts.</li>
              <li><strong>Stripe</strong> — to process subscriptions.</li>
              <li><strong>Supabase / Lovable Cloud</strong> — our hosting & database provider.</li>
              <li><strong>AI providers</strong> (Google Gemini, OpenAI) — only redacted prompts you initiate (e.g. property valuations, document parsing).</li>
              <li><strong>Law enforcement</strong> — only when legally compelled.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Security</h2>
            <p>
              All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Plaid access
              tokens are stored server-side only and are never exposed to your browser. Authentication
              uses bcrypt-hashed passwords and HIBP leak checking. We perform regular security audits.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Your Rights</h2>
            <p>
              You may request a copy, correction, or deletion of your data at any time from
              Settings or by emailing team@aetherwealth.co. EU/UK residents have GDPR rights;
              California residents have CCPA rights. Account deletions are honoured within 30
              days; you may cancel the deletion during the grace period.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">6. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. After deletion, financial
              data, documents and AI history are purged within 30 days. We may retain minimal
              records (e.g. invoices) for up to 7 years to satisfy tax and accounting law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">7. Cookies</h2>
            <p>
              We use only essential cookies (session, CSRF). We do not use third-party advertising
              or cross-site tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">8. International Transfers</h2>
            <p>
              Our infrastructure is hosted in the United States. By using the Service you consent
              to your data being processed in the US under standard contractual clauses where
              applicable.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">9. Children</h2>
            <p>The Service is not directed at anyone under 18. We do not knowingly collect data from minors.</p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">10. Changes</h2>
            <p>
              We will notify you by email and in-app banner of any material changes at least 14
              days before they take effect.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">11. Data Services — Plaid</h2>
            <p>
              Æther Wealth uses Plaid Technologies, Inc. ("Plaid") to connect your financial
              accounts. By connecting your accounts through Plaid Link, you acknowledge and agree
              that your data will be handled in accordance with Plaid's Privacy Policy, available
              at{" "}
              <a
                href="https://plaid.com/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                plaid.com/legal
              </a>
              . Plaid collects, uses, and shares your personal and financial information as
              described in their privacy policy to provide account connection services. You grant
              Æther Wealth and Plaid the right to access, transmit and use your financial data
              solely to provide the services described in this Privacy Policy. You may disconnect
              your accounts and revoke Plaid's access to your data at any time through the Security
              Center within the Æther Wealth application.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">12. Contact</h2>
            <p>
              Privacy requests: <a href="mailto:team@aetherwealth.co" className="text-primary hover:underline">team@aetherwealth.co</a>
            </p>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms of Service →</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
