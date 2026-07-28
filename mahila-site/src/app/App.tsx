"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { Toaster } from "sonner";
import { DEFAULTS, loadContent, type ContentMap } from "@/lib/content";
import { DEFAULT_SITE_DATA, loadSiteData, type SiteData } from "@/lib/data";
import { Seo } from "./components/seo/Seo";
import { getRouteMeta } from "@/config/routes";
import { getPageJsonLd } from "@/lib/jsonld";
import { EventsBlogPage } from "./EventsBlogPage";
import { ComingSoonModal } from "./ComingSoonModal";

// Context
import { ContentContext } from "./context/ContentContext";
import { SiteDataContext } from "./context/SiteDataContext";

// Shared helpers
import { PAGE_TO_PATH, pathToPage, type Page } from "./components/shared/styleHelpers";
import { imgAboutBanner } from "./constants/images";

// Components
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";

// Modals
import { GlobalModals } from "./modals/GlobalModals";

// Pages
import { HomePage } from "./pages/HomePage";
import { AboutPage } from "./pages/AboutPage";
import { StoriesPage } from "./pages/StoriesPage";
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
    loadContent().then(setContent);
    loadSiteData().then(setSiteData);
  }, []);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      navigate("/home", { replace: true });
    }
  }, [location.pathname, navigate]);

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
          {page === "eventsBlog" && <EventsBlogPage posts={siteData.blogPosts.filter(p => p.section === "event")} bannerImg={imgAboutBanner} />}
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