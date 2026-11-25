import { useState, useEffect, useRef } from "react";

/** Upsert an entity by matching IDs while removing any duplicate entries. */
export function upsertEntityByIds<T extends { id: string | number }>(
  list: T[],
  matchIds: Array<string | number | null | undefined>,
  updater: (existing: T | undefined) => T | null
): T[] {
  const idSet = new Set(matchIds.filter((v) => v != null && String(v) !== "").map(String));
  const existing = list.find((item) => idSet.has(String(item.id)));
  const replacement = updater(existing);
  if (!replacement) return list;

  let inserted = false;
  const next: T[] = [];
  for (const item of list) {
    if (idSet.has(String(item.id))) {
      if (!inserted) {
        next.push(replacement);
        inserted = true;
      }
      continue;
    }
    next.push(item);
  }
  if (!inserted) {
    next.push(replacement);
  }
  return next;
}

/**
 * Shared state/queue manager for list-based admin editors so async image uploads,
 * concurrent field edits, and temporary-to-DB ID transitions never race or drop data.
 */
export function useSerializedEntityEditor<T extends { id: string }>(
  items: T[],
  onChange: (next: T[] | ((prev: T[]) => T[])) => void
) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ? String(items[0].id) : null);
  const [saving, setSaving] = useState(false);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const idAliasesRef = useRef<Map<string, string>>(new Map());
  const clientKeyMapRef = useRef<Map<string, string>>(new Map());
  const saveQueuesRef = useRef<Map<string, Promise<void>>>(new Map());

  function resolveId(rawId: string | number | null | undefined): string {
    let cur = String(rawId ?? "");
    const seen = new Set<string>();
    while (cur && idAliasesRef.current.has(cur) && !seen.has(cur)) {
      seen.add(cur);
      cur = idAliasesRef.current.get(cur)!;
    }
    return cur;
  }

  function getStableKey(rawId: string | number | null | undefined): string {
    const raw = String(rawId ?? "");
    if (!raw) return "";
    const resolved = resolveId(raw);
    const existing = clientKeyMapRef.current.get(resolved) || clientKeyMapRef.current.get(raw);
    if (existing) {
      clientKeyMapRef.current.set(raw, existing);
      clientKeyMapRef.current.set(resolved, existing);
      return existing;
    }
    clientKeyMapRef.current.set(raw, raw);
    return raw;
  }

  function recordIdMigration(oldIds: string[], savedId: string, stableKey: string) {
    for (const oldId of oldIds) {
      if (oldId && oldId !== savedId) {
        idAliasesRef.current.set(oldId, savedId);
      }
    }
    if (savedId && stableKey) {
      clientKeyMapRef.current.set(savedId, stableKey);
    }
  }

  const resolvedActiveId = activeId ? resolveId(activeId) : null;
  const active =
    items.find(
      (item) =>
        String(item.id) === String(activeId) || (resolvedActiveId !== null && String(item.id) === resolvedActiveId)
    ) ??
    items[0] ??
    null;
  const activeEditorKey = active ? getStableKey(active.id) : "none";

  useEffect(() => {
    if (items.length === 0) return;
    const hasMatch =
      activeId &&
      items.some(
        (item) =>
          String(item.id) === String(activeId) || (resolvedActiveId !== null && String(item.id) === resolvedActiveId)
      );
    if (!hasMatch) {
      setActiveId(String(items[0].id));
    }
  }, [items, activeId, resolvedActiveId]);

  function applyLocalUpdate(matchIds: string[], patch: Partial<T>) {
    const updater = (prev: T[]) =>
      upsertEntityByIds(prev, matchIds, (existing) => (existing ? { ...existing, ...patch } : null));
    itemsRef.current = updater(itemsRef.current);
    onChangeRef.current(updater);
  }

  function applyUpdater(updater: (prev: T[]) => T[]) {
    itemsRef.current = updater(itemsRef.current);
    onChangeRef.current(updater);
  }

  function enqueueTask(targetId: string, runner: (ctx: { canonicalId: string; stableKey: string }) => Promise<void>) {
    const stableKey = getStableKey(targetId);
    const prevQueue = saveQueuesRef.current.get(stableKey) || Promise.resolve();
    const task = prevQueue
      .catch(() => {})
      .then(() => runner({ canonicalId: resolveId(targetId), stableKey }));
    saveQueuesRef.current.set(stableKey, task);
    return task;
  }

  return {
    active,
    activeId,
    setActiveId,
    activeEditorKey,
    saving,
    setSaving,
    itemsRef,
    activeIdRef,
    clientKeyMapRef,
    resolveId,
    getStableKey,
    recordIdMigration,
    applyLocalUpdate,
    applyUpdater,
    enqueueTask,
  };
}
