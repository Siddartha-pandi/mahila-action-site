import svgPaths from "./svg-6fcsh0az5g";
import _imgBannerSection from "./2d1b5465a5dfdae07df9d30b92aa1a1930398a6c.png";
import _imgTakeActionImage from "./6bd40b4d49b728881886868554ea429eeb0d2e01.png";
import _imgStoryImage from "./788d28db62c65b5f55d746c307e794795661454c.png";
import _imgEventImage from "./39242dfa2d4add5f76889c42da60d903f880be6f.png";
import _imgLogo from "./9d095694bb05f68181e7700b7124281eb76c32ec.png";

const toSrc = (img: any): string => (typeof img === "string" ? img : img?.src || "");
const imgBannerSection = toSrc(_imgBannerSection);
const imgTakeActionImage = toSrc(_imgTakeActionImage);
const imgStoryImage = toSrc(_imgStoryImage);
const imgEventImage = toSrc(_imgEventImage);
const imgLogo = toSrc(_imgLogo);

function BannerSection() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-0 overflow-clip px-[485px] py-[245px] top-[101px]" data-name="Banner Section">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 overflow-hidden">
          <img alt="" className="absolute h-[191.47%] left-0 max-w-none top-[-28.32%] w-full" src={imgBannerSection} />
        </div>
        <div className="absolute bg-[rgba(0,0,0,0.45)] inset-0" />
      </div>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Fraunces:Regular',sans-serif] font-normal leading-[90px] relative shrink-0 text-[#f4efe7] text-[96px] text-center whitespace-nowrap" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Who Are We
      </p>
    </div>
  );
}

function MissionDescription() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] items-start justify-center relative shrink-0 w-full" data-name="Mission Description">
      <p className="capitalize font-['Fraunces:Regular',sans-serif] leading-[normal] relative shrink-0 text-[48px] w-full" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Self-Led Sustainable Transformation
      </p>
      <div className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] font-['Inter:Regular',sans-serif] leading-[0] not-italic opacity-85 relative shrink-0 text-[20px] tracking-[-0.4px] w-full whitespace-pre-wrap">
        <p className="leading-[1.8] mb-0">Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders – not passive beneficiaries.</p>
        <p className="leading-[1.8] mb-0">​</p>
        <p className="leading-[1.8]">By building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.</p>
      </div>
    </div>
  );
}

function MissionContent() {
  return (
    <div className="[word-break:break-word] bg-[#a65a4a] content-stretch flex flex-col font-normal items-start justify-center px-[30px] py-[50px] relative rounded-[20px] shrink-0 text-[#f4efe7] w-[585px]" data-name="Mission Content">
      <p className="font-['Inter:Regular',sans-serif] leading-[40px] not-italic relative shrink-0 text-[15px] whitespace-nowrap">Our Mission</p>
      <MissionDescription />
    </div>
  );
}

function MissionDescription1() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[40px] items-start justify-center relative shrink-0 text-black w-full" data-name="Mission Description">
      <p className="capitalize font-['Fraunces:Regular',sans-serif] leading-[normal] relative shrink-0 text-[48px] w-full" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Self-Led Sustainable Transformation
      </p>
      <div className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] font-['Inter:Regular',sans-serif] leading-[0] not-italic opacity-85 relative shrink-0 text-[20px] tracking-[-0.4px] w-full whitespace-pre-wrap">
        <p className="leading-[1.8] mb-0">Mahila Action rejects the transactional traditional donor-victim paradigm. We operate on the unshakeable premise that local communities and marginalized women are structural change leaders – not passive beneficiaries.</p>
        <p className="leading-[1.8] mb-0">​</p>
        <p className="leading-[1.8]">By building civil rights agency, providing microscale financial networks, and offering accredited educational transition schooling, we turn vulnerabilities into localized cooperative engines of sustainable success.</p>
      </div>
    </div>
  );
}

function MissionContent1() {
  return (
    <div className="content-stretch flex flex-col items-start justify-center px-[30px] py-[50px] relative rounded-[20px] shrink-0 w-[585px]" data-name="Mission Content">
      <div aria-hidden className="absolute border-2 border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[40px] not-italic relative shrink-0 text-[15px] text-black whitespace-nowrap">Our Vision</p>
      <MissionDescription1 />
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[30px] items-center justify-center relative shrink-0 w-full">
      <MissionContent />
      <MissionContent1 />
    </div>
  );
}

function Frame16() {
  return (
    <div className="absolute content-stretch flex flex-col h-[751px] items-center left-0 pt-[150px] top-[658px] w-[1440px]">
      <Frame />
    </div>
  );
}

function ImpactLogo() {
  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Impact Logo">
      <div className="h-[78.448px] relative shrink-0 w-[79.043px]" data-name="Exclude">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 79.0434 78.4479">
          <path d={svgPaths.p2f12b700} fill="var(--fill-0, #F4EFE7)" id="Exclude" />
        </svg>
      </div>
      <div className="[word-break:break-word] font-['Fraunces:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[#f4efe7] text-[32px] whitespace-nowrap" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        <p className="leading-[normal] mb-0">Mahila</p>
        <p className="leading-[normal]">Action</p>
      </div>
    </div>
  );
}

function ImpactActionItem() {
  return (
    <div className="bg-[#f4efe7] relative rounded-[20000px] shrink-0 w-full" data-name="Impact Action Item">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[60px] py-[15px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[16px] whitespace-nowrap">Donate For The Cause</p>
        </div>
      </div>
    </div>
  );
}

function ImpactActionItem1() {
  return (
    <div className="bg-[#a65a4a] relative rounded-[20000px] shrink-0 w-full" data-name="Impact Action Item">
      <div aria-hidden className="absolute border-2 border-[#f4efe7] border-solid inset-0 pointer-events-none rounded-[20000px]" />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[60px] py-[15px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[16px] whitespace-nowrap">Join The Movement</p>
        </div>
      </div>
    </div>
  );
}

function ImpactActionsContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center justify-center relative shrink-0 w-[246px]" data-name="Impact Actions Container">
      <ImpactActionItem />
      <ImpactActionItem1 />
    </div>
  );
}

function ImpactSloganContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] items-start justify-center relative shrink-0" data-name="Impact Slogan Container">
      <div className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Fraunces:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[#f4efe7] text-[30px] w-[246px]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        <p className="leading-[normal] mb-0">Small Actions.</p>
        <p className="leading-[normal]">Lasting Change.</p>
      </div>
      <ImpactActionsContainer />
    </div>
  );
}

function FooterHeader() {
  return (
    <div className="content-stretch flex flex-col gap-[50px] items-start justify-center relative shrink-0" data-name="footer header">
      <ImpactLogo />
      <ImpactSloganContainer />
    </div>
  );
}

function ColumnTextContainer() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 text-[14px]" data-name="Column Text Container">
      <p className="relative shrink-0 whitespace-nowrap">Empowering Women, Strengthening</p>
      <p className="min-w-full relative shrink-0 w-[min-content]">Communities, amd Creating Lasting</p>
      <p className="min-w-full relative shrink-0 w-[min-content]">Change for over 28 years</p>
    </div>
  );
}

function InfoColumn() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-start justify-center relative shrink-0 w-[244px]" data-name="Info Column">
      <p className="min-w-full relative shrink-0 text-[20px] uppercase w-[min-content]">Mahila Action</p>
      <ColumnTextContainer />
    </div>
  );
}

function ColumnTextContainer1() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 text-[14px] w-full" data-name="Column Text Container">
      <p className="min-w-full relative shrink-0 w-[min-content]">Attend Events</p>
      <p className="relative shrink-0 whitespace-nowrap">Partner With Us</p>
    </div>
  );
}

function InfoColumn1() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] h-[115px] items-center relative shrink-0 w-[171px]" data-name="Info Column">
      <p className="relative shrink-0 text-[20px] uppercase w-full">get involved</p>
      <ColumnTextContainer1 />
    </div>
  );
}

function FooterLinkContainer() {
  return (
    <div className="[word-break:break-word] content-stretch flex font-['Inter:Semi_Bold',sans-serif] font-semibold gap-[136px] items-start leading-[normal] not-italic relative shrink-0 text-[#f4efe7] w-full" data-name="Footer Link Container">
      <InfoColumn />
      <InfoColumn1 />
    </div>
  );
}

function ColumnTextContainer2() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 text-[14px]" data-name="Column Text Container">
      <p className="relative shrink-0 whitespace-nowrap">{`Women & Leadership`}</p>
      <p className="min-w-full relative shrink-0 w-[min-content]">{`Education & Learning`}</p>
      <p className="min-w-full relative shrink-0 w-[min-content]">{`Livelihood & Skills`}</p>
      <p className="relative shrink-0 whitespace-nowrap">Community Wellbeing</p>
    </div>
  );
}

function InfoColumn2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold gap-[20px] items-start justify-center leading-[normal] not-italic relative shrink-0 text-[#f4efe7]" data-name="Info Column">
      <p className="min-w-full relative shrink-0 text-[20px] uppercase w-[min-content]">Our impacts</p>
      <ColumnTextContainer2 />
    </div>
  );
}

function ContactInfo() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold gap-[10px] items-start leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[14px] whitespace-nowrap" data-name="Contact Info">
      <p className="relative shrink-0">contact@mahilaction.org</p>
      <p className="relative shrink-0">+91 XXXXXXXXX</p>
    </div>
  );
}

function Instagram1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="instagram">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="instagram">
          <path d={svgPaths.p4fdb300} id="Vector" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p39557800} id="Vector_2" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M17.5 6.5H17.51" id="Vector_3" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Instagram() {
  return (
    <div className="content-stretch flex items-start p-[3px] relative shrink-0 size-[30px]" data-name="Instagram">
      <Instagram1 />
    </div>
  );
}

function Facebook1() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="facebook">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="facebook">
          <path d={svgPaths.p3d19f300} id="Vector" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Facebook() {
  return (
    <div className="content-stretch flex items-start p-[3px] relative shrink-0 size-[30px]" data-name="Facebook">
      <Facebook1 />
    </div>
  );
}

function Linkedin() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="linkedin">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="linkedin">
          <path d={svgPaths.p30958080} id="Vector" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d="M6 9H2V21H6V9Z" id="Vector_2" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p1bb3a100} id="Vector_3" stroke="var(--stroke-0, #F4EFE7)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function LinkedIn() {
  return (
    <div className="content-stretch flex items-start p-[3px] relative shrink-0 size-[30px]" data-name="LinkedIn">
      <Linkedin />
    </div>
  );
}

function SocialMediaLinks() {
  return (
    <div className="content-stretch flex gap-[25px] items-center relative shrink-0 w-[171px]" data-name="Social Media Links">
      <Instagram />
      <Facebook />
      <LinkedIn />
    </div>
  );
}

function ColumnTextContainer3() {
  return (
    <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0" data-name="Column Text Container">
      <ContactInfo />
      <SocialMediaLinks />
    </div>
  );
}

function InfoColumn3() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] h-[142px] items-center relative shrink-0 w-[172px]" data-name="Info Column">
      <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] min-w-full not-italic relative shrink-0 text-[#f4efe7] text-[20px] uppercase w-[min-content]">Contact</p>
      <ColumnTextContainer3 />
    </div>
  );
}

function FooterLinkContainer1() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Footer Link Container">
      <InfoColumn2 />
      <InfoColumn3 />
    </div>
  );
}

function FooterLinks() {
  return (
    <div className="content-stretch flex flex-col gap-[60px] items-start justify-center relative shrink-0 w-[552px]" data-name="footer-links">
      <FooterLinkContainer />
      <FooterLinkContainer1 />
    </div>
  );
}

function FooterContent() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-[1152px]" data-name="footer-content">
      <FooterHeader />
      <FooterLinks />
    </div>
  );
}

function FooterContainer() {
  return (
    <div className="bg-[#a65a4a] content-stretch flex flex-col items-start px-[144px] py-[100px] relative shrink-0 w-[1440px]" data-name="footer-container">
      <FooterContent />
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute content-stretch flex flex-col items-start justify-center left-0 pt-[150px] top-[3911px] w-[1440px]" data-name="footer">
      <FooterContainer />
    </div>
  );
}

function TakeActionHeader() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal items-start justify-center relative shrink-0 text-black w-full whitespace-nowrap" data-name="Take Action Header">
      <p className="font-['Inter:Regular',sans-serif] leading-[40px] not-italic relative shrink-0 text-[15px]">Take Action</p>
      <p className="capitalize font-['Fraunces:Regular',sans-serif] leading-[normal] relative shrink-0 text-[48px]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        One Contribution. Many Futures.
      </p>
    </div>
  );
}

function CategoryTag() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-[37px] px-[40px] py-[10px] rounded-[40px] top-[24px]" data-name="Category Tag">
      <div aria-hidden className="absolute border-2 border-[#f4efe7] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[14px] whitespace-nowrap">Education</p>
    </div>
  );
}

function ProgressBar() {
  return (
    <div className="absolute bg-[#d9d9d9] content-stretch flex flex-col h-[4px] items-start left-[37px] pr-[143px] rounded-[10000000px] top-[511px] w-[666px]" data-name="Progress Bar">
      <div className="bg-[#587735] h-[4px] relative rounded-[10000000px] shrink-0 w-[523px]" data-name="Progress Filled Bar" />
    </div>
  );
}

function ProgressIndicator() {
  return (
    <div className="absolute content-stretch flex gap-[10px] h-[30px] items-start justify-center left-[543px] px-[6px] py-[7px] top-[473.5px]" data-name="Progress Indicator">
      <div className="absolute h-[29.985px] left-0 top-0 w-[33px]" data-name="Union">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 33 29.9846">
          <g id="Union">
            <mask fill="white" id="path-1-inside-1_1_1362">
              <path d={svgPaths.p21eda5c0} />
            </mask>
            <path d={svgPaths.p21eda5c0} fill="var(--fill-0, #89A26E)" />
            <path d={svgPaths.p33bfa000} fill="var(--stroke-0, #587735)" mask="url(#path-1-inside-1_1_1362)" />
          </g>
        </svg>
      </div>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[10px] whitespace-nowrap">75%</p>
    </div>
  );
}

function TakeActionImage() {
  return (
    <div className="h-[561px] overflow-clip relative rounded-[20px] shrink-0 w-full" data-name="Take Action Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[20px] size-full" src={imgTakeActionImage} />
      <div className="absolute bg-gradient-to-b from-[25.806%] from-[rgba(0,0,0,0)] h-[561px] left-0 to-[#1e1e1e] to-[94.22%] top-0 w-[740px]" data-name="Image Background" />
      <CategoryTag />
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[37px] not-italic text-[#f4efe7] text-[24px] top-[436px] whitespace-nowrap">Help Build Community Learning Centres</p>
      <ProgressBar />
      <ProgressIndicator />
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[39px] not-italic text-[#f4efe7] text-[12px] top-[487px] whitespace-nowrap">₹4,50,000 Raised</p>
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] left-[610px] not-italic text-[#89a26e] text-[12px] top-[487px] whitespace-nowrap">Goal: ₹6,00,000</p>
      <div className="absolute flex h-[82.429px] items-center justify-center left-[460px] top-[78.5px] w-[79.68px]">
        <div className="flex-none rotate-[12.94deg]">
          <div className="h-[69.457px] relative w-[65.796px]">
            <div className="absolute inset-[-7.77%_-7.01%_-0.6%_-6.46%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 74.6614 75.2693">
                <g id="Vector 8">
                  <path d={svgPaths.p7abe100} fill="var(--stroke-0, #F4EFE7)" style={{ mixBlendMode: "soft-light" }} />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute flex h-[95.397px] items-center justify-center left-[218px] top-[217.5px] w-[94.864px]">
        <div className="flex-none rotate-[-39.09deg]">
          <div className="h-[69.457px] relative w-[65.796px]">
            <div className="absolute inset-[-7.77%_-7.01%_-0.6%_-6.46%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 74.6614 75.2693">
                <g id="Vector 9">
                  <path d={svgPaths.p7abe100} fill="var(--stroke-0, #F4EFE7)" style={{ mixBlendMode: "soft-light" }} />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TakeActionContent() {
  return (
    <div className="content-stretch flex flex-col gap-[25px] items-start justify-center relative shrink-0 w-[740px]" data-name="Take Action Content">
      <TakeActionHeader />
      <TakeActionImage />
    </div>
  );
}

function DonationOption() {
  return (
    <div className="bg-[#a65a4a] content-stretch flex items-center px-[50px] py-[10px] relative rounded-[40px] shrink-0" data-name="Donation Option">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[15px] whitespace-nowrap">One-Time</p>
    </div>
  );
}

function DonationOption1() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center px-[50px] py-[10px] relative rounded-[40px] shrink-0" data-name="Donation Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">Monthly</p>
    </button>
  );
}

function ContributionOption() {
  return (
    <div className="bg-[#a65a4a] content-stretch flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[15px] whitespace-nowrap">₹ 500</p>
    </div>
  );
}

function ContributionOption1() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">₹ 1000</p>
    </button>
  );
}

function ContributionOption2() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">₹ 5000</p>
    </button>
  );
}

function CustomContributionValue() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Custom Contribution Value">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#919090] text-[14px] w-[389px]">₹ 500</p>
    </div>
  );
}

function CustomContributionInput() {
  return (
    <div className="relative shrink-0 w-full" data-name="Custom Contribution Input">
      <div aria-hidden className="absolute border-[#a65a4a] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start justify-center px-[8px] py-[17px] relative size-full">
        <CustomContributionValue />
      </div>
    </div>
  );
}

function CustomContributionValue1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Custom Contribution Value">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#919090] text-[14px] w-[389px]">Jeon deo</p>
    </div>
  );
}

function CustomContributionInput1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Custom Contribution Input">
      <div aria-hidden className="absolute border-[#a65a4a] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start justify-center px-[8px] py-[17px] relative size-full">
        <CustomContributionValue1 />
      </div>
    </div>
  );
}

function CustomContributionValue2() {
  return (
    <div className="content-stretch flex items-center relative shrink-0 w-full" data-name="Custom Contribution Value">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#919090] text-[14px] w-[389px]">jeondeo@gmail.com</p>
    </div>
  );
}

function CustomContributionInput2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Custom Contribution Input">
      <div aria-hidden className="absolute border-[#a65a4a] border-b border-solid inset-0 pointer-events-none" />
      <div className="content-stretch flex flex-col items-start justify-center px-[8px] py-[17px] relative size-full">
        <CustomContributionValue2 />
      </div>
    </div>
  );
}

function ShowDetailsContainer() {
  return (
    <div className="content-stretch flex gap-[15px] items-end relative shrink-0" data-name="Show Details Container">
      <button className="block cursor-pointer relative rounded-[2px] shrink-0 size-[20px]" data-name="Checkbox">
        <div className="absolute bg-[#f4efe7] border border-[#a65a4a] border-solid inset-0 rounded-[2px]" data-name="Checkbox" />
      </button>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">Show my details</p>
    </div>
  );
}

function DonateAnonymouslyContainer() {
  return (
    <div className="content-stretch flex gap-[15px] items-end relative shrink-0" data-name="Donate Anonymously Container">
      <button className="block cursor-pointer relative rounded-[2px] shrink-0 size-[20px]" data-name="Checkbox">
        <div className="absolute bg-[#f4efe7] border border-[#a65a4a] border-solid inset-0 rounded-[2px]" data-name="Checkbox" />
      </button>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">Donate anonymously</p>
    </div>
  );
}

function DonationFormContainer() {
  return (
    <div className="bg-[#f4efe7] content-stretch flex flex-col gap-[20px] h-[685px] items-start justify-center px-[20px] py-[30px] relative rounded-[20px] shrink-0 w-[445px]" data-name="Donation Form Container">
      <div aria-hidden className="absolute border-2 border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[20px]" />
      <p className="[word-break:break-word] capitalize font-['Fraunces:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#1e1e1e] text-[26px] w-[min-content]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Donate To this Campaign
      </p>
      <div className="content-stretch flex gap-[30px] items-center relative shrink-0" data-name="Donation Options">
        <DonationOption />
        <DonationOption1 />
      </div>
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black uppercase whitespace-nowrap">Suggest contribution amount (INR):</p>
      <div className="content-stretch flex items-center justify-between relative shrink-0 w-[405px]" data-name="Suggested Contribution Options">
        <ContributionOption />
        <ContributionOption1 />
        <ContributionOption2 />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[405px]" data-name="Default Custom Contribution">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black uppercase w-full">Custom Contribution:</p>
        <CustomContributionInput />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[405px]" data-name="Default Custom Contribution">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black uppercase w-full">full name:</p>
        <CustomContributionInput1 />
      </div>
      <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[405px]" data-name="Default Custom Contribution">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black uppercase w-full">email address:</p>
        <CustomContributionInput2 />
      </div>
      <ShowDetailsContainer />
      <DonateAnonymouslyContainer />
      <div className="bg-[#a65a4a] relative rounded-[9999999980506448000px] shrink-0 w-full" data-name="menu-item">
        <div className="flex flex-col items-center justify-center size-full">
          <div className="content-stretch flex flex-col items-center justify-center px-[40px] py-[20px] relative size-full">
            <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[24px] whitespace-nowrap">Support for a cause</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TakeActionContainer() {
  return (
    <div className="content-stretch flex gap-[37px] items-center justify-center relative shrink-0" data-name="Take Action Container">
      <TakeActionContent />
      <DonationFormContainer />
    </div>
  );
}

function TakeActionSection() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-[1440px]" data-name="Take Action Section">
      <TakeActionContainer />
    </div>
  );
}

function ContentSection() {
  return (
    <div className="absolute content-stretch flex flex-col items-center justify-center left-0 pt-[150px] top-[3076px] w-[1440px]" data-name="Content Section">
      <TakeActionSection />
    </div>
  );
}

function Container4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-[744px]" data-name="Container">
      <p className="[word-break:break-word] capitalize font-['Fraunces:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[48px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        The Advocates Leading the Way
      </p>
    </div>
  );
}

function StoriesDescription() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Stories Description">
      <Container4 />
    </div>
  );
}

function Title() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-[744px]" data-name="Title">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[40px] not-italic relative shrink-0 text-[15px] text-black text-center w-full">Councilors</p>
      <StoriesDescription />
    </div>
  );
}

function Container3() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <Title />
    </div>
  );
}

function StoryImage() {
  return (
    <div className="pointer-events-none relative rounded-[2000000px] shrink-0 size-[220px]" data-name="Story Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[2000000px] size-full" src={imgStoryImage} />
      <div aria-hidden className="absolute border-4 border-[#a65a4a] border-solid inset-0 rounded-[2000000px]" />
    </div>
  );
}

function Frame6() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[26px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium_Italic',sans-serif] font-medium italic leading-[normal] relative shrink-0 text-[#a65a4a] text-[16px] whitespace-nowrap">She Found Her Voice</p>
        </div>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[24px] text-center w-[303px]">She Found Her Voice</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center justify-center relative shrink-0 w-full">
      <Frame6 />
      <Frame5 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[1.8] min-w-px not-italic opacity-85 relative text-[#a65a4a] text-[20px] text-center tracking-[-0.4px]">What started as a small workshop became a journey of confidence, leadership, and self-belief.</p>
    </div>
  );
}

function StoryContent() {
  return (
    <div className="relative shrink-0 w-full" data-name="Story Content">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[25px] items-center justify-center px-[13px] relative size-full">
          <Frame1 />
          <Frame7 />
        </div>
      </div>
    </div>
  );
}

function StoryImage1() {
  return (
    <div className="pointer-events-none relative rounded-[2000000px] shrink-0 size-[220px]" data-name="Story Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[2000000px] size-full" src={imgStoryImage} />
      <div aria-hidden className="absolute border-4 border-[#a65a4a] border-solid inset-0 rounded-[2000000px]" />
    </div>
  );
}

function Frame8() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[26px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium_Italic',sans-serif] font-medium italic leading-[normal] relative shrink-0 text-[#a65a4a] text-[16px] whitespace-nowrap">She Found Her Voice</p>
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[24px] text-center w-[303px]">She Found Her Voice</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center justify-center relative shrink-0 w-full">
      <Frame8 />
      <Frame9 />
    </div>
  );
}

function Frame10() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[1.8] min-w-px not-italic opacity-85 relative text-[#a65a4a] text-[20px] text-center tracking-[-0.4px]">What started as a small workshop became a journey of confidence, leadership, and self-belief.</p>
    </div>
  );
}

function StoryContent1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Story Content">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[25px] items-center justify-center px-[13px] relative size-full">
          <Frame2 />
          <Frame10 />
        </div>
      </div>
    </div>
  );
}

function StoryImage2() {
  return (
    <div className="pointer-events-none relative rounded-[2000000px] shrink-0 size-[220px]" data-name="Story Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover rounded-[2000000px] size-full" src={imgStoryImage} />
      <div aria-hidden className="absolute border-4 border-[#a65a4a] border-solid inset-0 rounded-[2000000px]" />
    </div>
  );
}

function Frame11() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center px-[26px] relative size-full">
          <p className="[word-break:break-word] font-['Inter:Medium_Italic',sans-serif] font-medium italic leading-[normal] relative shrink-0 text-[#a65a4a] text-[16px] whitespace-nowrap">She Found Her Voice</p>
        </div>
      </div>
    </div>
  );
}

function Frame12() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[24px] text-center w-[303px]">She Found Her Voice</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex flex-col gap-[20px] items-center justify-center relative shrink-0 w-full">
      <Frame11 />
      <Frame12 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
      <p className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [word-break:break-word] flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[1.8] min-w-px not-italic opacity-85 relative text-[#a65a4a] text-[20px] text-center tracking-[-0.4px]">What started as a small workshop became a journey of confidence, leadership, and self-belief.</p>
    </div>
  );
}

function StoryContent2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Story Content">
      <div className="flex flex-col items-center justify-center size-full">
        <div className="content-stretch flex flex-col gap-[25px] items-center justify-center px-[13px] relative size-full">
          <Frame3 />
          <Frame13 />
        </div>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="content-stretch flex gap-[30px] items-center justify-center relative shrink-0 w-full" data-name="Container">
      <div className="bg-[#f4efe7] content-stretch flex flex-col gap-[50px] items-center justify-center px-[40px] py-[50px] relative rounded-[20px] shrink-0 w-[414px]" data-name="Component 1">
        <div aria-hidden className="absolute border-2 border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[20px]" />
        <StoryImage />
        <StoryContent />
      </div>
      <div className="bg-[#f4efe7] content-stretch flex flex-col gap-[50px] items-center justify-center px-[40px] py-[50px] relative rounded-[20px] shrink-0 w-[414px]" data-name="Component 1">
        <div aria-hidden className="absolute border-2 border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[20px]" />
        <StoryImage1 />
        <StoryContent1 />
      </div>
      <div className="bg-[#f4efe7] content-stretch flex flex-col gap-[50px] items-center justify-center px-[40px] py-[50px] relative rounded-[20px] shrink-0 w-[414px]" data-name="Component 1">
        <div aria-hidden className="absolute border-2 border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[20px]" />
        <StoryImage2 />
        <StoryContent2 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="content-stretch flex flex-col gap-[50px] items-center justify-center relative shrink-0 w-[1302px]" data-name="Container">
      <Container3 />
      <Container5 />
    </div>
  );
}

function Container1() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <Container2 />
    </div>
  );
}

function Container() {
  return (
    <div className="absolute content-stretch flex flex-col items-center left-0 pt-[150px] top-[2239px] w-[1440px]" data-name="Container">
      <Container1 />
    </div>
  );
}

function Container10() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0 w-[744px]" data-name="Container">
      <p className="[word-break:break-word] capitalize font-['Fraunces:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[48px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Our Impacts since 1995
      </p>
    </div>
  );
}

function StoriesDescription1() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Stories Description">
      <Container10 />
    </div>
  );
}

function Title1() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-[1152px]" data-name="Title">
      <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[40px] not-italic relative shrink-0 text-[15px] text-black text-center w-full">Our Impacts</p>
      <StoriesDescription1 />
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex flex-col items-center relative shrink-0 w-full" data-name="Container">
      <Title1 />
    </div>
  );
}

function Container8() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0 w-full" data-name="Container">
      <Container9 />
    </div>
  );
}

function ContributionOption3() {
  return (
    <div className="bg-[#a65a4a] content-stretch flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[15px] whitespace-nowrap">1995</p>
    </div>
  );
}

function ContributionOption4() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">2002</p>
    </button>
  );
}

function ContributionOption5() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">2009</p>
    </button>
  );
}

function ContributionOption6() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">2016</p>
    </button>
  );
}

function ContributionOption7() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">2021</p>
    </button>
  );
}

function ContributionOption8() {
  return (
    <button className="bg-[#f4efe7] content-stretch cursor-pointer flex items-center justify-center px-[30px] py-[10px] relative rounded-[40px] shrink-0" data-name="Contribution Option">
      <div aria-hidden className="absolute border border-[#a65a4a] border-solid inset-0 pointer-events-none rounded-[40px]" />
      <p className="[word-break:break-word] font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[15px] text-left whitespace-nowrap">2026</p>
    </button>
  );
}

function Timeline() {
  return (
    <div className="content-stretch flex gap-[30px] items-center justify-center relative shrink-0 w-full" data-name="Timeline">
      <ContributionOption3 />
      <ContributionOption4 />
      <ContributionOption5 />
      <ContributionOption6 />
      <ContributionOption7 />
      <ContributionOption8 />
    </div>
  );
}

function EventImage() {
  return (
    <div className="h-[431px] relative rounded-[20px] shrink-0 w-[586px]" data-name="Event Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[20px] size-full" src={imgEventImage} />
    </div>
  );
}

function MissionDescription2() {
  return (
    <div className="content-stretch flex flex-col gap-[40px] items-start justify-center relative shrink-0 w-full" data-name="Mission Description">
      <p className="capitalize font-['Fraunces:Regular',sans-serif] leading-[normal] relative shrink-0 text-[48px] w-full" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
        Foundation of Mahila Action
      </p>
      <div className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both] font-['Inter:Regular',sans-serif] leading-[0] not-italic opacity-85 relative shrink-0 text-[20px] tracking-[-0.4px] w-full whitespace-pre-wrap">
        <p className="leading-[1.8] mb-0">Registered by a small group of six local women, and starting with a single room operating basic literacy circles for children of brick-kiln laborers.</p>
        <p className="leading-[1.8] mb-0">​</p>
        <p className="leading-[1.8]">Registered by a small group of six local women, and starting with a single room operating basic literacy circles for children of brick-kiln laborers.</p>
      </div>
    </div>
  );
}

function MissionContent2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-normal gap-[5px] items-start justify-center relative rounded-[20px] shrink-0 text-black w-full" data-name="Mission Content">
      <p className="font-['Inter:Regular',sans-serif] leading-[40px] not-italic relative shrink-0 text-[15px] whitespace-nowrap">1995</p>
      <MissionDescription2 />
    </div>
  );
}

function Frame14() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
      <MissionContent2 />
    </div>
  );
}

function Frame15() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-[585px]">
      <Frame14 />
    </div>
  );
}

function Component() {
  return (
    <div className="content-stretch flex gap-[30px] items-center justify-center relative shrink-0 w-full" data-name="Component 3">
      <EventImage />
      <Frame15 />
    </div>
  );
}

function Container7() {
  return (
    <div className="content-stretch flex flex-col h-[681px] items-center justify-between relative shrink-0 w-full" data-name="Container">
      <Container8 />
      <div className="content-stretch flex flex-col gap-[60px] items-center justify-center relative shrink-0 w-full" data-name="Component 9">
        <Timeline />
        <Component />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute content-stretch flex flex-col items-center left-0 pt-[150px] top-[1409px] w-[1440px]" data-name="Container">
      <Container7 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-center relative shrink-0">
      <a className="content-stretch cursor-pointer flex items-center justify-center px-[20px] py-[16px] relative shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black text-left whitespace-nowrap">Home</p>
      </a>
      <div className="content-stretch flex items-center justify-center px-[20px] py-[16px] relative shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#a65a4a] text-[16px] whitespace-nowrap">Who are We</p>
      </div>
      <button className="content-stretch cursor-pointer flex items-center justify-center px-[20px] py-[16px] relative shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black text-left whitespace-nowrap">Our Impact</p>
      </button>
      <div className="content-stretch flex items-center justify-center px-[20px] py-[16px] relative shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black whitespace-nowrap">Stories</p>
      </div>
      <button className="content-stretch cursor-pointer flex items-center justify-center px-[20px] py-[16px] relative shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[16px] text-black text-left whitespace-nowrap">Take Action</p>
      </button>
    </div>
  );
}

function HeaderNavBar() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[1152px]" data-name="header-nav-bar">
      <div className="content-stretch flex gap-[11px] items-center justify-center relative shrink-0" data-name="logo-lg">
        <div className="relative rounded-[4px] shrink-0 size-[61px]" data-name="Logo">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[4px]">
            <img alt="" className="absolute h-[209.02%] left-[-57.42%] max-w-none top-[-52.69%] w-[227.34%]" src={imgLogo} />
          </div>
        </div>
        <div className="[word-break:break-word] font-['Fraunces:Regular',sans-serif] font-normal leading-[0] relative shrink-0 text-[24px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
          <p className="leading-[normal] mb-0">Mahila</p>
          <p className="leading-[normal]">Action</p>
        </div>
      </div>
      <Frame4 />
      <div className="bg-[#a65a4a] content-stretch flex flex-col items-center justify-center px-[40px] py-[10px] relative rounded-[9999999980506448000px] shrink-0" data-name="menu-item">
        <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[normal] not-italic relative shrink-0 text-[#f4efe7] text-[16px] whitespace-nowrap">Donate Now</p>
      </div>
    </div>
  );
}

export default function Concept2WhoWeAre() {
  return (
    <div className="bg-[#f4efe7] relative size-full" data-name="concept 2 - Who we are">
      <BannerSection />
      <Frame16 />
      <Footer />
      <ContentSection />
      <Container />
      <Container6 />
      <div className="absolute bottom-0 h-[4605px] left-0 pointer-events-none top-0">
        <div className="bg-[#f4efe7] content-stretch drop-shadow-[0px_256px_36px_rgba(0,0,0,0),0px_164px_32.5px_rgba(0,0,0,0.01),0px_92px_27.5px_rgba(0,0,0,0.03),0px_41px_20.5px_rgba(0,0,0,0.04),0px_10px_11px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center pointer-events-auto py-[20px] sticky top-0 w-[1440px]" data-name="Header">
          <HeaderNavBar />
        </div>
      </div>
    </div>
  );
}