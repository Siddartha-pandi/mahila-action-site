"use client";

import { useState } from "react";
import { TIMELINE_FALLBACK_IMAGES } from "../constants/fallbacks";
import { imgAboutBanner, imgEvent, imgTakeAction, imgStory1 } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { PageBanner } from "../components/PageBanner";
import { CouncilorCard } from "../components/CouncilorCard";
import { FilterTabs } from "../components/FilterTabs";
import { Button } from "../components/ui/Button";
import { inter, fraunces, type Page } from "../components/shared/styleHelpers";

export function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const timeline = [...siteData.timeline]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ year: t.year, img: t.image || TIMELINE_FALLBACK_IMAGES[t.id] || imgEvent, title: t.title, desc: t.description }));

  const [activeYear, setActiveYear] = useState(timeline[0]?.year ?? "");
  const active = timeline.find((t) => t.year === activeYear) ?? timeline[0];

  const councilors = siteData.councilors
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ img: c.image || imgStory1, role: c.role, name: c.name, story: c.bio }));

  const yearTabOptions = timeline.map((t) => ({ id: t.year, name: t.year }));

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgAboutBanner} title="Who Are We" />

      {/* Mission + Vision */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#a65a4a] rounded-2xl p-8 md:p-10">
            <SectionLabel text="Our Mission" />
            <h3
              className={`${fraunces()} text-[#f4efe7] text-[36px] md:text-[42px] mt-3 capitalize leading-tight`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Self-Led Sustainable Transformation
            </h3>
            <p className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-5`}>
              Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders — not passive beneficiaries.
            </p>
            <p className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-4`}>
              By building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.
            </p>
          </div>
          <div className="border-2 border-[#a65a4a] rounded-2xl p-8 md:p-10">
            <SectionLabel text="Our Vision" />
            <h3
              className={`${fraunces()} text-[#1e1e1e] text-[36px] md:text-[42px] mt-3 capitalize leading-tight`}
              style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Self-Led Sustainable Transformation
            </h3>
            <p className={`${inter()} text-[#1e1e1e]/80 text-[17px] leading-relaxed mt-5`}>
              Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders — not passive beneficiaries.
            </p>
            <p className={`${inter()} text-[#1e1e1e]/80 text-[17px] leading-relaxed mt-4`}>
              By building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.
            </p>
          </div>
        </div>
      </section>

      {/* Councilors */}
      <section className="py-16 px-6 bg-white/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Councilors" />
            <SectionTitle text="The Advocates Leading the Way" center />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {councilors.map((c) => (
              <CouncilorCard key={c.name} name={c.name} role={c.role} story={c.story} img={c.img} />
            ))}
          </div>
        </div>
      </section>

      {/* Impact Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="Our Impacts" />
            <SectionTitle text="Our Impacts Since 1995" center />
          </div>
          {timeline.length > 0 && (
            <>
              <div className="mb-10">
                <FilterTabs
                  options={yearTabOptions}
                  activeId={activeYear}
                  onChange={setActiveYear}
                  showAllOption={false}
                />
              </div>
              {active && (
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="relative w-full lg:w-[520px] h-[380px] rounded-2xl overflow-hidden shrink-0">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={active.img}
                      alt={active.title}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                  <div>
                    <p className={`${inter()} text-[14px] text-[#1e1e1e]/60 mb-1`}>{active.year}</p>
                    <h3
                      className={`${fraunces()} text-[#1e1e1e] text-[36px] md:text-[42px] leading-tight capitalize`}
                      style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
                    >
                      {active.title}
                    </h3>
                    <p className={`${inter()} text-[#1e1e1e]/80 text-[18px] leading-relaxed mt-5`}>{active.desc}</p>
                    <p className={`${inter()} text-[#1e1e1e]/80 text-[18px] leading-relaxed mt-3`}>
                      Each milestone represents thousands of lives touched, hundreds of communities strengthened, and one unwavering commitment to human dignity and justice.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Take Action teaser */}
      <section className="relative py-24 px-6 overflow-hidden">
        <img loading="lazy" decoding="async" src={imgTakeAction} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-[#993925]/85" />
        <div className="relative max-w-[800px] mx-auto text-center flex flex-col items-center">
          <h2
            className={`${fraunces()} text-[#f4efe7] text-[42px] md:text-[52px] leading-tight`}
            style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            One Contribution. Many Futures.
          </h2>
          <Button
            variant="secondary"
            size="lg"
            className="mt-8 px-12 py-4"
            onClick={() => {
              setPage("donate");
              window.scrollTo({ top: 0 });
            }}
          >
            Donate Now
          </Button>
        </div>
      </section>
    </main>
  );
}
