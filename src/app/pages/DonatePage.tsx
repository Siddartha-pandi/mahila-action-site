"use client";

import { useState } from "react";
import { CAMPAIGNS, formatLakh } from "../constants/campaigns";
import { imgDonateBanner, imgTakeAction, imgStory1, imgStory2, imgStory3 } from "../constants/images";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { PageBanner } from "../components/PageBanner";
import { DonationFormCard } from "../forms/DonationFormCard";
import { inter } from "../components/shared/styleHelpers";
import { useUserProfile } from "../hooks/useUserProfile";

export function DonatePage() {
  const profile = useUserProfile();
  const featured = CAMPAIGNS[0];
  const otherCampaigns = CAMPAIGNS.slice(1);
  const campaignImages: Record<string, string> = {
    "women-leadership-fund": imgStory1,
    "skills-for-tomorrow": imgStory2,
    "community-health-drive": imgStory3,
  };
  const [selectedCampaignId, setSelectedCampaignId] = useState(featured.id);
  const progress = Math.min((featured.raised / featured.goal) * 100, 100);

  function pickCampaign(id: string) {
    setSelectedCampaignId(id);
    document.getElementById("donate-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgDonateBanner} title={`Donate For\na Cause`} />

      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10 items-start">
          {/* Campaign image side */}
          <div className="flex-1 w-full">
            <SectionLabel text="Take Action" />
            <SectionTitle text="One Contribution. Many Futures." />

            <div className="relative mt-6 rounded-2xl overflow-hidden h-[260px] sm:h-[380px] md:h-[480px]">
              <img loading="lazy" decoding="async"
                src={imgTakeAction}
                alt={featured.name}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/20 to-transparent" />

              {/* Category tag */}
              <div className="absolute top-6 left-8">
                <span className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[13px] font-bold px-8 py-2 rounded-full`}>
                  {featured.tag}
                </span>
              </div>

              {/* Campaign details */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p className={`${inter()} text-[#f4efe7] text-[22px] font-semibold`}>{featured.name}</p>
                <div className="mt-4 flex items-center justify-between mb-2">
                  <p className={`${inter()} text-[#f4efe7] text-[13px] font-semibold`}>₹{featured.raised.toLocaleString("en-IN")} Raised</p>
                  <p className={`${inter()} text-[#89a26e] text-[13px] font-semibold`}>Goal: ₹{featured.goal.toLocaleString("en-IN")}</p>
                </div>
                <div className="relative bg-white/30 rounded-full h-[5px] w-full">
                  <div className="bg-[#587735] h-[5px] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  <div className={`${inter()} absolute -top-8 bg-[#89a26e] text-[#f4efe7] text-[10px] font-semibold px-2 py-1 rounded`} style={{ left: `${progress - 4}%` }}>
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Donation form */}
          <div id="donate-form" className="w-full lg:w-[420px] shrink-0">
            <DonationFormCard
              initialCampaignId={selectedCampaignId}
              initialName={profile?.name}
              initialEmail={profile?.email}
              initialPhone={profile?.phone}
            />
          </div>
        </div>
      </section>

      {/* Other campaigns */}
      <section className="py-16 px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="More Campaigns" />
            <SectionTitle text="Every Cause Needs Your Help" center />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherCampaigns.map((c) => (
              <div key={c.id} className="bg-[#f4efe7] border-2 border-[#a65a4a]/30 rounded-2xl overflow-hidden hover:border-[#a65a4a] transition-colors group">
                <div className="relative h-[180px] overflow-hidden">
                  <img loading="lazy" decoding="async"
                    src={campaignImages[c.id]}
                    alt={c.name}
                    className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className={`${inter()} border border-[#f4efe7] text-[#f4efe7] text-[11px] font-semibold px-3 py-1 rounded-full bg-black/30`}>
                      {c.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p className={`${inter()} text-[#1e1e1e] text-[18px] font-semibold`}>{c.name}</p>
                  <div className="mt-3 bg-[#d9d9d9] rounded-full h-[4px]">
                    <div className="bg-[#587735] h-[4px] rounded-full" style={{ width: `${(c.raised / c.goal) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className={`${inter()} text-[#1e1e1e] text-[12px] font-semibold`}>{formatLakh(c.raised)} raised</p>
                    <p className={`${inter()} text-[#89a26e] text-[12px] font-semibold`}>Goal: {formatLakh(c.goal)}</p>
                  </div>
                  <button
                    onClick={() => pickCampaign(c.id)}
                    className={`${inter()} w-full bg-[#a65a4a]/10 border border-[#a65a4a] text-[#a65a4a] text-[14px] font-semibold py-2.5 rounded-full mt-4 hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-colors cursor-pointer`}
                  >
                    Donate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
