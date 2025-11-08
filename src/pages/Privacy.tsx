import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="prose prose-invert prose-zinc max-w-none">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy — Inbox Defender</h1>
          <p className="text-zinc-400 mb-8">Last updated: September 7th, 2025</p>
          <p className="text-zinc-300 mb-8">
            Owner: Bliztic LLC, ("Bliztic", "we", "us", "our")
          </p>

          <div className="space-y-8 text-zinc-300">
            <p>
              Inbox Defender connects to your email (Gmail first) to automatically sort cold outreach/sales emails into a separate folder and reduce future noise. This policy explains what we collect, why, and how we protect it.
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1) What we collect</h2>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong>Account & auth:</strong> name, email, org/workspace name, password hash (if applicable), Google OAuth tokens (access + refresh).
                </li>
                <li>
                  <strong>Mailbox metadata:</strong> Gmail message IDs, sender email & domain, received time, label IDs, and a hash of the subject line.
                </li>
                <li>
                  <strong>Filtering decisions:</strong> category/score, action taken (e.g., moved to "Outreach (AI)"), timestamps.
                </li>
                <li>
                  <strong>Settings/usage:</strong> allow/deny lists, thresholds, digest frequency, counts (emails scanned, AI calls), support tickets.
                </li>
                <li>
                  <strong>Content handling:</strong> to classify a message we may read headers and a small portion of the body. We process content in memory and do not store full bodies by default.
                </li>
                <li>
                  <strong>Optional auto-opt-out:</strong> if you enable it, we may send a polite decline/opt-out from your mailbox to reduce repeat outreach.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2) How we use data</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide core features: classify, label/move, digests, restore/undo.</li>
                <li>Improve accuracy (rules tuning, per-inbox preferences).</li>
                <li>Security, abuse prevention, troubleshooting, and analytics (aggregated).</li>
                <li>If enabled, send decline/opt-out replies to deter repeat sequences.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3) Legal bases (where applicable)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Performance of a contract (running the service you signed up for).</li>
                <li>Legitimate interests (security, fraud prevention, product improvement).</li>
                <li>Consent (connecting your mailbox, enabling auto-opt-out, receiving emails).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4) Data retention</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Filtering ledger</strong> (message IDs, decisions): 14 days by default.</li>
                <li><strong>Digests/exports:</strong> on demand; you control retention.</li>
                <li><strong>Logs/metrics:</strong> up to 90 days.</li>
              </ul>
              <p className="mt-3">
                You can disconnect Gmail anytime; we stop processing and delete related tokens/keys. You may also request deletion at <a href="mailto:privacy@bliztic.com" className="text-blue-400 hover:text-blue-300">privacy@bliztic.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5) Sharing & processors</h2>
              <p className="mb-3">
                We don't sell your data. We share only with sub-processors needed to run the product:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Google Cloud Platform (hosting, database, secrets).</li>
                <li>Email delivery provider (digests/alerts).</li>
                <li>AI inference provider (only when a small model pass is needed; we send the minimum text required and instruct providers not to use it for training).</li>
              </ul>
              <p className="mt-3">
                A current list of sub-processors is available on request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6) Google API disclosure</h2>
              <p>
                Inbox Defender's use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements. We request the minimum scopes (gmail.modify and gmail.labels), use the data only to deliver user-facing features, do not transfer it except as necessary to provide the service, and do not use it to build profiles unrelated to Inbox Defender.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7) Security</h2>
              <p>
                Transport encryption (HTTPS), encrypted token storage, least-privilege access, audit logs, and regular permission reviews. No plaintext passwords; OAuth wherever possible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8) Your rights</h2>
              <p>
                Depending on your location, you may request access, correction, deletion, or export of your data. Contact <a href="mailto:privacy@bliztic.com" className="text-blue-400 hover:text-blue-300">privacy@bliztic.com</a>. You can disconnect Gmail at any time in the dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">9) Children</h2>
              <p>
                Not intended for children under 16. We don't knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">10) Changes</h2>
              <p>
                We'll update this policy as the product evolves and will post the revised date above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">Contact</h2>
              <p>
                Bliztic LLC, Dallas, TX. Email: <a href="mailto:privacy@bliztic.com" className="text-blue-400 hover:text-blue-300">privacy@bliztic.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
