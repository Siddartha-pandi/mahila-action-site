import { api, BASE_URL } from "./api";
import { comingSoon } from "./comingSoon";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type RegKind = "attendee" | "volunteer" | "vendor" | "donor";

export interface RegWindow {
  kind: RegKind;
  enabled: boolean;
  regStart: string; // ISO date, yyyy-mm-dd
  regEnd: string; // ISO date, yyyy-mm-dd
  maxRegistrations?: number;
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
// CMS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const ENDPOINTS = {
  events: "/api/cms/events",
  categories: "/api/cms/categories",
  blogPosts: "/api/cms/blog-posts",
  councilors: "/api/cms/councilors",
  timeline: "/api/cms/timeline",
  contactInfo: "/api/cms/contact-info",
};

// ═══════════════════════════════════════════════════════════════════════════
// MEDIA HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function mediaUrl(media: any): string {
  if (!media) return "";
  if (typeof media === "string") return media;
  const raw = Array.isArray(media) ? media[0] : media;
  const item = raw?.data?.attributes || raw?.data || raw;
  const url = item?.url || raw?.url || "";
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return BASE_URL ? `${BASE_URL}${url}` : url;
}

function mediaUrls(mediaList: any): string[] {
  if (!mediaList) return [];
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
      { kind: "attendee", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(20), maxRegistrations: 45 },
      { kind: "volunteer", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(14), maxRegistrations: 0 },
      { kind: "vendor", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(18), maxRegistrations: 0 },
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
      if (windows.length === 0) return true;
      return windows.some((w) => w.enabled && new Date(w.regEnd) >= now) || (ev.eventDate && new Date(ev.eventDate) >= now);
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD & SAVE — local storage primary with optional API sync
// ═══════════════════════════════════════════════════════════════════════════

const SITE_DATA_KEY = "mahila_site_data";
const DELETED_EVENT_IDS_KEY = "mahila_deleted_event_ids";

function getDeletedEventIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_EVENT_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isDeletedEventId(id: string | number, deletedIds?: string[]): boolean {
  const list = deletedIds ?? getDeletedEventIds();
  const strId = String(id);
  const rawId = strId.replace(/^evt_/, "");
  const prefixedId = strId.startsWith("evt_") ? strId : `evt_${strId}`;

  return list.includes(strId) || list.includes(rawId) || list.includes(prefixedId);
}

function recordDeletedEventId(id: string | number) {
  try {
    const ids = getDeletedEventIds();
    const strId = String(id);
    const rawId = strId.replace(/^evt_/, "");
    const prefixedId = strId.startsWith("evt_") ? strId : `evt_${strId}`;

    if (!ids.includes(strId)) ids.push(strId);
    if (!ids.includes(rawId)) ids.push(rawId);
    if (!ids.includes(prefixedId)) ids.push(prefixedId);

    localStorage.setItem(DELETED_EVENT_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function getLocalSiteData(): Partial<SiteData> {
  try {
    const raw = localStorage.getItem(SITE_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalSiteData(patch: Partial<SiteData>, silent = false) {
  try {
    const current = getLocalSiteData();
    const deletedIds = getDeletedEventIds();
    const rawEvents = patch.events ?? current.events ?? DEFAULT_EVENTS;
    const cleanEvents = rawEvents.filter((e) => !isDeletedEventId(e.id, deletedIds));

    const updated = {
      events: cleanEvents,
      categories: patch.categories ?? current.categories ?? DEFAULT_CATEGORIES,
      blogPosts: patch.blogPosts ?? current.blogPosts ?? DEFAULT_BLOG_POSTS,
      councilors: patch.councilors ?? current.councilors ?? DEFAULT_COUNCILORS,
      timeline: patch.timeline ?? current.timeline ?? DEFAULT_TIMELINE,
      contact: patch.contact ?? current.contact ?? DEFAULT_CONTACT,
    };
    localStorage.setItem(SITE_DATA_KEY, JSON.stringify(updated));
    // Only notify listeners when an admin explicitly saves a change.
    // Internal cache writes (e.g. from loadSiteData) pass silent=true to
    // avoid re-triggering App.tsx's refresh and creating an infinite loop.
    if (!silent && typeof window !== "undefined") {
      window.dispatchEvent(new Event("mahila_sitedata_changed"));
    }
  } catch (err) {
    console.error("Failed to save local site data:", err);
  }
}

export async function loadSiteData(): Promise<SiteData> {
  const local = getLocalSiteData();
  const deletedIds = getDeletedEventIds();

  let events = (local.events ?? DEFAULT_EVENTS).filter((e) => !isDeletedEventId(e.id, deletedIds));
  let categories = local.categories ?? DEFAULT_CATEGORIES;
  let blogPosts = local.blogPosts ?? DEFAULT_BLOG_POSTS;
  let councilors = local.councilors ?? DEFAULT_COUNCILORS;
  let timeline = local.timeline ?? DEFAULT_TIMELINE;
  let contact = local.contact ?? DEFAULT_CONTACT;

  try {
    const [eventsRes, catsRes, postsRes, councilorsRes, timelineRes, contactRes] = await Promise.all([
      api.get<any>(ENDPOINTS.events),
      api.get<any>(ENDPOINTS.categories),
      api.get<any>(ENDPOINTS.blogPosts),
      api.get<any>(ENDPOINTS.councilors),
      api.get<any>(ENDPOINTS.timeline),
      api.get<any>(ENDPOINTS.contactInfo),
    ]);

    const eventRows: any[] = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.data ?? [];
    const catRows: any[] = Array.isArray(catsRes.data) ? catsRes.data : catsRes.data?.data ?? [];
    const postRows: any[] = Array.isArray(postsRes.data) ? postsRes.data : postsRes.data?.data ?? [];
    const councilorRows: any[] = Array.isArray(councilorsRes.data) ? councilorsRes.data : councilorsRes.data?.data ?? [];
    const timelineRows: any[] = Array.isArray(timelineRes.data) ? timelineRes.data : timelineRes.data?.data ?? [];
    const contactRow: any = contactRes.data?.email ? contactRes.data : contactRes.data?.data ?? null;

    if (Array.isArray(eventRows) && eventRows.length > 0) {
      events = eventRows
        .filter((r: any) => !isDeletedEventId(r.id, deletedIds))
        .map((r: any) => ({
          id: String(r.id),
          title: r.title,
          description: r.description || "",
          image: mediaUrl(r.image),
          eventDate: r.event_date || r.eventDate || "",
          location: r.location || "",
          totalSeats: Number(r.total_seats ?? r.totalSeats ?? 0),
          windows: Array.isArray(r.windows) ? r.windows : typeof r.windows === "string" ? JSON.parse(r.windows || "[]") : [],
          categoryId: r.category_id || r.categoryId || null,
          createdAt: r.created_at || r.createdAt || new Date().toISOString(),
        }));
    }

    if (Array.isArray(catRows) && catRows.length > 0) {
      categories = catRows.map((r: any) => ({ id: r.id, name: r.name }));
    }

    if (Array.isArray(postRows) && postRows.length > 0) {
      blogPosts = postRows.map((r: any) => ({
        id: r.id,
        section: r.section,
        categoryId: r.category_id || r.categoryId || null,
        title: r.title,
        excerpt: r.excerpt || "",
        content: r.content || "",
        coverImage: mediaUrl(r.cover_image || r.coverImage),
        gallery: mediaUrls(r.gallery),
        tags: Array.isArray(r.tags) ? r.tags : typeof r.tags === "string" ? JSON.parse(r.tags || "[]") : [],
        createdAt: r.created_at || r.createdAt || new Date().toISOString(),
      }));
    }

    if (Array.isArray(councilorRows) && councilorRows.length > 0) {
      councilors = councilorRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        role: r.role || "",
        bio: r.bio || "",
        image: mediaUrl(r.image),
        order: Number(r.order_index ?? r.order ?? 0),
      }));
    }

    if (Array.isArray(timelineRows) && timelineRows.length > 0) {
      timeline = timelineRows.map((r: any) => ({
        id: r.id,
        year: r.year,
        title: r.title,
        description: r.description || "",
        image: mediaUrl(r.image),
        order: Number(r.order_index ?? r.order ?? 0),
      }));
    }

    if (contactRow?.email) {
      contact = {
        email: contactRow.email,
        emailNote: contactRow.email_note || contactRow.emailNote || "",
        phone: contactRow.phone || "",
        phoneNote: contactRow.phone_note || contactRow.phoneNote || "",
        address: contactRow.address || "",
        addressNote: contactRow.address_note || contactRow.addressNote || "",
        hours: contactRow.hours || "",
        hoursNote: contactRow.hours_note || contactRow.hoursNote || "",
      };
    }
  } catch (err) {
    console.warn("loadSiteData: using local storage data", err);
  }

  if (!blogPosts.some((p) => p.section === "impact")) {
    const seedImpactPosts = DEFAULT_BLOG_POSTS.filter((p) => p.section === "impact");
    blogPosts = [...blogPosts, ...seedImpactPosts];
  }

  // Cache the fetched data locally for offline use, but silently so we
  // don't re-trigger App.tsx's mahila_sitedata_changed listener (which
  // would call loadSiteData() again and create an infinite request loop).
  saveLocalSiteData({ events, categories, blogPosts, councilors, timeline, contact }, true);
  return { events, categories, blogPosts, councilors, timeline, contact };
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newEvent(): EventItem {
  return {
    id: uid("evt"), title: "New Event", description: "", image: "",
    eventDate: daysFromNow(30), location: "", totalSeats: 30,
    windows: [
      { kind: "attendee", enabled: true, regStart: daysFromNow(0), regEnd: daysFromNow(20), maxRegistrations: 30 },
      { kind: "volunteer", enabled: true, regStart: daysFromNow(0), regEnd: daysFromNow(20), maxRegistrations: 0 },
      { kind: "vendor", enabled: true, regStart: daysFromNow(0), regEnd: daysFromNow(20), maxRegistrations: 0 },
      { kind: "donor", enabled: false, regStart: daysFromNow(0), regEnd: daysFromNow(20) },
    ],
    categoryId: null,
    createdAt: new Date().toISOString(),
  };
}

export async function saveEvent(ev: EventItem): Promise<boolean> {
  const current = getLocalSiteData();
  const events = current.events ?? DEFAULT_EVENTS;
  const idx = events.findIndex((e) => e.id === ev.id);
  const updated = idx >= 0 ? events.map((e) => (e.id === ev.id ? ev : e)) : [...events, ev];
  saveLocalSiteData({ events: updated });

  try {
    const res = await api.post(ENDPOINTS.events, ev);
    return res.ok;
  } catch {
    return true;
  }
}

export function unrecordDeletedEventId(id: string | number) {
  try {
    const ids = getDeletedEventIds();
    const strId = String(id);
    const rawId = strId.replace(/^evt_/, "");
    const prefixedId = strId.startsWith("evt_") ? strId : `evt_${strId}`;

    const filtered = ids.filter((i) => i !== strId && i !== rawId && i !== prefixedId);
    localStorage.setItem(DELETED_EVENT_IDS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  const current = getLocalSiteData();
  const deletedIds = getDeletedEventIds();
  const allEvents = current.events ?? DEFAULT_EVENTS;
  const targetEvent = allEvents.find((e) => String(e.id) === String(id));

  // Record the deletion so it survives refresh even if the API doesn't persist it
  recordDeletedEventId(id);

  if (targetEvent && typeof window !== "undefined") {
    try {
      const { addToTrash } = require("./recycleBin");
      addToTrash({
        id: String(targetEvent.id),
        type: "event",
        title: targetEvent.title,
        subtitle: targetEvent.eventDate ? `Date: ${targetEvent.eventDate}` : "Event",
        data: targetEvent,
      });
    } catch {
      // ignore
    }
  }

  const events = allEvents.filter((e) => !isDeletedEventId(e.id, deletedIds) && String(e.id) !== String(id));
  saveLocalSiteData({ events });

  try {
    const rawId = String(id).replace(/^evt_/, "");
    await api.del(`${ENDPOINTS.events}/${encodeURIComponent(id)}`);
    if (rawId !== id) {
      await api.del(`${ENDPOINTS.events}/${encodeURIComponent(rawId)}`);
    }
    return true;
  } catch {
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOG POSTS CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newBlogPost(section: "story" | "event" | "impact", categoryId: string | null = null): BlogPost {
  return {
    id: uid("post"), section, categoryId, title: "New Post", excerpt: "", content: "",
    coverImage: "", gallery: [], tags: [], createdAt: new Date().toISOString(),
  };
}

export async function saveBlogPost(p: BlogPost): Promise<boolean> {
  const current = getLocalSiteData();
  const blogPosts = current.blogPosts ?? DEFAULT_BLOG_POSTS;
  const idx = blogPosts.findIndex((item) => item.id === p.id);
  const updated = idx >= 0 ? blogPosts.map((item) => (item.id === p.id ? p : item)) : [...blogPosts, p];
  saveLocalSiteData({ blogPosts: updated });

  try {
    const res = await api.post(ENDPOINTS.blogPosts, p);
    return res.ok;
  } catch {
    return true;
  }
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const current = getLocalSiteData();
  const allBlogs = current.blogPosts ?? DEFAULT_BLOG_POSTS;
  const target = allBlogs.find((p) => p.id === id);

  if (target && typeof window !== "undefined") {
    try {
      const { addToTrash } = require("./recycleBin");
      addToTrash({
        id: target.id,
        type: "blog",
        title: target.title,
        subtitle: `Blog Post (${target.section})`,
        data: target,
      });
    } catch {
      // ignore
    }
  }

  const blogPosts = allBlogs.filter((p) => p.id !== id);
  saveLocalSiteData({ blogPosts });

  try {
    const res = await api.del(`${ENDPOINTS.blogPosts}/${encodeURIComponent(id)}`);
    return res.ok;
  } catch {
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newCategory(): Category {
  return { id: uid("cat"), name: "New Category" };
}

export async function saveCategory(c: Category): Promise<boolean> {
  const current = getLocalSiteData();
  const categories = current.categories ?? DEFAULT_CATEGORIES;
  const idx = categories.findIndex((item) => item.id === c.id);
  const updated = idx >= 0 ? categories.map((item) => (item.id === c.id ? c : item)) : [...categories, c];
  saveLocalSiteData({ categories: updated });

  try {
    const res = await api.post(ENDPOINTS.categories, c);
    return res.ok;
  } catch {
    return true;
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  const current = getLocalSiteData();
  const categories = (current.categories ?? DEFAULT_CATEGORIES).filter((c) => c.id !== id);
  saveLocalSiteData({ categories });

  try {
    const res = await api.del(`${ENDPOINTS.categories}/${encodeURIComponent(id)}`);
    return res.ok;
  } catch {
    return true;
  }
}

export async function reassignCategoryPosts(posts: BlogPost[], fromCategoryId: string, toCategoryId: string | null) {
  const affected = posts.filter((p) => p.categoryId === fromCategoryId);
  for (const p of affected) {
    await saveBlogPost({ ...p, categoryId: toCategoryId });
  }
  return posts.map((p) => (p.categoryId === fromCategoryId ? { ...p, categoryId: toCategoryId } : p));
}

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
  const current = getLocalSiteData();
  const councilors = current.councilors ?? DEFAULT_COUNCILORS;
  const idx = councilors.findIndex((item) => item.id === c.id);
  const updated = idx >= 0 ? councilors.map((item) => (item.id === c.id ? c : item)) : [...councilors, c];
  saveLocalSiteData({ councilors: updated });

  try {
    const res = await api.post(ENDPOINTS.councilors, c);
    return res.ok;
  } catch {
    return true;
  }
}

export async function deleteCouncilor(id: string): Promise<boolean> {
  const current = getLocalSiteData();
  const allCouncilors = current.councilors ?? DEFAULT_COUNCILORS;
  const target = allCouncilors.find((c) => c.id === id);

  if (target && typeof window !== "undefined") {
    try {
      const { addToTrash } = require("./recycleBin");
      addToTrash({
        id: target.id,
        type: "councilor",
        title: target.name,
        subtitle: target.role || "Councilor",
        data: target,
      });
    } catch {
      // ignore
    }
  }

  const councilors = allCouncilors.filter((c) => c.id !== id);
  saveLocalSiteData({ councilors });

  try {
    const res = await api.del(`${ENDPOINTS.councilors}/${encodeURIComponent(id)}`);
    return res.ok;
  } catch {
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE CRUD
// ═══════════════════════════════════════════════════════════════════════════

export function newTimelineEntry(order: number): TimelineEntry {
  return { id: uid("tl"), year: new Date().getFullYear().toString(), title: "New Milestone", description: "", image: "", order };
}

export async function saveTimelineEntry(t: TimelineEntry): Promise<boolean> {
  const current = getLocalSiteData();
  const timeline = current.timeline ?? DEFAULT_TIMELINE;
  const idx = timeline.findIndex((item) => item.id === t.id);
  const updated = idx >= 0 ? timeline.map((item) => (item.id === t.id ? t : item)) : [...timeline, t];
  saveLocalSiteData({ timeline: updated });

  try {
    const res = await api.post(ENDPOINTS.timeline, t);
    return res.ok;
  } catch {
    return true;
  }
}

export async function deleteTimelineEntry(id: string): Promise<boolean> {
  const current = getLocalSiteData();
  const allTimeline = current.timeline ?? DEFAULT_TIMELINE;
  const target = allTimeline.find((t) => t.id === id);

  if (target && typeof window !== "undefined") {
    try {
      const { addToTrash } = require("./recycleBin");
      addToTrash({
        id: target.id,
        type: "timeline",
        title: target.title,
        subtitle: target.year ? `Year: ${target.year}` : "Timeline Milestone",
        data: target,
      });
    } catch {
      // ignore
    }
  }

  const timeline = allTimeline.filter((t) => t.id !== id);
  saveLocalSiteData({ timeline });

  try {
    const res = await api.del(`${ENDPOINTS.timeline}/${encodeURIComponent(id)}`);
    return res.ok;
  } catch {
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT INFO
// ═══════════════════════════════════════════════════════════════════════════

export async function saveContactInfo(c: ContactInfo): Promise<boolean> {
  saveLocalSiteData({ contact: c });

  const res = await api.put(ENDPOINTS.contactInfo, c);
  return res.ok;
}