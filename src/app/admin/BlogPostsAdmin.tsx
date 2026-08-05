import { useState } from "react";
import { toast } from "sonner";
import { AdminListEditor, GalleryField, ImageField, TagsField, inputBase, labelBase } from "../adminWidgets";
import { BlogContentEditor } from "../BlogContentEditor";
import { BlogPost, Category, newBlogPost, saveBlogPost, deleteBlogPost } from "../../lib/data";

export function BlogPostsAdmin({
  section,
  posts,
  categories,
  onChange,
}: {
  section: "story" | "event" | "impact";
  posts: BlogPost[];
  categories: Category[];
  onChange: (next: BlogPost[]) => void;
}) {
  // For non-impact sections we keep the existing behavior. For the Impact section
  // we show one editable slot per category. If a category has an authored impact
  // post (section === 'impact' && categoryId matches) we show that post; otherwise
  // we expose a placeholder editable slot so admins can edit the impact page for
  // that category without being able to add arbitrary new impact pages.
  const usesCategories = section === "story" || section === "impact";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  // Build a working list for the UI. For impact section, ensure exactly one
  // entry per category so new categories become editable here automatically.
  const uiItems: BlogPost[] =
    section !== "impact"
      ? posts.filter((p) => p.section === section)
      : (() => {
          const existing = posts.filter((p) => p.section === "impact");
          return categories.map((cat) => {
            const found = existing.find((p) => p.categoryId === cat.id);
            if (found) return found;
            return {
              id: `imp_cat_${cat.id}`,
              section: "impact",
              categoryId: cat.id,
              title: cat.name,
              excerpt: "",
              content: "",
              coverImage: "",
              gallery: [],
              tags: [],
              createdAt: new Date().toISOString(),
            } as BlogPost;
          });
        })();

  const [activeId, setActiveId] = useState<string | null>(uiItems[0]?.id ?? null);

  // The active item is taken from the uiItems list (which may include placeholders)
  const active = uiItems.find((p) => p.id === activeId) ?? null;

  // Local update helper that updates the UI list and also writes back to the
  // persisted posts array when saving. Updates to placeholders only change the
  // local UI until the admin clicks Save Post.
  const update = (patch: Partial<BlogPost>) => {
    if (!active) return;
    const next = uiItems.map((p) => (p.id === active.id ? { ...p, ...patch } : p));
    // Reflect UI changes in-memory by setting activeId to force a re-render.
    // We intentionally do NOT call onChange here — changes are saved when the
    // admin clicks "Save Post" which will persist and notify the parent.
    setActiveId((id) => (id === active.id ? active.id : id));

    // Replace uiItems in place by mutating (small local update) — the component
    // reads uiItems anew each render so we don't keep a separate state for it.
    // To keep things simple, write-through happens on Save.
    // NOTE: Nothing else to do here.
  };

  function handleAdd() {
    // For impact pages adding is disabled — we create placeholders automatically
    // from categories. For other sections, keep existing add behaviour.
    if (section === "impact") return;
    const post = newBlogPost(section, usesCategories ? categories[0]?.id ?? null : null);
    onChange([...posts, post]);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    // If the ID looks synthetic (imp_cat_) we treat it as an empty placeholder
    // and simply clear its content by saving a post-less state (no-op) or we
    // could delete an authored post.
    if (id.startsWith("imp_cat_")) {
      // Deleting a placeholder isn't meaningful — convert it to an empty post
      // (no server call) and update UI by removing any authored post with the
      // same category if present.
      const catId = id.replace(/^imp_cat_/, "");
      const next = posts.filter((p) => !(p.section === "impact" && p.categoryId === catId));
      onChange(next);
      if (activeId === id) setActiveId(next.filter((p) => p.section === section)[0]?.id ?? null);
      toast.success(`${sectionNoun} updated.`);
      return;
    }

    const ok = await deleteBlogPost(id);
    if (!ok) return toast.error(`Couldn't delete this ${sectionNoun.toLowerCase()} — please try again.`);
    const next = posts.filter((p) => p.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next.filter((p) => p.section === section)[0]?.id ?? null);
    toast.success(`${sectionNoun} deleted successfully.`);
  }

  async function handleSave() {
    if (!active) return;

    // Persist the active item. If it's a placeholder id (imp_cat_{catId}) we
    // will save it as-is — saveBlogPost will append it to blogPosts if needed.
    const ok = await saveBlogPost(active);

    // After persisting, ensure the parent is notified with the updated posts
    // list so the admin panel and other pages reflect the change immediately.
    const nonImpact = posts.filter((p) => p.section !== "impact");

    // Build the updated impact posts list from UI items / existing posts.
    // Start with existing authored impact posts (overwritten by any active edits),
    // then include placeholders that were saved (they now exist in storage via saveBlogPost).
    const updatedImpact = uiItems.map((ui) => {
      // If ui.id corresponds to an authored post in `posts`, prefer that record
      const found = posts.find((p) => p.id === ui.id || (p.section === "impact" && p.categoryId === ui.categoryId));
      return found ? { ...found, ...ui } : ui;
    });

    const next = [...nonImpact, ...updatedImpact];
    onChange(next);

    if (ok) toast.success(`${sectionNoun} saved and published!`);
    else toast.error(`Save failed — changes were NOT stored. Check the console (F12) for details.`);
  }

  return (
    <AdminListEditor
      items={uiItems}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={section === 'impact' ? undefined : handleAdd}
      onDelete={handleDelete}
      itemLabel={(p) => p.title}
      itemSubLabel={(p) => (usesCategories ? categories.find((c) => c.id === p.categoryId)?.name ?? "Uncategorized" : new Date(p.createdAt).toLocaleDateString())}
      addLabel={section === "story" ? "Add New Story" : section === "impact" ? "Edit Impact Pages" : "Add New Event Blog"}
      emptyLabel="Nothing here yet."
    >

      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select a category to edit its impact page.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[640px]">
          <div>
            <label className={labelBase}>Title</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
          </div>
          {usesCategories && (
            <div>
              <label className={labelBase}>Category</label>
              <select value={active.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })} className={`${inputBase} cursor-pointer`}>
                {categories.length === 0 && <option value="">No categories yet</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelBase}>Card Excerpt (shown on the card, keep it short)</label>
            <textarea value={active.excerpt} onChange={(e) => update({ excerpt: e.target.value })} rows={2} className={`${inputBase} resize-y`} />
          </div>
          <TagsField label="Tags" value={active.tags ?? []} onChange={(v) => update({ tags: v })} />
          <ImageField label="Cover Image" value={active.coverImage} onChange={(v) => update({ coverImage: v })} />
          <div>
            <label className={labelBase}>Full {section === "impact" ? "Page" : "Blog"} Content</label>
            <BlogContentEditor key={active.id} value={active.content} onChange={(html) => update({ content: html })} />
          </div>
          <GalleryField label="Gallery Images (optional — add as many as you like)" value={active.gallery} onChange={(v) => update({ gallery: v })} />
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
          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Post
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
