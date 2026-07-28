"use client";

import { useState } from "react";
import { STORY_FALLBACK_IMAGES } from "../constants/fallbacks";
import { imgHeroCard, imgStory1 } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { PageBanner } from "../components/PageBanner";
import { inter, fraunces, type Page } from "../components/shared/styleHelpers";

export function StoriesPage({ setPage: _setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { openModal } = useModal();

  const storyPosts = siteData.blogPosts.filter((p) => p.section === "story");
  const filtered =
    activeCategory === "All"
      ? storyPosts
      : storyPosts.filter((s) => s.categoryId === activeCategory);

  const activeCategoryHasNoPosts = activeCategory !== "All" && filtered.length === 0;

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgHeroCard} title="Our Stories" />

      {/* Filter tabs */}
      <section className="py-10 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveCategory("All")}
              className={`${inter()} text-[16px] font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer ${activeCategory === "All"
                ? "bg-[#a35848] text-[#f4efe7]"
                : "bg-[#f4efe7] border border-[#a35848] text-[#a35848] hover:bg-[#a35848]/10"
                }`}
            >
              All
            </button>
            {siteData.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`${inter()} text-[16px] font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer ${activeCategory === cat.id
                  ? "bg-[#a35848] text-[#f4efe7]"
                  : "bg-[#f4efe7] border border-[#a35848] text-[#a35848] hover:bg-[#a35848]/10"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Story grid */}
      <section className="pb-20 px-6">
        {filtered.length > 0 && (
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col">
                <div className="h-[220px] shrink-0 overflow-hidden rounded-t-2xl bg-[#a35848]/20">
                  <img loading="lazy" decoding="async"
                    src={s.coverImage || STORY_FALLBACK_IMAGES[s.id]?.banner || imgStory1}
                    alt={s.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="bg-[#a35848] p-6 rounded-b-2xl flex flex-col flex-1">
                  <p className={`${inter()} text-[#f4efe7] text-[22px] font-semibold capitalize line-clamp-2`}>{s.title}</p>
                  <p className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-3 line-clamp-3`}>{s.excerpt}</p>
                  <button
                    onClick={() => openModal("story", { id: s.id })}
                    className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-auto pt-4 opacity-85 hover:opacity-100 transition-opacity cursor-pointer text-left`}
                  >
                    Read Story →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeCategoryHasNoPosts && (
          <div className="text-center py-20">
            <p className={`${fraunces()} text-[#a65a4a] text-[26px] font-semibold mb-2`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Something Big Is Cooking!
            </p>
            <p className={`${inter()} text-[#1e1e1e]/50 text-[16px]`}>
              We're preparing stories for this category — check back soon.
            </p>
          </div>
        )}

        {activeCategory === "All" && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className={`${inter()} text-[#1e1e1e]/50 text-[18px]`}>No stories yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}
