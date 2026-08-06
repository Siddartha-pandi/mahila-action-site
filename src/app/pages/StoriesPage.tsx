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

  const storyPosts = [...siteData.blogPosts]
    .filter((p) => p.section === "story")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Community Stories = three most recent; Our Stories = remaining older posts
  const communityStories = storyPosts.slice(0, 3);
  const ourStoriesAll = storyPosts.slice(3);

  // Deduplicate categories by normalized name (case-insensitive) to avoid duplicate chips
  const dedupedCategories = (() => {
    const seen = new Set<string>();
    const out: { id: string; name: string }[] = [];
    for (const c of siteData.categories || []) {
      const nameNorm = (c.name || "").trim().toLowerCase();
      if (!nameNorm) continue;
      if (!seen.has(nameNorm)) {
        seen.add(nameNorm);
        out.push({ id: c.id, name: c.name });
      }
    }
    return out;
  })();

  const selectedCatObj = dedupedCategories.find((c) => c.id === activeCategory || c.name === activeCategory);
  const targetCategoryKeys = new Set(
    [activeCategory, selectedCatObj?.id, selectedCatObj?.name].filter(Boolean) as string[]
  );

  const filtered =
    activeCategory === "All"
      ? ourStoriesAll
      : ourStoriesAll.filter((s) => s.categoryId && targetCategoryKeys.has(s.categoryId));

  const activeCategoryHasNoPosts = activeCategory !== "All" && filtered.length === 0;

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgHeroCard} title="Our Stories" />

      {/* Filter tabs */}
      <section className="py-10 px-6">
        <div className="max-w-[1200px] mx-auto">
          <FilterTabs
            options={dedupedCategories}
            activeId={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
      </section>

      {/* Story grid (Our Stories = older stories beyond the 3 featured on Home) */}
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
