export type TrashType = "event" | "story" | "category" | "councilor" | "timeline";

export interface TrashItem {
  id: string;
  originalType: TrashType;
  typeLabel: string;
  title: string;
  deletedAt: string;
  data: any;
}

const RECYCLE_BIN_KEY = "mahila_admin_recycle_bin_v1";

const TYPE_LABELS: Record<TrashType, string> = {
  event: "Upcoming Event",
  story: "Community Story / Post",
  category: "Story Category",
  councilor: "Councilor Profile",
  timeline: "Timeline Milestone",
};

export function getRecycleBinItems(): TrashItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECYCLE_BIN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecycleBinItems(items: TrashItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("mahila_recycle_bin_changed"));
  } catch (err) {
    console.error("Failed to save recycle bin items:", err);
  }
}

export function moveToRecycleBin(type: TrashType, title: string, data: any): TrashItem {
  const items = getRecycleBinItems();
  const newItem: TrashItem = {
    id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    originalType: type,
    typeLabel: TYPE_LABELS[type] || "Content Item",
    title: title || "Untitled Item",
    deletedAt: new Date().toISOString(),
    data,
  };
  const updated = [newItem, ...items];
  saveRecycleBinItems(updated);
  return newItem;
}

export function restoreFromRecycleBin(id: string): TrashItem | null {
  const items = getRecycleBinItems();
  const target = items.find(i => i.id === id);
  if (!target) return null;
  const remaining = items.filter(i => i.id !== id);
  saveRecycleBinItems(remaining);
  return target;
}

export function permanentlyDeleteFromRecycleBin(id: string) {
  const items = getRecycleBinItems();
  const remaining = items.filter(i => i.id !== id);
  saveRecycleBinItems(remaining);
}

export function emptyRecycleBin() {
  saveRecycleBinItems([]);
}
