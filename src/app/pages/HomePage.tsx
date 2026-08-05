"use client";

import { useCallback, useState } from "react";
import { ArrowRight, Users, BookOpen, Briefcase, Heart } from "lucide-react";
import { upcomingOrOpenEvents, isEventOpen, type EventItem } from "@/lib/data";
import { STORY_FALLBACK_IMAGES } from "../constants/fallbacks";
import { imgImpact1, imgImpact2, imgImpact3, imgImpact4, imgEvent, imgHeroCard, imgHeroMain, imgHeroSide, heroSvg, statsSvg } from "../constants/images";
import { useContent } from "../context/ContentContext";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { EventCard } from "../components/EventCard";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { inter, fraunces, type Page } from "../components/shared/styleHelpers";

// Homepage rails stay short — the full sets live on /events and /stories.
const MAX_RAIL_ITEMS = 5;

function c(content: Record<string, string>, key: string) {
  return content[key] || "";
}

export function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  const content = useContent();
  const siteData = useSiteData();
  const { openModal } = useModal();

  function openDetail(id: string) {
    openModal("impact", { id });
  }

  function openStoryBlog(id: string) {
    openModal("story", { id });
  }

  const impactCards = [
    { id: "women-leadership", img: content["img_impact1"] || imgImpact1, icon: <Users size={20} strokeWidth={1.5} />, title: content["impact_card1_title"], desc: content["impact_card1_desc"] },
    { id: "education", img: content["img_impact2"] || imgImpact2, icon: <BookOpen size={20} strokeWidth={1.5} />, title: content["impact_card2_title"], desc: content["impact_card2_desc"] },
    { id: "livelihood", img: content["img_impact3"] || imgImpact3, icon: <Briefcase size={20} strokeWidth={1.5} />, title: content["impact_card3_title"], desc: content["impact_card3_desc"] },
    { id: "wellbeing", img: content["img_impact4"] || imgImpact4, icon: <Heart size={20} strokeWidth={1.5} />, title: content["impact_card4_title"], desc: content["impact_card4_desc"] },
  ];

  const storyPosts = [...siteData.blogPosts]
    .filter(p => p.section === "story")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Community Stories: show 3 latest stories on the homepage (no carousel)
  const communityStories = storyPosts.slice(0, 3);
  const stories = communityStories.map(p => ({ id: p.id, img: p.coverImage || STORY_FALLBACK_IMAGES[p.id]?.banner || imgEvent, title: p.title, excerpt: p.excerpt }));

  const upcoming = upcomingOrOpenEvents(siteData.events);
  const railEvents = (upcoming.length > 0 ? upcoming : siteData.events).slice(0, MAX_RAIL_ITEMS);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  // The CTA always acts on whichever event the carousel is currently showing.
  const featuredEvent: EventItem | null = railEvents[activeEventIndex] ?? railEvents[0] ?? null;
  const eventOpen = featuredEvent ? isEventOpen(featuredEvent) : false;

  const handleEventSelect = useCallback((i: number) => setActiveEventIndex(i), []);

  function handleReserveClick() {
    if (!featuredEvent) return;
    if (eventOpen) openModal("reserve", { id: String(featuredEvent.id) });
    else openModal("closed");
  }

  function goToPage(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0 });
  }

  function categoryName(categoryId: string | null) {
    return siteData.categories.find((c) => c.id === categoryId)?.name;
  }

  return (
    <main className="bg-[#f4efe7]">
      {/* ── Hero ── */}
      <section className="bg-[#f4efe7] pt-20 pb-0">
        <div className="flex flex-col items-center text-center px-6 pb-10">
          <div
            className="font-['Fraunces',serif] font-normal text-[#1e1e1e] whitespace-pre-line"
            style={{ fontSize: "clamp(22px,5vw,70px)", lineHeight: 1.28, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {content["hero_title"]}
          </div>
          <p
            className="font-['Inter',sans-serif] text-[#1e1e1e]/85 text-center tracking-[-0.4px] mt-8 max-w-[640px]"
            style={{ fontSize: "clamp(14px,1.4vw,20px)", lineHeight: 1.8 }}
          >
            {content["hero_subtitle"]}
          </p>
          <button
            onClick={() => document.getElementById("our-impact")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold rounded-full mt-10 hover:bg-[#993925] transition-colors cursor-pointer"
            style={{ fontSize: "clamp(14px,1.4vw,20px)", padding: "clamp(12px,1.4vw,20px) clamp(24px,2.8vw,40px)" }}
          >
            {content["hero_cta"]}
          </button>
        </div>

        {/* Desktop mosaic */}
        <div className="hidden sm:flex items-end gap-[0.8vw] px-[3vw] mt-[-20px]">
          <div className="flex flex-col flex-1 min-w-0 gap-[0.8vw]">
            <div className="relative overflow-hidden rounded-[3vw]" style={{ height: "26vw" }}>
              <img loading="eager" decoding="async" src={imgHeroCard} alt="" className="absolute inset-0 size-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
              <div className="absolute bottom-[8%] left-[9%] font-['Fraunces',serif] font-semibold text-[#f4efe7] w-[82%]" style={{ fontSize: "clamp(12px,2.1vw,30px)", lineHeight: 1.33, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                <p className="mb-0">Every Woman Empowered</p>
                <p>Strengthens A Family.</p>
              </div>
            </div>
            <div className="bg-[#a65a4a] rounded-[3vw] flex flex-col items-start justify-center" style={{ height: "14.5vw", padding: "0 10%" }}>
              <p className="font-['Inter',sans-serif] font-bold text-[#f4efe7]" style={{ fontSize: "clamp(16px,2.8vw,40px)", lineHeight: 1 }}>10,000+</p>
              <p className="font-['Inter',sans-serif] text-[#f4efe7] mt-[0.7vw]" style={{ fontSize: "clamp(10px,1.8vw,26px)", lineHeight: 1 }}>Stories Changed</p>
            </div>
          </div>
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-[3vw]" style={{ height: "35vw" }}>
            <img loading="eager" fetchPriority="high" decoding="async" src={imgHeroMain} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
            <div className="absolute bottom-[8%] left-[11%] text-[#f4efe7]">
              <p className="font-['Inter',sans-serif] font-bold" style={{ fontSize: "clamp(18px,2.8vw,40px)", lineHeight: 1 }}>500+</p>
              <p className="font-['Inter',sans-serif] font-medium mt-[0.7vw]" style={{ fontSize: "clamp(10px,1.55vw,22px)", lineHeight: 1.27 }}>Women Leading<br />Their Communities</p>
            </div>
          </div>
          <div className="bg-[#a65a4a] flex-1 min-w-0 rounded-[3vw] flex flex-col items-start justify-between overflow-hidden" style={{ height: "28vw", padding: "3.5vw 1.8vw" }}>
            <div className="font-['Fraunces',serif] font-semibold text-[#f4efe7]" style={{ fontSize: "clamp(12px,2vw,29px)", lineHeight: 1.38, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              <p className="mb-0">Join Thousands</p>
              <p className="mb-0">Building</p>
              <p className="mb-0">Stronger</p>
              <p>Communities.</p>
            </div>
            <button onClick={() => openModal("volunteer")} className="bg-[#f4efe7] text-[#a65a4a] font-['Inter',sans-serif] font-semibold w-full text-center rounded-full hover:bg-white transition-colors cursor-pointer" style={{ fontSize: "clamp(10px,1vw,15px)", padding: "clamp(5px,1vw,10px) 0" }}>
              Become a Volunteer
            </button>
          </div>
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-[3vw]" style={{ height: "35vw" }}>
            <img loading="eager" decoding="async" src={imgHeroSide} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
            <p className="absolute bottom-[8%] left-1/2 -translate-x-1/2 font-['Fraunces',serif] font-semibold text-[#f4efe7] text-center w-[82%]" style={{ fontSize: "clamp(12px,2.1vw,30px)", lineHeight: 1.33, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Education Opens New Possibilities.
            </p>
          </div>
          <div className="flex flex-col flex-1 min-w-0 gap-[0.8vw]">
            <div className="relative overflow-hidden rounded-[3vw] bg-[#993925]" style={{ height: "26vw" }}>
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
                <div style={{ transform: "rotate(14.94deg)", width: "310%", height: "290%", flexShrink: 0 }}>
                  <svg fill="none" preserveAspectRatio="none" viewBox="0 0 710.79 563.451" className="w-full h-full">
                    <path d={heroSvg.p2d6d0d00} fill="#A65A4A" />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#f4efe7]">
                <p className="font-['Inter',sans-serif] font-bold" style={{ fontSize: "clamp(22px,4.4vw,64px)", lineHeight: 1 }}>28+</p>
                <p className="font-['Inter',sans-serif] font-medium italic text-center mt-[0.9vw]" style={{ fontSize: "clamp(10px,2.1vw,30px)", lineHeight: 1.27, width: "64%" }}>Years Walking Alongside Women</p>
              </div>
            </div>
            <div className="bg-[#a65a4a] rounded-[3vw] flex items-center justify-center" style={{ height: "14.5vw" }}>
              <p className="font-['Fraunces',serif] font-semibold text-[#f4efe7] text-center" style={{ fontSize: "clamp(11px,1.8vw,26px)", lineHeight: 1.54, fontVariationSettings: '"SOFT" 0, "WONK" 1', width: "83%" }}>
                Small Actions.<br />Lasting Change.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile hero */}
        <div className="sm:hidden flex flex-col gap-3 px-4 mt-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl" style={{ height: "clamp(200px,58vw,280px)" }}>
            <img loading="eager" decoding="async" src={imgHeroCard} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(30,30,30,0.8)] from-[0%] to-transparent to-[55%]" />
            <p className="absolute font-['Fraunces',serif] font-semibold text-[#f4efe7]" style={{ bottom: "clamp(14px,4vw,20px)", left: "clamp(14px,4vw,20px)", fontSize: "clamp(16px,5vw,22px)", lineHeight: 1.35, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Every Woman Empowered<br />Strengthens A Family.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#a65a4a] rounded-2xl flex flex-col items-center justify-center text-[#f4efe7] text-center" style={{ padding: "clamp(14px,4.5vw,20px) 8px" }}>
              <p className="font-['Inter',sans-serif] font-bold leading-none" style={{ fontSize: "clamp(20px,6.5vw,28px)" }}>500+</p>
              <p className="font-['Inter',sans-serif] leading-tight px-2 mt-1.5" style={{ fontSize: "clamp(11px,3.2vw,13px)" }}>Women Leading<br />Communities</p>
            </div>
            <div className="bg-[#993925] rounded-2xl flex flex-col items-center justify-center text-[#f4efe7] text-center" style={{ padding: "clamp(14px,4.5vw,20px) 8px" }}>
              <p className="font-['Inter',sans-serif] font-bold leading-none" style={{ fontSize: "clamp(20px,6.5vw,28px)" }}>28+</p>
              <p className="font-['Inter',sans-serif] italic leading-tight px-2 mt-1.5" style={{ fontSize: "clamp(11px,3.2vw,13px)" }}>Years Walking<br />Alongside Women</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="bg-[#a65a4a] relative overflow-hidden mt-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute" style={{ inset: "-36.89% -18.29% -45.2% -17.98%" }}>
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1962.28 389.665" xmlnsXlink="http://www.w3.org/1999/xlink">
              <g>
                <g>
                  {[
                    "matrix(0 0 0 0 1895.98 134.034)", "translate(1896.01 134.126) scale(2.8373e-05) rotate(82.6921)",
                    "translate(978.602 128.438) scale(0.309402) rotate(-90.7474)", "translate(932.332 167.033) scale(0.308898) rotate(-60.9147)",
                    "translate(541.344 260.453) scale(0.294442) rotate(-87.6413)", "translate(313.3 318.814) scale(0.206479) rotate(-155.035)",
                    "translate(242.21 278.793) scale(0.203602) rotate(-71.0532)", "translate(290.515 187.924) scale(0.192121) rotate(-18.8363)",
                    "translate(455.804 104.054) scale(0.158718) rotate(-13.9323)", "translate(686.835 65.2657) scale(0.279792) rotate(-14.8195)",
                    "translate(798.751 126.377) scale(0.275509) rotate(-171.81)", "translate(1082.54 101.464) scale(0.309392) rotate(157.409)",
                    "translate(1260.29 79.3244) scale(0.284444) rotate(137.378)", "translate(1238.1 64.0513) scale(0.286345) rotate(111.917)",
                    "translate(1495.65 92.6092) scale(0.202586) rotate(-135.526)", "translate(1503.24 73.3141) scale(0.208261) rotate(172.747)",
                    "translate(1786.28 131.087) scale(0.0790798) rotate(-178.677)", "translate(1821.32 287.98) scale(0.123915) rotate(118.468)",
                    "translate(1363.32 323.427) scale(0.257431) rotate(-144.538)", "translate(1090.95 399.056) scale(0.303713) rotate(-164.727)",
                    "translate(952.745 310.084) scale(0.306993) rotate(-99.7518)", "translate(748.024 270.866) scale(0.300073) rotate(172.86)",
                    "translate(568 230) scale(0.24) rotate(150)", "translate(400 310) scale(0.21) rotate(-170)",
                    "translate(200 180) scale(0.19) rotate(-20)", "translate(100 200) scale(0.015) rotate(170)",
                  ].map((t, i) => (
                    <use key={i} transform={t} xlinkHref="#s_dot" />
                  ))}
                </g>
              </g>
              <defs>
                <g id="s_dot">
                  <path d={statsSvg.p394b980} fill="#B8704E" />
                </g>
              </defs>
            </svg>
          </div>
        </div>
        <div className="relative py-10 lg:py-0 lg:h-[214px] flex items-center justify-center px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 lg:gap-x-[60px] lg:gap-y-0 w-full max-w-[1100px] text-[#f4efe7] text-center">
            {[
              { num: "3,200+", label: "Girls Supported\nThrough Education" },
              { num: "1,800+", label: "Families Building\nSustainable Livelihoods" },
              { num: "250+", label: "Community Workshops\nConducted" },
              { num: "872+", label: "Supporters\nDriving Change" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-2 lg:gap-[14px] items-center">
                <p className={`${inter()} font-bold text-[28px] lg:text-[40px] leading-tight lg:leading-[40px]`}>{s.num}</p>
                <p className={`${inter()} font-normal text-[13px] lg:text-[20px] leading-snug lg:leading-[30px] max-w-[180px] lg:max-w-[232px]`} style={{ whiteSpace: "pre-line" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Impact ── */}
      <section id="our-impact" className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Our Impacts" />
            <SectionTitle text="How We Create Impact" center />
            <p className={`${inter()} text-[#1e1e1e]/75 text-[18px] leading-relaxed mt-4 max-w-[600px] mx-auto`}>
              Mahila Action works alongside communities through connected programs that empower women, children, and families to build sustainable futures.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {impactCards.map((card) => (
              <div key={card.title} className="group relative rounded-2xl overflow-hidden cursor-pointer h-[340px]">
                <img loading="lazy" decoding="async" src={card.img} alt={card.title} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/30 to-transparent" />
                <div className="absolute top-4 left-4 bg-[#b66e5f] text-white p-3 rounded-2xl">{card.icon}</div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className={`${inter()} text-[#f4efe7] text-[18px] font-semibold`}>{card.title}</p>
                  <p className={`${inter()} text-[#f4efe7]/80 text-[14px] mt-1`}>{card.desc}</p>
                </div>
                <div className="absolute inset-0 bg-[#a65a4a] flex flex-col justify-center items-start p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white mb-3">{card.icon}</div>
                  <p className={`${inter()} text-[#f4efe7] text-[20px] font-semibold mb-3`}>{card.title}</p>
                  <p className={`${inter()} text-[#f4efe7]/90 text-[15px] leading-relaxed`}>{card.desc}</p>
                  <button onClick={() => openDetail(card.id)} className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-5 opacity-85 hover:opacity-100 cursor-pointer`}>
                    Read Story →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Event Registrations ── */}
      <section className="py-20 px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <SectionLabel text="Event Registrations" />
            <SectionTitle text="Join The Movement" />
            <p className={`${inter()} text-[#1e1e1e]/75 text-[18px] leading-relaxed mt-4 max-w-[440px]`}>
              Real change starts with participation. Volunteer your time, share your skills, or join a community event near you.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={handleReserveClick}
                disabled={!featuredEvent}
                className={`${inter()} bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold px-10 py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {eventOpen ? "Reserve Your Seat" : "See Events"}
              </button>
              <button
                onClick={() => goToPage("eventsBlog")}
                className={`${inter()} border-2 border-[#a65a4a] text-[#a65a4a] text-[17px] font-semibold px-10 py-4 rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer flex items-center gap-2`}
              >
                More Events <ArrowRight size={18} />
              </button>
            </div>
          </div>
          {featuredEvent ? (
            <div className="w-full lg:flex-1 min-w-0">
              <EventCard
                event={featuredEvent}
                categoryName={categoryName(featuredEvent.categoryId)}
                onReserve={() => handleReserveClick()}
              />
            </div>
          ) : (
            <div className="w-full lg:flex-1 h-[380px] rounded-2xl bg-[#a65a4a]/10 flex items-center justify-center">
              <p className={`${inter()} text-[#1e1e1e]/50 text-[16px]`}>No events scheduled right now — check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Community Stories ── */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Community Stories" />
            <SectionTitle text="Lives In Motion" center />
            <p className={`${inter()} text-[#1e1e1e]/75 text-[20px] leading-relaxed mt-4 max-w-[700px] mx-auto`}>
              Every initiative creates a ripple effect that reaches individuals, families, and entire communities.
            </p>
          </div>
          {stories.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((s) => (
                  <div key={s.id} className="rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full">
                    <div className="h-[220px] shrink-0 overflow-hidden rounded-t-2xl">
                      <img loading="lazy" decoding="async" src={s.img} alt={s.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="bg-[#a65a4a] p-6 rounded-b-2xl flex-1 flex flex-col">
                      <p className={`${inter()} text-[#f4efe7] text-[20px] font-semibold capitalize line-clamp-2`}>{s.title}</p>
                      <p className={`${inter()} text-[#f4efe7]/85 text-[16px] leading-relaxed mt-3 line-clamp-3`}>{s.excerpt}</p>
                      <button onClick={() => openStoryBlog(s.id)} className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-auto pt-6 opacity-85 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1 w-fit`}>
                        Read Story <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-10">
                <button
                  onClick={() => goToPage("stories")}
                  className={`${inter()} border-2 border-[#a65a4a] text-[#a65a4a] text-[17px] font-semibold px-10 py-4 rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer flex items-center gap-2`}
                >
                  More Stories <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
          {stories.length === 0 && (
            <p className={`${inter()} text-center text-[#1e1e1e]/50 text-[16px] py-10`}>Something big is cooking! Check back soon.</p>
          )}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 px-6 bg-[#993925]">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className={`${fraunces()} text-[#f4efe7] text-[42px] md:text-[52px] leading-tight`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
            One Contribution. Many Futures.
          </h2>
          <p className={`${inter()} text-[#f4efe7]/85 text-[18px] mt-4 leading-relaxed`}>
            Your support directly funds programs that transform lives. Help us reach more women, more families, more communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button onClick={() => { setPage("donate"); window.scrollTo({ top: 0 }); }} className={`${inter()} bg-[#f4efe7] text-[#a65a4a] text-[17px] font-bold px-10 py-4 rounded-full hover:bg-white transition-colors cursor-pointer`}>
              Donate Now
            </button>
            <button onClick={() => { setPage("about"); window.scrollTo({ top: 0 }); }} className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[17px] font-semibold px-10 py-4 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer`}>
              Learn More
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
