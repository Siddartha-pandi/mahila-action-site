import {
  saveLocalSiteData,
  getLocalSiteData,
  DEFAULT_EVENTS,
  DEFAULT_BLOG_POSTS,
  DEFAULT_COUNCILORS,
  DEFAULT_TIMELINE,
  unrecordDeletedEventId,
  EventItem,
  BlogPost,
  Councilor,
  TimelineEntry,
} from "./data";
import { restoreRawSubmission, getSubmissions, SubmissionItem } from "./backend";

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
}

export function removeFromTrash(id: string, type?: TrashItem["type"]) {
  const current = getTrashItems();
  const updated = current.filter((t) => !(String(t.id) === String(id) && (!type || t.type === type)));
  saveTrashItems(updated);
}

export function clearTrash() {
  saveTrashItems([]);
}

export function restoreTrashItem(item: TrashItem): boolean {
  try {
    if (item.type === "event") {
      const ev: EventItem = item.data;
      unrecordDeletedEventId(ev.id);
      const current = getLocalSiteData();
      const currentEvents = Array.isArray(current.events) ? [...current.events] : [...DEFAULT_EVENTS];
      if (!currentEvents.some((e) => String(e.id) === String(ev.id))) {
        currentEvents.unshift(ev);
      }
      saveLocalSiteData({ events: currentEvents });
    } else if (item.type === "submission") {
      const sub: SubmissionItem = item.data;
      restoreRawSubmission(sub);
    } else if (item.type === "blog") {
      const blog: BlogPost = item.data;
      const current = getLocalSiteData();
      const currentBlogs = Array.isArray(current.blogPosts) ? [...current.blogPosts] : [...DEFAULT_BLOG_POSTS];
      if (!currentBlogs.some((b) => String(b.id) === String(blog.id))) {
        currentBlogs.unshift(blog);
      }
      saveLocalSiteData({ blogPosts: currentBlogs });
    } else if (item.type === "councilor") {
      const c: Councilor = item.data;
      const current = getLocalSiteData();
      const currentCouncilors = Array.isArray(current.councilors) ? [...current.councilors] : [...DEFAULT_COUNCILORS];
      if (!currentCouncilors.some((co) => String(co.id) === String(c.id))) {
        currentCouncilors.unshift(c);
      }
      saveLocalSiteData({ councilors: currentCouncilors });
    } else if (item.type === "timeline") {
      const t: TimelineEntry = item.data;
      const current = getLocalSiteData();
      const currentTimeline = Array.isArray(current.timeline) ? [...current.timeline] : [...DEFAULT_TIMELINE];
      if (!currentTimeline.some((ti) => String(ti.id) === String(t.id))) {
        currentTimeline.unshift(t);
      }
      saveLocalSiteData({ timeline: currentTimeline });
    }

    removeFromTrash(item.id, item.type);
    return true;
  } catch (err) {
    console.error("restoreTrashItem error:", err);
    return false;
  }
}
