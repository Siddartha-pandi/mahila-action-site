"use client";

import { useCallback } from "react";
import { useSearchParams } from "react-router";

// ── URL-driven modal state ───────────────────────────────────────────────────
// Every shareable modal (volunteer portal, event reserve/RSVP, attend, partner,
// story/impact detail, closed-event notice) is driven by ?modal=&id=&kind= search
// params instead of local component state, so any modal can be deep-linked and the
// browser back button closes it naturally.
export function useModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawModal = searchParams.get("modal");
  const modalId = searchParams.get("id") || searchParams.get("token");
  const modalKind = searchParams.get("kind");
  const modal = rawModal || (modalKind === "reset" || searchParams.has("token") ? "volunteer" : null);

  const openModal = useCallback(
    (name: string, extra?: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      next.set("modal", name);
      next.delete("id");
      next.delete("token");
      next.delete("kind");
      Object.entries(extra ?? {}).forEach(([k, v]) => next.set(k, v));
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const setModalKind = useCallback(
    (kind: string) => {
      const next = new URLSearchParams(searchParams);
      next.set("kind", kind);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const closeModal = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("modal");
    next.delete("id");
    next.delete("token");
    next.delete("kind");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return { modal, modalId, modalKind, openModal, setModalKind, closeModal };
}
