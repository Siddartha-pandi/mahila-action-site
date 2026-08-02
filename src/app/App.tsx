"use client";

import { useState, useEffect, useCallback } from "react";
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
import { PAGE_TO_PATH, pathToPage, type Page } from "./components/shared/styleHelpers";

// Components
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";

// Modals
import { GlobalModals } from "./modals/GlobalModals";

// Pages
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { StoriesPage } from "./pages/StoriesPage";
import { EventsPage } from "./pages/EventsPage";
import { DonatePage } from "./pages/DonatePage";
import { ContactPage } from "./pages/ContactPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pathToPage(location.pathname);
  const setPage = useCallback((p: Page) => navigate(PAGE_TO_PATH[p]), [navigate]);

  const [content, setContent] = useState<ContentMap>(DEFAULTS);
  const [siteData, setSiteData] = useState<SiteData>(DEFAULT_SITE_DATA);

  useEffect(() => {
    function refreshData() {
      loadContent().then(setContent);
      loadSiteData().then(setSiteData);
    }
    refreshData();
    // Only re-fetch CMS data when an admin explicitly saves a change.
    // The broad "storage" listener was firing on every localStorage write
    // (submissions polling, session saves, etc.) causing 7 DB requests per cycle.
    window.addEventListener("mahila_sitedata_changed", refreshData);
    return () => {
      window.removeEventListener("mahila_sitedata_changed", refreshData);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      // Keep the query string — emailed links land on "/" carrying the modal
      // they need to open (e.g. ?modal=volunteer&kind=reset&id=<token>), and
      // dropping it here sent people to a bare home page instead.
      navigate({ pathname: "/home", search: location.search }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (page !== "admin") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  if (page === "admin") {
    return (
      <ContentContext.Provider value={content}>
        <SiteDataContext.Provider value={siteData}>
          <Seo meta={getRouteMeta("/admin")} />
          <Toaster position="top-center" richColors />
          <ComingSoonModal />
          <AdminPage
            onExit={() => setPage("home")}
            onContentSaved={(updated) => setContent(updated)}
            siteData={siteData}
            onSiteDataChange={setSiteData}
          />
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
          <Navigation page={page} setPage={setPage} />
          {page === "home" && <HomePage setPage={setPage} />}
          {page === "about" && <AboutPage setPage={setPage} />}
          {page === "stories" && <StoriesPage setPage={setPage} />}
          {page === "eventsBlog" && <EventsPage />}
          {page === "donate" && <DonatePage />}
          {page === "contact" && <ContactPage />}
          {page === "account" && <AccountPage setPage={setPage} />}
          <Footer setPage={setPage} />
          <GlobalModals />
        </div>
      </SiteDataContext.Provider>
    </ContentContext.Provider>
  );
}