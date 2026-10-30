"use client";

import { useLocation } from "react-router";
import { upcomingOrOpenEvents, findCategory, type RegKind } from "@/lib/data";
import { BlogDetailModal } from "./BlogDetailModal";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  PROTECTED_MODAL_PROMPTS,
  isProtectedModal,
  rememberIntendedDestination,
} from "../hooks/useAuthGuard";
import { IMPACT_CARD_CATEGORY } from "../constants/fallbacks";
import { VolunteerPortal } from "./VolunteerPortal";
import { AttendEventModal, PartnerWithUsModal, ClosedEventNoticeModal, ReserveSeatModal } from "./ReserveSeatModal";

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

  if (modal === "volunteer" || modal === "login" || modal === "reset" || modal === "forgot" || modalKind === "reset" || modalKind === "forgot") {
    return (
      <VolunteerPortal
        onClose={closeModal}
        initialStep={
          modal === "reset" || modalKind === "reset"
            ? "reset"
            : modal === "forgot" || modalKind === "forgot"
            ? "forgot"
            : modal === "login" || modalKind === "login"
            ? "login"
            : undefined
        }
        resetToken={modalKind === "reset" || modal === "reset" ? (modalId ?? undefined) : undefined}
        events={siteData.events}
      />
    );
  }
  if (modal === "attend") return <AttendEventModal events={attendEvents} onClose={closeModal} />;
  if (modal === "partner") return <PartnerWithUsModal events={attendEvents} onClose={closeModal} />;
  if (modal === "closed") return <ClosedEventNoticeModal events={siteData.events} onClose={closeModal} />;

  if (modal === "reserve" && modalId) {
    const event = siteData.events.find(e => String(e.id) === String(modalId));
    if (!event) return null;
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
        ? impactPosts.find(p => String(p.id) === String(modalId)) ??
          impactPosts.find(p => {
            const foundCat = findCategory(siteData.categories, p.categoryId);
            const targetCat = findCategory(siteData.categories, IMPACT_CARD_CATEGORY[modalId] || modalId);
            return (
              String(p.categoryId) === String(IMPACT_CARD_CATEGORY[modalId]) ||
              String(p.categoryId) === String(modalId) ||
              (foundCat && targetCat && String(foundCat.id) === String(targetCat.id))
            );
          })
        : siteData.blogPosts.find(p => String(p.id) === String(modalId));
    if (!post) return null;

    const enrichedPost = {
      ...post,
      coverImage: post.coverImage || "",
      gallery: Array.isArray(post.gallery) ? post.gallery : [],
    };
    const categoryLabel =
      findCategory(siteData.categories, post.categoryId)?.name ??
      (modal === "impact" ? "Our Impacts" : "Our Stories");

    return <BlogDetailModal post={enrichedPost} categoryLabel={categoryLabel} onClose={closeModal} />;
  }

  return null;
}
