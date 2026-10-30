// Fallback images are disabled.
// If an image is not uploaded or fails to load, UI components display an image error state.
export const IMPACT_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {};

export const STORY_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {};

export const TIMELINE_FALLBACK_IMAGES: Record<string, string> = {};

// The 4 default "Our Impact" home page cards map to a fixed category id.
export const IMPACT_CARD_CATEGORY: Record<string, string> = {
  "women-leadership": "1",
  "education": "2",
  "livelihood": "3",
  "wellbeing": "4",
  cat_women: "1",
  cat_education: "2",
  cat_livelihood: "3",
  cat_wellbeing: "4",
};
