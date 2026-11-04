"use client";

import { PageBanner } from "../components/PageBanner";
import { fraunces, inter, type Page } from "../components/shared/styleHelpers";
import { ShieldCheck, Lock, Eye, FileText, Mail, ArrowLeft } from "lucide-react";
import { useSiteData } from "../context/SiteDataContext";

export function PrivacyPolicyPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const contact = siteData?.contact;
  const email = contact?.email || "";
  const phone = contact?.phone || "+91 70955 48387";

  return (
    <main className="bg-[#f4efe7] min-h-screen pb-20">
      <PageBanner title="Privacy Policy" />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => setPage("home")}
            className={`${inter()} inline-flex items-center gap-2 text-[14px] font-semibold text-[#8b263e] hover:text-[#a65a4a] transition-colors cursor-pointer`}
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </button>
          <span className={`${inter()} text-[13px] text-[#1e1e1e]/60`}>
            Last updated: November 2026
          </span>
        </div>

        {/* Intro Highlight Box */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#e5ded3] mb-10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-[#8b263e]/10 text-[#8b263e] shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2
                className={`${fraunces()} text-[22px] sm:text-[26px] text-[#1e1e1e] leading-snug font-semibold`}
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                Our Commitment to Your Privacy
              </h2>
              <p className={`${inter()} text-[#1e1e1e]/80 text-[15px] sm:text-[16px] leading-relaxed mt-2`}>
                Mahila Action (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a non-profit organization dedicated to empowering women and marginalized communities since 1995. We take your privacy seriously and are committed to safeguarding personal information collected through our website, community events, volunteer programs, and donation platforms.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Body */}
        <div className="space-y-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 sm:p-10 border border-[#e5ded3]">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <Eye className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                1. Information We Collect
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-3 pl-1`}>
              <p>We may collect information you provide directly to us when interacting with our organization:</p>
              <ul className="list-disc pl-6 space-y-1.5 text-[#1e1e1e]/80">
                <li>
                  <strong className="text-[#1e1e1e]">Personal Details:</strong> Name, email address, phone number, and location when you register for events, sign up as a volunteer, reserve seats, or contact our team.
                </li>
                <li>
                  <strong className="text-[#1e1e1e]">Donation &amp; Contribution Records:</strong> Donor name, email address, transaction reference, amount, and pan/tax details for issuing donation receipts in accordance with applicable laws. (Payment card details and banking passwords are never stored on our servers).
                </li>
                <li>
                  <strong className="text-[#1e1e1e]">Communications:</strong> Inquiries, feedback, partner submissions, and testimonials submitted via our contact and partner forms.
                </li>
              </ul>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <Lock className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                2. Google API Services &amp; OAuth Data Transparency
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-3 pl-1`}>
              <p>
                Our administrative tools allow authorized administrators to connect with Google Drive API services to store and synchronize community program media, photos, and organizational records.
              </p>
              <div className="bg-[#f9f7f4] border-l-4 border-[#8b263e] p-4 rounded-r-lg space-y-2">
                <p className="font-semibold text-[#1e1e1e]">Limited Use Disclosure:</p>
                <p className="text-[14px] text-[#1e1e1e]/80">
                  Mahila Action&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b263e] underline font-medium hover:text-[#a65a4a]"
                  >
                    Google API Services User Data Policy
                  </a>
                  , including the Limited Use requirements.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-1.5 text-[#1e1e1e]/80">
                <li>We only request access to Google scopes strictly necessary for organization-managed media storage (<code className="text-[13px] bg-[#e5ded3]/60 px-1.5 py-0.5 rounded text-[#1e1e1e]">drive.file</code>).</li>
                <li>We do not sell, rent, or transfer your Google user data to third parties or advertising networks.</li>
                <li>OAuth tokens are securely stored server-side and are used solely to fulfill administrator-initiated file uploads.</li>
              </ul>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <FileText className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                3. How We Use Your Information
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>The information we collect is used solely to support our non-profit mission, specifically to:</p>
              <ul className="list-disc pl-6 space-y-1 text-[#1e1e1e]/80">
                <li>Process event registrations, attendance lists, and volunteer coordination.</li>
                <li>Issue official donation receipts, tax certificates, and audit documentation.</li>
                <li>Respond to inquiries, grant inquiries, and partnership requests.</li>
                <li>Maintain the security, integrity, and operational health of our web platform.</li>
                <li>Comply with applicable legal, accounting, and regulatory obligations in India.</li>
              </ul>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <ShieldCheck className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                4. Data Protection &amp; Security
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                We employ industry-standard technical, organizational, and physical safeguards to protect your personal data from unauthorized access, loss, misuse, or alteration. All web communications are transmitted over encrypted TLS/SSL connections, and database credentials and access tokens are strictly restricted.
              </p>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <Mail className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                5. Your Rights &amp; Contact Us
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-3 pl-1`}>
              <p>
                You have the right to request access to the personal information we hold about you, request corrections, or request deletion of your data from our active event and volunteer records.
              </p>
              <div className="bg-[#f9f7f4] rounded-xl p-5 border border-[#e5ded3]">
                <p className="font-semibold text-[#1e1e1e] mb-2">Mahila Action Privacy Contact:</p>
                <div className="text-[14px] space-y-1 text-[#1e1e1e]/80">
                  <p><strong>Email:</strong> <a href={`mailto:${email}`} className="text-[#8b263e] hover:underline">{email}</a></p>
                  <p><strong>Phone:</strong> {phone}</p>
                  <p><strong>Location:</strong> Andhra Pradesh &amp; Telangana, India</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

