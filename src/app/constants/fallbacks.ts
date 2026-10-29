// Fallback images are disabled.
// If an image is not uploaded or fails to load, UI components display an image error state.
export const IMPACT_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {};

export const STORY_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {};

export const TIMELINE_FALLBACK_IMAGES: Record<string, string> = {};

// The 4 default "Our Impact" home page cards map to a fixed category id.
export const IMPACT_CARD_CATEGORY: Record<string, string> = {
  "women-leadership": "cat_women",
  "education": "cat_education",
  "livelihood": "cat_livelihood",
  "wellbeing": "cat_wellbeing",
};
