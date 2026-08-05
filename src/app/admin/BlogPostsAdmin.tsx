import { useState, useEffect } from "react";
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
  const usesCategories = section === "story" || section === "impact";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  const buildUiItems = (): BlogPost[] => {
    if (section !== "impact") {
      return posts.filter((p) => p.section === section);
    }

    const existingImpacts = posts.filter((p) => p.section === "impact");
    return categories.map((cat) => {
      const found = existingImpacts.find((p) => p.categoryId === cat.id);
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
  };

  const [uiItems, setUiItems] = useState<BlogPost[]>(buildUiItems);
  const [activeId, setActiveId] = useState<string | null>(uiItems[0]?.id ?? null);

  useEffect(() => {
    const items = buildUiItems();
    setUiItems(items);
    if (!items.find((item) => item.id === activeId)) {
      setActiveId(items[0]?.id ?? null);
    }
  }, [posts, categories, section]);

  const active = uiItems.find((p) => p.id === activeId) ?? uiItems[0] ?? null;

  const update = (patch: Partial<BlogPost>) => {
    if (!active) return;
    setUiItems((current) => current.map((item) => (item.id === active.id ? { ...item, ...patch } : item)));
  };

  function handleAdd() {
    if (section === "impact") return;
    const post = newBlogPost(section, usesCategories ? categories[0]?.id ?? null : null);
    onChange([...posts, post]);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    if (section === "impact" && id.startsWith("imp_cat_")) {
      const catId = id.replace(/^imp_cat_/, "");
      const next = posts.filter((p) => !(p.section === "impact" && p.categoryId === catId));
      onChange(next);
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
    const ok = await saveBlogPost(active);

    const updatedPosts = posts.filter((p) => p.section !== "impact");
    const updatedImpactPosts = uiItems
      .map((item) => {
        const existingPost = posts.find((p) => p.id === item.id || (p.section === "impact" && p.categoryId === item.categoryId));
        return existingPost ? { ...existingPost, ...item } : item;
      })
      .filter((item) => item.section === "impact");

    onChange([...updatedPosts, ...updatedImpactPosts]);

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
              Each category gets one editable impact page via this panel — new categories added in the Categories section
              will automatically appear here as editable slots. Don't change the category assignment above unless you want
              to move the page to a different impact category.
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
