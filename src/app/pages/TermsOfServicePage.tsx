"use client";

import { PageBanner } from "../components/PageBanner";
import { fraunces, inter, type Page } from "../components/shared/styleHelpers";
import { Scale, HeartHandshake, FileCheck, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { useSiteData } from "../context/SiteDataContext";

export function TermsOfServicePage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const contact = siteData?.contact;
  const email = contact?.email || "";
  const phone = contact?.phone || "+91 70955 48387";

  return (
    <main className="bg-[#f4efe7] min-h-screen pb-20">
      <PageBanner title="Terms of Service" />

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
              <Scale className="size-6" />
            </div>
            <div>
              <h2
                className={`${fraunces()} text-[22px] sm:text-[26px] text-[#1e1e1e] leading-snug font-semibold`}
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                Terms and Conditions of Use
              </h2>
              <p className={`${inter()} text-[#1e1e1e]/80 text-[15px] sm:text-[16px] leading-relaxed mt-2`}>
                Welcome to Mahila Action. By accessing or using our website, participating in our programs, registering for community events, volunteering, or donating to our cause, you agree to comply with and be bound by the following Terms of Service.
              </p>
            </div>
          </div>
        </div>

        {/* Terms Body */}
        <div className="space-y-8 bg-white/70 backdrop-blur-sm rounded-2xl p-6 sm:p-10 border border-[#e5ded3]">
          {/* Section 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <FileCheck className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                1. Acceptance &amp; Organizational Purpose
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                Mahila Action is a non-profit civil society organization established in 1995 to empower women, strengthen grassroots community leadership, and facilitate access to education and livelihood skills.
              </p>
              <p>
                This platform is operated solely for public welfare, community education, non-profit outreach, event registrations, and voluntary charitable contributions. Any commercial exploitation, scraping, or misuse of this platform is strictly prohibited.
              </p>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <HeartHandshake className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                2. Donations &amp; Financial Contributions
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-3 pl-1`}>
              <p>
                All donations made to Mahila Action are voluntary gifts in support of our charitable mission and empowerment initiatives.
              </p>
              <ul className="list-disc pl-6 space-y-1.5 text-[#1e1e1e]/80">
                <li>
                  <strong className="text-[#1e1e1e]">Donation Receipts:</strong> Official digital receipts and confirmation records are generated for all completed financial transactions and emailed to the address provided during checkout.
                </li>
                <li>
                  <strong className="text-[#1e1e1e]">Refund Policy:</strong> Because donations are immediately committed to ongoing grassroots field operations and beneficiary support, contributions are generally non-refundable. If an erroneous transaction or duplicate charge occurs, please contact us within 7 days at <a href={`mailto:${email}`} className="text-[#8b263e] underline">{email}</a> with transaction details for review.
                </li>
              </ul>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <AlertCircle className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                3. Event Participation &amp; Code of Conduct
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                When attending Mahila Action community meetings, workshops, volunteer drives, or fundraisers, participants are expected to uphold a safe, respectful, and inclusive environment.
              </p>
              <p>
                We reserve the right to decline or cancel event registrations or volunteer participation in cases of disruptive, unlawful, or discriminatory conduct.
              </p>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <FileCheck className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                4. Intellectual Property &amp; Beneficiary Dignity
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                All original content, designs, logos, and materials published on this website are the property of Mahila Action or used with permission.
              </p>
              <p>
                Stories, photographs, and testimonials of women, children, and families supported by our programs are published with consent and to preserve their dignity. Republication, framing, or unauthorized commercial use of these materials is strictly forbidden.
              </p>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <Scale className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                5. Governing Law &amp; Jurisdiction
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                These terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or related to the use of this website or organization services shall be subject to the exclusive jurisdiction of the competent courts in Andhra Pradesh / Telangana, India.
              </p>
            </div>
          </section>

          <hr className="border-[#e5ded3]" />

          {/* Section 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5 text-[#8b263e]">
              <Mail className="size-5" />
              <h3 className={`${fraunces()} text-[20px] sm:text-[22px] font-semibold text-[#1e1e1e]`}>
                6. Contact Information
              </h3>
            </div>
            <div className={`${inter()} text-[#1e1e1e]/85 text-[15px] leading-relaxed space-y-2 pl-1`}>
              <p>
                For questions regarding these Terms of Service or organizational policies, please reach out to:
              </p>
              <div className="bg-[#f9f7f4] rounded-xl p-5 border border-[#e5ded3]">
                <p className="font-semibold text-[#1e1e1e] mb-2">Mahila Action Secretariat:</p>
                <div className="text-[14px] space-y-1 text-[#1e1e1e]/80">
                  <p><strong>Email:</strong> <a href={`mailto:${email}`} className="text-[#8b263e] hover:underline">{email}</a></p>
                  <p><strong>Phone:</strong> {phone}</p>
                  <p><strong>Region:</strong> Andhra Pradesh &amp; Telangana, India</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

