"use client";

import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { DEFAULTS, loadContent, type ContentMap } from "@/lib/content";
import { DEFAULT_SITE_DATA, loadSiteData, type SiteData } from "@/lib/data";
import { Seo } from "./components/seo/Seo";
import { getRouteMeta } from "@/config/routes";
import { getPageJsonLd } from "@/lib/jsonld";
import { ComingSoonModal } from "./modals/ComingSoonModal";

// Context
import { ContentContext } from "./context/ContentContext";
import { SiteDataContext } from "./context/SiteDataContext";

// Shared helpers
import { PAGE_TO_PATH, pathToPage, scrollToTop, type Page } from "./components/shared/styleHelpers";

// Components
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { AdminObservationBar } from "./components/AdminObservationBar";

// Modals
import { GlobalModals } from "./modals/GlobalModals";

// Pages
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { StoriesPage } from "./pages/StoriesPage";
import { EventsPage } from "./pages/EventsPage";
import { EventsBlogPage } from "./pages/EventsBlogPage";
import { DonatePage } from "./pages/DonatePage";
import { ContactPage } from "./pages/ContactPage";
import { AccountPage } from "./pages/AccountPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/TermsOfServicePage";

const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pathToPage(location.pathname);
  const setPage = useCallback((p: Page) => navigate(PAGE_TO_PATH[p]), [navigate]);

  const [content, setContent] = useState<ContentMap>(DEFAULTS);
  const [siteData, setSiteData] = useState<SiteData>(DEFAULT_SITE_DATA);

  useEffect(() => {
    let isMounted = true;
    let syncInProgress = false;

    async function refreshData(silent = true) {
      if (syncInProgress) return;
      syncInProgress = true;
      try {
        const [freshContent, freshSiteData] = await Promise.all([
          loadContent(),
          loadSiteData(),
        ]);
        if (!isMounted) return;
        setContent((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(freshContent)) return prev;
          return freshContent;
        });
        setSiteData((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(freshSiteData)) return prev;
          return freshSiteData;
        });
      } catch (err) {
        console.warn("Background data sync warning:", err);
      } finally {
        syncInProgress = false;
      }
    }

    // 1. Initial load
    refreshData(false);

    // 2. Cross-tab BroadcastChannel (<5ms instant sync across browser tabs)
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("mahila_live_channel");
      channel.onmessage = (e) => {
        if (
          e.data === "sitedata_changed" ||
          e.data === "submissions_updated" ||
          e.data === "content_changed" ||
          e.data === "sync_all"
        ) {
          refreshData(true);
        }
      };
    }

    // 3. Custom event listeners
    const handleSync = () => refreshData(true);
    window.addEventListener("mahila_sitedata_changed", handleSync);
    window.addEventListener("mahila_content_changed", handleSync);
    window.addEventListener("mahila_submissions_changed", handleSync);

    // 4. Instant sync on tab focus or visibility resume
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // 5. Continuous background polling (every 15 seconds)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshData(true);
      }
    }, 15000);

    return () => {
      isMounted = false;
      if (channel) channel.close();
      window.removeEventListener("mahila_sitedata_changed", handleSync);
      window.removeEventListener("mahila_content_changed", handleSync);
      window.removeEventListener("mahila_submissions_changed", handleSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Track active path in sessionStorage so browser refresh always stays on the exact page
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.pathname && location.pathname !== "/" && location.pathname !== "") {
      try {
        sessionStorage.setItem("mahila_active_path", location.pathname + location.search);
      } catch {}
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      let targetPath = "/home";
      try {
        const saved = sessionStorage.getItem("mahila_active_path");
        if (saved && saved !== "/" && saved !== "/home" && saved.startsWith("/")) {
          targetPath = saved;
        }
      } catch {}
      navigate(targetPath, { replace: true });
      return;
    }

    const segments = location.pathname.split("/").filter(Boolean);
    const first = segments[0]?.toLowerCase();
    const slugId = segments[1];

    if (slugId && !location.search.includes("modal=")) {
      if (first === "events" || first === "event") {
        navigate({ pathname: "/events", search: `?modal=reserve&id=${encodeURIComponent(slugId)}` }, { replace: true });
      } else if (first === "stories" || first === "story") {
        navigate({ pathname: "/stories", search: `?modal=story&id=${encodeURIComponent(slugId)}` }, { replace: true });
      } else if (first === "impact" || first === "impacts") {
        navigate({ pathname: "/home", search: `?modal=impact&id=${encodeURIComponent(slugId)}` }, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (page !== "admin") {
      scrollToTop("instant");
      const raf = requestAnimationFrame(() => {
        scrollToTop("instant");
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [location.pathname, page]);

  if (page === "admin") {
    return (
      <ContentContext.Provider value={content}>
        <SiteDataContext.Provider value={siteData}>
          <Seo meta={getRouteMeta("/admin")} />
          <Toaster position="top-center" richColors />
          <ComingSoonModal />
          <Suspense
            fallback={
              <div className="min-h-screen bg-[#f4efe7] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8b263e]"></div>
              </div>
            }
          >
            <AdminPage
              onExit={(targetPage) => setPage(targetPage || "home")}
              onContentSaved={(updated) => setContent(updated)}
              siteData={siteData}
              onSiteDataChange={setSiteData}
            />
          </Suspense>
        </SiteDataContext.Provider>
      </ContentContext.Provider>
    );
  }

  const routeMeta = getRouteMeta(PAGE_TO_PATH[page]);
  const pageJsonLd = getPageJsonLd(routeMeta);

  return (
    <ContentContext.Provider value={content}>
      <SiteDataContext.Provider value={siteData}>
        <div className="min-h-screen bg-[#f4efe7]">
          <Seo meta={routeMeta} jsonLd={pageJsonLd} />
          <Toaster position="top-center" richColors />
          <ComingSoonModal />
          <AdminObservationBar page={page} setPage={setPage} />
          <Navigation page={page} setPage={setPage} />
          {page === "home" && <HomePage setPage={setPage} />}
          {page === "about" && <AboutPage setPage={setPage} />}
          {page === "stories" && <StoriesPage setPage={setPage} />}
          {page === "events" && <EventsPage setPage={setPage} />}
          {page === "eventsBlog" && <EventsBlogPage setPage={setPage} />}
          {page === "donate" && <DonatePage />}
          {page === "contact" && <ContactPage />}
          {page === "account" && <AccountPage setPage={setPage} />}
          {page === "privacy" && <PrivacyPolicyPage setPage={setPage} />}
          {page === "terms" && <TermsOfServicePage setPage={setPage} />}
          <Footer setPage={setPage} />
          <GlobalModals />
        </div>
      </SiteDataContext.Provider>
    </ContentContext.Provider>
  );
}
