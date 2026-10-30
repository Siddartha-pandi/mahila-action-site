"use client";

import { useState, useEffect } from "react";
import { isEventOpen, saveEvent, findCategory, type EventItem } from "@/lib/data";
import { toast } from "sonner";
import { Shield } from "lucide-react";
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
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
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

  async function handleTogglePublish(ev: EventItem, published: boolean) {
    if ((ev.published !== false) === published) return;
    const patched: EventItem = { ...ev, published };
    const res = await saveEvent(patched);
    if (res.ok) {
      window.dispatchEvent(new Event("mahila_sitedata_changed"));
      if (published) {
        toast.success(`"${ev.title}" is now Published and live on the website!`);
      } else {
        toast.success(`"${ev.title}" is now Unpublished (Draft) and hidden from public.`);
      }
    } else {
      toast.error(res.error || "Failed to update event publication status.");
    }
  }

  const selectedCatObj = siteData.categories.find(
    (c) => String(c.id) === String(activeCategory) || c.name === activeCategory
  );
  const targetCategoryKeys = new Set(
    [String(activeCategory), selectedCatObj ? String(selectedCatObj.id) : null, selectedCatObj?.name].filter(Boolean) as string[]
  );

  const allEvents = sortForDisplay(siteData.events).filter((e) => isAdmin ? true : e.published !== false);
  const events =
    activeCategory === ALL
      ? allEvents
      : allEvents.filter((e) => {
          const eCat = findCategory(siteData.categories, e.categoryId);
          const actCat = findCategory(siteData.categories, activeCategory);
          if (eCat && actCat) {
            return String(eCat.id) === String(actCat.id);
          }
          return String(e.categoryId) === String(activeCategory) || e.categoryId === activeCategory;
        });

  const eventPosts = [...siteData.blogPosts]
    .filter((p) => p.section === "event" && (isAdmin ? true : p.published !== false))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleReserve(ev: EventItem) {
    if (isEventOpen(ev)) openModal("reserve", { id: String(ev.id) });
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
    return findCategory(siteData.categories, categoryId)?.name ?? categoryId;
  }

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgAboutBanner} title="Events" />

      {/* ── Upcoming events ── */}
      <section className="pt-14 pb-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="Upcoming Events" />
            <SectionTitle text="Join The Movement" center />
            <p className={`${inter()} text-[#1e1e1e]/75 text-[17px] leading-relaxed mt-4 max-w-[640px] mx-auto`}>
              Every event we run is open to the community. Filter by the area you care about, then reserve your seat.
            </p>
          </div>

          <div className="mb-10">
            <FilterTabs
              options={siteData.categories}
              activeId={activeCategory}
              onChange={setActiveCategory}
            />
          </div>

          {/* Admin Mode Bar */}
          {isAdmin && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-900">
                <Shield size={18} className="text-amber-700 shrink-0" />
                <span className="text-[13px] font-semibold">
                  Admin Mode Active: Showing all events (including drafts). Use the <strong>Publish</strong> and <strong>Unpublish</strong> buttons on each card to toggle visibility.
                </span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto">
                Admin Controls ON
              </span>
            </div>
          )}

          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  categoryName={categoryName(ev.categoryId)}
                  onReserve={handleReserve}
                  onTogglePublish={isAdmin ? handleTogglePublish : undefined}
                  className="h-[420px]"
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Something Big Is Cooking!"
              description={
                activeCategory === ALL
                  ? "No events scheduled right now — check back soon."
                  : "No events in this category yet — check back soon."
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
