"use client";

import { useLocation } from "react-router";
import { upcomingOrOpenEvents, type RegKind } from "@/lib/data";
import { BlogDetailModal } from "./BlogDetailModal";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  PROTECTED_MODAL_PROMPTS,
  isProtectedModal,
  rememberIntendedDestination,
} from "../hooks/useAuthGuard";
import { IMPACT_FALLBACK_IMAGES, STORY_FALLBACK_IMAGES, IMPACT_CARD_CATEGORY } from "../constants/fallbacks";
import { VolunteerPortal } from "./VolunteerPortal";
import { AttendEventModal, PartnerWithUsModal, ClosedEventNoticeModal, ReserveSeatModal } from "./ReserveSeatModal";
import { useContent } from "../context/ContentContext";
type ReserveUIKind = RegKind | "attendee";

// Global modal router — renders on every page.
// Every shareable modal is driven by ?modal=&id=&kind= search params,
// making them deep-linkable.
export function GlobalModals() {
  const siteData = useSiteData();
  const location = useLocation();
  const profile = useUserProfile();
  const { modal, modalId, modalKind, closeModal, setModalKind } = useModal();
  const attendEvents = upcomingOrOpenEvents(siteData.events);

  // Single gate for every protected modal. Because these modals are addressed
  // by URL, checking here covers buttons, deep links, shared links and the back
  // button alike — there is no second way in to leave unguarded.
  if (isProtectedModal(modal) && !profile) {
    rememberIntendedDestination(location.pathname + location.search);
    return (
      <VolunteerPortal
        onClose={closeModal}
        initialStep="login"
        events={siteData.events}
        prompt={PROTECTED_MODAL_PROMPTS[modal!]}
      />
    );
  }

  if (modal === "volunteer" || modal === "login") {
    return (
      <VolunteerPortal
        onClose={closeModal}
        initialStep={modal === "login" ? "login" : modalKind === "login" ? "login" : modalKind === "reset" ? "reset" : undefined}
        resetToken={modalKind === "reset" ? (modalId ?? undefined) : undefined}
        events={siteData.events}
      />
    );
  }
  if (modal === "attend") return <AttendEventModal events={attendEvents} onClose={closeModal} />;
  if (modal === "partner") return <PartnerWithUsModal events={attendEvents} onClose={closeModal} />;
  if (modal === "closed") return <ClosedEventNoticeModal events={siteData.events} onClose={closeModal} />;

  if (modal === "reserve" && modalId) {
    const event = siteData.events.find(e => e.id === modalId);
    if (!event) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[420px] p-7 text-center shadow-2xl">
            <p className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[14px] mb-5">
              This event couldn't be found — it may have been removed, or the link may be out of date.
            </p>
            <button onClick={closeModal} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer">
              Close
            </button>
          </div>
        </div>
      );
    }
    return (
      <ReserveSeatModal
        event={event}
        onClose={closeModal}
        initialKind={(modalKind as ReserveUIKind) ?? undefined}
        onKindChange={(k) => setModalKind(k)}
      />
    );
  }

  if ((modal === "story" || modal === "impact") && modalId) {
    const impactPosts = siteData.blogPosts.filter(p => p.section === "impact");
    const post =
      modal === "impact"
        ? impactPosts.find(p => p.id === modalId) ?? impactPosts.find(p => p.categoryId === IMPACT_CARD_CATEGORY[modalId])
        : siteData.blogPosts.find(p => p.id === modalId);

    // If there's no authored post, construct a fallback page from static content
    // so the impact card always opens a meaningful modal instead of showing an
    // error. This uses dynamic content when available, falling back to DEFAULTS.
    if (!post) {
      const content = useContent();
      const keyMap: Record<string, number> = {
        "women-leadership": 1,
        "education": 2,
        "livelihood": 3,
        "wellbeing": 4,
      };
      const idx = keyMap[modalId as string] ?? 1;
      const titleKey = `impact_card${idx}_title` as keyof typeof content;
      const descKey = `impact_card${idx}_desc` as keyof typeof content;
      const fallbackText = {
        id: modalId,
        section: "impact",
        categoryId: IMPACT_CARD_CATEGORY[modalId as string] ?? null,
        title: content[titleKey] || "Our Impact",
        excerpt: content[descKey] || "",
        content: content[descKey] || "",
      } as any;

      const fb = IMPACT_FALLBACK_IMAGES[modalId as string] ?? { banner: "", gallery: [] };
      const enrichedPost = {
        ...fallbackText,
        coverImage: fb.banner || "",
        gallery: fb.gallery || [],
      };
      const categoryLabel = siteData.categories.find(cat => String(cat.id) === String(fallbackText.categoryId))?.name ?? "Our Impacts";
      return <BlogDetailModal post={enrichedPost} categoryLabel={categoryLabel} onClose={closeModal} />;
    }

    const fb =
      modal === "impact"
        ? IMPACT_FALLBACK_IMAGES[modalId]
        : STORY_FALLBACK_IMAGES[post.id];
    const enrichedPost = {
      ...post,
      coverImage: post.coverImage || fb?.banner || "",
      gallery: post.gallery?.length ? post.gallery : (fb?.gallery ?? []),
    };
    const categoryLabel =
      siteData.categories.find(cat => String(cat.id) === String(post.categoryId))?.name ??
      (modal === "impact" ? "Our Impacts" : "Our Stories");

    return <BlogDetailModal post={enrichedPost} categoryLabel={categoryLabel} onClose={closeModal} />;
  }

  return null;
}
