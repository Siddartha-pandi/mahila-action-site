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
  const filtered = posts.filter((p) => p.section === section);
  const [activeId, setActiveId] = useState<string | null>(filtered[0]?.id ?? null);
  const active = posts.find((p) => p.id === activeId) ?? null;
  const usesCategories = section === "story" || section === "impact";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  function update(patch: Partial<BlogPost>) {
    if (!active) return;
    onChange(posts.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  }

  function handleAdd() {
    const post = newBlogPost(section, usesCategories ? categories[0]?.id ?? null : null);
    onChange([...posts, post]);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    await deleteBlogPost(id);
    const next = posts.filter((p) => p.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next.filter((p) => p.section === section)[0]?.id ?? null);
    toast.success(`${sectionNoun} deleted successfully.`);
  }

  async function handleSave() {
    if (!active) return;
    await saveBlogPost(active);
    toast.success(`${sectionNoun} saved and published!`);
  }

  return (
    <AdminListEditor
      items={filtered}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={section === "impact" ? undefined : handleAdd}
      onDelete={section === "impact" ? undefined : handleDelete}
      itemLabel={(p) => p.title}
      itemSubLabel={(p) => (usesCategories ? categories.find((c) => c.id === p.categoryId)?.name ?? "Uncategorized" : new Date(p.createdAt).toLocaleDateString())}
      addLabel={section === "story" ? "Add New Story" : section === "impact" ? undefined : "Add New Event Blog"}
      emptyLabel="Nothing here yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a post to edit it.</p>
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
