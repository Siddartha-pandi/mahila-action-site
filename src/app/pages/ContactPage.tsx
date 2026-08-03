"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { saveContact } from "@/lib/backend";
import { LIMITS, firstError, validateEmail, validateName, validatePhone, validateText } from "@/lib/validation";
import { imgAboutBanner } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { PageBanner } from "../components/PageBanner";
import { inter, fraunces } from "../components/shared/styleHelpers";

export function ContactPage() {
  const siteData = useSiteData();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = firstError(
      validateName(form.name),
      validateEmail(form.email),
      form.phone.trim() ? validatePhone(form.phone) : null,
      validateText(form.subject, "a subject", { max: LIMITS.subject.max, required: false }),
      validateText(form.message, "your message", { min: LIMITS.message.min, max: LIMITS.message.max })
    );
    if (invalid) return toast.error(invalid);
    setLoading(true);
    const res = await saveContact({
      name: form.name, email: form.email,
      phone: form.phone || undefined,
      subject: form.subject || undefined,
      message: form.message,
    });
    setLoading(false);
    if (!res.ok) return toast.error(res.error || "Something went wrong sending your message — please try again.");
    setSubmitted(true);
  }

  const inputBase = `w-full border-2 border-[#a65a4a]/25 bg-white rounded-xl px-4 py-3.5 text-[15px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]`;
  const labelBase = `font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e]/70 mb-1.5 block`;

  const contactCards = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
      label: "Email Us", value: siteData.contact.email, sub: siteData.contact.emailNote, href: `mailto:${siteData.contact.email}`,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.06 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.02 17z" /></svg>,
      label: "Call Us", value: siteData.contact.phone, sub: siteData.contact.phoneNote, href: `tel:${siteData.contact.phone.replace(/\s/g, "")}`,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
      label: "Visit Us", value: siteData.contact.address, sub: siteData.contact.addressNote, href: "#",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      label: "Office Hours", value: siteData.contact.hours, sub: siteData.contact.hoursNote, href: "#",
    },
  ];

  const faqs = [
    { q: "How can I volunteer with Mahila Action?", a: "Fill out the contact form with your areas of interest and availability. Our team will reach out with suitable volunteering opportunities within 3–5 working days." },
    { q: "Can I visit the office?", a: "Yes! Our Hyderabad office welcomes visitors. We recommend scheduling an appointment via phone or email to ensure the right team member is available to meet you." },
    { q: "How do I partner with Mahila Action?", a: "We welcome partnerships from corporates, NGOs, and institutions. Reach out via the form or email us with your proposal and we'll respond within 48 hours." },
    { q: "Where does my donation go?", a: "100% of donations go directly to our programmes. We maintain full financial transparency — annual reports are available on request." },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgAboutBanner} title="Contact Us" />

      {/* Contact info cards */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {contactCards.map((c) => (
            <a key={c.label} href={c.href} className="group bg-white border-2 border-transparent hover:border-[#a65a4a] rounded-2xl p-6 flex flex-col gap-4 transition-all hover:shadow-md cursor-pointer">
              <div className="size-12 bg-[#a65a4a]/10 text-[#a65a4a] rounded-xl flex items-center justify-center group-hover:bg-[#a65a4a] group-hover:text-[#f4efe7] transition-colors">
                {c.icon}
              </div>
              <div>
                <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider`}>{c.label}</p>
                <p className={`${inter()} text-[15px] font-semibold text-[#1e1e1e] mt-1`}>{c.value}</p>
                <p className={`${inter()} text-[13px] text-[#1e1e1e]/55 mt-0.5`}>{c.sub}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Form + sidebar */}
      <section className="pb-20 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10">
          <div className="flex-[1.4] bg-white rounded-2xl shadow-sm p-5 sm:p-8 md:p-10">
            {submitted ? (
              <div className="flex flex-col items-center text-center gap-5 py-10">
                <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                  <CheckCircle size={40} className="text-[#587735]" />
                </div>
                <h3 className={`${fraunces()} text-[#1e1e1e] text-[30px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Message Sent!</h3>
                <p className={`${inter()} text-[#1e1e1e]/65 text-[16px] leading-relaxed max-w-[380px]`}>
                  Thank you, <strong className="text-[#a65a4a]">{form.name}</strong>! We've received your message and will get back to you at <strong className="text-[#a65a4a]">{form.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => { setForm({ name: "", email: "", phone: "", subject: "", message: "" }); setSubmitted(false); }}
                  className={`${inter()} mt-2 bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold px-10 py-3.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <SectionLabel text="Get In Touch" />
                  <h2 className={`${fraunces()} text-[#1e1e1e] text-[22px] sm:text-[30px] md:text-[42px] leading-tight mt-2`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                    We'd Love to Hear From You
                  </h2>
                  <p className={`${inter()} text-[#1e1e1e]/60 text-[15px] leading-relaxed mt-3`}>
                    Whether you want to volunteer, partner, donate, or simply learn more — drop us a message and our team will respond promptly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelBase}>Full Name *</label>
                      <input value={form.name} onChange={set("name")} placeholder="Your full name" className={inputBase} />
                    </div>
                    <div>
                      <label className={labelBase}>Phone Number</label>
                      <input value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" className={inputBase} />
                    </div>
                  </div>
                  <div>
                    <label className={labelBase}>Email Address *</label>
                    <input value={form.email} onChange={set("email")} placeholder="you@email.com" type="email" className={inputBase} />
                  </div>
                  <div>
                    <label className={labelBase}>Subject</label>
                    <select value={form.subject} onChange={set("subject")} className={`${inputBase} cursor-pointer`}>
                      <option value="">Select a subject…</option>
                      <option>Volunteering Enquiry</option>
                      <option>Partnership / Collaboration</option>
                      <option>Donation &amp; Funding</option>
                      <option>Event Registration</option>
                      <option>Media &amp; Press</option>
                      <option>General Enquiry</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Your Message *</label>
                    <textarea value={form.message} onChange={set("message")} placeholder="Tell us how we can help or how you'd like to get involved…" rows={5} className={`${inputBase} resize-none`} />
                  </div>
                  <button type="submit" disabled={loading} className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-3 mt-2`}>
                    {loading ? (
                      <>
                        <svg className="animate-spin size-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </>
                    ) : "Send Message"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-[#a65a4a] rounded-2xl p-7 text-[#f4efe7]">
              <h3 className={`${fraunces()} text-[26px] font-semibold leading-tight`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Why Reach Out?</h3>
              <div className={`${inter()} text-[14px] text-[#f4efe7]/85 flex flex-col gap-3 mt-5`}>
                {[
                  "Volunteer your skills for a cause that matters",
                  "Partner with us to amplify community impact",
                  "Fund a programme and see direct results",
                  "Attend or organise community events",
                  "Share your story or get media coverage",
                ].map((item) => (
                  <div key={item} className="flex gap-3 items-start">
                    <CheckCircle size={15} className="mt-0.5 shrink-0 text-[#f4efe7]/70" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6">
              <p className={`${inter()} text-[13px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider mb-4`}>Follow Our Work</p>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Instagram", handle: "@mahilaaction", color: "bg-pink-50 text-pink-600" },
                  { name: "Facebook", handle: "Mahila Action", color: "bg-blue-50 text-blue-600" },
                  { name: "LinkedIn", handle: "Mahila Action NGO", color: "bg-sky-50 text-sky-700" },
                  { name: "Twitter / X", handle: "@mahilaaction", color: "bg-slate-50 text-slate-700" },
                ].map((s) => (
                  <div key={s.name} className={`${inter()} flex items-center justify-between rounded-xl px-4 py-2.5 ${s.color}`}>
                    <span className="text-[14px] font-semibold">{s.name}</span>
                    <span className="text-[13px] opacity-75">{s.handle}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-2 border-[#a65a4a]/30 rounded-2xl p-6 flex gap-4 items-start">
              <div className="size-10 bg-[#a65a4a]/10 text-[#a65a4a] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div>
                <p className={`${inter()} text-[14px] font-semibold text-[#1e1e1e]`}>Fast Response Promise</p>
                <p className={`${inter()} text-[13px] text-[#1e1e1e]/60 mt-1 leading-relaxed`}>We commit to responding to all messages within <strong className="text-[#a65a4a]">24 business hours</strong>. Urgent matters? Call us directly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-white/40">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="FAQ" />
            <SectionTitle text="Frequently Asked Questions" center />
          </div>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#a65a4a]/15">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`${inter()} w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer hover:bg-[#f4efe7]/50 transition-colors`}
                >
                  <span className="text-[15px] font-semibold text-[#1e1e1e] pr-4">{faq.q}</span>
                  <span className={`text-[#a65a4a] shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className={`${inter()} text-[14px] text-[#1e1e1e]/65 leading-relaxed border-t border-[#a65a4a]/10 pt-4`}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative bg-[#e8e4df] rounded-2xl overflow-hidden h-[300px] md:h-[400px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#a65a4a]/10 to-[#993925]/10" />
            <div className="relative text-center">
              <div className="size-16 bg-[#a65a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <p className={`${fraunces()} text-[#1e1e1e] text-[24px] font-semibold`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Hyderabad, Telangana</p>
              <p className={`${inter()} text-[#1e1e1e]/60 text-[15px] mt-1`}>India – 500 001</p>
              <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className={`${inter()} inline-block mt-5 bg-[#a65a4a] text-[#f4efe7] text-[14px] font-semibold px-7 py-3 rounded-full hover:bg-[#993925] transition-colors`}>
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
