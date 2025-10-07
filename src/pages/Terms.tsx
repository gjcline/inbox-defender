import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Terms() {
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
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service — Inbox Defender</h1>
          <p className="text-zinc-400 mb-8">Last updated: September 7th, 2025</p>

          <div className="space-y-8 text-zinc-300">
            <p>
              These Terms govern your access to and use of Inbox Defender ("Service"). By using the Service you agree to these Terms.
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">1) Account & eligibility</h2>
              <p>
                You must be at least 16 and able to form a contract. Keep credentials secure and notify us of any unauthorized use.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">2) Plans & limits</h2>
              <p className="mb-3">
                <strong>Personal plan:</strong> 1 inbox; monthly email scan limits and feature caps as shown at checkout.
              </p>
              <p className="mb-3">
                <strong>Business plan:</strong> multiple inboxes under one org; pooled limits; admin controls.
              </p>
              <p>
                We may throttle or suspend processing if you exceed plan limits or abuse the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">3) Billing</h2>
              <p>
                Subscriptions renew monthly until canceled. Fees are due in advance and are non-refundable except where required by law. Taxes and payment processor fees may apply. You can cancel in the dashboard; access continues until the end of the paid period.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">4) Connecting Gmail</h2>
              <p>
                By connecting your Gmail account, you authorize us to process messages as described in the Privacy Policy to classify, move/label, generate digests, and (if you enable it) send decline/opt-out replies from your mailbox. You can disconnect anytime.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">5) Acceptable use</h2>
              <p className="mb-3">You will not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service to violate laws (e.g., CAN-SPAM, privacy), harass others, or interfere with mail systems.</li>
                <li>Attempt to access another user's data or bypass security.</li>
                <li>Copy, reverse engineer, resell, or operate the Service as a competing product without our written consent.</li>
              </ul>
              <p className="mt-3">
                We may suspend accounts for suspected abuse or security risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">6) Intellectual property</h2>
              <p>
                The Service, brand, and software are owned by Bliztic LLC. You retain rights to your content and mailbox data. Feedback may be used to improve the Service without obligation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">7) Privacy & data processing</h2>
              <p>
                Our Privacy Policy forms part of these Terms. Where required, we offer a Data Processing Addendum (DPA) upon request for Business customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">8) Service changes</h2>
              <p>
                We may modify or discontinue features with reasonable notice when feasible. Beta/experimental features are provided "as is".
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">9) Disclaimers</h2>
              <p>
                The Service is provided "as is" and "as available." We do not warrant uninterrupted or error-free operation or that filtering will catch every message or avoid all false positives.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">10) Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, our total liability for any claims arising out of or relating to the Service is limited to the amount you paid to us for the Service in the 12 months before the claim, or US$100, whichever is greater. We're not liable for indirect, incidental, special, or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">11) Termination</h2>
              <p>
                You may stop using the Service at any time. We may suspend or terminate access for breach, risk, or non-payment. Upon termination we will delete or de-identify your data in accordance with the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">12) Governing law & disputes</h2>
              <p>
                These Terms are governed by the laws of Texas, without regard to conflict-of-law rules. Disputes will be resolved in the courts of Texas, USA. You agree to personal jurisdiction there.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-3">13) Contact</h2>
              <p>
                Bliztic LLC • <a href="mailto:legal@bliztic.com" className="text-blue-400 hover:text-blue-300">legal@bliztic.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
