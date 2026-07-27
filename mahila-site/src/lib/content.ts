import { api } from "./api";
import { comingSoon } from "./comingSoon";

// ── Default content — used until the API responds, or if it's unreachable ─
export const DEFAULTS: Record<string, string> = {
  // Hero
  hero_title: "When Women Rise,\nCommunities Thrive.",
  hero_subtitle: "For over 28 years, Mahila Action has worked alongside women, children, and communities to create opportunities, protect rights, and build lasting change from the ground up.",
  hero_cta: "Explore Our Impacts",

  // Impact section
  impact_heading: "How We Create Impact",
  impact_subtext: "Mahila Action works alongside communities through connected programmes that empower women, children, and families to build sustainable futures.",
  impact_card1_title: "Women & Leadership",
  impact_card1_desc: "Supporting women to become confident leaders in their communities.",
  impact_card2_title: "Education & Learning",
  impact_card2_desc: "Creating access to safe, inclusive, lifelong educational opportunities.",
  impact_card3_title: "Livelihood & Skills",
  impact_card3_desc: "Building economic independence through vocational skills and micro-finance.",
  impact_card4_title: "Community Wellbeing",
  impact_card4_desc: "Strengthening health, safety, and social support networks.",

  // Events
  events_heading: "Join The Movement",
  events_subtext: "Real change starts with participation. Volunteer your time, share your skills, or join a community event near you.",
  event_title: "Community Leadership Workshop",
  event_date: "August 12, 2026",
  event_location: "Hyderabad",
  event_seats: "45",

  // Stories
  stories_heading: "Lives In Motion",
  stories_subtext: "Every initiative creates a ripple effect that reaches individuals, families, and entire communities.",
  story1_title: "She Found Her Voice",
  story1_excerpt: "What started as a small workshop became a journey of confidence, leadership, and self-belief.",
  story2_title: "A New Dawn for Priya",
  story2_excerpt: "Access to education transformed one family's future across three generations.",
  story3_title: "Building Futures Together",
  story3_excerpt: "How a community cooperative changed the economic landscape of an entire village.",

  // About
  about_mission_title: "Self-Led Sustainable Transformation",
  about_mission_body: "Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders – not passive beneficiaries.\n\nBy building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.",
  about_vision_body: "Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders – not passive beneficiaries.\n\nBy building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.",

  // Images (URLs)
  img_hero_card1: "",
  img_hero_card2: "",
  img_hero_card3: "",
  img_hero_card4: "",
  img_impact1: "",
  img_impact2: "",
  img_impact3: "",
  img_impact4: "",
  img_event: "",
  img_story1: "",
  img_story2: "",
  img_story3: "",
  img_about_banner: "",
};

export type ContentMap = typeof DEFAULTS;

// ── Load all content from the API ─────────────────────────────────────────
export async function loadContent(): Promise<ContentMap> {
  const res = await api.get<Record<string, string>>("/api/content");
  if (!res.ok || !res.data) return { ...DEFAULTS };
  const map = { ...DEFAULTS };
  for (const [key, value] of Object.entries(res.data)) {
    if (key in map) map[key as keyof ContentMap] = value;
  }
  return map;
}

// ── Save a single key ──────────────────────────────────────────────────────
export async function saveContentKey(key: string, value: string): Promise<boolean> {
  return comingSoon();
  // ── Original logic (restore by deleting the line above) ──
  // const res = await api.put(`/api/content/${encodeURIComponent(key)}`, { value });
  // if (!res.ok) console.error(`saveContentKey: failed to save "${key}" —`, res.error);
  // return res.ok;
}

// ── Save all keys at once ─────────────────────────────────────────────────
export async function saveAllContent(content: ContentMap): Promise<boolean> {
  return comingSoon();
  // ── Original logic (restore by deleting the line above) ──
  // const res = await api.put("/api/content", content);
  // if (!res.ok) console.error("saveAllContent: failed to save site content —", res.error);
  // return res.ok;
}
