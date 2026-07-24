import { api, BASE_URL } from "./api";
import { comingSoon } from "./comingSoon";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type RegKind = "volunteer" | "vendor" | "donor";

export interface RegWindow {
  kind: RegKind;
  enabled: boolean;
  regStart: string; // ISO date, yyyy-mm-dd
  regEnd: string; // ISO date, yyyy-mm-dd
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  image: string;
  eventDate: string; // ISO date — when the event itself happens
  location: string;
  totalSeats: number;
  windows: RegWindow[];
  categoryId: string | null; // e.g. "Women & Leadership" — shares the same categories as Stories
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface BlogPost {
  id: string;
  section: "story" | "event" | "impact"; // "story" -> Our Stories, "event" -> Events Blog, "impact" -> Our Impact "Read More" pages
  categoryId: string | null; // used for section === "story" and section === "impact"
  title: string;
  excerpt: string;
  content: string; // paragraphs separated by blank lines
  coverImage: string;
  gallery: string[];
  tags: string[];
  createdAt: string;
}

export interface Councilor {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  order: number;
}

export interface TimelineEntry {
  id: string;
  year: string;
  title: string;
  description: string;
  image: string;
  order: number;
}

export interface ContactInfo {
  email: string;
  emailNote: string;
  phone: string;
  phoneNote: string;
  address: string;
  addressNote: string;
  hours: string;
  hoursNote: string;
}

export interface SiteData {
  events: EventItem[];
  categories: Category[];
  blogPosts: BlogPost[];
  councilors: Councilor[];
  timeline: TimelineEntry[];
  contact: ContactInfo;
}

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// STRAPI CONFIG
// ═══════════════════════════════════════════════════════════════════════════
//
// These are the REST endpoint paths Strapi generates from each content type's
// "API ID (Plural)". Strapi derives these automatically from the display name
// you typed when you created the type in the Content-Type Builder — so these
// MUST match what your project actually generated.
//
// ⚠️ VERIFY THESE before testing. To check the real value for any type:
//   Content-Type Builder → click the type → "Edit" (top right) →
//   look at "API ID (Plural)".
// Or just try the URL directly in your browser, e.g.:
//   http://localhost:1337/api/events
// A working endpoint returns JSON like { "data": [...], "meta": {...} }.
// A wrong one returns a 404 with a "Not Found" error.
//
// The one most likely to be wrong is TIMELINE — you named the type
// "TimeLineEntry" (capital L, capital E), which Strapi likely turned into
// `time-line-entries`, not `timeline-entries`. Fix the constant below if so.

const ENDPOINTS = {
  events: "/api/events",
  categories: "/api/categories",
  blogPosts: "/api/blog-posts",
  councilors: "/api/councilors",
  timeline: "/api/time-line-entries", // ⚠️ verify — see note above
  contactInfo: "/api/contact-info", // single type
};

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA HELPERS — Strapi media fields return { url, ... } with a *relative*
// url (e.g. "/uploads/photo_abc123.jpg"). Prefix with the Strapi origin to
// get something an <img> tag can actually load.
// ═══════════════════════════════════════════════════════════════════════════

function mediaUrl(media: any): string {
  if (!media) return "";
  const raw = Array.isArray(media) ? media[0] : media;
  const item = raw?.data?.attributes || raw?.data || raw;
  const url = item?.url || raw?.url || "";
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE_URL}${url}`;
}

function mediaUrls(mediaList: any): string[] {
  const items = Array.isArray(mediaList?.data) ? mediaList.data : Array.isArray(mediaList) ? mediaList : [];
  return items.map(mediaUrl).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULTS — used until the API responds, or as first-run seed data
// ═══════════════════════════════════════════════════════════════════════════

const today = new Date();
function daysFromNow(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_women", name: "Women & Leadership" },
  { id: "cat_education", name: "Education & Learning" },
  { id: "cat_livelihood", name: "Livelihood & Skills" },
  { id: "cat_wellbeing", name: "Community Wellbeing" },
];

export const DEFAULT_EVENTS: EventItem[] = [
  {
    id: "evt_default_1",
    title: "Community Leadership Workshop",
    description: "A hands-on workshop building confidence, public speaking, and civic leadership skills for women in the community.",
    image: "",
    eventDate: daysFromNow(21),
    location: "Hyderabad",
    totalSeats: 45,
    windows: [
      { kind: "volunteer", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(14) },
      { kind: "vendor", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(18) },
      { kind: "donor", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(10) },
    ],
    categoryId: "cat_women",
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_BLOG_POSTS: BlogPost[] = [
  { id: "story_she_found_voice", section: "story", categoryId: "cat_women", title: "She Found Her Voice", excerpt: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", content: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", coverImage: "", gallery: [], tags: [], createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "story_new_dawn_priya", section: "story", categoryId: "cat_education", title: "A New Dawn for Priya", excerpt: "Access to education transformed one family's future across three generations.", content: "Access to education transformed one family's future across three generations.", coverImage: "", gallery: [], tags: [], createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
  { id: "story_building_futures", section: "story", categoryId: "cat_livelihood", title: "Building Futures Together", excerpt: "How a community cooperative changed the economic landscape of an entire village.", content: "How a community cooperative changed the economic landscape of an entire village.", coverImage: "", gallery: [], tags: [], createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "story_health_all", section: "story", categoryId: "cat_wellbeing", title: "Health for All", excerpt: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", content: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", coverImage: "", gallery: [], tags: [], createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "story_first_sarpanch", section: "story", categoryId: "cat_women", title: "First Woman Sarpanch", excerpt: "Asha Devi became the first female elected leader in her village after years of advocacy.", content: "Asha Devi became the first female elected leader in her village after years of advocacy.", coverImage: "", gallery: [], tags: [], createdAt: new Date(Date.now() - 1 * 86400000).toISOString() },
  { id: "story_breaking_cycle", section: "story", categoryId: "cat_education", title: "Breaking the Cycle", excerpt: "Four sisters all graduated high school — the first in their family's history.", content: "Four sisters all graduated high school — the first in their family's history.", coverImage: "", gallery: [], tags: [], createdAt: new Date().toISOString() },

  // "Our Impact" home-page cards (section === "impact") — their "Read More" pages, edited
  // in the admin panel exactly like Stories and Event Blogs.
  {
    id: "women-leadership",
    section: "impact",
    categoryId: "cat_women",
    title: "When Women Rise, Communities Thrive.",
    excerpt: "Women & Leadership — grassroots training, civic engagement, and mentorship that puts women in decision-making roles.",
    content: "<p>Mahila Action's Women &amp; Leadership programme has been transforming the civic and economic landscape of rural Telangana for over two decades. We believe lasting change begins when women take their rightful place as decision-makers in their homes, communities, and institutions.</p><h2>1. Grassroots Leadership Training</h2><p>Our flagship 12-week leadership training immerses women in modules covering public speaking, conflict resolution, rights awareness, and community organising. Over 3,000 women have completed the programme since 2005, with 500+ now holding elected positions in local governance.</p><h2>2. Civic Engagement &amp; Panchayat Access</h2><p>We prepare women to actively engage with panchayat processes — from attending gram sabhas to filing RTI applications. Our legal literacy workshops have helped over 1,200 women access entitlements they previously didn't know existed.</p><h2>3. Mentorship Networks</h2><p>We connect emerging women leaders with experienced advocates who guide them through the challenges of public life. These networks have proven to be one of the most powerful tools for sustained participation and confidence-building.</p><h2>4. Young Women's Councils</h2><p>Recognising that leadership starts early, we run Young Women's Councils in 45 schools across Nalgonda and Warangal districts — giving girls a safe space to practise leadership, debate, and civic advocacy.</p><h2>5. Impact in Numbers</h2><p>500+ women in elected leadership positions · 3,000+ trained leaders · 1,200+ RTI applications filed successfully · 45 Young Women's Councils active in schools.</p>",
    coverImage: "",
    gallery: [],
    tags: [],
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: "education",
    section: "impact",
    categoryId: "cat_education",
    title: "Education Opens New Possibilities.",
    excerpt: "Education & Learning — community centres, adult literacy, and scholarships that keep girls in school.",
    content: "<p>Access to quality education remains one of the most persistent inequities facing women and children in rural India. Mahila Action's Education &amp; Learning programmes work at every stage — from early childhood literacy to adult continuing education.</p><h2>1. Community Learning Centres</h2><p>We operate 38 community learning centres serving over 12,000 students annually. Located in brick-kiln colonies, tribal hamlets, and urban slums, these centres provide remedial tutoring, life skills, and a safe after-school environment.</p><h2>2. Adult Literacy Circles</h2><p>Our adult literacy programme — where Mahila Action began in 1995 — continues to run literacy circles for women who never had the opportunity to complete schooling. To date, we have helped over 8,000 women achieve functional literacy.</p><h2>3. Scholarships &amp; Retention Support</h2><p>We provide annual scholarships to 400 girls at risk of school dropout due to economic pressure or early marriage. Our retention coordinators follow up monthly with families to resolve barriers and keep girls in school.</p><h2>4. Teacher Training &amp; Curriculum</h2><p>We work with government school teachers to improve pedagogy around girls' education. Our supplemental curriculum on gender equality has been adopted by 120 government schools across four districts.</p><h2>5. Impact in Numbers</h2><p>38 community learning centres · 12,000+ students served annually · 8,000+ adult women made literate · 400 scholarships awarded each year.</p>",
    coverImage: "",
    gallery: [],
    tags: [],
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "livelihood",
    section: "impact",
    categoryId: "cat_livelihood",
    title: "Building Economic Independence Together.",
    excerpt: "Livelihood & Skills — vocational training, SHG networks, and market access that build lasting income.",
    content: "<p>Economic dependency is one of the primary barriers to women's freedom and dignity. Mahila Action's Livelihood &amp; Skills programmes build sustainable income pathways through vocational training, micro-enterprise support, and access to financial services.</p><h2>1. Vocational Skills Training</h2><p>We offer certified vocational programmes in tailoring, food processing, beauty therapy, construction trades, and digital skills. Over 6,000 women have completed vocational training, with 78% reporting increased household income within six months.</p><h2>2. Micro-Finance &amp; SHG Networks</h2><p>Our self-help group (SHG) federation connects over 4,200 women in 210 SHGs across 14 districts. Members access affordable credit, savings facilities, and insurance products tailored to their needs.</p><h2>3. Market Linkages &amp; Entrepreneurship</h2><p>We connect trained women with market opportunities — from e-commerce platforms to B2B buyers and government procurement programmes. Our annual Livelihood Skills Fair brings together 500+ women entrepreneurs with corporate buyers and mentors.</p><h2>4. Digital Financial Literacy</h2><p>In partnership with banking institutions, we have trained 5,000+ women in mobile banking, UPI transactions, and digital record-keeping — enabling them to manage businesses and savings with greater confidence.</p><h2>5. Impact in Numbers</h2><p>6,000+ women trained in vocational skills · 4,200 women in 210 SHGs · 78% report income increase post-training · ₹12 crore in micro-credit disbursed annually.</p>",
    coverImage: "",
    gallery: [],
    tags: [],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "wellbeing",
    section: "impact",
    categoryId: "cat_wellbeing",
    title: "Health and Dignity for Every Family.",
    excerpt: "Community Wellbeing — mobile health camps, nutrition, and survivor support for women and families.",
    content: "<p>True empowerment requires physical safety and good health. Mahila Action's Community Wellbeing programmes address the healthcare access gap facing women and children through mobile clinics, health education, and survivor support services.</p><h2>1. Mobile Health Camps</h2><p>Our fleet of mobile health units visits 80 remote villages and urban slums every quarter, offering free screenings for anaemia, malnutrition, cervical cancer, and maternal health. Over 25,000 consultations are conducted annually.</p><h2>2. Maternal &amp; Child Nutrition</h2><p>We partner with government ASHA workers to identify and support malnourished children and pregnant women. Our nutrition programme has contributed to a 42% reduction in severe malnutrition in targeted communities over five years.</p><h2>3. Domestic Violence Support</h2><p>Our trauma-informed support services provide counselling, legal aid, and safe shelter referrals to survivors of gender-based violence. Last year, we supported 1,100 women across all four districts we operate in.</p><h2>4. Mental Health Awareness</h2><p>Following COVID-19, we launched community mental health awareness sessions and trained 350 community health volunteers in psychological first aid and suicide prevention protocols.</p><h2>5. Impact in Numbers</h2><p>25,000+ health consultations annually · 42% reduction in severe malnutrition in target areas · 1,100 GBV survivors supported · 350 mental health volunteers trained.</p>",
    coverImage: "",
    gallery: [],
    tags: [],
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

export const DEFAULT_COUNCILORS: Councilor[] = [
  { id: "coun_1", name: "Sunita Devi", role: "Community Advocate", bio: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", image: "", order: 0 },
  { id: "coun_2", name: "Kavitha Reddy", role: "Education Lead", bio: "Through Mahila Action's programmes, Kavitha became the first woman elected to the panchayat.", image: "", order: 1 },
  { id: "coun_3", name: "Meena Sharma", role: "Livelihood Champion", bio: "From daily wage laborer to micro-entrepreneur — a story of resilience and transformation.", image: "", order: 2 },
];

export const DEFAULT_TIMELINE: TimelineEntry[] = [
  { id: "tl_1995", year: "1995", title: "Foundation of Mahila Action", description: "Registered by a small group of six local women, starting with a single room operating basic literacy circles for children of brick-kiln laborers.", image: "", order: 0 },
  { id: "tl_2002", year: "2002", title: "Expanding Educational Access", description: "Launched three community learning centers reaching over 800 children and 400 adult learners across rural areas.", image: "", order: 1 },
  { id: "tl_2009", year: "2009", title: "Women's Leadership Programme", description: "Introduced the flagship leadership programme, training over 200 women to take civic and economic leadership roles.", image: "", order: 2 },
  { id: "tl_2016", year: "2016", title: "Livelihood & Skills Scale-Up", description: "Partnered with 12 corporate organizations to provide vocational training and employment to 3,000+ women.", image: "", order: 3 },
  { id: "tl_2021", year: "2021", title: "Digital & COVID Response", description: "Pivoted to digital learning; distributed 500 smartphones and provided mental health support to 10,000 families during the pandemic.", image: "", order: 4 },
  { id: "tl_2026", year: "2026", title: "28 Years of Lasting Change", description: "Operating across 200+ communities, our programmes have directly benefited over 10,000 women and their families.", image: "", order: 5 },
];

export const DEFAULT_CONTACT: ContactInfo = {
  email: "contact@mahilaction.org",
  emailNote: "We reply within 24 hours",
  phone: "+91 XXXXXXXXXX",
  phoneNote: "Mon – Sat, 9 AM – 6 PM IST",
  address: "Hyderabad, Telangana",
  addressNote: "India – 500 001",
  hours: "Mon – Friday",
  hoursNote: "9:00 AM – 5:30 PM IST",
};

export const DEFAULT_SITE_DATA: SiteData = {
  events: DEFAULT_EVENTS,
  categories: DEFAULT_CATEGORIES,
  blogPosts: DEFAULT_BLOG_POSTS,
  councilors: DEFAULT_COUNCILORS,
  timeline: DEFAULT_TIMELINE,
  contact: DEFAULT_CONTACT,
};

// ═══════════════════════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Is this specific registration window currently open? */
export function isWindowOpen(w: RegWindow, now = new Date()): boolean {
  if (!w.enabled) return false;
  const start = new Date(w.regStart);
  const end = new Date(w.regEnd);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

/** An event is "open" if at least one of its enabled registration windows is currently open. */
export function isEventOpen(ev: EventItem, now = new Date()): boolean {
  const windows = Array.isArray(ev.windows) ? ev.windows : [];
  return windows.some((w) => isWindowOpen(w, now));
}

/** Events whose registration hasn't started yet, or is currently open — used to populate the "next available" modal. */
export function upcomingOrOpenEvents(events: EventItem[], now = new Date()): EventItem[] {
  return events
    .filter((ev) => {
      const windows = Array.isArray(ev.windows) ? ev.windows : [];
      return windows.some((w) => w.enabled && new Date(w.regEnd) >= now);
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}



// ═══════════════════════════════════════════════════════════════════════════
// LOAD — reads every content type from Strapi; falls back to defaults per-type
// if empty/unavailable. NOTE: `populate=*` is required on every call that
// includes media or relations — Strapi omits them by default.
// ═══════════════════════════════════════════════════════════════════════════

export async function loadSiteData(): Promise<SiteData> {
  try {
    const [eventsRes, catsRes, postsRes, councilorsRes, timelineRes, contactRes] = await Promise.all([
      api.get<any>(`${ENDPOINTS.events}?populate=*`),
      api.get<any>(ENDPOINTS.categories),
      api.get<any>(`${ENDPOINTS.blogPosts}?populate=*`),
      api.get<any>(`${ENDPOINTS.councilors}?populate=*&sort=order:asc`),
      api.get<any>(`${ENDPOINTS.timeline}?populate=*&sort=order:asc`),
      api.get<any>(ENDPOINTS.contactInfo),
    ]);

    // Strapi wraps every response in { data, meta }. Collection types return
    // data as an array; the ContactInfo single type returns data as one object.
    const eventRows: any[] = eventsRes.data?.data ?? [];
    const catRows: any[] = catsRes.data?.data ?? [];
    const postRows: any[] = postsRes.data?.data ?? [];
    const councilorRows: any[] = councilorsRes.data?.data ?? [];
    const timelineRows: any[] = timelineRes.data?.data ?? [];
    const contactRow: any = contactRes.data?.data ?? null;

    const parseDescription = (desc: any): string => {
      if (!desc) return "";
      if (typeof desc === "string") return desc;
      if (Array.isArray(desc)) {
        return desc
          .map((b: any) => (Array.isArray(b?.children) ? b.children.map((c: any) => c?.text || "").join("") : ""))
          .filter(Boolean)
          .join("\n\n");
      }
      return String(desc);
    };

    const normalizeWindow = (w: any): RegWindow => ({
      kind: w?.kind || "volunteer",
      enabled: w?.enabled !== undefined ? Boolean(w.enabled) : true,
      regStart: w?.regStart ?? w?.reg_start ?? w?.startDate ?? w?.["start-date"] ?? "",
      regEnd: w?.regEnd ?? w?.reg_end ?? w?.endDate ?? w?.["end-date"] ?? "",
    });

    const events: EventItem[] = eventRows.length
      ? eventRows.map((r: any) => {
          const rawWindows = Array.isArray(r.windows)
            ? r.windows
            : typeof r.windows === "string"
            ? (() => { try { return JSON.parse(r.windows); } catch { return []; } })()
            : [];
          return {
            id: r.documentId ?? r.id,
            title: r.title,
            description: parseDescription(r.description),
            image: mediaUrl(r.image),
            eventDate: r.eventDate,
            location: r.location ?? "",
            totalSeats: r.totalSeats ?? 0,
            windows: rawWindows.map(normalizeWindow),
            categoryId: r.category?.documentId ?? r.category?.id ?? null,
            createdAt: r.createdAt,
          };
        })
      : DEFAULT_EVENTS;

    const categories: Category[] = catRows.length
      ? catRows.map((r: any) => ({ id: r.documentId ?? r.id, name: r.name }))
      : DEFAULT_CATEGORIES;

    let blogPosts: BlogPost[] = postRows.length
      ? postRows.map((r: any) => ({
        id: r.documentId ?? r.id,
        section: r.section,
        categoryId: r.category?.documentId ?? r.category?.id ?? null,
        title: r.title,
        excerpt: r.excerpt ?? "",
        content: r.content ?? "",
        coverImage: mediaUrl(r.coverImage),
        gallery: mediaUrls(r.gallery),
        tags: r.tags ?? [],
        createdAt: r.createdAt,
      }))
      : DEFAULT_BLOG_POSTS;

    // One-time backfill: sites that already had story/event posts saved before the
    // "Our Impact" read-more pages existed won't have any section === "impact" rows yet.
    // Seed the 4 defaults in and persist them so they show up in the admin panel immediately.
    if (!blogPosts.some((p) => p.section === "impact")) {
      const seedImpactPosts = DEFAULT_BLOG_POSTS.filter((p) => p.section === "impact");
      blogPosts = [...blogPosts, ...seedImpactPosts];
      // Not calling saveBlogPost here anymore — admin-write is disabled right now anyway,
      // and this was triggering the "coming soon" modal on every page load.
    }

    const councilors: Councilor[] = councilorRows.length
      ? councilorRows.map((r: any) => ({
        id: r.documentId ?? r.id,
        name: r.name,
        role: r.role ?? "",
        bio: r.bio ?? "",
        image: mediaUrl(r.image),
        order: r.order ?? 0,
      }))
      : DEFAULT_COUNCILORS;

    const timeline: TimelineEntry[] = timelineRows.length
      ? timelineRows.map((r: any) => ({
        id: r.documentId ?? r.id,
        year: r.year,
        title: r.title,
        description: r.description ?? "",
        image: mediaUrl(r.image),
        order: r.order ?? 0,
      }))
      : DEFAULT_TIMELINE;

    const contact: ContactInfo = contactRow?.email
      ? {
        email: contactRow.email,
        emailNote: contactRow.emailNote,
        phone: contactRow.phone,
        phoneNote: contactRow.phoneNote,
        address: contactRow.address,
        addressNote: contactRow.addressNote,
        hours: contactRow.hours,
        hoursNote: contactRow.hoursNote,
      }
      : DEFAULT_CONTACT;

    for (const [label, res] of [
      ["events", eventsRes], ["categories", catsRes], ["blog-posts", postsRes],
      ["councilors", councilorsRes], ["timeline", timelineRes], ["contact-info", contactRes],
    ] as const) {
      if (!(res as any).ok) console.error(`loadSiteData: failed to read ${label} —`, (res as any).error);
    }

    return { events, categories, blogPosts, councilors, timeline, contact };
  } catch (err) {
    console.error("loadSiteData: unexpected error —", err);
    return { ...DEFAULT_SITE_DATA };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newEvent(): EventItem {
  return {
    id: uid("evt"), title: "New Event", description: "", image: "",
    eventDate: daysFromNow(30), location: "", totalSeats: 30,
    windows: [
      { kind: "volunteer", enabled: true, regStart: daysFromNow(0), regEnd: daysFromNow(20) },
      { kind: "vendor", enabled: true, regStart: daysFromNow(0), regEnd: daysFromNow(20) },
      { kind: "donor", enabled: false, regStart: daysFromNow(0), regEnd: daysFromNow(20) },
    ],
    categoryId: null,
    createdAt: new Date().toISOString(),
  };
}

export async function saveEvent(ev: EventItem): Promise<boolean> {
  const isExisting = !ev.id.startsWith("evt_");
  const body = {
    data: {
      title: ev.title, description: ev.description, eventDate: ev.eventDate,
      location: ev.location, totalSeats: ev.totalSeats, windows: ev.windows,
      category: ev.categoryId ?? null,
    },
  };
  const res = isExisting
    ? await api.put(`${ENDPOINTS.events}/${encodeURIComponent(ev.id)}`, body)
    : await api.post(ENDPOINTS.events, body);
  if (!res.ok) console.error("saveEvent:", res.error);
  return res.ok;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const res = await api.del(`${ENDPOINTS.events}/${encodeURIComponent(id)}`);
  if (!res.ok) console.error("deleteEvent:", res.error);
  return res.ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOG POSTS CRUD (stories + event blogs share this table)
// ═══════════════════════════════════════════════════════════════════════════

export function newBlogPost(section: "story" | "event" | "impact", categoryId: string | null = null): BlogPost {
  return {
    id: uid("post"), section, categoryId, title: "New Post", excerpt: "", content: "",
    coverImage: "", gallery: [], tags: [], createdAt: new Date().toISOString(),
  };
}

export async function saveBlogPost(p: BlogPost): Promise<boolean> {
  const isExisting = !p.id.startsWith("post_") && !p.id.startsWith("story_");
  const body = {
    data: {
      section: p.section, title: p.title, excerpt: p.excerpt, content: p.content,
      tags: p.tags, category: p.categoryId ?? null,
    },
  };
  const res = isExisting
    ? await api.put(`${ENDPOINTS.blogPosts}/${encodeURIComponent(p.id)}`, body)
    : await api.post(ENDPOINTS.blogPosts, body);
  if (!res.ok) console.error("saveBlogPost:", res.error);
  return res.ok;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const res = await api.del(`${ENDPOINTS.blogPosts}/${encodeURIComponent(id)}`);
  if (!res.ok) console.error("deleteBlogPost:", res.error);
  return res.ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newCategory(): Category {
  return { id: uid("cat"), name: "New Category" };
}

export async function saveCategory(c: Category): Promise<boolean> {
  const isExisting = !c.id.startsWith("cat_");
  const body = { data: { name: c.name } };
  const res = isExisting
    ? await api.put(`${ENDPOINTS.categories}/${encodeURIComponent(c.id)}`, body)
    : await api.post(ENDPOINTS.categories, body);
  if (!res.ok) console.error("saveCategory:", res.error);
  return res.ok;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const res = await api.del(`${ENDPOINTS.categories}/${encodeURIComponent(id)}`);
  if (!res.ok) console.error("deleteCategory:", res.error);
  return res.ok;
}

/** Reassign every post in `fromCategoryId` to `toCategoryId` (or null to leave uncategorized). */
export async function reassignCategoryPosts(posts: BlogPost[], fromCategoryId: string, toCategoryId: string | null) {
  const affected = posts.filter((p) => p.categoryId === fromCategoryId);
  for (const p of affected) {
    await saveBlogPost({ ...p, categoryId: toCategoryId });
  }
  return posts.map((p) => (p.categoryId === fromCategoryId ? { ...p, categoryId: toCategoryId } : p));
}

/** Delete every post in a category. */
export async function deleteCategoryPosts(posts: BlogPost[], categoryId: string) {
  const affected = posts.filter((p) => p.categoryId === categoryId);
  for (const p of affected) {
    await deleteBlogPost(p.id);
  }
  return posts.filter((p) => p.categoryId !== categoryId);
}

// ═══════════════════════════════════════════════════════════════════════════
// COUNCILORS CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newCouncilor(order: number): Councilor {
  return { id: uid("coun"), name: "New Councilor", role: "", bio: "", image: "", order };
}

export async function saveCouncilor(c: Councilor): Promise<boolean> {
  const isExisting = !c.id.startsWith("coun_");
  const body = { data: { name: c.name, role: c.role, bio: c.bio, order: c.order } };
  const res = isExisting
    ? await api.put(`${ENDPOINTS.councilors}/${encodeURIComponent(c.id)}`, body)
    : await api.post(ENDPOINTS.councilors, body);
  if (!res.ok) console.error("saveCouncilor:", res.error);
  return res.ok;
}

export async function deleteCouncilor(id: string): Promise<boolean> {
  const res = await api.del(`${ENDPOINTS.councilors}/${encodeURIComponent(id)}`);
  if (!res.ok) console.error("deleteCouncilor:", res.error);
  return res.ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newTimelineEntry(order: number): TimelineEntry {
  return { id: uid("tl"), year: new Date().getFullYear().toString(), title: "New Milestone", description: "", image: "", order };
}

export async function saveTimelineEntry(t: TimelineEntry): Promise<boolean> {
  const isExisting = !t.id.startsWith("tl_");
  const body = { data: { year: t.year, title: t.title, description: t.description, order: t.order } };
  const res = isExisting
    ? await api.put(`${ENDPOINTS.timeline}/${encodeURIComponent(t.id)}`, body)
    : await api.post(ENDPOINTS.timeline, body);
  if (!res.ok) console.error("saveTimelineEntry:", res.error);
  return res.ok;
}

export async function deleteTimelineEntry(id: string): Promise<boolean> {
  const res = await api.del(`${ENDPOINTS.timeline}/${encodeURIComponent(id)}`);
  if (!res.ok) console.error("deleteTimelineEntry:", res.error);
  return res.ok;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT INFO
// ═══════════════════════════════════════════════════════════════════════════

export async function saveContactInfo(c: ContactInfo): Promise<boolean> {
  const body = {
    data: {
      email: c.email, emailNote: c.emailNote, phone: c.phone, phoneNote: c.phoneNote,
      address: c.address, addressNote: c.addressNote, hours: c.hours, hoursNote: c.hoursNote,
    },
  };
  let res = await api.put(ENDPOINTS.contactInfo, body);
  if (!res.ok) res = await api.post(ENDPOINTS.contactInfo, body);
  if (!res.ok) console.error("saveContactInfo:", res.error);
  return res.ok;
}