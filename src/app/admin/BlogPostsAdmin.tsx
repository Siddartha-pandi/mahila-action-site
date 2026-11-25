import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Globe, EyeOff } from "lucide-react";
import { AdminListEditor, GalleryField, ImageField, TagsField, inputBase, labelBase } from "../adminWidgets";
import { BlogContentEditor } from "../BlogContentEditor";
import { BlogPost, Category, newBlogPost, saveBlogPost, deleteBlogPost, findCategory } from "../../lib/data";
import { getCurrentAdminSession, hasPermission, AdminModule } from "../../lib/permissions";

/** Replace matching blog post(s) cleanly and eliminate duplicate IDs. */
function upsertBlogPostInList(
  list: BlogPost[],
  matchIds: string[],
  updater: (existing: BlogPost | undefined) => BlogPost | null
): BlogPost[] {
  const idSet = new Set(matchIds.filter(Boolean).map(String));
  const existing = list.find((p) => idSet.has(String(p.id)));
  const replacement = updater(existing);
  if (!replacement) return list;

  let inserted = false;
  const next: BlogPost[] = [];
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

export function BlogPostsAdmin({
  section,
  posts,
  categories,
  onChange,
}: {
  section: "story" | "event" | "impact";
  posts: BlogPost[];
  categories: Category[];
  onChange: (next: BlogPost[] | ((prev: BlogPost[]) => BlogPost[])) => void;
}) {
  const filtered = posts.filter((p) => p.section === section);
  const [activeId, setActiveId] = useState<string | null>(filtered[0]?.id ? String(filtered[0].id) : null);
  const [saving, setSaving] = useState(false);

  const postsRef = useRef(posts);
  postsRef.current = posts;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Map temporary client IDs ("post_...") to persisted numeric DB IDs so concurrent edits/saves never fork.
  const idAliasesRef = useRef<Map<string, string>>(new Map());
  // Keep widget & rich-editor React keys stable across temp-to-DB ID migration while remounting on post switch.
  const clientKeyMapRef = useRef<Map<string, string>>(new Map());
  // Serialize persist operations per post so cover/gallery auto-saves and explicit Save clicks cannot race.
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

  const resolvedActiveId = activeId ? resolveId(activeId) : null;
  const active =
    posts.find(
      (p) =>
        p.section === section &&
        (String(p.id) === String(activeId) || (resolvedActiveId && String(p.id) === resolvedActiveId))
    ) ??
    filtered[0] ??
    null;
  const activeEditorKey = active ? getStableKey(active.id) : "none";

  const usesCategories = section === "story" || section === "impact" || section === "event";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  const moduleKey: AdminModule = section === "story" ? "stories" : section === "impact" ? "impactStories" : "eventsBlog";
  const session = getCurrentAdminSession();
  const canEdit = hasPermission(session, moduleKey, "edit");
  const canDelete = hasPermission(session, moduleKey, "delete");

  useEffect(() => {
    if (filtered.length === 0) return;
    const hasMatch =
      activeId &&
      filtered.some(
        (p) => String(p.id) === String(activeId) || (resolvedActiveId && String(p.id) === resolvedActiveId)
      );
    if (!hasMatch) {
      setActiveId(String(filtered[0].id));
    }
  }, [filtered, activeId, resolvedActiveId]);

  function applyLocalUpdate(matchIds: string[], patch: Partial<BlogPost>) {
    const updater = (prev: BlogPost[]) =>
      upsertBlogPostInList(prev, matchIds, (existing) => (existing ? { ...existing, ...patch } : null));
    postsRef.current = updater(postsRef.current);
    onChangeRef.current(updater);
  }

  function enqueuePersist(
    targetId: string,
    options: {
      forcePublished?: boolean;
      mode: "auto" | "explicit" | "publish";
    }
  ): Promise<void> {
    const stableKey = getStableKey(targetId);
    const prevQueue = saveQueuesRef.current.get(stableKey) || Promise.resolve();

    const task = prevQueue
      .catch(() => {})
      .then(async () => {
        const canonicalId = resolveId(targetId);
        const matchIds = [targetId, canonicalId];
        const latest = postsRef.current.find((p) => matchIds.includes(String(p.id)));
        if (!latest) return;

        const payload: BlogPost = {
          ...latest,
          id: canonicalId,
          ...(options.forcePublished !== undefined ? { published: options.forcePublished } : {}),
        };

        if (!payload.title?.trim()) {
          if (options.mode !== "auto") {
            toast.error(`Please enter a title for the ${sectionNoun.toLowerCase()}.`);
          }
          return;
        }

        if (options.mode !== "auto") {
          setSaving(true);
        }

        try {
          const res = await saveBlogPost(payload);
          if (res.ok) {
            const savedId = String(res.id || payload.id);
            if (savedId !== canonicalId || savedId !== targetId) {
              idAliasesRef.current.set(targetId, savedId);
              idAliasesRef.current.set(canonicalId, savedId);
              clientKeyMapRef.current.set(savedId, stableKey);
            }

            const serverPost = res.post;
            const mergeIds = [targetId, canonicalId, savedId];
            const updater = (prev: BlogPost[]) =>
              upsertBlogPostInList(prev, mergeIds, (cur) => {
                const current = cur || payload;
                return {
                  ...current,
                  id: savedId,
                  coverImage:
                    current.coverImage === payload.coverImage
                      ? (serverPost?.coverImage ?? current.coverImage)
                      : current.coverImage,
                  gallery:
                    JSON.stringify(current.gallery ?? []) === JSON.stringify(payload.gallery ?? [])
                      ? (serverPost?.gallery ?? current.gallery)
                      : current.gallery,
                  categoryId:
                    current.categoryId === payload.categoryId && serverPost?.categoryId !== undefined
                      ? serverPost.categoryId
                      : current.categoryId,
                  published:
                    current.published === payload.published && serverPost?.published !== undefined
                      ? serverPost.published
                      : current.published,
                  createdAt: serverPost?.createdAt || current.createdAt,
                };
              });

            postsRef.current = updater(postsRef.current);
            onChangeRef.current(updater);

            if (mergeIds.includes(String(activeIdRef.current ?? ""))) {
              setActiveId(savedId);
            }

            const isPub = payload.published !== false;
            if (options.mode === "explicit") {
              toast.success(`${sectionNoun} saved as ${isPub ? "Published (Live)" : "Draft"}!`);
            } else if (options.mode === "publish") {
              if (isPub) {
                toast.success(`"${payload.title}" is now Published and live on the website!`);
              } else {
                toast.success(`"${payload.title}" is now Unpublished (Draft) and hidden from the website.`);
              }
            }
          } else {
            toast.error(
              res.error ||
                (options.mode === "publish"
                  ? "Failed to update publish status."
                  : `Failed to save ${sectionNoun.toLowerCase()}.`)
            );
          }
        } catch (err: any) {
          toast.error(err?.message || `Failed to save ${sectionNoun.toLowerCase()}.`);
        } finally {
          if (options.mode !== "auto") {
            setSaving(false);
          }
        }
      });

    saveQueuesRef.current.set(stableKey, task);
    return task;
  }

  async function update(patch: Partial<BlogPost>, autoPersist = false) {
    if (!canEdit) return toast.error(`Permission denied: EDIT rights required for ${sectionNoun}.`);
    if (!active) return;
    const rawId = String(active.id);
    const canonicalId = resolveId(rawId);
    applyLocalUpdate([rawId, canonicalId], patch);

    if (autoPersist && (patch.title !== undefined ? patch.title : active.title)?.trim()) {
      await enqueuePersist(canonicalId || rawId, { mode: "auto" });
    }
  }

  function handleAdd() {
    if (!canEdit) return toast.error(`Permission denied: EDIT rights required to create a new ${sectionNoun.toLowerCase()}.`);
    const post = newBlogPost(section, section === "event" ? null : usesCategories ? categories[0]?.id ?? null : null);
    clientKeyMapRef.current.set(post.id, post.id);
    const updater = (prev: BlogPost[]) => [...prev, post];
    postsRef.current = updater(postsRef.current);
    onChangeRef.current(updater);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    if (!canDelete) return toast.error(`Permission denied: DELETE rights required for ${sectionNoun}.`);
    const canonicalId = resolveId(id);
    const removeIds = new Set([String(id), canonicalId]);
    await deleteBlogPost(canonicalId);
    const updater = (prev: BlogPost[]) => prev.filter((p) => !removeIds.has(String(p.id)));
    const next = updater(postsRef.current);
    postsRef.current = next;
    onChangeRef.current(updater);
    if (removeIds.has(String(activeIdRef.current ?? ""))) {
      const firstRemaining = next.find((p) => p.section === section);
      setActiveId(firstRemaining?.id ? String(firstRemaining.id) : null);
    }
    toast.success(`${sectionNoun} deleted successfully.`);
  }

  async function handleTogglePublish(targetPost?: BlogPost) {
    if (!canEdit) return toast.error(`Permission denied: EDIT rights required to change publish status.`);
    const post = targetPost || active;
    if (!post) return;
    const rawId = String(post.id);
    const canonicalId = resolveId(rawId);
    const nextPublished = post.published === false;
    applyLocalUpdate([rawId, canonicalId], { published: nextPublished });
    await enqueuePersist(canonicalId || rawId, { forcePublished: nextPublished, mode: "publish" });
  }

  async function handleSave(forcePublished?: boolean) {
    if (!canEdit) return toast.error(`Permission denied: EDIT rights required to save ${sectionNoun.toLowerCase()}.`);
    if (!active) return;
    const rawId = String(active.id);
    const canonicalId = resolveId(rawId);
    if (forcePublished !== undefined) {
      applyLocalUpdate([rawId, canonicalId], { published: forcePublished });
    }
    await enqueuePersist(canonicalId || rawId, { forcePublished, mode: "explicit" });
  }

  return (
    <AdminListEditor
      items={filtered}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={canEdit ? handleAdd : undefined}
      onDelete={canDelete ? handleDelete : undefined}
      itemLabel={(p) => p.title}
      itemSubLabel={(p) => {
        let catName = usesCategories ? findCategory(categories, p.categoryId)?.name : null;
        if (!catName && p.section === "impact") {
          const lower = (p.title || "").toLowerCase();
          if (lower.includes("women") || lower.includes("leadership") || String(p.id) === "7") catName = "Women & Leadership";
          else if (lower.includes("education") || lower.includes("learning") || String(p.id) === "8") catName = "Education & Learning";
          else if (lower.includes("economic") || lower.includes("livelihood") || lower.includes("skills") || String(p.id) === "9") catName = "Livelihood & Skills";
          else if (lower.includes("health") || lower.includes("wellbeing") || lower.includes("dignity") || String(p.id) === "10") catName = "Community Wellbeing";
        }
        const catLabel = catName ?? "Uncategorized";
        const parsedDate = p.createdAt ? new Date(p.createdAt) : null;
        const dateStr = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString() : "";
        const catOrDate =
          p.section === "event"
            ? (dateStr ? `${catLabel} • ${dateStr}` : catLabel)
            : usesCategories
            ? catLabel
            : dateStr;
        return `${p.published === false ? "⚠️ [Draft] • " : "🟢 "}${catOrDate}`;
      }}
      itemAction={(p) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePublish(p);
          }}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
            p.published !== false
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
          }`}
          title={p.published !== false ? "Live on website. Click to unpublish." : "Draft. Click to publish."}
        >
          {p.published !== false ? <Globe size={11} className="text-emerald-600" /> : <EyeOff size={11} className="text-amber-600" />}
          <span>{p.published !== false ? "Live" : "Draft"}</span>
        </button>
      )}
      addLabel={section === "story" ? "Add New Story" : section === "impact" ? "Add New Impact Story" : "Add New Event Blog"}
      emptyLabel="Nothing here yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a post to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[640px]">
          {/* Publication Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#a65a4a]/20 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full shrink-0 ${
                  active.published !== false
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#1e1e1e]">
                    {active.published !== false ? "Published & Live" : "Draft (Unpublished)"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      active.published !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {active.published !== false ? "Live on Web" : "Draft"}
                  </span>
                </div>
                <p className="font-['Inter',sans-serif] text-[11px] text-[#1e1e1e]/55 mt-0.5">
                  {active.published !== false
                    ? "Visible to public visitors across stories, homepage, and blogs."
                    : "Hidden from public visitors. Only visible to administrators in CMS."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {active.published !== false ? (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(active)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Unpublish this post to hide it from visitors"
                >
                  <EyeOff size={14} className="text-amber-600" />
                  <span>Unpublish (Draft)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(active)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
                  title="Publish this post to make it live for visitors"
                >
                  <Globe size={14} />
                  <span>Publish Post</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={labelBase}>Title</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
          </div>
          {usesCategories && (
            <div>
              <label className={labelBase}>Category</label>
              <select
                value={findCategory(categories, active.categoryId)?.id ?? (active.categoryId ? String(active.categoryId) : "")}
                onChange={(e) => update({ categoryId: e.target.value || null })}
                className={`${inputBase} cursor-pointer`}
              >
                <option value="">
                  {section === "impact"
                    ? "Select Impact Category"
                    : section === "event"
                    ? "No category (General)"
                    : "Select a Category"}
                </option>
                {categories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelBase}>Card Excerpt (shown on the card, keep it short)</label>
            <textarea value={active.excerpt} onChange={(e) => update({ excerpt: e.target.value })} rows={2} className={`${inputBase} resize-y`} />
          </div>
          <TagsField key={`tags-${activeEditorKey}`} label="Tags" value={active.tags ?? []} onChange={(v) => update({ tags: v })} />
          <ImageField key={`cover-${activeEditorKey}`} label="Cover Image" value={active.coverImage} onChange={(v) => update({ coverImage: v }, true)} title={active.title} />
          <div>
            <label className={labelBase}>Full {section === "impact" ? "Page" : "Blog"} Content</label>
            <BlogContentEditor key={`content-${activeEditorKey}`} value={active.content} onChange={(html) => update({ content: html })} />
          </div>
          <GalleryField key={`gallery-${activeEditorKey}`} label="Gallery Images (optional — add as many as you like)" value={active.gallery} onChange={(v) => update({ gallery: v }, true)} title={active.title} />
          {section === "event" && (
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 leading-relaxed">
              On the Events Blog reader, visitors can page between posts using Previous / Next, right below the gallery
              (only shown when a gallery is present).
            </p>
          )}
          {section === "impact" && (
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 leading-relaxed">
              This is the page visitors see when they hover an "Our Impact" card on the homepage and click "Read Story".
              There are always exactly 4 of these, matching the 4 homepage cards — they can be edited and updated here,
              but not added or removed. To keep the cards linked correctly, don't change the category assignment above.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!canEdit || saving}
              className="bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : active.published !== false ? "Save Changes" : "Save as Draft"}
            </button>

            {active.published === false ? (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={!canEdit || saving}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Globe size={15} />
                <span>{saving ? "Saving..." : "Publish & Save"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={!canEdit || saving}
                className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-300 font-['Inter',sans-serif] font-semibold text-[13px] px-5 py-2.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <EyeOff size={14} className="text-amber-700" />
                <span>{saving ? "Saving..." : "Unpublish (Move to Draft)"}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </AdminListEditor>
  );
}
