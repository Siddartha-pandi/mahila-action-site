"use client";

import { useState } from "react";
import { imgHeroCard } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { PageBanner } from "../components/PageBanner";
import { FilterTabs } from "../components/FilterTabs";
import { StoryCard } from "../components/StoryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { type Page } from "../components/shared/styleHelpers";
import { findCategory } from "@/lib/data";

export function StoriesPage({ setPage: _setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { openModal } = useModal();

  const storyPosts = siteData.blogPosts.filter((p) => p.section === "story" && p.published !== false);

  const filtered =
    activeCategory === "All"
      ? storyPosts
      : storyPosts.filter((s) => {
          const sCat = findCategory(siteData.categories, s.categoryId);
          const actCat = findCategory(siteData.categories, activeCategory);
          if (sCat && actCat) {
            return String(sCat.id) === String(actCat.id);
          }
          return String(s.categoryId) === String(activeCategory) || s.categoryId === activeCategory;
        });

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
