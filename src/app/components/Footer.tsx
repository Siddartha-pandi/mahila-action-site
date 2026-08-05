"use client";

import { LogoMark } from "./LogoMark";
import { useModal } from "../hooks/useModal";
import { fraunces, inter, type Page } from "./shared/styleHelpers";
import { useEffect, useState } from "react";

const FOOTER_IMPACT_LINKS: { label: string; id: string }[] = [
  { label: "Women & Leadership", id: "women-leadership" },
  { label: "Education & Learning", id: "education" },
  { label: "Livelihood & Skills", id: "livelihood" },
  { label: "Community Wellbeing", id: "wellbeing" },
];

export function Footer({ setPage }: { setPage: (p: Page) => void }) {
  const { openModal } = useModal();

  function nav(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0 });
  }

  function openImpact(id: string) {
    openModal("impact", { id });
  }

  const [email, setEmail] = useState<string>('contact@mahilaction.org');
  const [phone, setPhone] = useState<string>('+91 XXXXXXXXX');

  useEffect(() => {
    let mounted = true;
    async function loadContact() {
      try {
        const res = await fetch('/api/cms/contact-info');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!mounted) return;
        if (data?.email) setEmail(data.email);
        if (data?.phone) setPhone(data.phone);
      } catch (err) {
        // keep defaults
      }
    }
    loadContact();

    function onSiteDataChanged() {
      loadContact();
    }
    window.addEventListener('mahila_sitedata_changed', onSiteDataChanged);
    return () => {
      mounted = false;
      window.removeEventListener('mahila_sitedata_changed', onSiteDataChanged);
    };
  }, []);

  return (
    <footer className="bg-[#a65a4a]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row justify-between gap-12">
          {/* Brand */}
          <div className="flex flex-col gap-8 max-w-[300px]">
            <LogoMark invert />
            <div
              className={`${fraunces()} text-[#f4efe7] text-[26px] leading-tight`}
              style={{
                fontVariationSettings: '"SOFT" 0, "WONK" 1',
              }}
            >
              <div>Small Actions.</div>
              <div>Lasting Change.</div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => nav("donate")}
                className={`${inter()} bg-[#f4efe7] text-[#a65a4a] text-[15px] font-bold px-10 py-3 rounded-full hover:bg-white transition-colors cursor-pointer text-center`}
              >
                Donate For The Cause
              </button>
              <button
                onClick={() => openModal("volunteer")}
                className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[15px] font-bold px-10 py-3 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer text-center`}
              >
                Join The Movement
              </button>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-10">
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Mahila Action
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] leading-relaxed`}
              >
                <p>Empowering Women,</p>
                <p>Strengthening Communities,</p>
                <p>Creating Lasting Change</p>
                <p>for over 28 years.</p>
              </div>
            </div>
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Get Involved
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                <button
                  onClick={() => openModal("attend")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Attend Events
                </button>
                <button
                  onClick={() => openModal("partner")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Partner With Us
                </button>
                <button
                  onClick={() => openModal("volunteer")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Volunteer
                </button>
              </div>
            </div>
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Our Impacts
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                {FOOTER_IMPACT_LINKS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => openImpact(l.id)}
                    className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Contact
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#f4efe7] transition-colors"
                >
                  {email}
                </a>
                <span>{phone}</span>
              </div>
              {/* Social icons */}
              <div className="flex gap-4 mt-4">
                {[
                  {
                    label: "Instagram",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        />
                        <circle cx="12" cy="12" r="4" />
                        <circle
                          cx="17.5"
                          cy="6.5"
                          r="0.5"
                          fill="currentColor"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "Facebook",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect
                          x="2"
                          y="9"
                          width="4"
                          height="12"
                        />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    ),
                  },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className="text-[#f4efe7]/80 hover:text-[#f4efe7] transition-colors cursor-pointer"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${inter()} text-[#f4efe7]/50 text-[12px] text-center mt-12 pt-8 border-t border-[#f4efe7]/20 flex flex-col items-center gap-2`}>
          <span>© {new Date().getFullYear()} Mahila Action. All rights reserved. Empowering women since 1995.</span>
        </div>
      </div>
    </footer>
  );
}
