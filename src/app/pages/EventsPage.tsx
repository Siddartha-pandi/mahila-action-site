"use client";

import { useState } from "react";
import { isEventOpen, type EventItem } from "@/lib/data";
import { BlogDetailModal } from "../modals/BlogDetailModal";
import { imgAboutBanner } from "../constants/images";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { EventCard } from "../components/EventCard";
import { PageBanner } from "../components/PageBanner";
import { SectionLabel, SectionTitle } from "../components/SectionLabel";
import { FilterTabs } from "../components/FilterTabs";
import { StoryCard } from "../components/StoryCard";
import { EmptyState } from "../components/ui/EmptyState";
import { inter } from "../components/shared/styleHelpers";

const ALL = "All";

/** Upcoming events first (soonest first), then past ones (most recent first). */
function sortForDisplay(events: EventItem[], now = new Date()): EventItem[] {
  const time = (e: EventItem) => {
    const t = new Date(e.eventDate).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  const isPast = (e: EventItem) => time(e) > 0 && time(e) < now.getTime() && !isEventOpen(e, now);
  return [...events].sort((a, b) => {
    const pastA = isPast(a);
    const pastB = isPast(b);
    if (pastA !== pastB) return pastA ? 1 : -1;
    return pastA ? time(b) - time(a) : time(a) - time(b);
  });
}

export function EventsPage() {
  const siteData = useSiteData();
  const { openModal } = useModal();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Sort events so openings (date >= now) come first, soonest-first; past events follow newest-first
  const now = new Date();
  const time = (e: EventItem) => {
    const t = new Date(e.eventDate).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  const allEvents = [...siteData.events];
  const openings = allEvents.filter((e) => time(e) >= now.getTime()).sort((a, b) => time(a) - time(b)); // soonest upcoming first
  const pasts = allEvents.filter((e) => time(e) < now.getTime()).sort((a, b) => time(b) - time(a)); // most recent past first
  const events = [...openings, ...pasts];

  // Past event blog posts (most recent first). These will be filterable with chips.
  const [postActiveCategory, setPostActiveCategory] = useState<string>(ALL);
  const allEventPosts = [...siteData.blogPosts]
    .filter((p) => p.section === "event")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

  const selectedPostCatObj = dedupedCategories.find((c) => c.id === postActiveCategory || c.name === postActiveCategory);
  const postTargetCategoryKeys = new Set(
    [postActiveCategory, selectedPostCatObj?.id, selectedPostCatObj?.name].filter(Boolean) as string[]
  );
  const eventPosts =
    postActiveCategory === ALL
      ? allEventPosts
      : allEventPosts.filter((p) => p.categoryId && postTargetCategoryKeys.has(p.categoryId));

  function handleReserve(ev: EventItem) {
    if (isEventOpen(ev)) openModal("reserve", { id: ev.id });
    else openModal("closed");
  }

  function navigatePost(dir: -1 | 1) {
    setActiveIndex((i) => {
      if (i === null) return i;
      const next = i + dir;
      if (next < 0 || next >= eventPosts.length) return i;
      return next;
    });
  }

  function categoryName(categoryId: string | null) {
    if (!categoryId) return undefined;
    return siteData.categories.find((c) => c.id === categoryId || c.name === categoryId)?.name ?? categoryId;
  }

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgAboutBanner} title="Events" />

      {/* ── Event Registrations ── */}
      <section className="pt-14 pb-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="Event Registrations" />
            <SectionTitle text="Join The Movement" center />
            <p className={`${inter()} text-[#1e1e1e]/75 text-[17px] leading-relaxed mt-4 max-w-[640px] mx-auto`}>
              Every event we run is open to the community. Reserve your seat for any ongoing registration below.
            </p>
          </div>

          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  categoryName={categoryName(ev.categoryId)}
                  onReserve={handleReserve}
                  className="h-[420px]"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Something Big Is Cooking!"
              description={
                "No events scheduled right now — check back soon."
              }
            />
          )}
        </div>
      </section>

      {/* ── Past events blog ── */}
      <section className="py-16 px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="What We've Done" />
            <SectionTitle text="Events Blog" center />
            <p className={`${inter()} text-[#1e1e1e]/70 text-[17px] max-w-[640px] mx-auto mt-4`}>
              A look back at the events we've run — with the stories and photos from each one.
            </p>
          </div>

          <div className="mb-10">
            <FilterTabs
              options={dedupedCategories}
              activeId={postActiveCategory}
              onChange={setPostActiveCategory}
            />
          </div>

          {eventPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
              {eventPosts.map((p, i) => (
                <StoryCard
                  key={p.id}
                  title={p.title}
                  excerpt={p.excerpt}
                  coverImage={p.coverImage}
                  onClick={() => setActiveIndex(i)}
                  ctaText="Read More →"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Something Big Is Cooking!"
              description="No past event blog posts available yet."
            />
          )}
        </div>
      </section>

      {activeIndex !== null && eventPosts[activeIndex] && (
        <BlogDetailModal
          post={eventPosts[activeIndex]}
          categoryLabel="Events Blog"
          onClose={() => setActiveIndex(null)}
          onNavigate={navigatePost}
        />
      )}
    </main>
  );
}
