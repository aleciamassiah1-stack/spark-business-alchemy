import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Æther Wealth" },
      { name: "description", content: "Terms governing your use of Æther Wealth." },
      { property: "og:title", content: "Terms of Service — Æther Wealth" },
      { property: "og:description", content: "Terms governing your use of Æther Wealth." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
        <h1 className="mt-2 font-serif text-4xl text-foreground">Terms of Service</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: April 23, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/85">
          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Æther Wealth ("the Service"), you agree to these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">2. The Service</h2>
            <p>
              Æther Wealth is a private wealth management platform that aggregates financial
              accounts, investments, real estate, insurance and estate documents into a unified
              dashboard. We are not a registered investment adviser, broker-dealer, bank, tax
              advisor, or law firm. Nothing in the Service constitutes financial, tax, legal or
              investment advice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">3. Eligibility & Account</h2>
            <p>
              You must be at least 18 years old and legally able to enter into a binding contract.
              You are responsible for safeguarding your password and for all activity under your
              account. Notify us immediately at team@aetherwealth.co of any unauthorised use.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">4. Connected Accounts (Plaid)</h2>
            <p>
              When you link a financial institution, you authorise our data partner Plaid to access
              your account information on your behalf. Plaid's privacy policy applies to that data
              flow. We never store your bank credentials.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">5. Subscriptions & Billing</h2>
            <p>
              Paid plans are billed monthly or annually in advance through Stripe. You may cancel
              at any time from the in-app billing portal; your subscription remains active until
              the end of the paid period. We do not refund partial periods unless required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">6. Acceptable Use</h2>
            <p>
              You agree not to (a) reverse engineer the Service, (b) use it to violate any law,
              (c) upload malware or attempt to disrupt the Service, or (d) use it to provide
              regulated financial advice to third parties without proper licensure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">7. Intellectual Property</h2>
            <p>
              All Service content, design, code and trademarks are owned by Æther Wealth or its
              licensors. You retain ownership of the data you upload; you grant us a limited
              licence to process it solely to operate the Service for you.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">8. Disclaimers</h2>
            <p>
              The Service is provided "as is" without warranty of any kind. Account valuations,
              property estimates and AI-generated summaries are for informational purposes only and
              may be inaccurate. Always confirm with your custodian, advisor or appraiser before
              acting on any figure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Æther Wealth's aggregate liability arising
              out of or related to the Service is limited to the amounts you paid us in the
              12 months preceding the claim. We are not liable for indirect, incidental,
              consequential or lost-profit damages.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">10. Termination</h2>
            <p>
              You may delete your account at any time from Settings. We may suspend or terminate
              accounts that violate these Terms. Deleted accounts enter a 30-day grace period
              before permanent purge.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, USA, without regard
              to conflict-of-laws rules. Disputes shall be resolved in the state or federal courts
              located in Delaware.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-xl text-foreground">12. Contact</h2>
            <p>
              Questions: <a href="mailto:team@aetherwealth.co" className="text-primary hover:underline">team@aetherwealth.co</a>
            </p>
          </section>
        </div>

        <div className="mt-12 flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy →</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
