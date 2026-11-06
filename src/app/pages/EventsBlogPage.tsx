"use client";

import { useState, useEffect, useMemo } from "react";
import { findCategory, type BlogPost } from "@/lib/data";
import { BlogDetailModal } from "../modals/BlogDetailModal";
import { imgAboutBanner } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { PageBanner } from "../components/PageBanner";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { FilterTabs } from "../components/FilterTabs";
import { StoryCard } from "../components/StoryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { inter, fraunces, scrollToTop, type Page } from "../components/shared/styleHelpers";
import { Search, X, Calendar, ArrowRight, Shield } from "lucide-react";

const ALL = "All";

export function EventsBlogPage({ setPage }: { setPage?: (p: Page) => void }) {
  const siteData = useSiteData();
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const hasAdmin = Boolean(
        localStorage.getItem("admin_jwt") ||
        localStorage.getItem("mahila_admin_active_session_v1") ||
        document.cookie.includes("mahila_admin=") ||
        new URLSearchParams(window.location.search).get("admin") === "1" ||
        new URLSearchParams(window.location.search).get("admin") === "true"
      );
      if (hasAdmin) setIsAdmin(true);
    } catch {}
  }, []);

  // Filter raw blog posts for section "event"
  const rawEventPosts = useMemo(() => {
    return [...siteData.blogPosts]
      .filter((p) => p.section === "event" && (isAdmin ? true : p.published !== false))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [siteData.blogPosts, isAdmin]);

  const eventPosts = useMemo(() => {
    return rawEventPosts.map((p) => ({
      ...p,
      coverImage: p.coverImage || "",
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
    }));
  }, [rawEventPosts]);

  // Filter by category and search query
  const filteredPosts = useMemo(() => {
    return eventPosts.filter((post) => {
      // Category filter
      if (activeCategory !== ALL) {
        const postCat = findCategory(siteData.categories, post.categoryId);
        const actCat = findCategory(siteData.categories, activeCategory);
        const match =
          (postCat && actCat && String(postCat.id) === String(actCat.id)) ||
          String(post.categoryId) === String(activeCategory) ||
          post.categoryId === activeCategory;
        if (!match) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(q);
        const matchExcerpt = post.excerpt?.toLowerCase().includes(q);
        return matchTitle || matchExcerpt;
      }

      return true;
    });
  }, [eventPosts, activeCategory, searchQuery, siteData.categories]);

  function navigatePost(dir: -1 | 1) {
    setActiveIndex((i) => {
      if (i === null) return i;
      const next = i + dir;
      if (next < 0 || next >= filteredPosts.length) return i;
      return next;
    });
  }

  return (
    <main className="bg-[#f4efe7] min-h-screen">
      {/* ── Page Banner ── */}
      <PageBanner
        img={imgAboutBanner}
        title="Events Blog"
      />

      {/* ── Main Content Section ── */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1240px] mx-auto">
          {/* Header & Description */}
          <div className="text-center mb-8 sm:mb-10">
            <SectionLabel text="What We've Done" />
            <SectionTitle text="Memories & Field Stories" center />
            <p
              className={`${inter()} text-[#1e1e1e]/75 text-[15px] sm:text-[17px] leading-relaxed mt-3 sm:mt-4 max-w-[680px] mx-auto`}
            >
              Every event brings our community closer together. Explore stories, photo galleries,
              and reflections from our grassroots workshops, health camps, and empowerment seminars.
            </p>
          </div>

          {/* Filter Tabs & Search Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 sm:mb-10">
            <div className="flex-1 overflow-x-auto no-scrollbar py-1">
              <FilterTabs
                options={siteData.categories}
                activeId={activeCategory}
                onChange={setActiveCategory}
              />
            </div>

            {/* Quick Search */}
            <div className="relative w-full md:w-64 shrink-0">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716c]"
              />
              <input
                type="text"
                placeholder="Search event stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inter()} w-full bg-white border border-[#e7e5e4] text-[#1c1917] placeholder-[#a8a29e] text-xs sm:text-sm rounded-full pl-9 pr-8 py-2 focus:outline-none focus:border-[#a65a4a] shadow-xs transition-colors`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Admin Mode Bar */}
          {isAdmin && (
            <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-900 text-xs sm:text-sm font-semibold">
                <Shield size={18} className="text-amber-700 shrink-0" />
                <span>
                  Admin Mode Active: Showing all event blog entries (including drafts).
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-1 rounded-full shrink-0">
                Admin
              </span>
            </div>
          )}

          {/* ── Stories Grid ── */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
              {filteredPosts.map((post, i) => (
                <StoryCard
                  key={post.id}
                  title={post.title}
                  excerpt={post.excerpt}
                  coverImage={post.coverImage}
                  galleryCount={Array.isArray(post.gallery) ? post.gallery.length : 0}
                  onClick={() => setActiveIndex(i)}
                  ctaText="View Event Story & Photos →"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={searchQuery ? "No matching event stories" : "Something Big Is Cooking!"}
              description={
                searchQuery
                  ? `No stories matched "${searchQuery}". Try a different keyword or reset filters.`
                  : activeCategory === ALL
                  ? "No past event stories have been published yet. Check back soon!"
                  : "No event stories in this category yet. Check back soon!"
              }
            />
          )}

          {/* ── Upcoming Events Callout Banner ── */}
          <div className="mt-16 sm:mt-20 p-6 sm:p-10 rounded-3xl bg-[#0c0a09] text-white border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#a65a4a]/20 text-[#a65a4a] border border-[#a65a4a]/30 mb-3">
                <Calendar size={13} />
                <span>Join Our Gatherings</span>
              </div>
              <h3
                className={`${fraunces()} text-white text-2xl sm:text-3xl font-normal tracking-tight`}
                style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                Want to participate in our next event?
              </h3>
              <p className={`${inter()} text-[#a8a29e] text-sm sm:text-base mt-2`}>
                Seats are free and open to all community members, volunteers, and supporters. Reserve your seat today.
              </p>
            </div>

            {setPage && (
              <button
                onClick={() => {
                  setPage("events");
                  scrollToTop("instant");
                }}
                className={`${inter()} px-6 py-3 rounded-full bg-[#a65a4a] text-white font-semibold text-sm hover:bg-[#8f3c2c] transition-all flex items-center gap-2 shrink-0 shadow-md cursor-pointer`}
              >
                <span>View Upcoming Events</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Blog Detail Modal with Gallery ── */}
      {activeIndex !== null && filteredPosts[activeIndex] && (
        <BlogDetailModal
          post={filteredPosts[activeIndex]}
          categoryLabel="Events Blog"
          onClose={() => setActiveIndex(null)}
          onNavigate={navigatePost}
        />
      )}
    </main>
  );
}
