import { useState, useCallback, useEffect, createContext, useContext, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { Toaster, toast } from "sonner";
import { loadContent, saveAllContent, DEFAULTS, type ContentMap } from "@/lib/content";
import { saveReservation, saveVolunteer, saveContact, saveDonation, saveVendor, signInAdmin, signOutAdmin, onAdminAuthChange, registerVolunteer, loginVolunteer, requestVolunteerPasswordReset, resetVolunteerPassword, getUserSubmissions, getSavedUserSession, saveUserSession, type VolunteerAccountProfile, type SubmissionItem } from "@/lib/backend";
import { showComingSoonModal } from "@/lib/comingSoon";
import { ComingSoonModal } from "./ComingSoonModal";
import {
  SiteData,
  DEFAULT_SITE_DATA,
  loadSiteData,
  isEventOpen,
  isWindowOpen,
  upcomingOrOpenEvents,
  type EventItem,
  type BlogPost,
  type RegKind,
} from "@/lib/data";
import { EventsAdmin } from "./admin/EventsAdmin";
import { BlogPostsAdmin } from "./admin/BlogPostsAdmin";
import { CategoriesAdmin } from "./admin/CategoriesAdmin";
import { CouncilorsAdmin } from "./admin/CouncilorsAdmin";
import { TimelineAdmin } from "./admin/TimelineAdmin";
import { ContactAdmin } from "./admin/ContactAdmin";
import { SubmissionsAdmin } from "./admin/SubmissionsAdmin";
import { RolesAdmin } from "./admin/RolesAdmin";
import {
  getCurrentAdminSession,
  setCurrentAdminSession,
  clearAdminSession,
  hasPermission,
  getRoleById,
  AdminUser,
  AdminModule,
} from "@/lib/permissions";
import { isValidPhoneNumber } from "@/lib/validation";
import { ImageField } from "./adminWidgets";
import { BlogDetailModal } from "./BlogDetailModal";
import { EventsBlogPage } from "./EventsBlogPage";
import { Seo } from "./components/seo/Seo";
import { getRouteMeta } from "@/config/routes";
import { getPageJsonLd } from "@/lib/jsonld";
import {
  Users,
  BookOpen,
  Briefcase,
  Heart,
  Calendar,
  MapPin,
  ArrowRight,
  Menu,
  X,
  CheckCircle,
  ChevronRight,
  LogIn,
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  UserCheck,
  Clock,
  Sparkles,
  Plus,
  UserPlus,
} from "lucide-react";

// ── Image imports from design assets ──────────────────────────────────────
import imgLogo from "@/imports/Concept2Home/9d095694bb05f68181e7700b7124281eb76c32ec.png";
import imgHeroCard from "@/imports/Concept2Home/574a812d0534a3409e7d3ed51ab995ae09ecd87a.png";
import imgHeroMain from "@/imports/Concept2Home/4ee3403c1c1f677ea9374f8484c6313c017d1716.png";
import imgHeroSide from "@/imports/Concept2Home/acf2f9e42e364c8ee9e324fb3c6d06a0a7d96de4.png";
import imgImpact1 from "@/imports/Concept2Home/207f7c7263e14103baf5c0de63b15703fa9a8f0f.png";
import imgImpact2 from "@/imports/Concept2Home/aa46b6c282e301c3380b3a4d31e5ab88cc44c53a.png";
import imgImpact3 from "@/imports/Concept2Home/f28b554308160cb557d229aae64de1b275d2a425.png";
import imgImpact4 from "@/imports/Concept2Home/de694d5098550aee3d3b0432e1a2a521925c2237.png";
import imgEvent from "@/imports/Concept2Home/39242dfa2d4add5f76889c42da60d903f880be6f.png";
import imgStory1 from "@/imports/Concept2Home/788d28db62c65b5f55d746c307e794795661454c.png";
import imgStory2 from "@/imports/Concept2Home/b52b755f8d429ab1b616fa86054c8530f2afc2a1.png";
import imgStory3 from "@/imports/Concept2Home/d4c160441601d59ba0b0f336d73394c0932d78d5.png";
import imgTakeAction from "@/imports/Concept2Home/6bd40b4d49b728881886868554ea429eeb0d2e01.png";
import imgHeroBackground from "@/imports/Concept2Home/9baa8187a2a80817e17111956702e6ca42b952ad.png";
import imgAboutBanner from "@/imports/Concept2WhoWeAre/2d1b5465a5dfdae07df9d30b92aa1a1930398a6c.png";
import heroSvg from "@/imports/Concept2Home-1/svg-664soetde0";
import imgDonateBanner from "@/imports/Concept2OurStories-1/61a25ebae5fc11149647a322766e8dc9b88b32ef.png";
import imgContextBanner from "@/imports/OurImpactContext/3970bc7fdf4596cd43d76a5d0ccbcee6dcea96f4.png";
import statsSvg from "@/imports/Stats/svg-gzhi309knq";
import imgGal1 from "@/imports/OurImpactContext/7b58b11459d66003eec9a212bdbdee039f5c987a.png";
import imgGal2 from "@/imports/OurImpactContext/38021a4b2f63e6bac08244a7b1ff6424951cf374.png";
import imgGal3 from "@/imports/OurImpactContext/2e8ff5608927ddd34602e508ea3a00685c3938da.png";
import svgWho from "@/imports/Concept2WhoWeAre/svg-6fcsh0az5g";

// ── Types ────────────────────────────────────────────────────────────────
type Page = "home" | "about" | "stories" | "eventsBlog" | "donate" | "contact" | "account" | "admin";

// ── Page <-> URL mapping (real routes, used for prerendering + navigation) ─
const PAGE_TO_PATH: Record<Page, string> = {
  home: "/home",
  about: "/about",
  stories: "/stories",
  eventsBlog: "/events",
  donate: "/donate",
  contact: "/contact",
  account: "/account",
  admin: "/admin",
};

function pathToPage(pathname: string): Page {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") return "home"; // bare root — redirected to /home on mount, see App()
  const entry = (Object.entries(PAGE_TO_PATH) as [Page, string][]).find(([, path]) => path === normalized);
  return entry ? entry[0] : "home";
}

// ── Content context ───────────────────────────────────────────────────────
const ContentContext = createContext<ContentMap>(DEFAULTS);
function useContent() { return useContext(ContentContext); }
function c(content: ContentMap, key: keyof ContentMap) {
  return content[key] || DEFAULTS[key];
}

// ── Site data (CMS) context ─────────────────────────────────────────────────
const SiteDataContext = createContext<SiteData>(DEFAULT_SITE_DATA);
function useSiteData() { return useContext(SiteDataContext); }
type VolAuthStep = "choice" | "login" | "register" | "forgot" | "reset" | "dashboard";

interface VolunteerProfile {
  name: string;
  email: string;
  phone: string;
  skills: string;
}

// Fallback banner/gallery images for the 4 default "Our Impact" pages, used only
// when the admin hasn't set a cover image / gallery for that impact post yet.
const IMPACT_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {
  "women-leadership": { banner: imgContextBanner, gallery: [imgGal1, imgGal2, imgGal3, imgImpact1, imgStory1] },
  "education": { banner: imgImpact2, gallery: [imgGal2, imgGal3, imgGal1, imgImpact2, imgStory2] },
  "livelihood": { banner: imgImpact3, gallery: [imgGal3, imgGal1, imgGal2, imgImpact3, imgStory3] },
  "wellbeing": { banner: imgImpact4, gallery: [imgGal1, imgGal3, imgGal2, imgImpact4, imgStory1] },
};

// Fallback banner/gallery images for the default "Our Stories" posts, used only
// when the admin hasn't set a cover image / gallery for that story post yet —
// keyed by the story's own post id so modal=story looks as complete as modal=impact.
const STORY_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {
  "story_she_found_voice": { banner: imgStory1, gallery: [imgGal1, imgGal2, imgGal3, imgImpact1] },
  "story_new_dawn_priya": { banner: imgStory2, gallery: [imgGal2, imgGal3, imgGal1, imgImpact2] },
  "story_building_futures": { banner: imgStory3, gallery: [imgGal3, imgGal1, imgGal2, imgImpact3] },
  "story_health_all": { banner: imgImpact4, gallery: [imgGal1, imgGal3, imgGal2, imgStory1] },
  "story_first_sarpanch": { banner: imgContextBanner, gallery: [imgGal2, imgGal1, imgGal3, imgStory2] },
  "story_breaking_cycle": { banner: imgImpact1, gallery: [imgGal3, imgGal2, imgGal1, imgStory3] },
};

// Fallback image for each of the 6 default Impact Timeline chips ("1995", "2002" etc.)
// used only when the admin hasn't uploaded an image for that timeline entry yet — keyed
// by the entry's own id so every chip shows a different photo (1 chip : 1 image) instead
// of every chip falling back to the same shared placeholder.
const TIMELINE_FALLBACK_IMAGES: Record<string, string> = {
  "tl_1995": imgEvent,
  "tl_2002": imgImpact2,
  "tl_2009": imgImpact1,
  "tl_2016": imgImpact3,
  "tl_2021": imgGal2,
  "tl_2026": imgTakeAction,
};

// The 4 default "Our Impact" home page cards map to a fixed category id — used to find
// the matching CMS post when no post has been explicitly saved under that card's own id yet.
const IMPACT_CARD_CATEGORY: Record<string, string> = {
  "women-leadership": "cat_women",
  "education": "cat_education",
  "livelihood": "cat_livelihood",
  "wellbeing": "cat_wellbeing",
};

// ── URL-driven modal state ───────────────────────────────────────────────────
// Every shareable modal (volunteer portal, event reserve/RSVP, attend, partner,
// story/impact detail, closed-event notice) is driven by ?modal=&id=&kind= search
// params instead of local component state, so any modal can be deep-linked and the
// browser back button closes it naturally. Opening a modal pushes a new history
// entry; closing one replaces the current entry (so Back from a closed modal goes
// to whatever was open *before* the modal, not back into the modal).
function useModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modal = searchParams.get("modal");
  const modalId = searchParams.get("id");
  const modalKind = searchParams.get("kind");

  const openModal = useCallback(
    (name: string, extra?: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      next.set("modal", name);
      next.delete("id");
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
    next.delete("kind");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return { modal, modalId, modalKind, openModal, setModalKind, closeModal };
}

// ── Donation campaigns — shared by the campaign dropdown in the donation form and
// the "More Campaigns" grid on the Donate page, so the numbers always match. ────────
interface Campaign {
  id: string;
  name: string;
  tag: string;
  raised: number;
  goal: number;
}
const CAMPAIGNS: Campaign[] = [
  { id: "learning-centres", name: "Help Build Community Learning Centres", tag: "Education", raised: 450000, goal: 600000 },
  { id: "women-leadership-fund", name: "Women Leadership Fund", tag: "Women & Leadership", raised: 280000, goal: 500000 },
  { id: "skills-for-tomorrow", name: "Skills for Tomorrow", tag: "Livelihood & Skills", raised: 185000, goal: 300000 },
  { id: "community-health-drive", name: "Community Health Drive", tag: "Community Wellbeing", raised: 420000, goal: 600000 },
];
function formatLakh(n: number) {
  return `₹${(n / 100000).toFixed(1)}L`;
}

// ── Shared helpers ───────────────────────────────────────────────────────
function fraunces(extra = "") {
  return `font-['Fraunces',serif] ${extra}`;
}
function inter(extra = "") {
  return `font-['Inter',sans-serif] ${extra}`;
}

// ── Reusable Logo ────────────────────────────────────────────────────────
function LogoMark({ invert = false }: { invert?: boolean }) {
  const textColor = invert
    ? "text-[#f4efe7]"
    : "text-[#1e1e1e]";
  return (
    <div className="flex gap-3 items-center">
      <div className="relative size-12 rounded-md overflow-hidden shrink-0">
        <img loading="eager" decoding="async"
          src={imgLogo}
          alt="Mahila Action logo"
          className="absolute w-[220%] h-[210%] max-w-none left-[-57%] top-[-53%] object-cover"
          style={invert ? { filter: "brightness(0) invert(1) sepia(8%) saturate(0.6)" } : undefined}
        />
      </div>
      <div
        className={`${fraunces()} ${textColor} text-[22px] leading-tight`}
        style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
      >
        <div>Mahila</div>
        <div>Action</div>
      </div>
    </div>
  );
}

// ── Navigation ───────────────────────────────────────────────────────────
function Navigation({
  page,
  setPage,
}: {
  page: Page;
  setPage: (p: Page) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<VolunteerAccountProfile | null>(getSavedUserSession);
  const { openModal } = useModal();

  useEffect(() => {
    function syncSession() {
      setUserSession(getSavedUserSession());
    }
    window.addEventListener("mahila_user_session_changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("mahila_user_session_changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const links: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Who Are We", page: "about" },
    { label: "Our Stories", page: "stories" },
    { label: "Events Blog", page: "eventsBlog" },
    { label: "Contact Us", page: "contact" },
  ];

  function nav(p: Page) {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f4efe7] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => nav("home")}
          className="cursor-pointer"
        >
          <LogoMark />
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.page}
              onClick={() => nav(l.page)}
              className={`${inter()} px-5 py-3 text-[15px] font-medium rounded-lg transition-colors cursor-pointer ${page === l.page
                ? "text-[#a65a4a]"
                : "text-[#1e1e1e] hover:text-[#a65a4a]"
                }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Donate Now Button */}
          <button
            onClick={() => nav("donate")}
            className={`hidden md:flex ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[15px] font-medium px-7 py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}
          >
            Donate Now
          </button>

          {/* User Auth Status: Show Login button (opens overlay modal) when unauthenticated; Hide Login button and show User Name pill (navigates to /account) to the right of Donate Now when authenticated */}
          {!userSession ? (
            <button
              onClick={() => openModal("login")}
              className={`${inter()} border-2 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7] text-[13px] sm:text-[15px] font-medium px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2`}
            >
              <LogIn size={15} />
              <span>Login</span>
            </button>
          ) : (
            <button
              onClick={() => nav("account")}
              className={`${inter()} bg-[#a65a4a]/10 border-2 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7] text-[13px] sm:text-[14px] font-semibold px-3 sm:px-4.5 py-1.5 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-2 shadow-sm ${page === "account" ? "bg-[#a65a4a] text-[#f4efe7]" : ""}`}
              title="View My Registered Events & Account Profile"
            >
              <div className="size-5 sm:size-6 rounded-full bg-[#a65a4a] text-[#f4efe7] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">
                {userSession.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[75px] sm:max-w-[120px] truncate">{userSession.name.split(" ")[0]}</span>
            </button>
          )}

          <button
            className="md:hidden p-2 cursor-pointer text-[#1e1e1e] hover:text-[#a65a4a]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#f4efe7] border-t border-[#a65a4a]/20 px-6 pb-5 pt-2">
          {links.map((l) => (
            <button
              key={l.page}
              onClick={() => nav(l.page)}
              className={`${inter()} block w-full text-left px-2 py-3 text-[15px] font-medium border-b border-[#a65a4a]/10 cursor-pointer ${page === l.page
                ? "text-[#a65a4a]"
                : "text-[#1e1e1e]"
                }`}
            >
              {l.label}
            </button>
          ))}

          <div className="pt-4 flex flex-col gap-2.5">
            <button
              onClick={() => nav("donate")}
              className={`w-full ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[15px] font-medium px-7 py-3 rounded-full cursor-pointer hover:bg-[#993925] transition-colors`}
            >
              Donate Now
            </button>

            {!userSession ? (
              <button
                onClick={() => { setMenuOpen(false); openModal("login"); }}
                className={`${inter()} w-full border-2 border-[#a65a4a] text-[#a65a4a] text-[15px] font-medium px-6 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-colors`}
              >
                <LogIn size={16} />
                Login
              </button>
            ) : (
              <button
                onClick={() => nav("account")}
                className={`${inter()} w-full bg-[#a65a4a]/10 border-2 border-[#a65a4a] text-[#a65a4a] text-[15px] font-semibold px-6 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer`}
              >
                <User size={16} />
                {userSession.name} (My Account)
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────
const FOOTER_IMPACT_LINKS: { label: string; id: string }[] = [
  { label: "Women & Leadership", id: "women-leadership" },
  { label: "Education & Learning", id: "education" },
  { label: "Livelihood & Skills", id: "livelihood" },
  { label: "Community Wellbeing", id: "wellbeing" },
];

function Footer({ setPage }: { setPage: (p: Page) => void }) {
  const { openModal } = useModal();

  function nav(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0 });
  }

  function openImpact(id: string) {
    openModal("impact", { id });
  }

  return (
    <footer className="bg-[#a65a4a]">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row justify-between gap-12">
          {/* Brand */}
          <div className="flex flex-col gap-8 max-w-[300px]">
            <LogoMark invert />
            <div
              className={`${fraunces()} text-[#f4efe7] text-[26px] leading-tight`}
              style={{
                fontVariationSettings: '"SOFT" 0, "WONK" 1',
              }}
            >
              <div>Small Actions.</div>
              <div>Lasting Change.</div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => nav("donate")}
                className={`${inter()} bg-[#f4efe7] text-[#a65a4a] text-[15px] font-bold px-10 py-3 rounded-full hover:bg-white transition-colors cursor-pointer text-center`}
              >
                Donate For The Cause
              </button>
              <button
                onClick={() => openModal("volunteer")}
                className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[15px] font-bold px-10 py-3 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer text-center`}
              >
                Join The Movement
              </button>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-10">
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Mahila Action
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] leading-relaxed`}
              >
                <p>Empowering Women,</p>
                <p>Strengthening Communities,</p>
                <p>Creating Lasting Change</p>
                <p>for over 28 years.</p>
              </div>
            </div>
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Get Involved
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                <button
                  onClick={() => openModal("attend")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Attend Events
                </button>
                <button
                  onClick={() => openModal("partner")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Partner With Us
                </button>
                <button
                  onClick={() => openModal("volunteer")}
                  className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                >
                  Volunteer
                </button>
              </div>
            </div>
            <div>
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Our Impacts
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                {FOOTER_IMPACT_LINKS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => openImpact(l.id)}
                    className="text-left hover:text-[#f4efe7] transition-colors cursor-pointer"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p
                className={`${inter()} text-[#f4efe7] text-[16px] font-semibold uppercase mb-4`}
              >
                Contact
              </p>
              <div
                className={`${inter()} text-[#f4efe7]/80 text-[13px] flex flex-col gap-2`}
              >
                <a
                  href="mailto:contact@mahilaction.org"
                  className="hover:text-[#f4efe7] transition-colors"
                >
                  contact@mahilaction.org
                </a>
                <span>+91 XXXXXXXXX</span>
              </div>
              {/* Social icons */}
              <div className="flex gap-4 mt-4">
                {[
                  {
                    label: "Instagram",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        />
                        <circle cx="12" cy="12" r="4" />
                        <circle
                          cx="17.5"
                          cy="6.5"
                          r="0.5"
                          fill="currentColor"
                        />
                      </svg>
                    ),
                  },
                  {
                    label: "Facebook",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-5"
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect
                          x="2"
                          y="9"
                          width="4"
                          height="12"
                        />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    ),
                  },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    aria-label={label}
                    className="text-[#f4efe7]/80 hover:text-[#f4efe7] transition-colors cursor-pointer"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${inter()} text-[#f4efe7]/50 text-[12px] text-center mt-12 pt-8 border-t border-[#f4efe7]/20 flex flex-col items-center gap-2`}>
          <span>© {new Date().getFullYear()} Mahila Action. All rights reserved. Empowering women since 1995.</span>
          {/* <button
            onClick={() => { nav("admin"); }}
            className="opacity-20 hover:opacity-60 transition-opacity cursor-pointer text-[10px] tracking-widest uppercase"
          >
            ⚙ Admin
          </button> */}
        </div>
      </div>
    </footer>
  );
}

// ── Section header ────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <p
      className={`${inter()} text-[14px] text-[#1e1e1e]/60 tracking-wider uppercase`}
    >
      {text}
    </p>
  );
}
function SectionTitle({
  text,
  center = false,
}: {
  text: string;
  center?: boolean;
}) {
  return (
    <h2
      className={`${fraunces()} text-[26px] sm:text-[36px] md:text-[52px] text-[#1e1e1e] leading-tight capitalize ${center ? "text-center" : ""}`}
      style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
    >
      {text}
    </h2>
  );
}

// ── Page banner ───────────────────────────────────────────────────────────
function PageBanner({
  img,
  title,
}: {
  img: string;
  title: string;
}) {
  return (
    <div className="relative h-[220px] sm:h-[340px] md:h-[520px] overflow-hidden">
      <img loading="eager" fetchPriority="high" decoding="async"
        src={img}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative h-full flex items-center justify-center">
        <h1
          className={`${fraunces()} text-[#f4efe7] text-[32px] sm:text-[52px] md:text-[96px] font-normal text-center leading-none`}
          style={{
            fontVariationSettings: '"SOFT" 0, "WONK" 1',
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════
// ── Hero scale hook ───────────────────────────────────────────────────────
// ── Volunteer Portal Modal ────────────────────────────────────────────────
const VOLUNTEER_EVENTS = [
  {
    id: 1, status: "ongoing" as const,
    title: "Community Leadership Workshop", date: "Aug 12, 2026",
    location: "Hyderabad", category: "Women & Leadership",
    slots: 12, desc: "Facilitate group sessions helping women develop leadership and public-speaking confidence.",
  },
  {
    id: 2, status: "ongoing" as const,
    title: "Mobile Health Camp", date: "Aug 18, 2026",
    location: "Secunderabad", category: "Community Wellbeing",
    slots: 8, desc: "Support our field medical team with registration, crowd management, and health record entry.",
  },
  {
    id: 3, status: "upcoming" as const,
    title: "Digital Literacy Drive", date: "Sep 4, 2026",
    location: "Warangal", category: "Education & Learning",
    slots: 20, desc: "Teach basic smartphone and internet skills to first-time users in rural communities.",
  },
  {
    id: 4, status: "upcoming" as const,
    title: "Livelihood Skills Fair", date: "Sep 14, 2026",
    location: "Nizamabad", category: "Livelihood & Skills",
    slots: 15, desc: "Help coordinate stalls, mentor participants, and document success stories at our annual skills fair.",
  },
  {
    id: 5, status: "upcoming" as const,
    title: "Child Learning Carnival", date: "Oct 2, 2026",
    location: "Hyderabad", category: "Education & Learning",
    slots: 30, desc: "Run activity booths, storytelling sessions, and art workshops for children aged 6–14.",
  },
  {
    id: 6, status: "upcoming" as const,
    title: "Women's Rights Awareness Walk", date: "Oct 11, 2026",
    location: "Hyderabad", category: "Women & Leadership",
    slots: 50, desc: "March alongside the community, carry banners, and distribute awareness leaflets.",
  },
];

function VolunteerPortal({ onClose, initialStep, resetToken, events }: { onClose: () => void; initialStep?: VolAuthStep; resetToken?: string; events: EventItem[] }) {
  const { closeModal } = useModal();
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    closeModal();
  }, [onClose, closeModal]);

  const [step, setStep] = useState<VolAuthStep>(initialStep ?? "login");
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse">("registered");

  useEffect(() => {
    if (initialStep) setStep(initialStep);
  }, [initialStep]);

  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  // User's recorded submissions from storage
  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    if (profile?.email || profile?.phone) {
      setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
    }
  }, [profile, step, confirmed]);

  function handleSignOut() {
    setProfile(null);
    setStep("choice");
    setConfirmed(false);
    setSelectedEvents([]);
    toast.success("Signed out successfully");
  }

  // ── Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // ── Register form
  const [reg, setReg] = useState({ name: "", email: "", phone: "", password: "", skills: "" });

  // ── Forgot / reset password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [resetPass, setResetPass] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const inputCls = `w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]`;
  const labelCls = `font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider mb-1 block`;

  // Auto sign-out from the volunteer dashboard after 5 minutes of no activity
  useEffect(() => {
    if (!profile) return;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setProfile(null);
        setStep("choice");
        setConfirmed(false);
        setSelectedEvents([]);
        toast.error("Signed out automatically after 5 minutes of inactivity");
      }, INACTIVITY_LIMIT_MS);
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [profile]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const identifier = loginEmail.trim();
    if (!identifier) return toast.error("Enter your email address or username");
    if (!loginPass.trim()) return toast.error("Enter your password");
    setAuthBusy(true);

    const lowerId = identifier.toLowerCase();
    const lowerPass = loginPass.toLowerCase().trim();

    // 1. Check Super Admin / Admin login credentials
    const isAdminAttempt =
      lowerId.includes("admin") ||
      lowerId.includes("super") ||
      lowerId === "superadmin" ||
      lowerId === "super admin" ||
      lowerPass === "admin123" ||
      lowerPass === "superadmin" ||
      lowerPass === "admin";

    if (isAdminAttempt) {
      const adminRes = await signInAdmin(identifier, loginPass);
      if (adminRes.ok) {
        let canonicalEmail = identifier;
        if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
          canonicalEmail = "superadmin@organization.org";
        } else if (lowerId === "admin") {
          canonicalEmail = "admin@organization.org";
        }
        setCurrentAdminSession(canonicalEmail);
        setAuthBusy(false);
        handleClose();
        setPage("admin");
        toast.success("Signed in to Admin Panel!");
        return;
      }
    }

    const result = await loginVolunteer(identifier, loginPass);
    if (result.ok && result.profile) {
      setAuthBusy(false);
      setProfile(result.profile);
      saveUserSession(result.profile);

      // Automatically register volunteer submission as a Permanent Volunteer
      await saveVolunteer({
        name: result.profile.name,
        email: result.profile.email,
        phone: result.profile.phone,
        skills: result.profile.skills || "General Community Support",
        volunteer_commitment: "ongoing",
        selected_events: ["Permanent Community Volunteer Membership"],
      });

      handleClose();
      toast.success(`Signed in successfully! Welcome back, ${result.profile.name}!`);
      setPage("account");
      window.scrollTo({ top: 0 });
      return;
    }

    // Fallback: If user login failed, try signInAdmin as last resort
    const fallbackAdmin = await signInAdmin(identifier, loginPass);
    setAuthBusy(false);
    if (fallbackAdmin.ok) {
      let canonicalEmail = identifier;
      if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
        canonicalEmail = "superadmin@organization.org";
      } else if (lowerId === "admin") {
        canonicalEmail = "admin@organization.org";
      }
      setCurrentAdminSession(canonicalEmail);
      handleClose();
      setPage("admin");
      toast.success("Signed in to Admin Panel!");
      return;
    }

    toast.error(result.error || "Incorrect email or password.");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!reg.name.trim()) return toast.error("Enter your full name");
    if (!reg.email.includes("@")) return toast.error("Enter a valid email");
    if (!isValidPhoneNumber(reg.phone)) return toast.error("Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)");
    if (reg.password.length < 6) return toast.error("Password must be at least 6 characters");
    setAuthBusy(true);
    const result = await registerVolunteer(reg);
    setAuthBusy(false);
    if (!result.ok || !result.profile) {
      toast.error(result.error || "Something went wrong creating your account — please try again.");
      return;
    }
    setProfile(result.profile);
    saveUserSession(result.profile);

    // Automatically record volunteer application as a Permanent Volunteer
    await saveVolunteer({
      name: result.profile.name,
      email: result.profile.email,
      phone: result.profile.phone,
      skills: result.profile.skills || "General Community Support",
      volunteer_commitment: "ongoing",
      selected_events: ["Permanent Community Volunteer Membership"],
    });

    handleClose();
    toast.success(`Registered as a Permanent Volunteer! Welcome, ${result.profile.name}!`);
    setPage("account");
    window.scrollTo({ top: 0 });
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.includes("@")) return toast.error("Enter a valid email");
    setAuthBusy(true);
    const result = await requestVolunteerPasswordReset(forgotEmail);
    setAuthBusy(false);
    if (!result.ok) return toast.error(result.error || "Something went wrong — please try again.");
    setForgotSent(true);
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) return toast.error("This reset link is missing its token — please request a new one.");
    if (resetPass.length < 6) return toast.error("Password must be at least 6 characters");
    if (resetPass !== resetConfirm) return toast.error("Passwords don't match");
    setAuthBusy(true);
    const result = await resetVolunteerPassword(resetToken, resetPass);
    setAuthBusy(false);
    if (!result.ok) return toast.error(result.error || "Something went wrong — please try again.");
    toast.success("Password updated! You can now sign in.");
    setStep("login");
  }

  function toggleEvent(id: string) {
    setSelectedEvents(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  }

  async function handleConfirm() {
    if (selectedEvents.length === 0) return toast.error("Please select at least one event");
    const eventTitles = realEvents.filter(e => selectedEvents.includes(e.id)).map(e => e.title);
    const ok = await saveVolunteer({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      skills: profile?.skills ?? "",
      selected_events: eventTitles,
    });
    if (!ok) return toast.error("Something went wrong submitting your registration — please try again.");
    setConfirmed(true);
    if (profile?.email || profile?.phone) {
      setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
    }
  }

  const now = new Date();
  const realEvents = events
    .filter((ev) => (Array.isArray(ev.windows) ? ev.windows : []).some((w) => w.enabled && new Date(w.regEnd) >= now))
    .map((ev) => ({
      id: ev.id,
      status: (isEventOpen(ev, now) ? "ongoing" : "upcoming") as "ongoing" | "upcoming",
      title: ev.title,
      date: new Date(ev.eventDate).toLocaleDateString(),
      location: ev.location,
      category: "",
      slots: ev.totalSeats,
      desc: ev.description,
    }));
  const filtered = realEvents.filter(e => filter === "all" || e.status === filter);
  const categoryColors: Record<string, string> = {
    "Women & Leadership": "bg-rose-100 text-rose-700",
    "Community Wellbeing": "bg-green-100 text-green-700",
    "Education & Learning": "bg-blue-100 text-blue-700",
    "Livelihood & Skills": "bg-amber-100 text-amber-700",
  };

  // Process user's registered event records from storage
  const registeredEventsList = useMemo(() => {
    if (!profile) return [];
    const list: {
      id: string;
      title: string;
      date: string;
      typeLabel: string;
      details?: string;
      createdAt: string;
      status: string;
    }[] = [];

    userSubmissions.forEach(sub => {
      if (sub.type === "volunteer") {
        const eventsArr: string[] = Array.isArray(sub.data?.selected_events)
          ? sub.data.selected_events
          : sub.data?.event_name
            ? [sub.data.event_name]
            : [];
        eventsArr.forEach((title, idx) => {
          list.push({
            id: `${sub.id}_${idx}`,
            title,
            date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            typeLabel: "Volunteer Registration",
            details: sub.data?.skills ? `Skills: ${sub.data.skills}` : "Registered Volunteer",
            createdAt: sub.createdAt,
            status: sub.status || "Confirmed",
          });
        });
      } else if (sub.type === "reservation") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Community Event",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Seat Reservation",
          details: `${sub.data?.seats || 1} Seat(s) Reserved ${sub.data?.volunteer_commitment === "ongoing" ? "· Ongoing Volunteer" : ""}`,
          createdAt: sub.createdAt,
          status: sub.status || "Confirmed",
        });
      } else if (sub.type === "vendor") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Event Support",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Vendor / Partner Application",
          details: `Business: ${sub.data?.business_name || ""} (${sub.data?.offering || ""})`,
          createdAt: sub.createdAt,
          status: sub.status || "Under Review",
        });
      }
    });

    return list;
  }, [userSubmissions, profile]);

  // Process user's donation records from storage
  const userDonationList = useMemo(() => {
    if (!profile) return [];
    return userSubmissions
      .filter(s => s.type === "donation")
      .map(s => ({
        id: s.id,
        amount: s.data?.amount || 0,
        cause: s.data?.campaign_name || s.data?.event_name || "General Empowerment Support",
        date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: s.status || "Completed",
      }));
  }, [userSubmissions, profile]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl sm:rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ maxWidth: step === "dashboard" ? "min(880px, 95vw)" : "min(460px, 92vw)" }}>

        {/* ── Header ── */}
        <div className="bg-[#a65a4a] px-7 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {(step === "forgot" || step === "reset") && (
              <button onClick={() => setStep("login")} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mr-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div>
              <p className="font-['Inter',sans-serif] text-[#f4efe7]/70 text-[11px] uppercase tracking-wider">Mahila Action Portal</p>
              <h3 className="font-['Fraunces',serif] text-[#f4efe7] text-[20px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                {step === "choice" && "User & Volunteer Portal"}
                {step === "login" && "Account Sign In"}
                {step === "register" && "Create Member Account"}
                {step === "forgot" && "Reset Password"}
                {step === "reset" && "Choose New Password"}
                {step === "dashboard" && `Account: ${profile?.name}`}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Choice screen ── */}
          {step === "choice" && (
            <div className="p-8 flex flex-col gap-5">
              <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[14px] leading-relaxed">
                Welcome to Mahila Action! Sign in to access your registered events, seat reservations, and donation history, or create a new account.
              </p>
              <button onClick={() => setStep("login")} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer">
                Sign In to My Account
              </button>
              <button onClick={() => setStep("register")} className="w-full border-2 border-[#a65a4a] text-[#a65a4a] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#a65a4a]/5 transition-colors cursor-pointer">
                Register New Account
              </button>
              <div className="bg-[#a65a4a]/8 rounded-xl p-4 border border-[#a65a4a]/20">
                <p className="font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold mb-2">Member Benefits</p>
                {["Track your registered events & seat reservations", "View contribution receipts & tax exemption docs", "Participate in community workshops & empowerment drives"].map(t => (
                  <div key={t} className="flex gap-2 items-start mt-1.5">
                    <CheckCircle size={13} className="text-[#a65a4a] mt-0.5 shrink-0" />
                    <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/65">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Login screen ── */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Email or Username</label>
                <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@email.com" type="text" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" type="password" className={inputCls} />
                <button
                  type="button"
                  onClick={() => { setForgotEmail(loginEmail); setForgotSent(false); setStep("forgot"); }}
                  className="mt-1.5 font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold cursor-pointer hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                {authBusy ? "Signing in…" : "Sign In"}
              </button>
              <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                New user?{" "}
                <button type="button" onClick={() => setStep("register")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* ── Register screen ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="p-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} placeholder="you@email.com" type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} placeholder="Min. 6 characters" type="password" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Your Skills / Areas of Interest</label>
                <select value={reg.skills} onChange={e => setReg(r => ({ ...r, skills: e.target.value }))} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select your primary skill…</option>
                  <option>Teaching / Training</option>
                  <option>Healthcare / Medical</option>
                  <option>Event Management</option>
                  <option>Communication / Outreach</option>
                  <option>Technology / Digital</option>
                  <option>Legal / Counselling</option>
                  <option>Arts / Creative</option>
                  <option>General Support</option>
                </select>
              </div>
              <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-1 disabled:opacity-60">
                {authBusy ? "Creating account…" : "Create Account & Continue"}
              </button>
              <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                Already registered?{" "}
                <button type="button" onClick={() => setStep("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {/* ── Forgot password screen ── */}
          {step === "forgot" && (
            forgotSent ? (
              <div className="p-8 flex flex-col items-center text-center gap-4">
                <div className="size-16 bg-[#587735]/10 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-[#587735]" />
                </div>
                <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[19px]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Check your email</h4>
                <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[14px] leading-relaxed">
                  If an account exists for <span className="font-semibold">{forgotEmail}</span>, we've sent a link to reset your password.
                </p>
                <button type="button" onClick={() => setStep("login")} className="mt-2 font-['Inter',sans-serif] text-[13px] text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="p-8 flex flex-col gap-4">
                <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[13px] leading-relaxed -mt-1">
                  Enter your email address and we'll send you a password reset link.
                </p>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@email.com" type="email" className={inputCls} autoFocus />
                </div>
                <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                  {authBusy ? "Sending…" : "Send Reset Link"}
                </button>
                <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                  <button type="button" onClick={() => setStep("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">← Back to sign in</button>
                </p>
              </form>
            )
          )}

          {/* ── Dashboard (Logged In View) ── */}
          {step === "dashboard" && (
            <div className="p-6 md:p-8">
              {/* User Profile Summary Card */}
              <div className="bg-white border border-[#a65a4a]/15 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-[#a65a4a] text-[#f4efe7] font-['Fraunces',serif] text-[22px] font-bold flex items-center justify-center shrink-0 shadow-md">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[20px] font-semibold">{profile?.name}</h4>
                      <span className="bg-[#587735]/15 text-[#587735] text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Active Account
                      </span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-0.5">
                      {profile?.email} {profile?.phone ? `· ${profile.phone}` : ""}
                    </p>
                    {profile?.skills && (
                      <p className="font-['Inter',sans-serif] text-[11px] text-[#a65a4a] font-medium mt-1">
                        Primary Skill: {profile.skills}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#a65a4a] hover:bg-[#a65a4a]/10 border border-[#a65a4a]/30 px-4 py-2 rounded-full transition-colors flex items-center gap-2 w-fit self-start md:self-auto cursor-pointer"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#a65a4a]/20 mb-6 gap-2 sm:gap-6 overflow-x-auto">
                <button
                  onClick={() => setDashTab("registered")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "registered"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <UserCheck size={16} /> My Registered Events ({registeredEventsList.length})
                </button>

                <button
                  onClick={() => setDashTab("donations")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "donations"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <Heart size={16} /> My Contributions ({userDonationList.length})
                </button>

                <button
                  onClick={() => setDashTab("browse")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "browse"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <Plus size={16} /> Browse & Volunteer New Events
                </button>
              </div>

              {/* Tab 1: Registered Events */}
              {dashTab === "registered" && (
                <div>
                  {registeredEventsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {registeredEventsList.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-[#a65a4a]/20 hover:border-[#a65a4a] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="bg-[#a65a4a]/10 text-[#a65a4a] text-[11px] font-bold px-2.5 py-1 rounded-full">
                                {item.typeLabel}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={10} /> {item.status}
                              </span>
                            </div>
                            <h5 className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] mt-1 leading-snug">
                              {item.title}
                            </h5>
                            <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-1 leading-relaxed">
                              {item.details}
                            </p>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-3 mt-4 flex items-center justify-between text-[12px] text-[#1e1e1e]/50 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1">
                              <Calendar size={13} /> Registered: {item.date}
                            </span>
                            <span className="font-medium text-[#a65a4a]">Confirmed Entry</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center my-4">
                      <div className="size-14 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-3">
                        <Calendar size={28} />
                      </div>
                      <h5 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">No Registered Events Yet</h5>
                      <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        You haven't signed up for any events yet. Explore upcoming community events and volunteer initiatives to get involved!
                      </p>
                      <button
                        onClick={() => setDashTab("browse")}
                        className="mt-5 px-6 py-3 bg-[#a65a4a] text-[#f4efe7] text-[14px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus size={16} /> Browse Upcoming Events
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Donations */}
              {dashTab === "donations" && (
                <div>
                  {userDonationList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userDonationList.map((d) => (
                        <div key={d.id} className="bg-white border-2 border-[#a65a4a]/20 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={11} /> Contribution
                              </span>
                              <span className="text-[#a65a4a] font-['Fraunces',serif] text-[20px] font-bold">
                                ₹{d.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <h5 className="font-['Inter',sans-serif] font-bold text-[15px] text-[#1e1e1e] mt-1">
                              {d.cause}
                            </h5>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-3 mt-4 flex items-center justify-between text-[12px] text-[#1e1e1e]/50 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {d.date}
                            </span>
                            <span className="bg-[#f4efe7] text-[#a65a4a] px-2.5 py-0.5 rounded text-[11px] font-medium">80G Tax Exempt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center my-4">
                      <div className="size-14 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-3">
                        <Heart size={28} />
                      </div>
                      <h5 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">No Contribution Records</h5>
                      <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        Your financial contributions help fund education, health, and women leadership programs across India.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Browse Events */}
              {dashTab === "browse" && (
                <div>
                  {confirmed ? (
                    <div className="flex flex-col items-center text-center gap-5 py-8 bg-white rounded-2xl p-6 border border-[#a65a4a]/15">
                      <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={40} className="text-[#587735]" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[26px]">You're Registered!</h4>
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[15px] max-w-[400px]">
                        Thank you, <strong className="text-[#a65a4a]">{profile?.name}</strong>! You've successfully registered for <strong className="text-[#a65a4a]">{selectedEvents.length} event(s)</strong>.
                      </p>
                      <button
                        onClick={() => {
                          setConfirmed(false);
                          setSelectedEvents([]);
                          setDashTab("registered");
                        }}
                        className="px-8 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                      >
                        View My Registered Events
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-6">
                        {(["all", "ongoing", "upcoming"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`font-['Inter',sans-serif] text-[13px] font-semibold px-5 py-2 rounded-full cursor-pointer transition-colors capitalize ${filter === f ? "bg-[#a65a4a] text-[#f4efe7]" : "border border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a]/8"
                              }`}
                          >
                            {f === "all" ? "All Events" : f === "ongoing" ? "🟢 Ongoing" : "📅 Upcoming"}
                          </button>
                        ))}
                        {selectedEvents.length > 0 && (
                          <span className="ml-auto font-['Inter',sans-serif] text-[12px] font-semibold bg-[#a65a4a]/10 text-[#a65a4a] px-3 py-1.5 rounded-full self-center">
                            {selectedEvents.length} selected
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                        {filtered.map(ev => {
                          const selected = selectedEvents.includes(ev.id);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => toggleEvent(ev.id)}
                              className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${selected ? "border-[#a65a4a] bg-[#a65a4a]/5" : "border-[#1e1e1e]/10 bg-white hover:border-[#a65a4a]/40"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className={`font-['Inter',sans-serif] text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryColors[ev.category] ?? "bg-gray-100 text-gray-600"}`}>
                                  {ev.category || "Community Event"}
                                </span>
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${selected ? "border-[#a65a4a] bg-[#a65a4a]" : "border-[#1e1e1e]/25"}`}>
                                  {selected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                              </div>
                              <p className="font-['Inter',sans-serif] font-semibold text-[15px] text-[#1e1e1e] leading-snug">{ev.title}</p>
                              <div className="flex gap-3 mt-2 mb-3">
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><Calendar size={11} /> {ev.date}</span>
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                              </div>
                              <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 leading-relaxed">{ev.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleConfirm}
                        disabled={selectedEvents.length === 0}
                        className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedEvents.length === 0 ? "Select events to register" : `Confirm Registration for ${selectedEvents.length} Event${selectedEvents.length > 1 ? "s" : ""}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reserve Seat Modal ────────────────────────────────────────────────────
type ReserveUIKind = RegKind | "attendee";
const RESERVE_KIND_LABEL: Record<ReserveUIKind, string> = { volunteer: "Volunteer", vendor: "Vendor", donor: "Donor", attendee: "Attendee" };
const reserveInputClass = `w-full border-b-2 border-[#a65a4a] bg-transparent py-2.5 text-[15px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none font-['Inter',sans-serif]`;
const reserveLabelClass = `font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider`;

function ReserveSeatModal({
  event,
  onClose,
  initialKind,
  onKindChange,
}: {
  event: EventItem;
  onClose: () => void;
  initialKind?: ReserveUIKind;
  onKindChange?: (kind: ReserveUIKind) => void;
}) {
  const siteData = useSiteData();
  const openKinds = (Array.isArray(event.windows) ? event.windows : []).filter(w => isWindowOpen(w));
  // "Attendee" is always available alongside whichever windows (Volunteer / Vendor / Donor) the
  // admin has opened for this event — it isn't gated by a registration window of its own.
  const kinds: ReserveUIKind[] = [...openKinds.map(w => w.kind), "attendee"];
  const [kind, setKindState] = useState<ReserveUIKind>(
    initialKind && kinds.includes(initialKind) ? initialKind : kinds[0] ?? "attendee"
  );
  function setKind(k: ReserveUIKind) {
    setKindState(k);
    onKindChange?.(k);
  }
  const attendEvents = upcomingOrOpenEvents(siteData.events);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Community Event</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              {event.title}
            </h3>
            <div className={`font-['Inter',sans-serif] text-[#f4efe7]/80 text-[13px] flex gap-4 mt-2`}>
              <span className="flex items-center gap-1.5"><Calendar size={13} /> {new Date(event.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.location}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>

        <div className="p-7">
          {kinds.length > 1 && (
            <div className="mb-5">
              <label className={reserveLabelClass}>Register As</label>
              <div className="flex gap-2 mt-1.5">
                {kinds.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors cursor-pointer ${kind === k ? "bg-[#a65a4a] text-white border-[#a65a4a]" : "border-[#a65a4a]/30 text-[#a65a4a]"}`}
                  >
                    {RESERVE_KIND_LABEL[k]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "volunteer" && <VolunteerReserveForm event={event} onClose={onClose} />}
          {kind === "donor" && <DonationFormCard eventName={event.title} />}
          {kind === "vendor" && <VendorReserveForm event={event} onClose={onClose} />}
          {kind === "attendee" && (
            <AttendEventForm
              events={attendEvents.length ? attendEvents : [event]}
              defaultEventId={event.id}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Volunteer tab of the Reserve Seat modal ─────────────────────────────────
function VolunteerReserveForm({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commitment, setCommitment] = useState<"event_only" | "ongoing">("event_only");
  const [seats, setSeats] = useState("1");
  const [companions, setCompanions] = useState<{ name: string; phone: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function handleSeatsChange(v: string) {
    setSeats(v);
    const n = Math.max(0, Number(v) - 1);
    setCompanions(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", phone: "" });
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateCompanion(i: number, patch: Partial<{ name: string; phone: string }>) {
    setCompanions(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid phone number (e.g. +91 98765 43210)");
    for (const c of companions) {
      if (!c.name.trim() || !isValidPhoneNumber(c.phone)) return toast.error("Please enter a valid name and phone number for each additional volunteer");
    }
    const ok = await saveReservation({
      name, email, phone, seats: Number(seats), event_name: event.title,
      volunteer_commitment: commitment, companions,
    });
    if (!ok) return toast.error("Something went wrong submitting your registration — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          Seat Reserved!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{name}</strong>! Your {seats} seat{Number(seats) > 1 ? "s have" : " has"} been reserved as {commitment === "ongoing" ? "an ongoing volunteer" : "a volunteer for this event only"}. </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>

      <div>
        <label className={reserveLabelClass}>Which category suits you well?</label>
        <div className="flex flex-col gap-2 mt-2">
          {([
            { val: "event_only" as const, label: "I want to volunteer for this event only" },
            { val: "ongoing" as const, label: "I can be a forever volunteer for future events too" },
          ]).map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setCommitment(opt.val)}
              className={`text-left px-4 py-3 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer font-['Inter',sans-serif] ${commitment === opt.val ? "bg-[#a65a4a]/10 border-[#a65a4a] text-[#a65a4a]" : "border-[#1e1e1e]/15 text-[#1e1e1e]/70 hover:border-[#a65a4a]/40"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={reserveLabelClass}>Number of Seats</label>
        <select value={seats} onChange={e => handleSeatsChange(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {["1", "2", "3", "4", "5"].map(n => <option key={n} value={n}>{n} seat{Number(n) > 1 ? "s" : ""}</option>)}
        </select>
      </div>

      {companions.length > 0 && (
        <div className="bg-[#a65a4a]/8 border border-[#a65a4a]/25 rounded-xl p-4 flex flex-col gap-4">
          <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] leading-relaxed">
            You're registering {companions.length} additional volunteer{companions.length > 1 ? "s" : ""}. As the person registering, you'll be their <strong>guardian</strong> for this event — please provide their details below.
          </p>
          {companions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={reserveLabelClass}>Volunteer {i + 2} Name *</label>
                <input value={c.name} onChange={e => updateCompanion(i, { name: e.target.value })} placeholder="Full name" className={reserveInputClass} />
              </div>
              <div>
                <label className={reserveLabelClass}>Volunteer {i + 2} Phone *</label>
                <input value={c.phone} onChange={e => updateCompanion(i, { phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#a65a4a]/10 border border-[#a65a4a]/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <span className="relative flex size-2"><span className="animate-ping absolute inline-flex size-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-red-500" /></span>
        <p className={`font-['Inter',sans-serif] text-[#a65a4a] text-[12px] font-semibold`}>{event.totalSeats} seats total — reserve yours now!</p>
      </div>
      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Confirm Reservation
      </button>
    </form>
  );
}

// ── Vendor tab of the Reserve Seat modal ────────────────────────────────────
function VendorReserveForm({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [offering, setOffering] = useState("");
  const [needsSpace, setNeedsSpace] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim()) return toast.error("Please enter your business or organization name");
    if (!contactName.trim()) return toast.error("Please enter a contact person's name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid contact phone number (e.g. +91 98765 43210)");
    if (!offering.trim()) return toast.error("Please describe what you'd like to offer");
    const ok = await saveVendor({
      business_name: businessName, contact_name: contactName, email, phone,
      offering, needs_space: needsSpace, event_name: event.title,
    });
    if (!ok) return toast.error("Something went wrong submitting your application — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          Application Received!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{businessName}</strong>! Your application to partner with us for {event.title} has been received.
        </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className={reserveLabelClass}>Business / Organization Name *</label>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business or organization" className={reserveInputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Contact Person *</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>
      <div>
        <label className={reserveLabelClass}>What would you like to offer? *</label>
        <textarea value={offering} onChange={e => setOffering(e.target.value)} placeholder="e.g. a food stall, printing services, sound equipment, product samples, a service booth..." rows={3} className={`${reserveInputClass} resize-none`} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setNeedsSpace(!needsSpace)}
          className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors shrink-0 ${needsSpace ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"}`}
        >
          {needsSpace && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
        </div>
        <span className="font-['Inter',sans-serif] text-[14px] font-medium text-[#1e1e1e]">I'll need space / a stall at the event</span>
      </label>
      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Submit Vendor Application
      </button>
    </form>
  );
}

// ── Attend Event form — used both standalone (footer "Attend Events") and as the
// "Attendee" tab inside the Reserve Seat modal ─────────────────────────────────────
function AttendEventForm({
  events,
  defaultEventId,
  onClose,
}: {
  events: EventItem[];
  defaultEventId?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventId, setEventId] = useState(defaultEventId ?? events[0]?.id ?? "");
  const [members, setMembers] = useState("1");
  const [companions, setCompanions] = useState<{ name: string; phone: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const selectedEvent = events.find(ev => ev.id === eventId) ?? null;

  function handleMembersChange(v: string) {
    setMembers(v);
    const n = Math.max(0, Number(v) - 1);
    setCompanions(prev => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", phone: "" });
      while (next.length > n) next.pop();
      return next;
    });
  }

  function updateCompanion(i: number, patch: Partial<{ name: string; phone: string }>) {
    setCompanions(prev => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your full name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(phone)) return toast.error("Please enter a valid phone number (e.g. +91 98765 43210)");
    if (!eventId || !selectedEvent) return toast.error("Please select an event to attend");
    for (const c of companions) {
      if (!c.name.trim() || !isValidPhoneNumber(c.phone)) return toast.error("Please enter a valid name and phone number for each additional attendee");
    }
    const ok = await saveReservation({
      name, email, phone, seats: Number(members),
      event_name: selectedEvent.title, companions,
    });
    if (!ok) return toast.error("Something went wrong submitting your registration — please try again.");
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <div className="size-16 bg-[#587735]/15 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-[#587735]" />
        </div>
        <h4 className={`font-['Fraunces',serif] text-[#1e1e1e] text-[26px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          You're All Set!
        </h4>
        <p className={`font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[15px] leading-relaxed`}>
          Thank you, <strong className="text-[#a65a4a]">{name}</strong>! {members} attendee{Number(members) > 1 ? "s are" : " is"} confirmed for <strong className="text-[#a65a4a]">{selectedEvent?.title}</strong>.
        </p>
        <button onClick={onClose} className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold py-3.5 rounded-full mt-2 hover:bg-[#993925] transition-colors cursor-pointer`}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={reserveLabelClass}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" className={reserveInputClass} />
        </div>
        <div>
          <label className={reserveLabelClass}>Phone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
        </div>
      </div>
      <div>
        <label className={reserveLabelClass}>Email Address *</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" className={reserveInputClass} />
      </div>
      <div>
        <label className={reserveLabelClass}>Select Event to Attend *</label>
        <select value={eventId} onChange={e => setEventId(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {events.length === 0 && <option value="">No events currently open</option>}
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title} · {new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {ev.location}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={reserveLabelClass}>No. of Members Attending</label>
        <select value={members} onChange={e => handleMembersChange(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
          {["1", "2", "3", "4", "5", "6"].map(n => <option key={n} value={n}>{n} member{Number(n) > 1 ? "s" : ""}</option>)}
        </select>
      </div>

      {companions.length > 0 && (
        <div className="bg-[#a65a4a]/8 border border-[#a65a4a]/25 rounded-xl p-4 flex flex-col gap-4">
          <p className="font-['Inter',sans-serif] text-[#a65a4a] text-[12px] leading-relaxed">
            Please share the name and phone number for each additional attendee joining you.
          </p>
          {companions.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={reserveLabelClass}>Attendee {i + 2} Name *</label>
                <input value={c.name} onChange={e => updateCompanion(i, { name: e.target.value })} placeholder="Full name" className={reserveInputClass} />
              </div>
              <div>
                <label className={reserveLabelClass}>Attendee {i + 2} Phone *</label>
                <input value={c.phone} onChange={e => updateCompanion(i, { phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className={reserveInputClass} />
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="submit" className={`font-['Inter',sans-serif] w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}>
        Confirm My Attendance
      </button>
    </form>
  );
}

// ── Standalone "Attend an Event" modal — opened from the footer's Get Involved links ──
function AttendEventModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Get Involved</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Attend an Event
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7">
          <AttendEventForm events={events} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// ── Standalone "Partner With Us" modal — reuses the Vendor form, opened from the footer ──
function PartnerWithUsModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const selectedEvent = events.find(ev => ev.id === eventId) ?? events[0] ?? null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className={`font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider`}>Get Involved</p>
            <h3 className={`font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Partner With Us
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7 flex flex-col gap-5">
          {events.length > 0 ? (
            <div>
              <label className={reserveLabelClass}>Which Event Would You Like to Support? *</label>
              <select value={eventId} onChange={e => setEventId(e.target.value)} className={`${reserveInputClass} cursor-pointer`}>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {ev.location}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="font-['Inter',sans-serif] text-[#1e1e1e]/60 text-[14px]">No events are currently open for partnerships — please check back soon.</p>
          )}
          {selectedEvent && <VendorReserveForm event={selectedEvent} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ── Closed Event Notice Modal — shown when the featured event's registration has ended ──
function ClosedEventNoticeModal({ events, onClose }: { events: EventItem[]; onClose: () => void }) {
  const upcoming = upcomingOrOpenEvents(events);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl w-[92vw] max-w-[520px] shadow-2xl overflow-hidden">
        <div className="bg-[#a65a4a] px-7 py-5 flex items-start justify-between">
          <div>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[12px] uppercase tracking-wider">Registration Closed</p>
            <h3 className="font-['Fraunces',serif] text-[#f4efe7] text-[22px] font-semibold mt-0.5" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              This event's registration has ended
            </h3>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mt-1"><X size={20} /></button>
        </div>
        <div className="p-7">
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/70 text-[14px] mb-5">
            Here's what's coming up next — with the date each one opens for registration.
          </p>
          <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
            {upcoming.map(ev => (
              <div key={ev.id} className="border border-[#a65a4a]/20 rounded-xl p-4">
                <p className="font-['Inter',sans-serif] font-semibold text-[15px] text-[#1e1e1e]">{ev.title}</p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><Calendar size={11} /> {new Date(ev.eventDate).toLocaleDateString()}</span>
                  <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(Array.isArray(ev.windows) ? ev.windows : []).filter(w => w.enabled).map(w => (
                    <span key={w.kind} className="font-['Inter',sans-serif] text-[11px] bg-[#a65a4a]/10 text-[#a65a4a] px-2.5 py-1 rounded-full">
                      {RESERVE_KIND_LABEL[w.kind]} opens {new Date(w.regStart).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && (
              <p className="font-['Inter',sans-serif] text-[#1e1e1e]/50 text-[14px]">No upcoming events scheduled right now — check back soon!</p>
            )}
          </div>
          <button onClick={onClose} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-3.5 rounded-full mt-6 hover:bg-[#993925] transition-colors cursor-pointer">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Global modal router — renders on every page ────────────────────────────
// Every shareable modal is rendered from here, driven entirely by ?modal=&id=&kind=.
// This is what makes them deep-linkable and shows up in the URL like Gmail's #inbox:
// opening one always looks the same (a URL change) regardless of which page/component
// triggered it, so footer links, home page cards, and the stories page can all just
// call openModal() without needing to know where the modal actually lives.
function GlobalModals() {
  const siteData = useSiteData();
  const { modal, modalId, modalKind, closeModal, setModalKind } = useModal();
  const attendEvents = upcomingOrOpenEvents(siteData.events);

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
    // Impact cards may be linked either by the CMS post's real id, or by the fixed
    // card id ("women-leadership" etc.) when no post has been saved under that id yet.
    const impactPosts = siteData.blogPosts.filter(p => p.section === "impact");
    const post =
      modal === "impact"
        ? impactPosts.find(p => p.id === modalId) ?? impactPosts.find(p => p.categoryId === IMPACT_CARD_CATEGORY[modalId])
        : siteData.blogPosts.find(p => p.id === modalId);
    if (!post) return null;

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
      siteData.categories.find(cat => cat.id === post.categoryId)?.name ??
      (modal === "impact" ? "Our Impacts" : "Our Stories");

    return <BlogDetailModal post={enrichedPost} categoryLabel={categoryLabel} onClose={closeModal} />;
  }

  return null;
}

function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  const content = useContent();
  const siteData = useSiteData();
  const { openModal } = useModal();

  function openDetail(id: string) {
    openModal("impact", { id });
  }

  function openStoryBlog(id: string) {
    openModal("story", { id });
  }

  const impactCards = [
    { id: "women-leadership", img: c(content, "img_impact1") || imgImpact1, icon: <Users size={20} strokeWidth={1.5} />, title: c(content, "impact_card1_title"), desc: c(content, "impact_card1_desc") },
    { id: "education", img: c(content, "img_impact2") || imgImpact2, icon: <BookOpen size={20} strokeWidth={1.5} />, title: c(content, "impact_card2_title"), desc: c(content, "impact_card2_desc") },
    { id: "livelihood", img: c(content, "img_impact3") || imgImpact3, icon: <Briefcase size={20} strokeWidth={1.5} />, title: c(content, "impact_card3_title"), desc: c(content, "impact_card3_desc") },
    { id: "wellbeing", img: c(content, "img_impact4") || imgImpact4, icon: <Heart size={20} strokeWidth={1.5} />, title: c(content, "impact_card4_title"), desc: c(content, "impact_card4_desc") },
  ];

  // Latest 3 community stories — newest first. Older stories still live on the full Our Stories page.
  const storyPosts = [...siteData.blogPosts]
    .filter(p => p.section === "story")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const stories = storyPosts.map(p => ({ id: p.id, img: p.coverImage || STORY_FALLBACK_IMAGES[p.id]?.banner || imgStory1, title: p.title, excerpt: p.excerpt }));

  // Soonest event that's either open or hasn't fully closed registration yet; falls back to most recent otherwise.
  const upcoming = upcomingOrOpenEvents(siteData.events);
  const featuredEvent: EventItem | null = upcoming[0] ?? siteData.events[0] ?? null;
  const eventOpen = featuredEvent ? isEventOpen(featuredEvent) : false;

  function handleReserveClick() {
    if (!featuredEvent) return;
    if (eventOpen) openModal("reserve", { id: featuredEvent.id });
    else openModal("closed");
  }

  return (
    <main className="bg-[#f4efe7]">
      {/* ── Hero ── */}
      <section className="bg-[#f4efe7] pt-20 pb-0">

        {/* Headline block — normal responsive text, no transform */}
        <div className="flex flex-col items-center text-center px-6 pb-10">
          <div
            className="font-['Fraunces',serif] font-normal text-[#1e1e1e] whitespace-pre-line"
            style={{ fontSize: "clamp(22px,5vw,70px)", lineHeight: 1.28, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            {c(content, "hero_title")}
          </div>
          <p
            className="font-['Inter',sans-serif] text-[#1e1e1e]/85 text-center tracking-[-0.4px] mt-8 max-w-[640px]"
            style={{ fontSize: "clamp(14px,1.4vw,20px)", lineHeight: 1.8 }}
          >
            {c(content, "hero_subtitle")}
          </p>
          <button
            onClick={() => document.getElementById("our-impact")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold rounded-full mt-10 hover:bg-[#993925] transition-colors cursor-pointer"
            style={{ fontSize: "clamp(14px,1.4vw,20px)", padding: "clamp(12px,1.4vw,20px) clamp(24px,2.8vw,40px)" }}
          >
            {c(content, "hero_cta")}
          </button>
        </div>

        {/* ── Mosaic card row — fluid vw-based heights, no transform ── */}
        {/* outer cols (stacked) total ~41.5vw > inner 35vw → natural stagger at bottom */}
        <div className="hidden sm:flex items-end gap-[0.8vw] px-[3vw] mt-[-20px]">

          {/* Col 1 — stacked: photo-quote + terracotta stat */}
          <div className="flex flex-col flex-1 min-w-0 gap-[0.8vw]">
            <div className="relative overflow-hidden rounded-[3vw]" style={{ height: "26vw" }}>
              <img loading="eager" decoding="async" src={imgHeroCard} alt="" className="absolute inset-0 size-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
              <div
                className="absolute bottom-[8%] left-[9%] font-['Fraunces',serif] font-semibold text-[#f4efe7] w-[82%]"
                style={{ fontSize: "clamp(12px,2.1vw,30px)", lineHeight: 1.33, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
              >
                <p className="mb-0">Every Woman Empowered</p>
                <p>Strengthens A Family.</p>
              </div>
            </div>
            <div
              className="bg-[#a65a4a] rounded-[3vw] flex flex-col items-start justify-center"
              style={{ height: "14.5vw", padding: "0 10%" }}
            >
              <p className="font-['Inter',sans-serif] font-bold text-[#f4efe7]" style={{ fontSize: "clamp(16px,2.8vw,40px)", lineHeight: 1 }}>10,000+</p>
              <p className="font-['Inter',sans-serif] text-[#f4efe7] mt-[0.7vw]" style={{ fontSize: "clamp(10px,1.8vw,26px)", lineHeight: 1 }}>Stories Changed</p>
            </div>
          </div>

          {/* Col 2 — tall photo + stat overlay */}
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-[3vw]" style={{ height: "35vw" }}>
            <img loading="eager" fetchPriority="high" decoding="async" src={imgHeroMain} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
            <div className="absolute bottom-[8%] left-[11%] text-[#f4efe7]">
              <p className="font-['Inter',sans-serif] font-bold" style={{ fontSize: "clamp(18px,2.8vw,40px)", lineHeight: 1 }}>500+</p>
              <p className="font-['Inter',sans-serif] font-medium mt-[0.7vw]" style={{ fontSize: "clamp(10px,1.55vw,22px)", lineHeight: 1.27 }}>
                Women Leading<br />Their Communities
              </p>
            </div>
          </div>

          {/* Col 3 — solid terracotta: text + volunteer button */}
          <div
            className="bg-[#a65a4a] flex-1 min-w-0 rounded-[3vw] flex flex-col items-start justify-between overflow-hidden"
            style={{ height: "28vw", padding: "3.5vw 1.8vw" }}
          >
            <div
              className="font-['Fraunces',serif] font-semibold text-[#f4efe7]"
              style={{ fontSize: "clamp(12px,2vw,29px)", lineHeight: 1.38, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              <p className="mb-0">Join Thousands</p>
              <p className="mb-0">Building</p>
              <p className="mb-0">Stronger</p>
              <p>Communities.</p>
            </div>
            <button
              onClick={async () => {
                const session = getSavedUserSession();
                if (session) {
                  await saveVolunteer({
                    name: session.name,
                    email: session.email,
                    phone: session.phone,
                    skills: session.skills || "Community Support",
                    volunteer_commitment: "ongoing",
                    selected_events: ["Permanent Community Volunteer Membership"],
                  });
                  toast.success(`Registered as a Permanent Volunteer! Welcome, ${session.name}!`);
                  setPage("account");
                  window.scrollTo({ top: 0 });
                } else {
                  openModal("volunteer");
                }
              }}
              className="bg-[#f4efe7] text-[#a65a4a] font-['Inter',sans-serif] font-semibold w-full text-center rounded-full hover:bg-white transition-colors cursor-pointer"
              style={{ fontSize: "clamp(10px,1vw,15px)", padding: "clamp(5px,1vw,10px) 0" }}
            >
              Become a Volunteer
            </button>
          </div>

          {/* Col 4 — tall photo + centered quote */}
          <div className="relative flex-1 min-w-0 overflow-hidden rounded-[3vw]" style={{ height: "35vw" }}>
            <img loading="eager" decoding="async" src={imgHeroSide} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[31%] to-[rgba(30,30,30,0.8)] to-[79%]" />
            <p
              className="absolute bottom-[8%] left-1/2 -translate-x-1/2 font-['Fraunces',serif] font-semibold text-[#f4efe7] text-center w-[82%]"
              style={{ fontSize: "clamp(12px,2.1vw,30px)", lineHeight: 1.33, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Education Opens New Possibilities.
            </p>
          </div>

          {/* Col 5 — stacked: dark-rust stat (with blob) + terracotta quote */}
          <div className="flex flex-col flex-1 min-w-0 gap-[0.8vw]">
            <div className="relative overflow-hidden rounded-[3vw] bg-[#993925]" style={{ height: "26vw" }}>
              {/* decorative rotated blob */}
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center">
                <div style={{ transform: "rotate(14.94deg)", width: "310%", height: "290%", flexShrink: 0 }}>
                  <svg fill="none" preserveAspectRatio="none" viewBox="0 0 710.79 563.451" className="w-full h-full">
                    <path d={heroSvg.p2d6d0d00} fill="#A65A4A" />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#f4efe7]">
                <p className="font-['Inter',sans-serif] font-bold" style={{ fontSize: "clamp(22px,4.4vw,64px)", lineHeight: 1 }}>28+</p>
                <p className="font-['Inter',sans-serif] font-medium italic text-center mt-[0.9vw]" style={{ fontSize: "clamp(10px,2.1vw,30px)", lineHeight: 1.27, width: "64%" }}>
                  Years Walking Alongside Women
                </p>
              </div>
            </div>
            <div
              className="bg-[#a65a4a] rounded-[3vw] flex items-center justify-center"
              style={{ height: "14.5vw" }}
            >
              <p
                className="font-['Fraunces',serif] font-semibold text-[#f4efe7] text-center"
                style={{ fontSize: "clamp(11px,1.8vw,26px)", lineHeight: 1.54, fontVariationSettings: '"SOFT" 0, "WONK" 1', width: "83%" }}
              >
                Small Actions.<br />Lasting Change.
              </p>
            </div>
          </div>

        </div>

        {/* Mobile hero */}
        <div className="sm:hidden flex flex-col gap-3 px-4 mt-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl" style={{ height: "clamp(200px,58vw,280px)" }}>
            <img loading="eager" decoding="async" src={imgHeroCard} alt="" className="absolute inset-0 size-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(30,30,30,0.8)] from-[0%] to-transparent to-[55%]" />
            <p
              className="absolute font-['Fraunces',serif] font-semibold text-[#f4efe7]"
              style={{ bottom: "clamp(14px,4vw,20px)", left: "clamp(14px,4vw,20px)", fontSize: "clamp(16px,5vw,22px)", lineHeight: 1.35, fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Every Woman Empowered<br />Strengthens A Family.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#a65a4a] rounded-2xl flex flex-col items-center justify-center text-[#f4efe7] text-center" style={{ padding: "clamp(14px,4.5vw,20px) 8px" }}>
              <p className="font-['Inter',sans-serif] font-bold leading-none" style={{ fontSize: "clamp(20px,6.5vw,28px)" }}>500+</p>
              <p className="font-['Inter',sans-serif] leading-tight px-2 mt-1.5" style={{ fontSize: "clamp(11px,3.2vw,13px)" }}>Women Leading<br />Communities</p>
            </div>
            <div className="bg-[#993925] rounded-2xl flex flex-col items-center justify-center text-[#f4efe7] text-center" style={{ padding: "clamp(14px,4.5vw,20px) 8px" }}>
              <p className="font-['Inter',sans-serif] font-bold leading-none" style={{ fontSize: "clamp(20px,6.5vw,28px)" }}>28+</p>
              <p className="font-['Inter',sans-serif] italic leading-tight px-2 mt-1.5" style={{ fontSize: "clamp(11px,3.2vw,13px)" }}>Years Walking<br />Alongside Women</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="bg-[#a65a4a] relative overflow-hidden mt-16">
        {/* Decorative scatter-dot vector (full-width, from Figma) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute" style={{ inset: "-36.89% -18.29% -45.2% -17.98%" }}>
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1962.28 389.665" xmlnsXlink="http://www.w3.org/1999/xlink">
              <g>
                <g>
                  {[
                    "matrix(0 0 0 0 1895.98 134.034)", "translate(1896.01 134.126) scale(2.8373e-05) rotate(82.6921)",
                    "translate(978.602 128.438) scale(0.309402) rotate(-90.7474)", "translate(932.332 167.033) scale(0.308898) rotate(-60.9147)",
                    "translate(541.344 260.453) scale(0.294442) rotate(-87.6413)", "translate(313.3 318.814) scale(0.206479) rotate(-155.035)",
                    "translate(242.21 278.793) scale(0.203602) rotate(-71.0532)", "translate(290.515 187.924) scale(0.192121) rotate(-18.8363)",
                    "translate(455.804 104.054) scale(0.158718) rotate(-13.9323)", "translate(686.835 65.2657) scale(0.279792) rotate(-14.8195)",
                    "translate(798.751 126.377) scale(0.275509) rotate(-171.81)", "translate(1082.54 101.464) scale(0.309392) rotate(157.409)",
                    "translate(1260.29 79.3244) scale(0.284444) rotate(137.378)", "translate(1238.1 64.0513) scale(0.286345) rotate(111.917)",
                    "translate(1495.65 92.6092) scale(0.202586) rotate(-135.526)", "translate(1503.24 73.3141) scale(0.208261) rotate(172.747)",
                    "translate(1786.28 131.087) scale(0.0790798) rotate(-178.677)", "translate(1821.32 287.98) scale(0.123915) rotate(118.468)",
                    "translate(1363.32 323.427) scale(0.257431) rotate(-144.538)", "translate(1090.95 399.056) scale(0.303713) rotate(-164.727)",
                    "translate(952.745 310.084) scale(0.306993) rotate(-99.7518)", "translate(748.024 270.866) scale(0.300073) rotate(172.86)",
                    "translate(568 230) scale(0.24) rotate(150)", "translate(400 310) scale(0.21) rotate(-170)",
                    "translate(200 180) scale(0.19) rotate(-20)", "translate(100 200) scale(0.015) rotate(170)",
                  ].map((t, i) => (
                    <use key={i} transform={t} xlinkHref="#s_dot" />
                  ))}
                </g>
              </g>
              <defs>
                <g id="s_dot">
                  <path d={statsSvg.p394b980} fill="#B8704E" />
                </g>
              </defs>
            </svg>
          </div>
        </div>

        {/* Stats content — grid-based, no fixed height, no wrapping issues */}
        <div className="relative py-10 lg:py-0 lg:h-[214px] flex items-center justify-center px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 lg:gap-x-[60px] lg:gap-y-0 w-full max-w-[1100px] text-[#f4efe7] text-center">
            {[
              { num: "3,200+", label: "Girls Supported\nThrough Education" },
              { num: "1,800+", label: "Families Building\nSustainable Livelihoods" },
              { num: "250+", label: "Community Workshops\nConducted" },
              { num: "872+", label: "Supporters\nDriving Change" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-2 lg:gap-[14px] items-center">
                <p className={`${inter()} font-bold text-[28px] lg:text-[40px] leading-tight lg:leading-[40px]`}>{s.num}</p>
                <p className={`${inter()} font-normal text-[13px] lg:text-[20px] leading-snug lg:leading-[30px] max-w-[180px] lg:max-w-[232px]`} style={{ whiteSpace: "pre-line" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Impact ── */}
      <section id="our-impact" className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Our Impacts" />
            <SectionTitle text="How We Create Impact" center />
            <p
              className={`${inter()} text-[#1e1e1e]/75 text-[18px] leading-relaxed mt-4 max-w-[600px] mx-auto`}
            >
              Mahila Action works alongside communities through
              connected programs that empower women, children,
              and families to build sustainable futures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {impactCards.map((card) => (
              <div
                key={card.title}
                className="group relative rounded-2xl overflow-hidden cursor-pointer h-[340px]"
              >
                <img loading="lazy" decoding="async"
                  src={card.img}
                  alt={card.title}
                  className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/30 to-transparent" />
                {/* Icon badge */}
                <div className="absolute top-4 left-4 bg-[#b66e5f] text-white p-3 rounded-2xl">
                  {card.icon}
                </div>
                {/* Default text */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p
                    className={`${inter()} text-[#f4efe7] text-[18px] font-semibold`}
                  >
                    {card.title}
                  </p>
                  <p
                    className={`${inter()} text-[#f4efe7]/80 text-[14px] mt-1`}
                  >
                    {card.desc}
                  </p>
                </div>
                {/* Hover reveal */}
                <div className="absolute inset-0 bg-[#a65a4a] flex flex-col justify-center items-start p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white mb-3">
                    {card.icon}
                  </div>
                  <p
                    className={`${inter()} text-[#f4efe7] text-[20px] font-semibold mb-3`}
                  >
                    {card.title}
                  </p>
                  <p
                    className={`${inter()} text-[#f4efe7]/90 text-[15px] leading-relaxed`}
                  >
                    {card.desc}
                  </p>
                  <button
                    onClick={() => openDetail(card.id)}
                    className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-5 opacity-85 hover:opacity-100 cursor-pointer`}
                  >
                    Read Story →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ── */}
      <section className="py-20 px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center gap-12">
          {/* Text side */}
          <div className="flex-1">
            <SectionLabel text="Upcoming Events" />
            <SectionTitle text="Join The Movement" />
            <p
              className={`${inter()} text-[#1e1e1e]/75 text-[18px] leading-relaxed mt-4 max-w-[440px]`}
            >
              Real change starts with participation. Volunteer
              your time, share your skills, or join a community
              event near you.
            </p>
            <button
              onClick={handleReserveClick}
              disabled={!featuredEvent}
              className={`${inter()} bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold px-10 py-4 rounded-full mt-8 hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {eventOpen ? "Reserve Your Seat" : "See Upcoming Events"}
            </button>
          </div>

          {/* Event card */}
          {featuredEvent ? (
            <div className="relative w-full lg:flex-1 h-[380px] rounded-2xl overflow-hidden">
              <img loading="lazy" decoding="async"
                src={featuredEvent.image || imgEvent}
                alt={featuredEvent.title}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-transparent" />
              {/* Status badge */}
              <div className="absolute top-6 left-6 flex items-center justify-between w-[calc(100%-48px)]">
                <span
                  className={`${inter()} border border-[#f4efe7] text-[#f4efe7] text-[12px] font-semibold px-4 py-1.5 rounded-full`}
                >
                  {siteData.categories.find((c) => c.id === featuredEvent.categoryId)?.name || "Community Event"}
                </span>
                {eventOpen ? (
                  <span className="bg-[#ebc2c2] border-2 border-[#8f6969] text-[#dc0f0f] text-[10px] font-medium px-4 py-1 rounded-full flex items-center gap-1.5">
                    <span className="size-1.5 bg-red-500 rounded-full animate-ping absolute" />
                    <span className="size-1.5 bg-red-500 rounded-full relative" />
                    {featuredEvent.totalSeats} Seats — Open
                  </span>
                ) : (
                  <span className="bg-[#1e1e1e]/50 border-2 border-[#f4efe7]/30 text-[#f4efe7] text-[10px] font-semibold px-4 py-1 rounded-full">
                    Closed
                  </span>
                )}
              </div>
              {/* Event details */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p
                  className={`${inter()} text-[#f4efe7] text-[20px] font-semibold`}
                >
                  {featuredEvent.title}
                </p>
                <div className="flex items-center gap-6 mt-3">
                  <span
                    className={`${inter()} text-[#f4efe7] text-[14px] flex items-center gap-2`}
                  >
                    <Calendar size={16} /> {new Date(featuredEvent.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                  <span
                    className={`${inter()} text-[#f4efe7] text-[14px] flex items-center gap-2`}
                  >
                    <MapPin size={16} /> {featuredEvent.location}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full lg:flex-1 h-[380px] rounded-2xl bg-[#a65a4a]/10 flex items-center justify-center">
              <p className={`${inter()} text-[#1e1e1e]/50 text-[16px]`}>No events scheduled right now — check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Community Stories ── */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Community Stories" />
            <SectionTitle text="Lives In Motion" center />
            <p
              className={`${inter()} text-[#1e1e1e]/75 text-[20px] leading-relaxed mt-4 max-w-[700px] mx-auto`}
            >
              Every initiative creates a ripple effect that
              reaches individuals, families, and entire
              communities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {stories.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden group cursor-pointer flex flex-col h-full"
              >
                <div className="h-[220px] shrink-0 overflow-hidden rounded-t-2xl">
                  <img loading="lazy" decoding="async"
                    src={s.img}
                    alt={s.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="bg-[#a65a4a] p-6 rounded-b-2xl flex-1 flex flex-col">
                  <p
                    className={`${inter()} text-[#f4efe7] text-[20px] font-semibold capitalize line-clamp-2`}
                  >
                    {s.title}
                  </p>
                  <p
                    className={`${inter()} text-[#f4efe7]/85 text-[16px] leading-relaxed mt-3 line-clamp-3`}
                  >
                    {s.excerpt}
                  </p>
                  <button
                    onClick={() => openStoryBlog(s.id)}
                    className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-auto pt-6 opacity-85 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1 w-fit`}
                  >
                    Read Story <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {stories.length === 0 && (
            <p className={`${inter()} text-center text-[#1e1e1e]/50 text-[16px] py-10`}>Something big is cooking! Check back soon.</p>
          )}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-20 px-6 bg-[#993925]">
        <div className="max-w-[800px] mx-auto text-center">
          <h2
            className={`${fraunces()} text-[#f4efe7] text-[42px] md:text-[52px] leading-tight`}
            style={{
              fontVariationSettings: '"SOFT" 0, "WONK" 1',
            }}
          >
            One Contribution. Many Futures.
          </h2>
          <p
            className={`${inter()} text-[#f4efe7]/85 text-[18px] mt-4 leading-relaxed`}
          >
            Your support directly funds programs that transform
            lives. Help us reach more women, more families, more
            communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => {
                setPage("donate");
                window.scrollTo({ top: 0 });
              }}
              className={`${inter()} bg-[#f4efe7] text-[#a65a4a] text-[17px] font-bold px-10 py-4 rounded-full hover:bg-white transition-colors cursor-pointer`}
            >
              Donate Now
            </button>
            <button
              onClick={() => {
                setPage("about");
                window.scrollTo({ top: 0 });
              }}
              className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[17px] font-semibold px-10 py-4 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer`}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ABOUT PAGE
// ═══════════════════════════════════════════════════════════════════════════
function AboutPage({
  setPage,
}: {
  setPage: (p: Page) => void;
}) {
  const siteData = useSiteData();
  const timeline = [...siteData.timeline]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ year: t.year, img: t.image || TIMELINE_FALLBACK_IMAGES[t.id] || imgEvent, title: t.title, desc: t.description }));

  const [activeYear, setActiveYear] = useState(timeline[0]?.year ?? "");
  const active =
    timeline.find((t) => t.year === activeYear) ?? timeline[0];

  const councilors = siteData.councilors
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ img: c.image || imgStory1, role: c.role, name: c.name, story: c.bio }));

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgAboutBanner} title="Who Are We" />

      {/* Mission + Vision */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mission */}
          <div className="bg-[#a65a4a] rounded-2xl p-8 md:p-10">
            <SectionLabel text="Our Mission" />
            <h3
              className={`${fraunces()} text-[#f4efe7] text-[36px] md:text-[42px] mt-3 capitalize leading-tight`}
              style={{
                fontVariationSettings: '"SOFT" 0, "WONK" 1',
              }}
            >
              Self-Led Sustainable Transformation
            </h3>
            <p
              className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-5`}
            >
              Mahila Action rejects the transactional
              traditional donor-victim paradigm. We operate on
              the unshakeable premise that local communities and
              marginalized women are structural change leaders —
              not passive beneficiaries.
            </p>
            <p
              className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-4`}
            >
              By building civil rights agency, providing
              microscale financial networks, and offering
              accredited educational transition schooling, we
              turn vulnerabilities into localized cooperative
              engines of sustainable success.
            </p>
          </div>

          {/* Vision */}
          <div className="border-2 border-[#a65a4a] rounded-2xl p-8 md:p-10">
            <SectionLabel text="Our Vision" />
            <h3
              className={`${fraunces()} text-[#1e1e1e] text-[36px] md:text-[42px] mt-3 capitalize leading-tight`}
              style={{
                fontVariationSettings: '"SOFT" 0, "WONK" 1',
              }}
            >
              Self-Led Sustainable Transformation
            </h3>
            <p
              className={`${inter()} text-[#1e1e1e]/80 text-[17px] leading-relaxed mt-5`}
            >
              Mahila Action rejects the transactional
              traditional donor-victim paradigm. We operate on
              the unshakeable premise that local communities and
              marginalized women are structural change leaders —
              not passive beneficiaries.
            </p>
            <p
              className={`${inter()} text-[#1e1e1e]/80 text-[17px] leading-relaxed mt-4`}
            >
              By building civil rights agency, providing
              microscale financial networks, and offering
              accredited educational transition schooling, we
              turn vulnerabilities into localized cooperative
              engines of sustainable success.
            </p>
          </div>
        </div>
      </section>

      {/* Councilors */}
      <section className="py-16 px-6 bg-white/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel text="Councilors" />
            <SectionTitle
              text="The Advocates Leading the Way"
              center
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {councilors.map((c) => (
              <div
                key={c.name}
                className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-8 flex flex-col items-center text-center gap-5"
              >
                <div className="relative size-[180px] rounded-full overflow-hidden border-4 border-[#a65a4a] shrink-0">
                  <img loading="lazy" decoding="async"
                    src={c.img}
                    alt={c.name}
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
                <div>
                  <p
                    className={`${inter()} text-[#a65a4a] text-[14px] italic font-medium`}
                  >
                    {c.role}
                  </p>
                  <p
                    className={`${inter()} text-[#a65a4a] text-[22px] font-semibold mt-1`}
                  >
                    {c.name}
                  </p>
                </div>
                <p
                  className={`${inter()} text-[#a65a4a]/80 text-[17px] leading-relaxed`}
                >
                  {c.story}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="Our Impacts" />
            <SectionTitle
              text="Our Impacts Since 1995"
              center
            />
          </div>

          {/* Year buttons */}
          {timeline.length > 0 && (
            <>
              <div className="flex flex-wrap gap-3 justify-center mb-10">
                {timeline.map((t) => (
                  <button
                    key={t.year}
                    onClick={() => setActiveYear(t.year)}
                    className={`${inter()} text-[14px] font-bold px-6 py-2.5 rounded-full transition-colors cursor-pointer ${activeYear === t.year
                      ? "bg-[#a65a4a] text-[#f4efe7]"
                      : "bg-[#f4efe7] border border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a]/10"
                      }`}
                  >
                    {t.year}
                  </button>
                ))}
              </div>

              {/* Timeline content */}
              {active && (
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="relative w-full lg:w-[520px] h-[380px] rounded-2xl overflow-hidden shrink-0">
                    <img loading="lazy" decoding="async"
                      src={active.img}
                      alt={active.title}
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                  <div>
                    <p
                      className={`${inter()} text-[14px] text-[#1e1e1e]/60 mb-1`}
                    >
                      {active.year}
                    </p>
                    <h3
                      className={`${fraunces()} text-[#1e1e1e] text-[36px] md:text-[42px] leading-tight capitalize`}
                      style={{
                        fontVariationSettings: '"SOFT" 0, "WONK" 1',
                      }}
                    >
                      {active.title}
                    </h3>
                    <p
                      className={`${inter()} text-[#1e1e1e]/80 text-[18px] leading-relaxed mt-5`}
                    >
                      {active.desc}
                    </p>
                    <p
                      className={`${inter()} text-[#1e1e1e]/80 text-[18px] leading-relaxed mt-3`}
                    >
                      Each milestone represents thousands of lives
                      touched, hundreds of communities strengthened,
                      and one unwavering commitment to human dignity
                      and justice.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Take Action teaser */}
      <section className="relative py-24 px-6 overflow-hidden">
        <img loading="lazy" decoding="async"
          src={imgTakeAction}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[#993925]/85" />
        <div className="relative max-w-[800px] mx-auto text-center">
          <h2
            className={`${fraunces()} text-[#f4efe7] text-[42px] md:text-[52px] leading-tight`}
            style={{
              fontVariationSettings: '"SOFT" 0, "WONK" 1',
            }}
          >
            One Contribution. Many Futures.
          </h2>
          <button
            onClick={() => {
              setPage("donate");
              window.scrollTo({ top: 0 });
            }}
            className={`${inter()} bg-[#f4efe7] text-[#a65a4a] text-[17px] font-bold px-12 py-4 rounded-full mt-8 hover:bg-white transition-colors cursor-pointer`}
          >
            Donate Now
          </button>
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STORIES PAGE
// ═══════════════════════════════════════════════════════════════════════════
function StoriesPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { openModal } = useModal();

  const storyPosts = siteData.blogPosts.filter((p) => p.section === "story");
  const filtered =
    activeCategory === "All"
      ? storyPosts
      : storyPosts.filter((s) => s.categoryId === activeCategory);

  const activeCategoryHasNoPosts = activeCategory !== "All" && filtered.length === 0;

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner img={imgHeroCard} title="Our Stories" />

      {/* Filter tabs */}
      <section className="py-10 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveCategory("All")}
              className={`${inter()} text-[16px] font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer ${activeCategory === "All"
                ? "bg-[#a35848] text-[#f4efe7]"
                : "bg-[#f4efe7] border border-[#a35848] text-[#a35848] hover:bg-[#a35848]/10"
                }`}
            >
              All
            </button>
            {siteData.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`${inter()} text-[16px] font-semibold px-6 py-2.5 rounded-full transition-colors cursor-pointer ${activeCategory === cat.id
                  ? "bg-[#a35848] text-[#f4efe7]"
                  : "bg-[#f4efe7] border border-[#a35848] text-[#a35848] hover:bg-[#a35848]/10"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Story grid */}
      <section className="pb-20 px-6">
        {filtered.length > 0 && (
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col"
              >
                <div className="h-[220px] shrink-0 overflow-hidden rounded-t-2xl bg-[#a35848]/20">
                  <img loading="lazy" decoding="async"
                    src={s.coverImage || STORY_FALLBACK_IMAGES[s.id]?.banner || imgStory1}
                    alt={s.title}
                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="bg-[#a35848] p-6 rounded-b-2xl flex flex-col flex-1">
                  <p
                    className={`${inter()} text-[#f4efe7] text-[22px] font-semibold capitalize line-clamp-2`}
                  >
                    {s.title}
                  </p>
                  <p
                    className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-3 line-clamp-3`}
                  >
                    {s.excerpt}
                  </p>
                  <button
                    onClick={() => openModal("story", { id: s.id })}
                    className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-auto pt-4 opacity-85 hover:opacity-100 transition-opacity cursor-pointer text-left`}
                  >
                    Read Story →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeCategoryHasNoPosts && (
          <div className="text-center py-20">
            <p className={`${fraunces()} text-[#a65a4a] text-[26px] font-semibold mb-2`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Something Big Is Cooking!
            </p>
            <p className={`${inter()} text-[#1e1e1e]/50 text-[16px]`}>
              We're preparing stories for this category — check back soon.
            </p>
          </div>
        )}

        {activeCategory === "All" && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className={`${inter()} text-[#1e1e1e]/50 text-[18px]`}>No stories yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════
// ── QR-code images for the payment screen — replace these two lines with
// your own uploaded QR screenshots once you're ready to go live. Swap the
// placeholder URL for a real image import (the same way imgHeroCard,
// imgLogo, etc. are imported near the top of this file), or a direct URL
// to your hosted QR image.
const GPAY_QR_IMAGE = "https://placehold.co/320x320/f4efe7/1e1e1e?text=Google+Pay+QR";
const PHONEPE_QR_IMAGE = "https://placehold.co/320x320/f4efe7/1e1e1e?text=PhonePe+QR";

function PaymentModal({
  amount,
  name,
  email,
  onClose,
  onSuccess,
}: {
  amount: number;
  name: string;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qrMethod, setQrMethod] = useState<"gpay" | "phonepe">("gpay");
  const [confirming, setConfirming] = useState(false);

  function handleConfirmPaid() {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      onSuccess();
    }, 900);
  }

  const qrImage = qrMethod === "gpay" ? GPAY_QR_IMAGE : PHONEPE_QR_IMAGE;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[420px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#a65a4a] px-6 py-5 flex items-center justify-between">
          <div>
            <p className={`${inter()} text-[#f4efe7] text-[13px] opacity-80`}>Paying for</p>
            <p className={`${fraunces()} text-[#f4efe7] text-[20px] font-semibold`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Mahila Action
            </p>
          </div>
          <div className="text-right">
            <p className={`${inter()} text-[#f4efe7]/80 text-[13px]`}>Amount</p>
            <p className={`${inter()} text-[#f4efe7] text-[24px] font-bold`}>₹{amount.toLocaleString("en-IN")}</p>
          </div>
          <button onClick={onClose} className="ml-4 text-[#f4efe7]/80 hover:text-[#f4efe7] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          {/* Donor info summary */}
          <div className="w-full bg-[#f4efe7] rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle size={18} className="text-[#587735] shrink-0" />
            <div>
              <p className={`${inter()} text-[#1e1e1e] text-[13px] font-medium`}>{name || "Anonymous Donor"}</p>
              <p className={`${inter()} text-[#1e1e1e]/60 text-[12px]`}>{email || "No email provided"}</p>
            </div>
          </div>

          {/* Google Pay / PhonePe toggle */}
          <div className="flex gap-2 w-full">
            {([
              { id: "gpay" as const, label: "Google Pay" },
              { id: "phonepe" as const, label: "PhonePe" },
            ]).map(m => (
              <button
                key={m.id}
                onClick={() => setQrMethod(m.id)}
                className={`${inter()} flex-1 py-2.5 text-[13px] font-semibold rounded-lg border transition-colors cursor-pointer ${qrMethod === m.id ? "bg-[#a65a4a] text-[#f4efe7] border-[#a65a4a]" : "text-[#a65a4a] border-[#a65a4a]/40 hover:border-[#a65a4a]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* QR code */}
          <div className="border-2 border-[#a65a4a]/25 rounded-2xl p-4 bg-white">
            <img src={qrImage} alt={`${qrMethod === "gpay" ? "Google Pay" : "PhonePe"} QR code`} className="size-[260px] object-contain" />
          </div>
          <p className={`${inter()} text-[#1e1e1e]/60 text-[13px] text-center`}>
            Scan this code with {qrMethod === "gpay" ? "Google Pay" : "PhonePe"} (or any UPI app) to pay <strong className="text-[#a65a4a]">₹{amount.toLocaleString("en-IN")}</strong>.
          </p>

          <button
            onClick={handleConfirmPaid}
            disabled={confirming}
            className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-3`}
          >
            {confirming ? (
              <>
                <svg className="animate-spin size-5 text-[#f4efe7]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Confirming…
              </>
            ) : "I've Completed the Payment"}
          </button>

          <p className={`${inter()} text-center text-[11px] text-[#1e1e1e]/40`}>
            🔒 Payments are made directly via UPI · Your details are safe
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Payment Success ──────────────────────────────────────────────────────
// function PaymentSuccess({
//   amount,
//   name,
//   onClose,
// }: {
//   amount: number;
//   name: string;
//   onClose: () => void;
// }) {
//   return (
//     <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//       <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl p-8 text-center">
//         <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center mx-auto mb-5">
//           <CheckCircle size={40} className="text-[#587735]" />
//         </div>
//         <h3
//           className={`${fraunces()} text-[#1e1e1e] text-[32px]`}
//           style={{
//             fontVariationSettings: '"SOFT" 0, "WONK" 1',
//           }}
//         >
//           Thank You!
//         </h3>
//         <p
//           className={`${inter()} text-[#1e1e1e]/70 text-[17px] mt-2`}
//         >
//           {name ? `Dear ${name}, your` : "Your"} donation of{" "}
//           <strong className="text-[#a65a4a]">
//             ₹{amount.toLocaleString("en-IN")}
//           </strong>{" "}
//           has been received.
//         </p>
//         <p
//           className={`${inter()} text-[#1e1e1e]/60 text-[15px] mt-3 leading-relaxed`}
//         >
//           Your contribution directly supports women and
//           communities across India. A confirmation receipt will
//           be sent to your email.
//         </p>
//         <div className="bg-[#f4efe7] rounded-xl p-5 mt-6">
//           <p
//             className={`${fraunces()} text-[#a65a4a] text-[20px]`}
//             style={{
//               fontVariationSettings: '"SOFT" 0, "WONK" 1',
//             }}
//           >
//             "Small Actions. Lasting Change."
//           </p>
//         </div>
//         <button
//           onClick={onClose}
//           className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full mt-6 hover:bg-[#993925] transition-colors cursor-pointer`}
//         >
//           Continue
//         </button>
//       </div>
//     </div>
//   );
// }

// ═══════════════════════════════════════════════════════════════════════════
// DONATION FORM CARD — reused by the Donate page AND the "Donor" tab of the
// Reserve Seat modal, so both look and behave identically.
// ═══════════════════════════════════════════════════════════════════════════
function DonationFormCard({ eventName, initialCampaignId }: { eventName?: string; initialCampaignId?: string }) {
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? CAMPAIGNS[0].id);
  const [anonymous, setAnonymous] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Keep the dropdown in sync if the person picks a different campaign card further down the page.
  useEffect(() => {
    if (initialCampaignId) setCampaignId(initialCampaignId);
  }, [initialCampaignId]);

  const selectedCampaign = CAMPAIGNS.find(c => c.id === campaignId) ?? CAMPAIGNS[0];
  const finalAmount = parseInt(customAmount, 10) || 0;

  function handleProceed() {
    if (!finalAmount || finalAmount < 10)
      return toast.error("Please enter a valid donation amount");
    if (!donorPhone.trim())
      return toast.error("Please enter your phone number");
    setShowPayment(true);
  }

  async function handlePaymentSuccess() {
    setShowPayment(false);
    const ok = await saveDonation({
      amount: finalAmount,
      name: anonymous ? "" : donorName,
      email: anonymous ? "" : donorEmail,
      phone: donorPhone,
      anonymous,
      event_name: eventName,
      campaign_name: selectedCampaign.name,
    });
    if (!ok) {
      toast.error("Payment succeeded, but we couldn't record it — please contact us with your payment confirmation.");
    }
    setPaymentSuccess(true);
  }

  function handleSuccessClose() {
    setPaymentSuccess(false);
    setDonorName("");
    setDonorEmail("");
    setDonorPhone("");
    setCustomAmount("");
  }

  return (
    <>
      <div className="bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-7 flex flex-col gap-5">
        <h3
          className={`${fraunces()} text-[#1e1e1e] text-[24px] font-semibold capitalize`}
          style={{
            fontVariationSettings: '"SOFT" 0, "WONK" 1',
          }}
        >
          {eventName ? "Donate To This Event" : "Donate To This Campaign"}
        </h3>

        {/* Custom amount */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Custom Contribution:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="₹ Enter amount"
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
        </div>

        {/* Campaign selector */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Select Campaign:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] focus:outline-none cursor-pointer`}
            >
              {CAMPAIGNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {formatLakh(c.raised)} raised so far
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Name */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Full Name:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your name"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Email Address:
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              disabled={anonymous}
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none disabled:opacity-40`}
            />
          </div>
        </div>

        {/* Phone — always required, even for anonymous donations, so we can send receipts */}
        <div>
          <p
            className={`${inter()} text-[13px] font-medium text-[#1e1e1e] uppercase tracking-wider mb-1`}
          >
            Phone Number: *
          </p>
          <div className="border-b-2 border-[#a65a4a] pb-2">
            <input
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              type="tel"
              className={`${inter()} w-full bg-transparent text-[15px] text-[#1e1e1e] placeholder-[#919090] focus:outline-none`}
            />
          </div>
          {anonymous && (
            <p className={`${inter()} text-[11px] text-[#1e1e1e]/45 mt-1`}>
              Kept private — used only for your donation receipt, never shown publicly.
            </p>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setShowDetails(!showDetails)}
              className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${showDetails ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"
                }`}
            >
              {showDetails && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
            </div>
            <span className={`${inter()} text-[15px] font-medium text-[#1e1e1e]`}>
              Show my details
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => {
                setAnonymous(!anonymous);
                if (!anonymous) {
                  setDonorName("");
                  setDonorEmail("");
                }
              }}
              className={`size-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${anonymous ? "bg-[#a65a4a] border-[#a65a4a]" : "bg-[#f4efe7] border-[#a65a4a]"
                }`}
            >
              {anonymous && <CheckCircle size={14} className="text-[#f4efe7]" strokeWidth={3} />}
            </div>
            <span className={`${inter()} text-[15px] font-medium text-[#1e1e1e]`}>
              Donate anonymously
            </span>
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleProceed}
          className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[20px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer flex items-center justify-center gap-2`}
        >
          Support for a Cause <ChevronRight size={20} />
        </button>

        <p className={`${inter()} text-center text-[12px] text-[#1e1e1e]/50`}>
          80G Tax exemption available · Secure payment
        </p>
      </div>
      {showPayment && (
        <PaymentModal
          amount={finalAmount}
          name={anonymous ? "" : donorName}
          email={anonymous ? "" : donorEmail}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DONATE PAGE
// ═══════════════════════════════════════════════════════════════════════════
function DonatePage() {
  const featured = CAMPAIGNS[0];
  const otherCampaigns = CAMPAIGNS.slice(1);
  const campaignImages: Record<string, string> = {
    "women-leadership-fund": imgStory1,
    "skills-for-tomorrow": imgStory2,
    "community-health-drive": imgStory3,
  };
  const [selectedCampaignId, setSelectedCampaignId] = useState(featured.id);
  const progress = Math.min((featured.raised / featured.goal) * 100, 100);

  function pickCampaign(id: string) {
    setSelectedCampaignId(id);
    document.getElementById("donate-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="bg-[#f4efe7]">
      <PageBanner
        img={imgDonateBanner}
        title={`Donate For\na Cause`}
      />

      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10 items-start">
          {/* Campaign image side */}
          <div className="flex-1 w-full">
            <SectionLabel text="Take Action" />
            <SectionTitle text="One Contribution. Many Futures." />

            <div className="relative mt-6 rounded-2xl overflow-hidden h-[260px] sm:h-[380px] md:h-[480px]">
              <img loading="lazy" decoding="async"
                src={imgTakeAction}
                alt={featured.name}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-[#1e1e1e]/20 to-transparent" />

              {/* Category tag */}
              <div className="absolute top-6 left-8">
                <span
                  className={`${inter()} border-2 border-[#f4efe7] text-[#f4efe7] text-[13px] font-bold px-8 py-2 rounded-full`}
                >
                  {featured.tag}
                </span>
              </div>

              {/* Campaign details */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p
                  className={`${inter()} text-[#f4efe7] text-[22px] font-semibold`}
                >
                  {featured.name}
                </p>
                {/* Progress */}
                <div className="mt-4 flex items-center justify-between mb-2">
                  <p
                    className={`${inter()} text-[#f4efe7] text-[13px] font-semibold`}
                  >
                    ₹{featured.raised.toLocaleString("en-IN")} Raised
                  </p>
                  <p
                    className={`${inter()} text-[#89a26e] text-[13px] font-semibold`}
                  >
                    Goal: ₹{featured.goal.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="relative bg-white/30 rounded-full h-[5px] w-full">
                  <div
                    className="bg-[#587735] h-[5px] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Tooltip */}
                  <div
                    className={`${inter()} absolute -top-8 bg-[#89a26e] text-[#f4efe7] text-[10px] font-semibold px-2 py-1 rounded`}
                    style={{ left: `${progress - 4}%` }}
                  >
                    {Math.round(progress)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Donation form */}
          <div id="donate-form" className="w-full lg:w-[420px] shrink-0">
            <DonationFormCard initialCampaignId={selectedCampaignId} />
          </div>
        </div>
      </section>

      {/* Other campaigns */}
      <section className="py-16 px-6 bg-white/30">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="More Campaigns" />
            <SectionTitle
              text="Every Cause Needs Your Help"
              center
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherCampaigns.map((c) => (
              <div
                key={c.id}
                className="bg-[#f4efe7] border-2 border-[#a65a4a]/30 rounded-2xl overflow-hidden hover:border-[#a65a4a] transition-colors group"
              >
                <div className="relative h-[180px] overflow-hidden">
                  <img loading="lazy" decoding="async"
                    src={campaignImages[c.id]}
                    alt={c.name}
                    className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className={`${inter()} border border-[#f4efe7] text-[#f4efe7] text-[11px] font-semibold px-3 py-1 rounded-full bg-black/30`}
                    >
                      {c.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <p
                    className={`${inter()} text-[#1e1e1e] text-[18px] font-semibold`}
                  >
                    {c.name}
                  </p>
                  <div className="mt-3 bg-[#d9d9d9] rounded-full h-[4px]">
                    <div
                      className="bg-[#587735] h-[4px] rounded-full"
                      style={{
                        width: `${(c.raised / c.goal) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p
                      className={`${inter()} text-[#1e1e1e] text-[12px] font-semibold`}
                    >
                      {formatLakh(c.raised)} raised
                    </p>
                    <p
                      className={`${inter()} text-[#89a26e] text-[12px] font-semibold`}
                    >
                      Goal: {formatLakh(c.goal)}
                    </p>
                  </div>
                  <button
                    onClick={() => pickCampaign(c.id)}
                    className={`${inter()} w-full bg-[#a65a4a]/10 border border-[#a65a4a] text-[#a65a4a] text-[14px] font-semibold py-2.5 rounded-full mt-4 hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-colors cursor-pointer`}
                  >
                    Donate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT PAGE
// ═══════════════════════════════════════════════════════════════════════════
function ContactPage() {
  const siteData = useSiteData();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Please enter your full name");
    if (!form.email.trim() || !form.email.includes("@")) return toast.error("Please enter a valid email");
    if (form.phone.trim() && !isValidPhoneNumber(form.phone)) return toast.error("Please enter a valid phone number (e.g. +91 98765 43210)");
    if (!form.message.trim()) return toast.error("Please write your message");
    setLoading(true);
    const ok = await saveContact({
      name: form.name, email: form.email,
      phone: form.phone || undefined,
      subject: form.subject || undefined,
      message: form.message,
    });
    setLoading(false);
    if (!ok) return toast.error("Something went wrong sending your message — please try again.");
    setSubmitted(true);
  }

  const inputBase = `w-full border-2 border-[#a65a4a]/25 bg-white rounded-xl px-4 py-3.5 text-[15px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]`;
  const labelBase = `font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e]/70 mb-1.5 block`;

  const contactCards = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
      label: "Email Us",
      value: siteData.contact.email,
      sub: siteData.contact.emailNote,
      href: `mailto:${siteData.contact.email}`,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12 19.79 19.79 0 0 1 1.07 3.4 2 2 0 0 1 3.06 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.02 17z" /></svg>,
      label: "Call Us",
      value: siteData.contact.phone,
      sub: siteData.contact.phoneNote,
      href: `tel:${siteData.contact.phone.replace(/\s/g, "")}`,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
      label: "Visit Us",
      value: siteData.contact.address,
      sub: siteData.contact.addressNote,
      href: "#",
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      label: "Office Hours",
      value: siteData.contact.hours,
      sub: siteData.contact.hoursNote,
      href: "#",
    },
  ];

  const faqs = [
    { q: "How can I volunteer with Mahila Action?", a: "Fill out the contact form with your areas of interest and availability. Our team will reach out with suitable volunteering opportunities within 3–5 working days." },
    { q: "Can I visit the office?", a: "Yes! Our Hyderabad office welcomes visitors. We recommend scheduling an appointment via phone or email to ensure the right team member is available to meet you." },
    { q: "How do I partner with Mahila Action?", a: "We welcome partnerships from corporates, NGOs, and institutions. Reach out via the form or email us with your proposal and we'll respond within 48 hours." },
    { q: "Where does my donation go?", a: "100% of donations go directly to our programmes. We maintain full financial transparency — annual reports are available on request." },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="bg-[#f4efe7]">
      {/* ── Banner ── */}
      <PageBanner img={imgAboutBanner} title="Contact Us" />

      {/* ── Contact info cards ── */}
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {contactCards.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="group bg-white border-2 border-transparent hover:border-[#a65a4a] rounded-2xl p-6 flex flex-col gap-4 transition-all hover:shadow-md cursor-pointer"
            >
              <div className="size-12 bg-[#a65a4a]/10 text-[#a65a4a] rounded-xl flex items-center justify-center group-hover:bg-[#a65a4a] group-hover:text-[#f4efe7] transition-colors">
                {c.icon}
              </div>
              <div>
                <p className={`${inter()} text-[12px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider`}>{c.label}</p>
                <p className={`${inter()} text-[15px] font-semibold text-[#1e1e1e] mt-1`}>{c.value}</p>
                <p className={`${inter()} text-[13px] text-[#1e1e1e]/55 mt-0.5`}>{c.sub}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Form + sidebar ── */}
      <section className="pb-20 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-10">

          {/* Form card */}
          <div className="flex-[1.4] bg-white rounded-2xl shadow-sm p-5 sm:p-8 md:p-10">
            {submitted ? (
              <div className="flex flex-col items-center text-center gap-5 py-10">
                <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                  <CheckCircle size={40} className="text-[#587735]" />
                </div>
                <h3 className={`${fraunces()} text-[#1e1e1e] text-[30px]`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                  Message Sent!
                </h3>
                <p className={`${inter()} text-[#1e1e1e]/65 text-[16px] leading-relaxed max-w-[380px]`}>
                  Thank you, <strong className="text-[#a65a4a]">{form.name}</strong>! We've received your message and will get back to you at <strong className="text-[#a65a4a]">{form.email}</strong> within 24 hours.
                </p>
                <button
                  onClick={() => { setForm({ name: "", email: "", phone: "", subject: "", message: "" }); setSubmitted(false); }}
                  className={`${inter()} mt-2 bg-[#a65a4a] text-[#f4efe7] text-[16px] font-semibold px-10 py-3.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <SectionLabel text="Get In Touch" />
                  <h2 className={`${fraunces()} text-[#1e1e1e] text-[22px] sm:text-[30px] md:text-[42px] leading-tight mt-2`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                    We'd Love to Hear From You
                  </h2>
                  <p className={`${inter()} text-[#1e1e1e]/60 text-[15px] leading-relaxed mt-3`}>
                    Whether you want to volunteer, partner, donate, or simply learn more — drop us a message and our team will respond promptly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={labelBase}>Full Name *</label>
                      <input value={form.name} onChange={set("name")} placeholder="Your full name" className={inputBase} />
                    </div>
                    <div>
                      <label className={labelBase}>Phone Number</label>
                      <input value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" className={inputBase} />
                    </div>
                  </div>

                  <div>
                    <label className={labelBase}>Email Address *</label>
                    <input value={form.email} onChange={set("email")} placeholder="you@email.com" type="email" className={inputBase} />
                  </div>

                  <div>
                    <label className={labelBase}>Subject</label>
                    <select value={form.subject} onChange={set("subject")} className={`${inputBase} cursor-pointer`}>
                      <option value="">Select a subject…</option>
                      <option>Volunteering Enquiry</option>
                      <option>Partnership / Collaboration</option>
                      <option>Donation &amp; Funding</option>
                      <option>Event Registration</option>
                      <option>Media &amp; Press</option>
                      <option>General Enquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelBase}>Your Message *</label>
                    <textarea value={form.message} onChange={set("message")} placeholder="Tell us how we can help or how you'd like to get involved…" rows={5} className={`${inputBase} resize-none`} />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`${inter()} w-full bg-[#a65a4a] text-[#f4efe7] text-[17px] font-semibold py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-70 flex items-center justify-center gap-3 mt-2`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin size-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending…
                      </>
                    ) : "Send Message"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Why reach out */}
            <div className="bg-[#a65a4a] rounded-2xl p-7 text-[#f4efe7]">
              <h3 className={`${fraunces()} text-[26px] font-semibold leading-tight`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                Why Reach Out?
              </h3>
              <div className={`${inter()} text-[14px] text-[#f4efe7]/85 flex flex-col gap-3 mt-5`}>
                {[
                  "Volunteer your skills for a cause that matters",
                  "Partner with us to amplify community impact",
                  "Fund a programme and see direct results",
                  "Attend or organise community events",
                  "Share your story or get media coverage",
                ].map((item) => (
                  <div key={item} className="flex gap-3 items-start">
                    <CheckCircle size={15} className="mt-0.5 shrink-0 text-[#f4efe7]/70" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div className="bg-white rounded-2xl p-6">
              <p className={`${inter()} text-[13px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider mb-4`}>Follow Our Work</p>
              <div className="flex flex-col gap-3">
                {[
                  { name: "Instagram", handle: "@mahilaaction", color: "bg-pink-50 text-pink-600" },
                  { name: "Facebook", handle: "Mahila Action", color: "bg-blue-50 text-blue-600" },
                  { name: "LinkedIn", handle: "Mahila Action NGO", color: "bg-sky-50 text-sky-700" },
                  { name: "Twitter / X", handle: "@mahilaaction", color: "bg-slate-50 text-slate-700" },
                ].map((s) => (
                  <div key={s.name} className={`${inter()} flex items-center justify-between rounded-xl px-4 py-2.5 ${s.color}`}>
                    <span className="text-[14px] font-semibold">{s.name}</span>
                    <span className="text-[13px] opacity-75">{s.handle}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Response time promise */}
            <div className="border-2 border-[#a65a4a]/30 rounded-2xl p-6 flex gap-4 items-start">
              <div className="size-10 bg-[#a65a4a]/10 text-[#a65a4a] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <div>
                <p className={`${inter()} text-[14px] font-semibold text-[#1e1e1e]`}>Fast Response Promise</p>
                <p className={`${inter()} text-[13px] text-[#1e1e1e]/60 mt-1 leading-relaxed`}>We commit to responding to all messages within <strong className="text-[#a65a4a]">24 business hours</strong>. Urgent matters? Call us directly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-6 bg-white/40">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-10">
            <SectionLabel text="FAQ" />
            <SectionTitle text="Frequently Asked Questions" center />
          </div>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#a65a4a]/15">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`${inter()} w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer hover:bg-[#f4efe7]/50 transition-colors`}
                >
                  <span className="text-[15px] font-semibold text-[#1e1e1e] pr-4">{faq.q}</span>
                  <span className={`text-[#a65a4a] shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-45" : ""}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className={`${inter()} text-[14px] text-[#1e1e1e]/65 leading-relaxed border-t border-[#a65a4a]/10 pt-4`}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Map placeholder ── */}
      <section className="px-6 pb-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative bg-[#e8e4df] rounded-2xl overflow-hidden h-[300px] md:h-[400px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#a65a4a]/10 to-[#993925]/10" />
            <div className="relative text-center">
              <div className="size-16 bg-[#a65a4a] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </div>
              <p className={`${fraunces()} text-[#1e1e1e] text-[24px] font-semibold`} style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Hyderabad, Telangana</p>
              <p className={`${inter()} text-[#1e1e1e]/60 text-[15px] mt-1`}>India – 500 001</p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`${inter()} inline-block mt-5 bg-[#a65a4a] text-[#f4efe7] text-[14px] font-semibold px-7 py-3 rounded-full hover:bg-[#993925] transition-colors`}
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEPARATE LOGIN & USER ACCOUNT PAGE
// ═══════════════════════════════════════════════════════════════════════════
function LoginPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(() => {
    try {
      const raw = localStorage.getItem("mahila_user_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState<"login" | "register">("login");
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse">("registered");
  const [authBusy, setAuthBusy] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regSkill, setRegSkill] = useState("");

  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    if (profile) {
      setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
      localStorage.setItem("mahila_user_session", JSON.stringify(profile));
    } else {
      localStorage.removeItem("mahila_user_session");
    }
  }, [profile, confirmed]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const identifier = email.trim();
    if (!identifier) return toast.error("Please enter your email or username");
    if (!password.trim()) return toast.error("Please enter your password");

    setAuthBusy(true);

    const lowerId = identifier.toLowerCase();
    const lowerPass = password.toLowerCase().trim();

    // 1. Check if Super Admin / Admin credentials
    const isAdminAttempt =
      lowerId.includes("admin") ||
      lowerId.includes("super") ||
      lowerId === "superadmin" ||
      lowerId === "super admin" ||
      lowerPass === "admin123" ||
      lowerPass === "superadmin" ||
      lowerPass === "admin";

    if (isAdminAttempt) {
      const adminRes = await signInAdmin(identifier, password);
      if (adminRes.ok) {
        let canonicalEmail = identifier;
        if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
          canonicalEmail = "superadmin@organization.org";
        } else if (lowerId === "admin") {
          canonicalEmail = "admin@organization.org";
        }
        setCurrentAdminSession(canonicalEmail);
        setAuthBusy(false);
        toast.success("Signed in to Admin Panel!");
        setPage("admin");
        return;
      }
    }

    // 2. Perform User / Volunteer Login based on credentials
    const result = await loginVolunteer(identifier, password);
    if (result.ok && result.profile) {
      setAuthBusy(false);
      saveUserSession(result.profile);
      setProfile(result.profile);
      toast.success(`Welcome back, ${result.profile.name}!`);
      setPage("account");
      return;
    }

    // Fallback: If user login failed, try signInAdmin as last resort
    const fallbackAdmin = await signInAdmin(identifier, password);
    setAuthBusy(false);
    if (fallbackAdmin.ok) {
      let canonicalEmail = identifier;
      if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
        canonicalEmail = "superadmin@organization.org";
      } else if (lowerId === "admin") {
        canonicalEmail = "admin@organization.org";
      }
      setCurrentAdminSession(canonicalEmail);
      toast.success("Signed in to Admin Panel!");
      setPage("admin");
      return;
    }

    toast.error(result.error || "Incorrect email or password");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim()) return toast.error("Please enter your full name");
    if (!email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(regPhone)) return toast.error("Please enter a valid phone number (+91 98765 43210)");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setAuthBusy(true);
    const result = await registerVolunteer({
      name: regName,
      email,
      phone: regPhone,
      password,
      skills: regSkill,
    });
    setAuthBusy(false);

    if (result.ok && result.profile) {
      saveUserSession(result.profile);
      setProfile(result.profile);
      toast.success("Account created successfully!");
      setPage("account");
    } else {
      toast.error(result.error || "Registration failed. Please try again.");
    }
  }

  return (
    <main className="bg-[#f4efe7] min-h-screen">
      <PageBanner img={imgHeroCard} title="User Login" />

      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          {profile ? (
            <div className="max-w-[500px] w-full mx-auto bg-white rounded-3xl p-8 border border-[#a65a4a]/20 text-center shadow-lg">
              <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Currently Signed In</h3>
              <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/65 max-w-md mx-auto mt-2 leading-relaxed">
                You are logged in as <strong className="text-[#a65a4a]">{profile.name}</strong> ({profile.email}).
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setPage("account")}
                  className="w-full sm:w-auto px-7 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <User size={18} /> Go to My Account →
                </button>
                <button
                  onClick={() => {
                    saveUserSession(null);
                    setProfile(null);
                    toast.success("Signed out");
                  }}
                  className="w-full sm:w-auto px-5 py-3 border border-[#a65a4a]/30 text-[#a65a4a] font-['Inter',sans-serif] font-semibold text-[14px] rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-[480px] w-full mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-[#a65a4a]/20 overflow-hidden">
              {/* Header */}
              <div className="bg-[#a65a4a] px-8 py-6 text-center">
                <h2 className="font-['Fraunces',serif] text-[#f4efe7] text-[26px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                  {mode === "login" ? "Account Sign In" : "Create Account"}
                </h2>
                <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[13px] mt-1">
                  {mode === "login" ? "Access your registered events & contributions" : "Register to participate in community initiatives"}
                </p>
              </div>

              <div className="p-8">
                {mode === "login" && (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Email or Username</label>
                      <input
                        type="text"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@email.com or superadmin"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <LogIn size={18} />
                      {authBusy ? "Signing in…" : "Sign In"}
                    </button>
                    <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                      New user?{" "}
                      <button type="button" onClick={() => setMode("register")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                        Create an account
                      </button>
                    </p>
                  </form>
                )}

                {mode === "register" && (
                  <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Phone Number *</label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Password *</label>
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Primary Skill / Interest</label>
                      <select
                        value={regSkill}
                        onChange={e => setRegSkill(e.target.value)}
                        className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif] cursor-pointer"
                      >
                        <option value="">Select skill area…</option>
                        <option>Teaching / Education</option>
                        <option>Healthcare / Support</option>
                        <option>Event Operations</option>
                        <option>Digital / Technology</option>
                        <option>Legal & Social Rights</option>
                        <option>General Support</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60"
                    >
                      {authBusy ? "Creating account…" : "Create Account & Continue"}
                    </button>
                    <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                      Already have an account?{" "}
                      <button type="button" onClick={() => setMode("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                        Sign In
                      </button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEPARATE MY ACCOUNT PAGE (/account)
// ═══════════════════════════════════════════════════════════════════════════
function AccountPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(() => getSavedUserSession());
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse">("registered");
  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    function syncSession() {
      const current = getSavedUserSession();
      setProfile(current);
      if (current) {
        setUserSubmissions(getUserSubmissions(current.email, current.phone));
      }
    }
    syncSession();
    window.addEventListener("mahila_user_session_changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("mahila_user_session_changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [confirmed]);

  function handleSignOut() {
    saveUserSession(null);
    setProfile(null);
    setSelectedEvents([]);
    toast.success("Signed out successfully");
    setPage("home");
  }

  const registeredEventsList = useMemo(() => {
    if (!profile) return [];
    const list: {
      id: string;
      title: string;
      date: string;
      typeLabel: string;
      details?: string;
      status: string;
    }[] = [];

    userSubmissions.forEach(sub => {
      if (sub.type === "volunteer") {
        const eventsArr: string[] = Array.isArray(sub.data?.selected_events)
          ? sub.data.selected_events
          : sub.data?.event_name
          ? [sub.data.event_name]
          : ["Permanent Community Volunteer Membership"];
        eventsArr.forEach((title, idx) => {
          list.push({
            id: `${sub.id}_${idx}`,
            title,
            date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            typeLabel: "Permanent Volunteer Membership",
            details: sub.data?.skills ? `Skills: ${sub.data.skills} · Permanent Community Support` : "Permanent Active Community Volunteer",
            status: "Permanent Member",
          });
        });
      } else if (sub.type === "reservation") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Community Event",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Seat Reservation",
          details: `${sub.data?.seats || 1} Seat(s) Reserved ${sub.data?.volunteer_commitment === "ongoing" ? "· Ongoing Volunteer" : ""}`,
          status: sub.status || "Confirmed",
        });
      } else if (sub.type === "vendor") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Event Support",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Vendor / Partner Application",
          details: `Business: ${sub.data?.business_name || ""} (${sub.data?.offering || ""})`,
          status: sub.status || "Under Review",
        });
      }
    });

    return list;
  }, [userSubmissions, profile]);

  const userDonationList = useMemo(() => {
    if (!profile) return [];
    return userSubmissions
      .filter(s => s.type === "donation")
      .map(s => ({
        id: s.id,
        amount: s.data?.amount || 0,
        cause: s.data?.campaign_name || s.data?.event_name || "General Empowerment Support",
        date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: s.status || "Completed",
      }));
  }, [userSubmissions, profile]);

  const now = new Date();
  const realEvents = siteData.events
    .filter((ev) => (Array.isArray(ev.windows) ? ev.windows : []).some((w) => w.enabled && new Date(w.regEnd) >= now))
    .map((ev) => ({
      id: ev.id,
      status: (isEventOpen(ev, now) ? "ongoing" : "upcoming") as "ongoing" | "upcoming",
      title: ev.title,
      date: new Date(ev.eventDate).toLocaleDateString(),
      location: ev.location,
      desc: ev.description,
    }));

  return (
    <main className="bg-[#f4efe7] min-h-screen">
      <PageBanner img={imgHeroCard} title="My Account" />

      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          {!profile ? (
            <div className="max-w-[520px] mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-[#a65a4a]/20 text-center shadow-lg">
              <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                <User size={32} />
              </div>
              <h3 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Sign In to View Your Account</h3>
              <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/65 max-w-md mx-auto mt-2 leading-relaxed">
                Please sign in to access your registered events, seat reservations, volunteer activities, and contribution history.
              </p>
              <button
                onClick={() => openModal("login")}
                className="mt-6 px-8 py-3.5 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <LogIn size={18} /> Sign In / Create Account →
              </button>
            </div>
          ) : (
            /* Logged-In User Dashboard on the Page */
            <div className="max-w-[960px] mx-auto">
              {/* User Profile Card */}
              <div className="bg-white border border-[#a65a4a]/20 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="size-16 rounded-2xl bg-[#a65a4a] text-[#f4efe7] font-['Fraunces',serif] text-[26px] font-bold flex items-center justify-center shrink-0 shadow-md">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-['Fraunces',serif] text-[#1e1e1e] text-[24px] font-semibold">{profile.name}</h3>
                      <span className="bg-[#a65a4a] text-[#f4efe7] text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        ⭐ Permanent Volunteer
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={13} /> Active Member
                      </span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 mt-1">
                      {profile.email} {profile.phone ? `· ${profile.phone}` : ""}
                    </p>
                    {profile.skills && (
                      <p className="font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold mt-1">
                        Interest / Skill: {profile.skills}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSignOut}
                    className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#a65a4a] hover:bg-[#a65a4a]/10 border border-[#a65a4a]/30 px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b-2 border-[#a65a4a]/20 mb-8 gap-4 sm:gap-8 overflow-x-auto">
                <button
                  onClick={() => setDashTab("registered")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "registered"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <UserCheck size={18} /> My Registered Events ({registeredEventsList.length})
                </button>

                <button
                  onClick={() => setDashTab("donations")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "donations"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <Heart size={18} /> My Contributions ({userDonationList.length})
                </button>

                <button
                  onClick={() => setDashTab("browse")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "browse"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <Plus size={18} /> Browse Upcoming Events
                </button>
              </div>

              {/* Tab 1: My Registered Events */}
              {dashTab === "registered" && (
                <div>
                  {registeredEventsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {registeredEventsList.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-[#a65a4a]/20 hover:border-[#a65a4a] rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="bg-[#a65a4a]/10 text-[#a65a4a] text-[12px] font-bold px-3 py-1 rounded-full">
                                {item.typeLabel}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={11} /> {item.status}
                              </span>
                            </div>
                            <h4 className="font-['Inter',sans-serif] font-bold text-[18px] text-[#1e1e1e] mt-1 leading-snug">
                              {item.title}
                            </h4>
                            <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/65 mt-2 leading-relaxed">
                              {item.details}
                            </p>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-4 mt-5 flex items-center justify-between text-[13px] text-[#1e1e1e]/55 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={14} /> Registered: {item.date}
                            </span>
                            <span className="font-semibold text-[#a65a4a]">Confirmed Entry</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-10 border border-[#a65a4a]/15 text-center my-4 shadow-sm">
                      <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                        <Calendar size={32} />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">No Registered Events Yet</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        You haven't signed up for any events yet. Explore upcoming community events and volunteer initiatives to get involved!
                      </p>
                      <button
                        onClick={() => setDashTab("browse")}
                        className="mt-6 px-7 py-3.5 bg-[#a65a4a] text-[#f4efe7] text-[15px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus size={18} /> Browse Upcoming Events
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: My Contributions */}
              {dashTab === "donations" && (
                <div>
                  {userDonationList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {userDonationList.map((d) => (
                        <div key={d.id} className="bg-white border-2 border-[#a65a4a]/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="bg-emerald-100 text-emerald-800 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={12} /> Donation
                              </span>
                              <span className="text-[#a65a4a] font-['Fraunces',serif] text-[22px] font-bold">
                                ₹{d.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <h4 className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] mt-1">
                              {d.cause}
                            </h4>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-4 mt-5 flex items-center justify-between text-[13px] text-[#1e1e1e]/55 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} /> Date: {d.date}
                            </span>
                            <span className="bg-[#f4efe7] text-[#a65a4a] px-3 py-1 rounded-full text-[12px] font-medium">80G Tax Exempt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-10 border border-[#a65a4a]/15 text-center my-4 shadow-sm">
                      <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                        <Heart size={32} />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">No Contribution Records</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        Your financial contributions help fund education, health, and women leadership programs across India.
                      </p>
                      <button
                        onClick={() => setPage("donate")}
                        className="mt-6 px-7 py-3.5 bg-[#a65a4a] text-[#f4efe7] text-[15px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Heart size={18} /> Donate For The Cause
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Browse Events */}
              {dashTab === "browse" && (
                <div>
                  {confirmed ? (
                    <div className="flex flex-col items-center text-center gap-5 py-10 bg-white rounded-3xl p-8 border border-[#a65a4a]/15 shadow-sm">
                      <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={44} className="text-[#587735]" />
                      </div>
                      <h3 className="font-['Fraunces',serif] text-[#1e1e1e] text-[28px]">Registration Successful!</h3>
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[16px] max-w-[420px] leading-relaxed">
                        Thank you, <strong className="text-[#a65a4a]">{profile.name}</strong>! You've successfully registered for <strong className="text-[#a65a4a]">{selectedEvents.length} event(s)</strong>.
                      </p>
                      <button
                        onClick={() => {
                          setConfirmed(false);
                          setSelectedEvents([]);
                          setDashTab("registered");
                        }}
                        className="px-8 py-3.5 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                      >
                        View My Registered Events →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2 mb-6">
                        {(["all", "ongoing", "upcoming"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`font-['Inter',sans-serif] text-[13px] font-semibold px-5 py-2.5 rounded-full cursor-pointer transition-colors capitalize ${
                              filter === f ? "bg-[#a65a4a] text-[#f4efe7]" : "border border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a]/8"
                            }`}
                          >
                            {f === "all" ? "All Events" : f === "ongoing" ? "🟢 Ongoing" : "📅 Upcoming"}
                          </button>
                        ))}
                        {selectedEvents.length > 0 && (
                          <span className="ml-auto font-['Inter',sans-serif] text-[13px] font-semibold bg-[#a65a4a]/10 text-[#a65a4a] px-4 py-1.5 rounded-full self-center">
                            {selectedEvents.length} selected
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {realEvents.filter(e => filter === "all" || e.status === filter).map(ev => {
                          const selected = selectedEvents.includes(ev.id);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => {
                                setSelectedEvents(prev =>
                                  prev.includes(ev.id) ? prev.filter(e => e !== ev.id) : [...prev, ev.id]
                                );
                              }}
                              className={`text-left rounded-2xl border-2 p-5 transition-all cursor-pointer ${selected ? "border-[#a65a4a] bg-[#a65a4a]/5 shadow-md" : "border-[#1e1e1e]/10 bg-white hover:border-[#a65a4a]/40"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className="font-['Inter',sans-serif] text-[11px] font-semibold px-3 py-1 rounded-full bg-[#a65a4a]/10 text-[#a65a4a]">
                                  Community Event
                                </span>
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${selected ? "border-[#a65a4a] bg-[#a65a4a]" : "border-[#1e1e1e]/25"}`}>
                                  {selected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                              </div>
                              <p className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] leading-snug">{ev.title}</p>
                              <div className="flex gap-4 mt-2.5 mb-3">
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><Calendar size={12} /> {ev.date}</span>
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>
                              </div>
                              <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/65 leading-relaxed">{ev.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={async () => {
                          if (selectedEvents.length === 0) return toast.error("Please select at least one event");
                          const eventTitles = realEvents.filter(e => selectedEvents.includes(e.id)).map(e => e.title);
                          await saveVolunteer({
                            name: profile.name,
                            email: profile.email,
                            phone: profile.phone,
                            skills: profile.skills,
                            selected_events: eventTitles,
                          });
                          setConfirmed(true);
                          setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
                        }}
                        disabled={selectedEvents.length === 0}
                        className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedEvents.length === 0 ? "Select events to register" : `Confirm Registration for ${selectedEvents.length} Event${selectedEvents.length > 1 ? "s" : ""}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
// Admin login now uses real Supabase Auth (see AdminApp below) — no password lives in this file anymore.

// Custom admin tabs — each backed by real CRUD and RBAC permissions.
const CUSTOM_TABS = [
  { id: "submissions", label: "Form Submissions & Applications" },
  { id: "events", label: "Upcoming Events" },
  { id: "stories", label: "Community Stories" },
  { id: "impactStories", label: "Our Impact — Read More Pages" },
  { id: "categories", label: "Story Categories" },
  { id: "eventsBlog", label: "Events Blog" },
  { id: "councilors", label: "Councilors" },
  { id: "timeline", label: "Timeline" },
  { id: "contact", label: "Contact Info" },
  { id: "roles", label: "User & Role Management" },
] as const;

function AdminPage({
  onExit,
  onContentSaved,
  siteData,
  onSiteDataChange,
}: {
  onExit: () => void;
  onContentSaved: (c: ContentMap) => void;
  siteData: SiteData;
  onSiteDataChange: (d: SiteData) => void;
}) {
  const existing = useContent();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = still checking session
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loginPortalMode, setLoginPortalMode] = useState<"superadmin" | "user">("superadmin");
  const [draft, setDraft] = useState<ContentMap>({ ...existing });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("submissions");
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser>(() => getCurrentAdminSession());

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(existing);
  }, [draft, existing]);

  useEffect(() => {
    const unsubscribe = onAdminAuthChange((isLoggedIn) => {
      setLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        setDraft({ ...existing });
        setCurrentAdminUser(getCurrentAdminSession());
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto sign-out after 5 minutes of no mouse/keyboard/touch/scroll activity.
  useEffect(() => {
    if (!loggedIn) return;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
    let timer: NodeJS.Timeout;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await signOutAdmin();
        clearAdminSession();
        setLoggedIn(false);
        toast.error("Signed out automatically after 5 minutes of inactivity");
        onExit();
      }, INACTIVITY_LIMIT_MS);
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [loggedIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    const result = await signInAdmin(email, password);
    setSigningIn(false);
    if (!result.ok) return toast.error(result.error || "Incorrect email or password");

    setCurrentAdminSession(email);
    const userSession = getCurrentAdminSession();
    setCurrentAdminUser(userSession);
    setLoggedIn(true);
    setDraft({ ...existing });
    const userRole = getRoleById(userSession.roleId);
    toast.success(`Signed in as ${userRole.name}`);
  }

  async function handleLogout() {
    await signOutAdmin();
    clearAdminSession();
    setLoggedIn(false);
    toast("Signed out");
    onExit();
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveAllContent(draft);
    setSaving(false);
    if (ok) {
      onContentSaved(draft);
      toast.success("Changes saved and published!");
    } else {
      toast.error("Save failed — changes were NOT stored. Open the browser console (F12) for details.");
    }
  }

  function update(key: string, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  const inputBase = "w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] bg-white";

  if (loggedIn === null) {
    return (
      <main className="min-h-screen bg-[#f4efe7] flex items-center justify-center px-4">
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/50 text-[14px]">Checking session…</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#f4efe7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden">
          <div className="bg-[#a65a4a] px-7 py-6">
            <h1 className="font-['Fraunces',serif] text-[#f4efe7] text-[24px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Admin Panel
            </h1>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/70 text-[13px] mt-1">Mahila Action — Content & Role Management</p>
          </div>
          <form onSubmit={handleLogin} className="p-7 flex flex-col gap-4">
            <div>
              <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@organization.org" className={inputBase} autoFocus required />
            </div>
            <div>
              <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Admin Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className={inputBase} required />
            </div>
            <button type="submit" disabled={signingIn} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
              {signingIn ? "Signing in…" : "Sign In"}
            </button>
            <button type="button" onClick={onExit} className="w-full text-[#1e1e1e]/50 font-['Inter',sans-serif] text-[13px] cursor-pointer hover:text-[#a65a4a] transition-colors">
              ← Back to website
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Filter sidebar navigation tabs based on user's view permission
  const visibleTabs = CUSTOM_TABS.filter((t) => hasPermission(currentAdminUser, t.id as AdminModule, "view"));

  // Check current section access
  const hasViewAccess = hasPermission(currentAdminUser, activeSection as AdminModule, "view");
  const customTab = CUSTOM_TABS.find(t => t.id === activeSection);
  const currentRole = getRoleById(currentAdminUser.roleId);

  function updateSiteData(patch: Partial<SiteData>) {
    onSiteDataChange({ ...siteData, ...patch });
  }

  return (
    <main className="min-h-screen bg-[#f0ebe3] flex flex-col">
      {/* Header */}
      <div className="bg-[#a65a4a] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <LogoMark invert />
          <div>
            <p className="font-['Fraunces',serif] text-[#f4efe7] text-[18px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Admin Panel</p>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/65 text-[11px]">Changes go live immediately after saving</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active User Pill */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#f4efe7]/15 border border-[#f4efe7]/30 text-[#f4efe7] text-[12px]">
            <div className="w-6 h-6 rounded-full bg-[#f4efe7] text-[#a65a4a] font-bold text-[11px] flex items-center justify-center shrink-0">
              {currentAdminUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-medium">{currentAdminUser.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#f4efe7] text-[#a65a4a]">
                {currentRole.name}
              </span>
            </div>
          </div>

          {isDirty && (
            <span className="bg-amber-300 text-amber-950 font-['Inter',sans-serif] text-[11px] font-bold px-3 py-1 rounded-full animate-pulse">
              Unsaved Changes
            </span>
          )}
          <button onClick={handleLogout} className="font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[13px] px-4 py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer">
            Sign Out
          </button>
          <button onClick={onExit} className="font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[13px] px-4 py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer">
            ← View Site
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-[250px] shrink-0 bg-white border-r border-[#a65a4a]/15 py-4 hidden md:block overflow-y-auto">
          <p className="px-5 pb-2 font-['Inter',sans-serif] text-[10px] font-bold text-[#1e1e1e]/35 uppercase tracking-wider">Manage Content & Access</p>
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={`w-full text-left px-5 py-3 font-['Inter',sans-serif] text-[13px] font-medium transition-colors cursor-pointer ${activeSection === t.id ? "bg-[#a65a4a]/10 text-[#a65a4a] border-r-2 border-[#a65a4a]" : "text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/5"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile section select */}
        <div className="md:hidden w-full px-4 pt-4">
          <select value={activeSection} onChange={e => setActiveSection(e.target.value)} className={`${inputBase} mb-4`}>
            {visibleTabs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <h2 className="font-['Fraunces',serif] text-[#1e1e1e] text-[22px] font-semibold mb-6" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
            {customTab?.label}
          </h2>

          {!hasViewAccess ? (
            <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                🔒
              </div>
              <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">Access Restricted</h3>
              <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-2">
                Your role <strong>({currentRole.name})</strong> does not have permission to view the <strong>{customTab?.label}</strong> module.
              </p>
              {visibleTabs.length > 0 && (
                <button
                  onClick={() => setActiveSection(visibleTabs[0].id)}
                  className="mt-5 px-5 py-2.5 bg-[#a65a4a] text-white text-[13px] font-semibold rounded-full hover:bg-[#993925] transition-colors"
                >
                  Return to {visibleTabs[0].label}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeSection === "roles" && (
                <RolesAdmin onSessionChange={(u) => setCurrentAdminUser(u)} />
              )}
              {activeSection === "submissions" && (
                <SubmissionsAdmin />
              )}
              {activeSection === "events" && (
                <EventsAdmin events={siteData.events} categories={siteData.categories} onChange={(events) => updateSiteData({ events })} />
              )}
              {activeSection === "stories" && (
                <BlogPostsAdmin
                  section="story"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "eventsBlog" && (
                <BlogPostsAdmin
                  section="event"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "impactStories" && (
                <BlogPostsAdmin
                  section="impact"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "categories" && (
                <CategoriesAdmin
                  categories={siteData.categories}
                  posts={siteData.blogPosts}
                  onCategoriesChange={(categories) => updateSiteData({ categories })}
                  onPostsChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "councilors" && (
                <CouncilorsAdmin councilors={siteData.councilors} onChange={(councilors) => updateSiteData({ councilors })} />
              )}
              {activeSection === "timeline" && (
                <TimelineAdmin timeline={siteData.timeline} onChange={(timeline) => updateSiteData({ timeline })} />
              )}
              {activeSection === "contact" && (
                <ContactAdmin contact={siteData.contact} onChange={(contact) => updateSiteData({ contact })} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════
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
    // Bare "/" is only a landing alias (and what GitHub Pages serves as the
    // prerendered root document) — swap the visible URL to /home right away.
    // `replace` keeps this out of browser history so the back button doesn't
    // bounce the user between "/" and "/home".
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