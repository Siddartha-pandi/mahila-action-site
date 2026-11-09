import {
  saveLocalSiteData,
  getLocalSiteData,
  DEFAULT_EVENTS,
  DEFAULT_BLOG_POSTS,
  DEFAULT_COUNCILORS,
  DEFAULT_TIMELINE,
  unrecordDeletedEventId,
  saveEvent,
  saveBlogPost,
  saveCouncilor,
  saveTimelineEntry,
  EventItem,
  BlogPost,
  Councilor,
  TimelineEntry,
} from "./data";
import {
  restoreRawSubmission,
  inferSubmissionType,
  saveDonation,
  saveReservation,
  saveVolunteer,
  saveVendor,
  saveContact,
  savePermVolunteerRequest,
  updateSubmissionStatusRemote,
  SubmissionItem,
} from "./backend";
import { api } from "./api";

export interface TrashItem {
  id: string;
  type: "event" | "submission" | "blog" | "councilor" | "timeline" | "story";
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
  data: any;
}

const TRASH_STORAGE_KEY = "mahila_recycle_bin";

export function getTrashItems(): TrashItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrashItems(items: TrashItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("mahila_trash_changed"));
    window.dispatchEvent(new Event("storage"));
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("mahila_live_channel");
      channel.postMessage({ type: "trash_changed" });
      channel.close();
    }
  } catch {
    // ignore
  }
}

export async function fetchTrashItems(): Promise<TrashItem[]> {
  try {
    const res = await api.get<TrashItem[]>("/api/admin/recycle-bin");
    if (res.ok && Array.isArray(res.data)) {
      saveTrashItems(res.data);
      return res.data;
    }
  } catch {}
  return getTrashItems();
}

export function addToTrash(item: Omit<TrashItem, "deletedAt">) {
  const current = getTrashItems();
  const existingIdx = current.findIndex((t) => String(t.id) === String(item.id) && t.type === item.type);
  const trashEntry: TrashItem = {
    ...item,
    id: String(item.id),
    deletedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    current[existingIdx] = trashEntry;
  } else {
    current.unshift(trashEntry);
  }
  saveTrashItems(current);

  // Sync to database
  api.post("/api/admin/recycle-bin", trashEntry).catch(() => {});
}

export async function removeFromTrash(id: string, type?: TrashItem["type"]) {
  const current = getTrashItems();
  const updated = current.filter((t) => !(String(t.id) === String(id) && (!type || t.type === type)));
  saveTrashItems(updated);

  // Sync to database
  try {
    const params = new URLSearchParams({ id: String(id) });
    if (type) params.set("type", type);
    await api.del(`/api/admin/recycle-bin?${params.toString()}`);
  } catch {}
}

export async function clearTrash() {
  saveTrashItems([]);

  // Sync to database
  try {
    await api.del("/api/admin/recycle-bin?all=true");
  } catch {}
}

export async function restoreTrashItem(item: TrashItem): Promise<boolean> {
  try {
    if (item.type === "event") {
      const ev: EventItem = item.data;
      unrecordDeletedEventId(ev.id);
      await saveEvent(ev);
      const current = getLocalSiteData();
      const currentEvents = Array.isArray(current.events) ? [...current.events] : [...DEFAULT_EVENTS];
      if (!currentEvents.some((e) => String(e.id) === String(ev.id))) {
        currentEvents.unshift(ev);
      }
      saveLocalSiteData({ events: currentEvents });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_sitedata_changed"));
      }
    } else if (item.type === "submission") {
      const sub: SubmissionItem = item.data;
      const subType = inferSubmissionType(sub) || sub.type;
      const payload = sub.data || {};
      let restoredResult: any = null;

      if (subType === "donation") {
        restoredResult = await saveDonation({
          amount: Number(payload.amount) || 0,
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          anonymous: Boolean(payload.anonymous),
          donation_type: payload.donation_type || "one-time",
          campaign_name: payload.campaign_name || undefined,
          pan_number: payload.pan_number || undefined,
          address: payload.address || undefined,
          payment_method: payload.payment_method || "upi",
          transaction_id: payload.transaction_id || undefined,
          notes: payload.notes || undefined,
          is_offline: Boolean(payload.is_offline),
          status: sub.status || "New",
        });
      } else if (subType === "reservation" || (subType as string) === "attendee") {
        restoredResult = await saveReservation({
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          event_name: payload.event_name || "",
          event_id: payload.event_id || undefined,
          seats: Number(payload.seats) || 1,
          volunteer_commitment: payload.volunteer_commitment || undefined,
          companions: payload.companions || undefined,
        });
      } else if (subType === "volunteer") {
        restoredResult = await saveVolunteer({
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          skills: payload.skills || "",
          volunteer_commitment: payload.volunteer_commitment || "event_only",
          selected_events: Array.isArray(payload.selected_events) && payload.selected_events.length > 0
            ? payload.selected_events
            : [payload.event_name || "General Volunteer"],
          seats: Number(payload.seats) || 1,
          companions: payload.companions || undefined,
        });
      } else if (subType === "vendor") {
        restoredResult = await saveVendor({
          business_name: payload.business_name || payload.name || "",
          contact_name: payload.contact_name || payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          offering: payload.offering || "",
          needs_space: Boolean(payload.needs_space),
          event_name: payload.event_name || "",
        });
      } else if (subType === "contact") {
        restoredResult = await saveContact({
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || undefined,
          subject: payload.subject || undefined,
          message: payload.message || "",
        });
      } else if (subType === "perm_volunteer_request" || subType === "perm_volunteer_deactivate") {
        restoredResult = await savePermVolunteerRequest({
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || undefined,
          request_type: payload.request_type || (subType === "perm_volunteer_deactivate" ? "deactivate" : "activate"),
          message: payload.message || undefined,
        });
      }

      if (sub.status && sub.status !== "New") {
        const targetId = restoredResult?.id ? String(restoredResult.id) : String(sub.id);
        const restoredItem: SubmissionItem = { ...sub, id: targetId };
        await updateSubmissionStatusRemote(restoredItem, sub.status);
      }

      restoreRawSubmission(sub);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_submissions_changed"));
      }
    } else if (item.type === "blog" || item.type === "story") {
      const blog: BlogPost = item.data;
      await saveBlogPost(blog);
      const current = getLocalSiteData();
      const currentBlogs = Array.isArray(current.blogPosts) ? [...current.blogPosts] : [...DEFAULT_BLOG_POSTS];
      if (!currentBlogs.some((b) => String(b.id) === String(blog.id))) {
        currentBlogs.unshift(blog);
      }
      saveLocalSiteData({ blogPosts: currentBlogs });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_sitedata_changed"));
      }
    } else if (item.type === "councilor") {
      const c: Councilor = item.data;
      await saveCouncilor(c);
      const current = getLocalSiteData();
      const currentCouncilors = Array.isArray(current.councilors) ? [...current.councilors] : [...DEFAULT_COUNCILORS];
      if (!currentCouncilors.some((co) => String(co.id) === String(c.id))) {
        currentCouncilors.unshift(c);
      }
      saveLocalSiteData({ councilors: currentCouncilors });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_sitedata_changed"));
      }
    } else if (item.type === "timeline") {
      const t: TimelineEntry = item.data;
      await saveTimelineEntry(t);
      const current = getLocalSiteData();
      const currentTimeline = Array.isArray(current.timeline) ? [...current.timeline] : [...DEFAULT_TIMELINE];
      if (!currentTimeline.some((ti) => String(ti.id) === String(t.id))) {
        currentTimeline.unshift(t);
      }
      saveLocalSiteData({ timeline: currentTimeline });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("mahila_sitedata_changed"));
      }
    }

    await removeFromTrash(item.id, item.type);
    return true;
  } catch (err) {
    console.error("restoreTrashItem error:", err);
    return false;
  }
}
