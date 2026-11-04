"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { CAMPAIGNS, Campaign, formatLakh } from "../constants/campaigns";
import { imgDonateBanner, imgTakeAction, imgStory1, imgStory2, imgStory3 } from "../constants/images";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { PageBanner } from "../components/PageBanner";
import { DonationFormCard } from "../forms/DonationFormCard";
import { TransactionCheckerModal } from "../modals/TransactionCheckerModal";
import { inter } from "../components/shared/styleHelpers";
import { useUserProfile } from "../hooks/useUserProfile";

export function DonatePage() {
  const profile = useUserProfile();
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);
  const [selectedCampaignId, setSelectedCampaignId] = useState(CAMPAIGNS[0].id);
  const [showChecker, setShowChecker] = useState(false);

  const campaignImages: Record<string, string> = {
    "learning-centres": imgTakeAction,
    "women-leadership-fund": imgStory1,
    "skills-for-tomorrow": imgStory2,
    "community-health-drive": imgStory3,
  };

  // Fetch live campaign totals from the API (aggregated from database donations)
  const fetchLiveCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCampaigns(data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch live campaign totals:", err);
    }
  }, []);

  useEffect(() => {
    fetchLiveCampaigns();
    window.addEventListener("mahila_campaigns_changed", fetchLiveCampaigns);
    return () => {
      window.removeEventListener("mahila_campaigns_changed", fetchLiveCampaigns);
    };
  }, [fetchLiveCampaigns]);

  // When a donation completes, immediately increment the local state so the left indicator updates with 0ms delay!
  const handleDonationSuccess = (info: { campaignId: string; amount: number }) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === info.campaignId) {
          return { ...c, raised: c.raised + info.amount };
        }
        return c;
      })
    );
    // Also re-verify with backend
    setTimeout(() => {
      fetchLiveCampaigns();
    }, 600);
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? campaigns[0];
  const otherCampaigns = campaigns.filter((c) => c.id !== selectedCampaign.id);
  const activeImage = campaignImages[selectedCampaign.id] || imgTakeAction;
  const progress = Math.min((selectedCampaign.raised / selectedCampaign.goal) * 100, 100);

  function pickCampaign(id: string) {
    setSelectedCampaignId(id);
    document.getElementById("donate-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgDonateBanner} title={`Donate For\na Cause`} />

      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-8 sm:gap-10 items-start">
          {/* Campaign image side */}
          <div className="flex-1 w-full">
            <SectionLabel text="Take Action" />
            <SectionTitle text="One Contribution. Many Futures." />

            <div className="relative mt-5 sm:mt-6 rounded-2xl overflow-hidden h-[240px] sm:h-[360px] md:h-[480px] shadow-sm">
              <img
                loading="lazy"
                decoding="async"
                src={activeImage}
                alt={selectedCampaign.name}
                className="absolute inset-0 size-full object-cover transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/20 to-transparent" />

              {/* Category tag */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-8">
                <span className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[12px] sm:text-[13px] font-bold px-4 sm:px-8 py-1.5 sm:py-2 rounded-full backdrop-blur-sm bg-black/20`}>
                  {selectedCampaign.tag}
                </span>
              </div>

              {/* Campaign details */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8">
                <p className={`${inter()} text-[#f4efe7] text-[18px] sm:text-[22px] font-semibold transition-all duration-300`}>
                  {selectedCampaign.name}
                </p>
                <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <p className={`${inter()} text-[#f4efe7] text-[15px] sm:text-[17px] font-bold tracking-wide`}>
                      ₹{selectedCampaign.raised.toLocaleString("en-IN")} Raised
                    </p>
                    <span className="text-[#89a26e] text-[12px] sm:text-[13px] font-bold bg-black/30 px-2 py-0.5 rounded-full border border-[#89a26e]/30">
                      {progress > 0 ? `${progress < 1 ? progress.toFixed(1) : Math.round(progress)}%` : "0%"}
                    </span>
                  </div>
                  <p className={`${inter()} text-[#89a26e] text-[12px] sm:text-[13px] font-semibold`}>
                    Goal: ₹{selectedCampaign.goal.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="relative bg-white/30 rounded-full h-[8px] w-full overflow-hidden shadow-inner">
                  <div
                    className="bg-[#587735] h-[8px] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(progress, selectedCampaign.raised > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Donation form */}
          <div id="donate-form" className="w-full lg:w-[460px] shrink-0 space-y-4">
            <DonationFormCard
              initialCampaignId={selectedCampaignId}
              campaigns={campaigns}
              onCampaignChange={(newId) => setSelectedCampaignId(newId)}
              onDonationSuccess={handleDonationSuccess}
              initialName={profile?.name}
              initialEmail={profile?.email}
              initialPhone={profile?.phone}
            />

            {/* UTR / Transaction Checker Card */}
            <div className="bg-white/70 border border-[#a65a4a]/25 rounded-2xl p-4 text-center space-y-1.5 shadow-sm">
              <p className={`${inter()} text-[13px] font-semibold text-[#1e1e1e]`}>
                Already contributed via UPI?
              </p>
              <p className={`${inter()} text-[12px] text-[#6e625d]`}>
                Verify transaction status or retrieve your official 80G tax receipt using your 12-digit UTR number.
              </p>
              <button
                type="button"
                onClick={() => setShowChecker(true)}
                className={`${inter()} inline-flex items-center gap-1.5 text-[13px] font-bold text-[#993925] hover:text-[#802f1e] hover:underline cursor-pointer pt-1`}
              >
                <Search size={14} /> Check UTR / Transaction Status &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      <TransactionCheckerModal
        isOpen={showChecker}
        onClose={() => setShowChecker(false)}
      />

      {/* Other campaigns */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="More Campaigns" />
            <SectionTitle text="Every Cause Needs Your Help" center />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((c) => {
              const isSelected = c.id === selectedCampaign.id;
              const cProgress = Math.min((c.raised / c.goal) * 100, 100);
              return (
                <div
                  key={c.id}
                  className={`bg-[#f4efe7] border-2 rounded-2xl overflow-hidden transition-all group ${
                    isSelected ? "border-[#993925] ring-2 ring-[#993925]/20 shadow-md" : "border-[#a65a4a]/30 hover:border-[#a65a4a]"
                  }`}
                >
                  <div className="relative h-[180px] overflow-hidden">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={campaignImages[c.id] || imgTakeAction}
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
                    <p className={`${inter()} text-[#1e1e1e] text-[18px] font-semibold line-clamp-1`}>{c.name}</p>
                    <div className="flex justify-between items-center mt-3 mb-1.5">
                      <p className={`${inter()} text-[#1e1e1e] text-[13px] font-bold`}>
                        ₹{c.raised.toLocaleString("en-IN")} raised
                      </p>
                      <span className={`${inter()} text-[#587735] text-[11px] font-bold bg-[#587735]/15 px-2 py-0.5 rounded-full`}>
                        {cProgress > 0 ? `${cProgress < 1 ? cProgress.toFixed(1) : Math.round(cProgress)}%` : "0%"}
                      </span>
                    </div>
                    <div className="bg-[#d9d9d9] rounded-full h-[6px] overflow-hidden">
                      <div
                        className="bg-[#587735] h-[6px] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(cProgress, c.raised > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <p className={`${inter()} text-[#89a26e] text-[11px] font-semibold`}>Goal: {formatLakh(c.goal)}</p>
                    </div>
                    <button
                      onClick={() => pickCampaign(c.id)}
                      className={`${inter()} w-full border text-[14px] font-semibold py-2.5 rounded-full mt-4 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#993925] text-white border-[#993925]"
                          : "bg-[#a65a4a]/10 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7]"
                      }`}
                    >
                      {isSelected ? "Selected Campaign" : "Donate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
