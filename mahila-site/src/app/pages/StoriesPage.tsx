"use client";

import { useState } from "react";
import { STORY_FALLBACK_IMAGES } from "../constants/fallbacks";
import { imgHeroCard, imgStory1 } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { PageBanner } from "../components/PageBanner";
import { FilterTabs } from "../components/FilterTabs";
import { StoryCard } from "../components/StoryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { type Page } from "../components/shared/styleHelpers";

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
          <FilterTabs
            options={siteData.categories}
            activeId={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
      </section>

      {/* Story grid */}
      <section className="pb-20 px-6">
        {filtered.length > 0 && (
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
            {filtered.map((s) => (
              <StoryCard
                key={s.id}
                title={s.title}
                excerpt={s.excerpt}
                coverImage={s.coverImage}
                fallbackImage={STORY_FALLBACK_IMAGES[s.id]?.banner || imgStory1}
                onClick={() => openModal("story", { id: s.id })}
                ctaText="Read Story →"
              />
            ))}
          </div>
        )}

        {activeCategoryHasNoPosts && (
          <EmptyState
            title="Something Big Is Cooking!"
            description="We're preparing stories for this category — check back soon."
          />
        )}

        {activeCategory === "All" && filtered.length === 0 && (
          <EmptyState
            title="No Stories Yet"
            description="Stories will appear here once published."
          />
        )}
      </section>
    </main>
  );
}
