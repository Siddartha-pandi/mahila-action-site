"use client";

import { useState, useEffect } from "react";
import { onAdminAuthChange } from "@/lib/backend";

function hasClientAdminIndicator(): boolean {
  try {
    return Boolean(
      sessionStorage.getItem("admin_jwt") ||
        sessionStorage.getItem("mahila_admin_active_session_v1")
    );
  } catch {
    return false;
  }
}

/** Tracks whether the current browser session is in Admin mode. */
export function useAdminMode(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (hasClientAdminIndicator()) {
      setIsAdmin(true);
    }

    const syncClient = () => {
      setIsAdmin(hasClientAdminIndicator());
    };
    const unsubscribe = onAdminAuthChange((loggedIn) => {
      setIsAdmin(loggedIn || hasClientAdminIndicator());
    });
    window.addEventListener("mahila_admin_auth_changed", syncClient);
    window.addEventListener("focus", syncClient);
    return () => {
      unsubscribe();
      window.removeEventListener("mahila_admin_auth_changed", syncClient);
      window.removeEventListener("focus", syncClient);
    };
  }, []);

  return isAdmin;
}
