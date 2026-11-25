"use client";

import { useState, useMemo } from "react";
import { Shield } from "lucide-react";
import { imgHeroCard } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { useAdminMode } from "../hooks/useAdminMode";
import { useModal } from "../hooks/useModal";
import { PageBanner } from "../components/PageBanner";
import { FilterTabs } from "../components/FilterTabs";
import { StoryCard } from "../components/StoryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { type Page } from "../components/shared/styleHelpers";
import { findCategory } from "@/lib/data";

export function StoriesPage({ setPage: _setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const isAdmin = useAdminMode();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { openModal } = useModal();

  const storyPosts = useMemo(() => {
    const toTime = (d?: string) => {
      if (!d) return 0;
      const t = new Date(d).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    return [...siteData.blogPosts]
      .filter((p) => p.section === "story" && (isAdmin ? true : p.published !== false))
      .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
  }, [siteData.blogPosts, isAdmin]);

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
      <section className="py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          <FilterTabs
            options={siteData.categories}
            activeId={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
      </section>

      {/* Story grid */}
      <section className="pb-16 sm:pb-20 px-4 sm:px-6">
        {isAdmin && (
          <div className="max-w-[1200px] mx-auto mb-6 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm font-semibold">
              <Shield size={18} className="text-amber-700 shrink-0" />
              <span>Admin Mode Active: Showing all stories (including drafts).</span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-1 rounded-full shrink-0">
              Admin
            </span>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
            {filtered.map((s) => (
              <StoryCard
                key={s.id}
                title={s.title}
                excerpt={s.excerpt}
                coverImage={s.coverImage}
                galleryCount={Array.isArray(s.gallery) ? s.gallery.length : 0}
                isDraft={s.published === false}
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
