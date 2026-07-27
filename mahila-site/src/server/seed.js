import "dotenv/config";
import pool, { initDb } from "./db.js";

const DEFAULT_CATEGORIES = [
  { id: "cat_women", name: "Women & Leadership" },
  { id: "cat_education", name: "Education & Learning" },
  { id: "cat_livelihood", name: "Livelihood & Skills" },
  { id: "cat_wellbeing", name: "Community Wellbeing" },
];

const today = new Date();
function daysFromNow(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_EVENTS = [
  {
    id: "evt_default_1",
    title: "Community Leadership Workshop",
    description: "A hands-on workshop building confidence, public speaking, and civic leadership skills for women in the community.",
    image: "",
    event_date: daysFromNow(21),
    location: "Hyderabad",
    total_seats: 45,
    windows: JSON.stringify([
      { kind: "volunteer", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(14) },
      { kind: "vendor", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(18) },
      { kind: "donor", enabled: true, regStart: daysFromNow(-10), regEnd: daysFromNow(10) },
    ]),
    category_id: "cat_women",
  },
];

const DEFAULT_BLOG_POSTS = [
  { id: "story_she_found_voice", section: "story", category_id: "cat_women", title: "She Found Her Voice", excerpt: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", content: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },
  { id: "story_new_dawn_priya", section: "story", category_id: "cat_education", title: "A New Dawn for Priya", excerpt: "Access to education transformed one family's future across three generations.", content: "Access to education transformed one family's future across three generations.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },
  { id: "story_building_futures", section: "story", category_id: "cat_livelihood", title: "Building Futures Together", excerpt: "How a community cooperative changed the economic landscape of an entire village.", content: "How a community cooperative changed the economic landscape of an entire village.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },
  { id: "story_health_all", section: "story", category_id: "cat_wellbeing", title: "Health for All", excerpt: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", content: "Mobile health camps reached 2,000 women in remote areas with life-saving screenings.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },
  { id: "story_first_sarpanch", section: "story", category_id: "cat_women", title: "First Woman Sarpanch", excerpt: "Asha Devi became the first female elected leader in her village after years of advocacy.", content: "Asha Devi became the first female elected leader in her village after years of advocacy.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },
  { id: "story_breaking_cycle", section: "story", category_id: "cat_education", title: "Breaking the Cycle", excerpt: "Four sisters all graduated high school — the first in their family's history.", content: "Four sisters all graduated high school — the first in their family's history.", cover_image: "", gallery: JSON.stringify([]), tags: JSON.stringify([]) },

  {
    id: "women-leadership",
    section: "impact",
    category_id: "cat_women",
    title: "When Women Rise, Communities Thrive.",
    excerpt: "Women & Leadership — grassroots training, civic engagement, and mentorship that puts women in decision-making roles.",
    content: "<p>Mahila Action's Women &amp; Leadership programme has been transforming the civic and economic landscape of rural Telangana for over two decades. We believe lasting change begins when women take their rightful place as decision-makers in their homes, communities, and institutions.</p><h2>1. Grassroots Leadership Training</h2><p>Our flagship 12-week leadership training immerses women in modules covering public speaking, conflict resolution, rights awareness, and community organising. Over 3,000 women have completed the programme since 2005, with 500+ now holding elected positions in local governance.</p><h2>2. Civic Engagement &amp; Panchayat Access</h2><p>We prepare women to actively engage with panchayat processes — from attending gram sabhas to filing RTI applications. Our legal literacy workshops have helped over 1,200 women access entitlements they previously didn't know existed.</p><h2>3. Mentorship Networks</h2><p>We connect emerging women leaders with experienced advocates who guide them through the challenges of public life. These networks have proven to be one of the most powerful tools for sustained participation and confidence-building.</p><h2>4. Young Women's Councils</h2><p>Recognising that leadership starts early, we run Young Women's Councils in 45 schools across Nalgonda and Warangal districts — giving girls a safe space to practise leadership, debate, and civic advocacy.</p><h2>5. Impact in Numbers</h2><p>500+ women in elected leadership positions · 3,000+ trained leaders · 1,200+ RTI applications filed successfully · 45 Young Women's Councils active in schools.</p>",
    cover_image: "",
    gallery: JSON.stringify([]),
    tags: JSON.stringify([]),
  },
  {
    id: "education",
    section: "impact",
    category_id: "cat_education",
    title: "Education Opens New Possibilities.",
    excerpt: "Education & Learning — community centres, adult literacy, and scholarships that keep girls in school.",
    content: "<p>Access to quality education remains one of the most persistent inequities facing women and children in rural India. Mahila Action's Education &amp; Learning programmes work at every stage — from early childhood literacy to adult continuing education.</p><h2>1. Community Learning Centres</h2><p>We operate 38 community learning centres serving over 12,000 students annually. Located in brick-kiln colonies, tribal hamlets, and urban slums, these centres provide remedial tutoring, life skills, and a safe after-school environment.</p><h2>2. Adult Literacy Circles</h2><p>Our adult literacy programme — where Mahila Action began in 1995 — continues to run literacy circles for women who never had the opportunity to complete schooling. To date, we have helped over 8,000 women achieve functional literacy.</p><h2>3. Scholarships &amp; Retention Support</h2><p>We provide annual scholarships to 400 girls at risk of school dropout due to economic pressure or early marriage. Our retention coordinators follow up monthly with families to resolve barriers and keep girls in school.</p><h2>4. Teacher Training &amp; Curriculum</h2><p>We work with government school teachers to improve pedagogy around girls' education. Our supplemental curriculum on gender equality has been adopted by 120 government schools across four districts.</p><h2>5. Impact in Numbers</h2><p>38 community learning centres · 12,000+ students served annually · 8,000+ adult women made literate · 400 scholarships awarded each year.</p>",
    cover_image: "",
    gallery: JSON.stringify([]),
    tags: JSON.stringify([]),
  },
  {
    id: "livelihood",
    section: "impact",
    category_id: "cat_livelihood",
    title: "Building Economic Independence Together.",
    excerpt: "Livelihood & Skills — vocational training, SHG networks, and market access that build lasting income.",
    content: "<p>Economic dependency is one of the primary barriers to women's freedom and dignity. Mahila Action's Livelihood &amp; Skills programmes build sustainable income pathways through vocational training, micro-enterprise support, and access to financial services.</p><h2>1. Vocational Skills Training</h2><p>We offer certified vocational programmes in tailoring, food processing, beauty therapy, construction trades, and digital skills. Over 6,000 women have completed vocational training, with 78% reporting increased household income within six months.</p><h2>2. Micro-Finance &amp; SHG Networks</h2><p>Our self-help group (SHG) federation connects over 4,200 women in 210 SHGs across 14 districts. Members access affordable credit, savings facilities, and insurance products tailored to their needs.</p><h2>3. Market Linkages &amp; Entrepreneurship</h2><p>We connect trained women with market opportunities — from e-commerce platforms to B2B buyers and government procurement programmes. Our annual Livelihood Skills Fair brings together 500+ women entrepreneurs with corporate buyers and mentors.</p><h2>4. Digital Financial Literacy</h2><p>In partnership with banking institutions, we have trained 5,000+ women in mobile banking, UPI transactions, and digital record-keeping — enabling them to manage businesses and savings with greater confidence.</p><h2>5. Impact in Numbers</h2><p>6,000+ women trained in vocational skills · 4,200 women in 210 SHGs · 78% report income increase post-training · ₹12 crore in micro-credit disbursed annually.</p>",
    cover_image: "",
    gallery: JSON.stringify([]),
    tags: JSON.stringify([]),
  },
  {
    id: "wellbeing",
    section: "impact",
    category_id: "cat_wellbeing",
    title: "Health and Dignity for Every Family.",
    excerpt: "Community Wellbeing — mobile health camps, nutrition, and survivor support for women and families.",
    content: "<p>True empowerment requires physical safety and good health. Mahila Action's Community Wellbeing programmes address the healthcare access gap facing women and children through mobile clinics, health education, and survivor support services.</p><h2>1. Mobile Health Camps</h2><p>Our fleet of mobile health units visits 80 remote villages and urban slums every quarter, offering free screenings for anaemia, malnutrition, cervical cancer, and maternal health. Over 25,000 consultations are conducted annually.</p><h2>2. Maternal &amp; Child Nutrition</h2><p>We partner with government ASHA workers to identify and support malnourished children and pregnant women. Our nutrition programme has contributed to a 42% reduction in severe malnutrition in targeted communities over five years.</p><h2>3. Domestic Violence Support</h2><p>Our trauma-informed support services provide counselling, legal aid, and safe shelter referrals to survivors of gender-based violence. Last year, we supported 1,100 women across all four districts we operate in.</p><h2>4. Mental Health Awareness</h2><p>Following COVID-19, we launched community mental health awareness sessions and trained 350 community health volunteers in psychological first aid and suicide prevention protocols.</p><h2>5. Impact in Numbers</h2><p>25,000+ health consultations annually · 42% reduction in severe malnutrition in target areas · 1,100 GBV survivors supported · 350 mental health volunteers trained.</p>",
    cover_image: "",
    gallery: JSON.stringify([]),
    tags: JSON.stringify([]),
  },
];

const DEFAULT_COUNCILORS = [
  { id: "coun_1", name: "Sunita Devi", role: "Community Advocate", bio: "What started as a small workshop became a journey of confidence, leadership, and self-belief.", image: "", order_index: 0 },
  { id: "coun_2", name: "Kavitha Reddy", role: "Education Lead", bio: "Through Mahila Action's programmes, Kavitha became the first woman elected to the panchayat.", image: "", order_index: 1 },
  { id: "coun_3", name: "Meena Sharma", role: "Livelihood Champion", bio: "From daily wage laborer to micro-entrepreneur — a story of resilience and transformation.", image: "", order_index: 2 },
];

const DEFAULT_TIMELINE = [
  { id: "tl_1995", year: "1995", title: "Foundation of Mahila Action", description: "Registered by a small group of six local women, starting with a single room operating basic literacy circles for children of brick-kiln laborers.", image: "", order_index: 0 },
  { id: "tl_2002", year: "2002", title: "Expanding Educational Access", description: "Launched three community learning centers reaching over 800 children and 400 adult learners across rural areas.", image: "", order_index: 1 },
  { id: "tl_2009", year: "2009", title: "Women's Leadership Programme", description: "Introduced the flagship leadership programme, training over 200 women to take civic and economic leadership roles.", image: "", order_index: 2 },
  { id: "tl_2016", year: "2016", title: "Livelihood & Skills Scale-Up", description: "Partnered with 12 corporate organizations to provide vocational training and employment to 3,000+ women.", image: "", order_index: 3 },
  { id: "tl_2021", year: "2021", title: "Digital & COVID Response", description: "Pivoted to digital learning; distributed 500 smartphones and provided mental health support to 10,000 families during the pandemic.", image: "", order_index: 4 },
  { id: "tl_2026", year: "2026", title: "28 Years of Lasting Change", description: "Operating across 200+ communities, our programmes have directly benefited over 10,000 women and their families.", image: "", order_index: 5 },
];

const DEFAULT_CONTACT = {
  id: 1,
  email: "contact@mahilaction.org",
  email_note: "We reply within 24 hours",
  phone: "+91 XXXXXXXXXX",
  phone_note: "Mon – Sat, 9 AM – 6 PM IST",
  address: "Hyderabad, Telangana",
  address_note: "India – 500 001",
  hours: "Mon – Friday",
  hours_note: "9:00 AM – 5:30 PM IST",
};

async function seed() {
  console.log("🌱 Starting full database seed to PostgreSQL / Neon DB...");
  await initDb();

  // 1. Categories
  for (const c of DEFAULT_CATEGORIES) {
    await pool.query(
      `INSERT INTO cms_categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
      [c.id, c.name]
    );
  }
  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} Categories`);

  // 2. Events
  for (const e of DEFAULT_EVENTS) {
    await pool.query(
      `INSERT INTO cms_events (id, title, description, image, event_date, location, total_seats, windows)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, image=EXCLUDED.image,
         event_date=EXCLUDED.event_date, location=EXCLUDED.location, total_seats=EXCLUDED.total_seats, windows=EXCLUDED.windows`,
      [e.id, e.title, e.description, e.image, e.event_date, e.location, e.total_seats, e.windows]
    );
  }
  console.log(`✅ Seeded ${DEFAULT_EVENTS.length} Events`);

  // 3. Blog Posts & Impact Pages
  for (const p of DEFAULT_BLOG_POSTS) {
    await pool.query(
      `INSERT INTO cms_blog_posts (id, section, category_id, title, excerpt, content, cover_image, gallery, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET section=EXCLUDED.section, category_id=EXCLUDED.category_id, title=EXCLUDED.title,
         excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, gallery=EXCLUDED.gallery, tags=EXCLUDED.tags`,
      [p.id, p.section, p.category_id, p.title, p.excerpt, p.content, p.cover_image, p.gallery, p.tags]
    );
  }
  console.log(`✅ Seeded ${DEFAULT_BLOG_POSTS.length} Stories & Impact Pages`);

  // 4. Councilors
  for (const c of DEFAULT_COUNCILORS) {
    await pool.query(
      `INSERT INTO cms_councilors (id, name, role, bio, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, bio=EXCLUDED.bio, image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [c.id, c.name, c.role, c.bio, c.image, c.order_index]
    );
  }
  console.log(`✅ Seeded ${DEFAULT_COUNCILORS.length} Councilors`);

  // 5. Timeline
  for (const t of DEFAULT_TIMELINE) {
    await pool.query(
      `INSERT INTO cms_timeline (id, year, title, description, image, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET year=EXCLUDED.year, title=EXCLUDED.title, description=EXCLUDED.description, image=EXCLUDED.image, order_index=EXCLUDED.order_index`,
      [t.id, t.year, t.title, t.description, t.image, t.order_index]
    );
  }
  console.log(`✅ Seeded ${DEFAULT_TIMELINE.length} Timeline Milestones`);

  // 7. Admin Users
  const bcrypt = (await import("bcryptjs")).default;
  const adminPasswordHash = bcrypt.hashSync("1980Jan23", 10);
  await pool.query(
    `INSERT INTO app_admin_users (id, email, password_hash)
     VALUES ('admin_user_1', 'mahilaaction.vsk@gmail.com', $1)
     ON CONFLICT (id) DO UPDATE SET email = 'mahilaaction.vsk@gmail.com', password_hash = $1`,
    [adminPasswordHash]
  );
  console.log(`✅ Seeded Admin Account (mahilaaction.vsk@gmail.com)`);

  console.log("🎉 All data successfully pushed to database!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
