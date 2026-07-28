// ── Image imports from design assets ──────────────────────────────────────
import _imgLogo from "@/imports/Concept2Home/9d095694bb05f68181e7700b7124281eb76c32ec.png";
import _imgHeroCard from "@/imports/Concept2Home/574a812d0534a3409e7d3ed51ab995ae09ecd87a.png";
import _imgHeroMain from "@/imports/Concept2Home/4ee3403c1c1f677ea9374f8484c6313c017d1716.png";
import _imgHeroSide from "@/imports/Concept2Home/acf2f9e42e364c8ee9e324fb3c6d06a0a7d96de4.png";
import _imgImpact1 from "@/imports/Concept2Home/207f7c7263e14103baf5c0de63b15703fa9a8f0f.png";
import _imgImpact2 from "@/imports/Concept2Home/aa46b6c282e301c3380b3a4d31e5ab88cc44c53a.png";
import _imgImpact3 from "@/imports/Concept2Home/f28b554308160cb557d229aae64de1b275d2a425.png";
import _imgImpact4 from "@/imports/Concept2Home/de694d5098550aee3d3b0432e1a2a521925c2237.png";
import _imgEvent from "@/imports/Concept2Home/39242dfa2d4add5f76889c42da60d903f880be6f.png";
import _imgStory1 from "@/imports/Concept2Home/788d28db62c65b5f55d746c307e794795661454c.png";
import _imgStory2 from "@/imports/Concept2Home/b52b755f8d429ab1b616fa86054c8530f2afc2a1.png";
import _imgStory3 from "@/imports/Concept2Home/d4c160441601d59ba0b0f336d73394c0932d78d5.png";
import _imgTakeAction from "@/imports/Concept2Home/6bd40b4d49b728881886868554ea429eeb0d2e01.png";
import _imgHeroBackground from "@/imports/Concept2Home/9baa8187a2a80817e17111956702e6ca42b952ad.png";
import _imgAboutBanner from "@/imports/Concept2WhoWeAre/2d1b5465a5dfdae07df9d30b92aa1a1930398a6c.png";
import heroSvg from "@/imports/Concept2Home-1/svg-664soetde0";
import _imgDonateBanner from "@/imports/Concept2OurStories-1/61a25ebae5fc11149647a322766e8dc9b88b32ef.png";
import _imgContextBanner from "@/imports/OurImpactContext/3970bc7fdf4596cd43d76a5d0ccbcee6dcea96f4.png";
import statsSvg from "@/imports/Stats/svg-gzhi309knq";
import _imgGal1 from "@/imports/OurImpactContext/7b58b11459d66003eec9a212bdbdee039f5c987a.png";
import _imgGal2 from "@/imports/OurImpactContext/38021a4b2f63e6bac08244a7b1ff6424951cf374.png";
import _imgGal3 from "@/imports/OurImpactContext/2e8ff5608927ddd34602e508ea3a00685c3938da.png";
import svgWho from "@/imports/Concept2WhoWeAre/svg-6fcsh0az5g";

const toSrc = (img: any): string => (typeof img === "string" ? img : img?.src || "");

export const imgLogo = toSrc(_imgLogo);
export const imgHeroCard = toSrc(_imgHeroCard);
export const imgHeroMain = toSrc(_imgHeroMain);
export const imgHeroSide = toSrc(_imgHeroSide);
export const imgImpact1 = toSrc(_imgImpact1);
export const imgImpact2 = toSrc(_imgImpact2);
export const imgImpact3 = toSrc(_imgImpact3);
export const imgImpact4 = toSrc(_imgImpact4);
export const imgEvent = toSrc(_imgEvent);
export const imgStory1 = toSrc(_imgStory1);
export const imgStory2 = toSrc(_imgStory2);
export const imgStory3 = toSrc(_imgStory3);
export const imgTakeAction = toSrc(_imgTakeAction);
export const imgHeroBackground = toSrc(_imgHeroBackground);
export const imgAboutBanner = toSrc(_imgAboutBanner);
export const imgDonateBanner = toSrc(_imgDonateBanner);
export const imgContextBanner = toSrc(_imgContextBanner);
export const imgGal1 = toSrc(_imgGal1);
export const imgGal2 = toSrc(_imgGal2);
export const imgGal3 = toSrc(_imgGal3);

export { heroSvg, statsSvg, svgWho };

export const getSrc = (img: any): string => (typeof img === "string" ? img : img?.src || "");
