"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  getSavedUserSession,
  refreshUserProfile,
  type VolunteerAccountProfile,
} from "@/lib/backend";

/**
 * The signed-in person's own profile, or null when nobody is signed in.
 *
 * Reads the session this browser already holds, keeps in step with sign-in and
 * sign-out happening elsewhere in the app (or in another tab), and asks the
 * server once per mount for the current details — so a profile edited on the
 * account page is what the next form prefills from.
 */
export function useUserProfile(): VolunteerAccountProfile | null {
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(getSavedUserSession);

  useEffect(() => {
    let active = true;

    function sync() {
      const next = getSavedUserSession();
      // Compare by value: getSavedUserSession parses fresh JSON every call, and
      // a new object identity on every event would restart consumers' effects.
      setProfile((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }

    sync();
    window.addEventListener("mahila_user_session_changed", sync);
    window.addEventListener("storage", sync);

    // Fire-and-forget: a failed refresh just leaves the cached session in place,
    // which is still better than an empty form.
    refreshUserProfile()
      .then(() => { if (active) sync(); })
      .catch(() => {});

    return () => {
      active = false;
      window.removeEventListener("mahila_user_session_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return profile;
}

/**
 * A form field that starts from the signed-in person's profile but stays fully
 * editable, for use in place of `useState("")`.
 *
 * The field follows `value` until the visitor types in it; from then on what
 * they entered is kept, including when they deliberately clear it. Passing an
 * absent detail leaves the field empty rather than prefilling something stale,
 * and signing out clears any field the visitor never touched so one person's
 * details are not left sitting in front of the next.
 */
export function useProfileField(value: string | undefined | null): [string, Dispatch<SetStateAction<string>>] {
  const [field, setField] = useState(value ?? "");
  const edited = useRef(false);

  useEffect(() => {
    if (edited.current) return;
    setField(value ?? "");
  }, [value]);

  const set: Dispatch<SetStateAction<string>> = (next) => {
    edited.current = true;
    setField(next);
  };

  return [field, set];
}
