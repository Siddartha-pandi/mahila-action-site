export type FieldType =
  | "string"
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "datetime"
  | "media"
  | "json"
  | "relation"
  | "enum";

export type ColSpanType = 12 | 6 | 4 | 3; // 12 = 100% (1 col), 6 = 50% (2 cols), 4 = 33% (3 cols), 3 = 25% (4 cols)

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
  enumOptions?: string[];
  targetModel?: string; // for relations
  gridWidth?: "full" | "half"; // legacy layout width
  colSpan?: ColSpanType; // legacy column span
  rowId?: number; // Automatic row grouping ID for multi-column auto-fit layout
}

export interface ContentTypeModel {
  uid: string; // e.g. "api::blog-post.blog-post"
  displayName: string;
  kind: "collectionType" | "singleType";
  description: string;
  tableName: string;
  apiEndpoint: string;
  fields: FieldDefinition[];
  isCustom?: boolean;
  createdAt?: string;
}

export const BUILTIN_CONTENT_TYPES: ContentTypeModel[] = [
  {
    uid: "api::blog-post.blog-post",
    displayName: "Blog Post / Story",
    kind: "collectionType",
    description: "Articles, community impact stories, and event news blogs",
    tableName: "cms_blog_posts",
    apiEndpoint: "/api/cms/blog-posts",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Unique Post ID" },
      { name: "title", type: "string", required: true, description: "Post Title" },
      { name: "section", type: "enum", required: true, enumOptions: ["story", "event", "impact"], description: "CMS Section" },
      { name: "category_id", type: "relation", targetModel: "api::category.category", description: "Category Relation" },
      { name: "excerpt", type: "text", description: "Short summary teaser" },
      { name: "content", type: "richtext", description: "Full Markdown / HTML content body" },
      { name: "cover_image", type: "media", description: "Primary cover image URL" },
      { name: "gallery", type: "json", description: "Array of gallery image URLs" },
      { name: "tags", type: "json", description: "Tags list" },
      { name: "created_at", type: "datetime", description: "Creation timestamp" },
    ],
  },
  {
    uid: "api::event.event",
    displayName: "Upcoming Event",
    kind: "collectionType",
    description: "Scheduled workshops, rallies, fairs, and community events",
    tableName: "cms_events",
    apiEndpoint: "/api/cms/events",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Event ID" },
      { name: "title", type: "string", required: true, description: "Event Title" },
      { name: "description", type: "text", description: "Detailed event summary" },
      { name: "image", type: "media", description: "Event promo banner image URL" },
      { name: "event_date", type: "datetime", required: true, description: "Event Date" },
      { name: "location", type: "string", description: "City / Venue Location" },
      { name: "total_seats", type: "number", defaultValue: 0, description: "Maximum attendee seat capacity" },
      { name: "windows", type: "json", description: "Registration window windows array" },
      { name: "created_at", type: "datetime", description: "Creation timestamp" },
    ],
  },
  {
    uid: "api::category.category",
    displayName: "Story Category",
    kind: "collectionType",
    description: "Categories for grouping stories and events (e.g., Leadership, Livelihood)",
    tableName: "cms_categories",
    apiEndpoint: "/api/cms/categories",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Category ID" },
      { name: "name", type: "string", required: true, description: "Category Name" },
      { name: "created_at", type: "datetime", description: "Creation timestamp" },
    ],
  },
  {
    uid: "api::councilor.councilor",
    displayName: "Councilor",
    kind: "collectionType",
    description: "Leadership team and advisory council members",
    tableName: "cms_councilors",
    apiEndpoint: "/api/cms/councilors",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Councilor ID" },
      { name: "name", type: "string", required: true, description: "Full Name" },
      { name: "role", type: "string", description: "Designation / Role" },
      { name: "bio", type: "text", description: "Short biography" },
      { name: "image", type: "media", description: "Profile photo URL" },
      { name: "order_index", type: "number", defaultValue: 0, description: "Sort display order" },
    ],
  },
  {
    uid: "api::timeline.timeline",
    displayName: "Timeline Entry",
    kind: "collectionType",
    description: "Historical milestones and organizational journey entries",
    tableName: "cms_timeline",
    apiEndpoint: "/api/cms/timeline",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Timeline Item ID" },
      { name: "year", type: "string", required: true, description: "Year (e.g. 1995)" },
      { name: "title", type: "string", required: true, description: "Milestone Title" },
      { name: "description", type: "text", description: "Milestone detail story" },
      { name: "image", type: "media", description: "Historical photo URL" },
      { name: "order_index", type: "number", defaultValue: 0, description: "Sort order" },
    ],
  },
  {
    uid: "api::contact-info.contact-info",
    displayName: "Contact Info",
    kind: "singleType",
    description: "Single-instance contact details (email, phone, office address, working hours)",
    tableName: "cms_contact",
    apiEndpoint: "/api/cms/contact-info",
    fields: [
      { name: "id", type: "number", required: true, unique: true, defaultValue: 1, description: "Singleton ID" },
      { name: "email", type: "string", description: "Official email" },
      { name: "email_note", type: "string", description: "Email helper note" },
      { name: "phone", type: "string", description: "Contact phone number" },
      { name: "phone_note", type: "string", description: "Phone helper note" },
      { name: "address", type: "text", description: "Physical office address" },
      { name: "address_note", type: "string", description: "Address helper note" },
      { name: "hours", type: "string", description: "Operating hours" },
      { name: "hours_note", type: "string", description: "Hours helper note" },
    ],
  },
  {
    uid: "api::contact-submission.contact-submission",
    displayName: "Contact Submission",
    kind: "collectionType",
    description: "Inquiries submitted via the Contact Us form",
    tableName: "contact_submissions",
    apiEndpoint: "/api/contact",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Submission ID" },
      { name: "name", type: "string", required: true, description: "Sender Name" },
      { name: "email", type: "string", required: true, description: "Sender Email" },
      { name: "phone", type: "string", description: "Sender Phone" },
      { name: "subject", type: "string", description: "Inquiry Subject" },
      { name: "message", type: "text", required: true, description: "Message Body" },
      { name: "created_at", type: "datetime", description: "Submission timestamp" },
    ],
  },
  {
    uid: "api::donation.donation",
    displayName: "Donation Record",
    kind: "collectionType",
    description: "Financial donation contributions and pledges",
    tableName: "donations",
    apiEndpoint: "/api/donations",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Donation ID" },
      { name: "amount", type: "number", required: true, description: "Amount (INR)" },
      { name: "name", type: "string", description: "Donor Name" },
      { name: "email", type: "string", description: "Donor Email" },
      { name: "phone", type: "string", required: true, description: "Donor Phone" },
      { name: "donation_type", type: "enum", enumOptions: ["one-time", "monthly"], defaultValue: "one-time", description: "Recurrence Type" },
      { name: "anonymous", type: "boolean", defaultValue: false, description: "Anonymous flag" },
      { name: "event_name", type: "string", description: "Target Event" },
      { name: "campaign_name", type: "string", description: "Target Campaign" },
      { name: "created_at", type: "datetime", description: "Donation timestamp" },
    ],
  },
  {
    uid: "api::volunteer-registration.volunteer-registration",
    displayName: "Volunteer Application",
    kind: "collectionType",
    description: "Volunteer sign-ups and skill registrations",
    tableName: "volunteer_registrations",
    apiEndpoint: "/api/volunteers",
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Registration ID" },
      { name: "name", type: "string", required: true, description: "Volunteer Name" },
      { name: "email", type: "string", required: true, description: "Volunteer Email" },
      { name: "phone", type: "string", required: true, description: "Volunteer Phone" },
      { name: "skills", type: "text", description: "Skills / Expertise" },
      { name: "selected_events", type: "json", description: "Selected event titles" },
      { name: "created_at", type: "datetime", description: "Registration timestamp" },
    ],
  },
];

const STORAGE_KEY = "mahila_cms_content_types_v1";

export function getStoredContentTypes(): ContentTypeModel[] {
  if (typeof window === "undefined") return BUILTIN_CONTENT_TYPES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BUILTIN_CONTENT_TYPES;
    const parsed: ContentTypeModel[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BUILTIN_CONTENT_TYPES;
    
    // Merge built-in models with any stored field additions/custom models
    const merged = BUILTIN_CONTENT_TYPES.map(builtin => {
      const customMatch = parsed.find(p => p.uid === builtin.uid);
      if (customMatch) {
        return {
          ...builtin,
          fields: customMatch.fields || builtin.fields,
        };
      }
      return builtin;
    });

    // Append user-created custom content types
    const extraCustom = parsed.filter(p => !BUILTIN_CONTENT_TYPES.some(b => b.uid === p.uid));
    return [...merged, ...extraCustom];
  } catch {
    return BUILTIN_CONTENT_TYPES;
  }
}

export function saveStoredContentTypes(models: ContentTypeModel[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  } catch (err) {
    console.error("Failed to save content types:", err);
  }
}

export function addFieldToContentType(uid: string, newField: FieldDefinition): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  if (target.fields.some(f => f.name.toLowerCase() === newField.name.toLowerCase())) {
    throw new Error(`Field '${newField.name}' already exists in ${target.displayName}.`);
  }

  target.fields.push(newField);
  saveStoredContentTypes(models);
  return models;
}

export function deleteFieldFromContentType(uid: string, fieldName: string): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  if (["id", "title", "name"].includes(fieldName.toLowerCase())) {
    throw new Error(`Primary field '${fieldName}' cannot be deleted.`);
  }

  target.fields = target.fields.filter(f => f.name !== fieldName);
  saveStoredContentTypes(models);
  return models;
}

export function createCustomContentType(newModel: {
  displayName: string;
  kind: "collectionType" | "singleType";
  description: string;
}): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const slug = newModel.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const uid = `api::${slug}.${slug}`;

  if (models.some(m => m.uid === uid)) {
    throw new Error(`A content type with API ID '${uid}' already exists.`);
  }

  const createdModel: ContentTypeModel = {
    uid,
    displayName: newModel.displayName,
    kind: newModel.kind,
    description: newModel.description || `${newModel.displayName} collection`,
    tableName: `cms_custom_${slug.replace(/-/g, "_")}`,
    apiEndpoint: `/api/cms/custom/${slug}`,
    isCustom: true,
    createdAt: new Date().toISOString(),
    fields: [
      { name: "id", type: "string", required: true, unique: true, description: "Primary Key" },
      { name: "title", type: "string", required: true, description: "Title / Name" },
      { name: "description", type: "text", description: "Body details" },
      { name: "created_at", type: "datetime", description: "Creation timestamp" },
    ],
  };

  models.push(createdModel);
  saveStoredContentTypes(models);
  return models;
}

export function deleteCustomContentType(uid: string): ContentTypeModel[] {
  if (BUILTIN_CONTENT_TYPES.some(b => b.uid === uid)) {
    throw new Error("System built-in content types cannot be deleted.");
  }
  const models = getStoredContentTypes();
  const filtered = models.filter(m => m.uid !== uid);
  saveStoredContentTypes(filtered);
  return filtered;
}

export function updateContentType(
  uid: string,
  patch: { displayName?: string; description?: string }
): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  if (patch.displayName && patch.displayName.trim()) {
    target.displayName = patch.displayName.trim();
  }
  if (patch.description !== undefined) {
    target.description = patch.description.trim();
  }

  saveStoredContentTypes(models);
  return models;
}

export function updateFieldInContentType(
  uid: string,
  oldFieldName: string,
  updatedField: FieldDefinition
): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  const fieldIdx = target.fields.findIndex(f => f.name === oldFieldName);
  if (fieldIdx === -1) throw new Error(`Field '${oldFieldName}' not found in ${target.displayName}.`);

  if (
    oldFieldName.toLowerCase() !== updatedField.name.toLowerCase() &&
    target.fields.some(f => f.name.toLowerCase() === updatedField.name.toLowerCase())
  ) {
    throw new Error(`A field named '${updatedField.name}' already exists in ${target.displayName}.`);
  }

  target.fields[fieldIdx] = updatedField;
  saveStoredContentTypes(models);
  return models;
}

export function reorderFieldsInContentType(
  uid: string,
  fromIndex: number,
  toIndex: number
): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  if (
    fromIndex < 0 ||
    fromIndex >= target.fields.length ||
    toIndex < 0 ||
    toIndex >= target.fields.length
  ) {
    return models;
  }

  const [moved] = target.fields.splice(fromIndex, 1);
  target.fields.splice(toIndex, 0, moved);

  saveStoredContentTypes(models);
  return models;
}

export function setFieldColSpan(
  uid: string,
  fieldName: string,
  colSpan: ColSpanType
): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  const field = target.fields.find(f => f.name === fieldName);
  if (!field) throw new Error(`Field '${fieldName}' not found.`);

  field.colSpan = colSpan;
  field.gridWidth = colSpan === 12 ? "full" : "half";

  saveStoredContentTypes(models);
  return models;
}

export function saveAllFieldsForContentType(
  uid: string,
  fields: FieldDefinition[]
): ContentTypeModel[] {
  const models = getStoredContentTypes();
  const target = models.find(m => m.uid === uid);
  if (!target) throw new Error(`Content type ${uid} not found.`);

  target.fields = fields;
  saveStoredContentTypes(models);
  return models;
}
