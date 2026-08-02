import {
  getSrc,
  imgContextBanner,
  imgGal1,
  imgGal2,
  imgGal3,
  imgImpact1,
  imgImpact2,
  imgImpact3,
  imgImpact4,
  imgStory1,
  imgStory2,
  imgStory3,
  imgEvent,
  imgTakeAction,
} from "./images";

// Fallback banner/gallery images for the 4 default "Our Impact" pages, used only
// when the admin hasn't set a cover image / gallery for that impact post yet.
export const IMPACT_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {
  "women-leadership": { banner: getSrc(imgContextBanner), gallery: [getSrc(imgGal1), getSrc(imgGal2), getSrc(imgGal3), getSrc(imgImpact1), getSrc(imgStory1)] },
  "education": { banner: getSrc(imgImpact2), gallery: [getSrc(imgGal2), getSrc(imgGal3), getSrc(imgGal1), getSrc(imgImpact2), getSrc(imgStory2)] },
  "livelihood": { banner: getSrc(imgImpact3), gallery: [getSrc(imgGal3), getSrc(imgGal1), getSrc(imgGal2), getSrc(imgImpact3), getSrc(imgStory3)] },
  "wellbeing": { banner: getSrc(imgImpact4), gallery: [getSrc(imgGal1), getSrc(imgGal3), getSrc(imgGal2), getSrc(imgImpact4), getSrc(imgStory1)] },
};

// Fallback banner/gallery images for the default "Our Stories" posts.
export const STORY_FALLBACK_IMAGES: Record<string, { banner: string; gallery: string[] }> = {
  "story_she_found_voice": { banner: getSrc(imgStory1), gallery: [getSrc(imgGal1), getSrc(imgGal2), getSrc(imgGal3), getSrc(imgImpact1)] },
  "story_new_dawn_priya": { banner: getSrc(imgStory2), gallery: [getSrc(imgGal2), getSrc(imgGal3), getSrc(imgGal1), getSrc(imgImpact2)] },
  "story_building_futures": { banner: getSrc(imgStory3), gallery: [getSrc(imgGal3), getSrc(imgGal1), getSrc(imgGal2), getSrc(imgImpact3)] },
  "story_health_all": { banner: getSrc(imgImpact4), gallery: [getSrc(imgGal1), getSrc(imgGal3), getSrc(imgGal2), getSrc(imgStory1)] },
  "story_first_sarpanch": { banner: getSrc(imgContextBanner), gallery: [getSrc(imgGal2), getSrc(imgGal1), getSrc(imgGal3), getSrc(imgStory2)] },
  "story_breaking_cycle": { banner: getSrc(imgImpact1), gallery: [getSrc(imgGal3), getSrc(imgGal2), getSrc(imgGal1), getSrc(imgStory3)] },
};

// Fallback image for each of the 6 default Impact Timeline chips.
export const TIMELINE_FALLBACK_IMAGES: Record<string, string> = {
  "tl_1995": getSrc(imgEvent),
  "tl_2002": getSrc(imgImpact2),
  "tl_2009": getSrc(imgImpact1),
  "tl_2016": getSrc(imgImpact3),
  "tl_2021": getSrc(imgGal2),
  "tl_2026": getSrc(imgTakeAction),
};

// The 4 default "Our Impact" home page cards map to a fixed category id.
export const IMPACT_CARD_CATEGORY: Record<string, string> = {
  "women-leadership": "cat_women",
  "education": "cat_education",
  "livelihood": "cat_livelihood",
  "wellbeing": "cat_wellbeing",
};
