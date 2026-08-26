/**
 * User-guide content, kept as data so the same structure renders in any
 * language. Adding a language is adding one key here — the UI reads whatever
 * is present. `dir` drives right-to-left rendering (Urdu).
 */

export type GuideLang = "en" | "ur" | "hi" | "bn";

export interface GuideStep {
  title: string;
  body: string;
}
export interface GuideFeature {
  name: string;
  href: string;
  body: string;
}
export interface GuideContent {
  label: string; // shown in the language switcher
  dir: "ltr" | "rtl";
  pageTitle: string;
  pageSubtitle: string;
  languageLabel: string;
  episodeHeading: string;
  shortcut: string;
  featuresHeading: string;
  tipsHeading: string;
  openLabel: string;
  steps: GuideStep[];
  features: GuideFeature[];
  tips: string[];
}

// Feature routes are shared across languages.
const HREF = {
  dashboard: "/dashboard",
  topics: "/topics",
  agents: "/agents",
  calendar: "/calendar",
  chat: "/chat",
  research: "/research",
  outlines: "/outlines",
  scripts: "/scripts",
  guests: "/guests",
  fact: "/fact-checks",
  seo: "/seo",
  social: "/social",
  projects: "/projects",
  knowledge: "/knowledge",
  memory: "/memory",
  exports: "/exports",
  analytics: "/analytics",
  billing: "/billing",
  apiKeys: "/api-keys",
  settings: "/settings",
} as const;

export const GUIDE_LANGS: GuideLang[] = ["en", "ur", "hi", "bn"];

export const GUIDE: Record<GuideLang, GuideContent> = {
  /* ------------------------------------------------------------------ English */
  en: {
    label: "English",
    dir: "ltr",
    pageTitle: "User Guide",
    pageSubtitle: "Everything you need to make your first episode.",
    languageLabel: "Language",
    episodeHeading: "How to make a complete episode",
    shortcut:
      "Shortcut: Episode Pipeline runs research → outline → script → SEO for you automatically in one flow — perfect for a fast first draft.",
    featuresHeading: "What each feature does",
    tipsHeading: "Tips",
    openLabel: "Open",
    steps: [
      {
        title: "1. Create a project",
        body: "Every episode starts here. Open Projects and create one with a title and topic. It becomes the home for your research, outline, script and exports.",
      },
      {
        title: "2. Find a topic (optional)",
        body: "Not sure what to cover? Open Topic Discovery for trending, audience-relevant ideas you can turn into an episode.",
      },
      {
        title: "3. Research",
        body: "Open AI Research in your project. The AI gathers facts, angles and sources on your topic so you never start from a blank page.",
      },
      {
        title: "4. Build an outline",
        body: "Open Outlines. The AI turns your research into a clear, segment-by-segment structure. Edit it until the flow feels right.",
      },
      {
        title: "5. Write the script",
        body: "Open Scripts. From your outline the AI drafts a full episode script — intro, segments, transitions and outro. Refine the tone and wording.",
      },
      {
        title: "6. Fact-check",
        body: "Run the Fact Checker on your script. It flags claims that need a source or look shaky, so you stay accurate.",
      },
      {
        title: "7. Prepare a guest (optional)",
        body: "Interviewing someone? Guest Assistant researches the guest and suggests a bio and smart questions.",
      },
      {
        title: "8. SEO & social",
        body: "Use the SEO Engine for a strong title, description and keywords, and Social Posts for ready-to-share promo copy.",
      },
      {
        title: "9. Export & schedule",
        body: "Open Export Center to download your script and show notes in the format you need, and use Calendar to schedule the episode.",
      },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "Your home base — recent projects, credits, activity and quick actions." },
      { name: "Topic Discovery", href: HREF.topics, body: "Find trending, audience-relevant episode ideas." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automate the whole flow — research to script to SEO — in one run." },
      { name: "Calendar", href: HREF.calendar, body: "Plan and schedule episodes, with reminders." },
      { name: "AI Chat", href: HREF.chat, body: "Ask the AI anything about your show and brainstorm live." },
      { name: "AI Research", href: HREF.research, body: "Gather facts, angles and sources for a topic." },
      { name: "Outlines", href: HREF.outlines, body: "Turn research into a clear segment structure." },
      { name: "Scripts", href: HREF.scripts, body: "Draft and refine the full episode script." },
      { name: "Guest Assistant", href: HREF.guests, body: "Research guests and generate bios and questions." },
      { name: "Fact Checker", href: HREF.fact, body: "Verify the claims in your script against sources." },
      { name: "SEO Engine", href: HREF.seo, body: "Titles, descriptions and keywords that get found." },
      { name: "Social Posts", href: HREF.social, body: "Ready-to-share promo posts for each platform." },
      { name: "Projects", href: HREF.projects, body: "Each episode's workspace — research, outline, script and exports in one place." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Upload your notes and docs so the AI uses your own material." },
      { name: "AI Memory", href: HREF.memory, body: "The AI remembers your style and past episodes for consistency." },
      { name: "Export Center", href: HREF.exports, body: "Download scripts and show notes in multiple formats." },
      { name: "Analytics", href: HREF.analytics, body: "See your usage and how your content is performing." },
      { name: "Billing", href: HREF.billing, body: "Manage your plan and AI credits." },
      { name: "API Keys", href: HREF.apiKeys, body: "Connect your own AI provider keys (optional, advanced)." },
      { name: "Settings", href: HREF.settings, body: "Profile, language and account preferences." },
    ],
    tips: [
      "You don't have to use every tool — a great episode can be just Research → Outline → Script.",
      "Each AI action uses credits; the Dashboard always shows your balance.",
      "Add your notes to the Knowledge Base so scripts sound like you.",
      "Set your preferred language in Settings, and per module where it's offered.",
    ],
  },

  /* ------------------------------------------------------------------ Urdu */
  ur: {
    label: "اردو",
    dir: "rtl",
    pageTitle: "استعمال کی گائیڈ",
    pageSubtitle: "اپنا پہلا ایپیسوڈ بنانے کے لیے درکار ہر چیز۔",
    languageLabel: "زبان",
    episodeHeading: "مکمل ایپیسوڈ بنانے کا طریقہ",
    shortcut:
      "شارٹ کٹ: Episode Pipeline خود بخود ایک ہی مرحلے میں ریسرچ → آؤٹ لائن → اسکرپٹ → SEO کر دیتا ہے — جلدی پہلا مسودہ بنانے کے لیے بہترین۔",
    featuresHeading: "ہر فیچر کیا کرتا ہے",
    tipsHeading: "مشورے",
    openLabel: "کھولیں",
    steps: [
      { title: "1۔ پروجیکٹ بنائیں", body: "ہر ایپیسوڈ یہیں سے شروع ہوتا ہے۔ Projects کھول کر عنوان اور موضوع کے ساتھ ایک پروجیکٹ بنائیں۔ یہی آپ کی ریسرچ، آؤٹ لائن، اسکرپٹ اور ایکسپورٹ کا ٹھکانہ بنے گا۔" },
      { title: "2۔ موضوع تلاش کریں (اختیاری)", body: "سمجھ نہیں آ رہا کس پر بات کریں؟ Topic Discovery کھولیں اور ٹرینڈنگ، سامعین کے مطابق آئیڈیاز حاصل کریں۔" },
      { title: "3۔ ریسرچ", body: "اپنے پروجیکٹ میں AI Research کھولیں۔ AI آپ کے موضوع پر حقائق، پہلو اور حوالہ جات جمع کرتا ہے تاکہ خالی صفحے سے شروع نہ کرنا پڑے۔" },
      { title: "4۔ آؤٹ لائن بنائیں", body: "Outlines کھولیں۔ AI آپ کی ریسرچ کو حصوں میں واضح ترتیب دیتا ہے۔ بہاؤ درست ہونے تک اسے ایڈٹ کریں۔" },
      { title: "5۔ اسکرپٹ لکھیں", body: "Scripts کھولیں۔ آؤٹ لائن سے AI پورا اسکرپٹ لکھتا ہے — انٹرو، حصے، ٹرانزیشنز اور آؤٹرو۔ لہجہ اور الفاظ بہتر بنائیں۔" },
      { title: "6۔ فیکٹ چیک", body: "اپنے اسکرپٹ پر Fact Checker چلائیں۔ یہ ان دعوؤں کو نشان زد کرتا ہے جنہیں حوالہ چاہیے یا جو کمزور لگتے ہیں، تاکہ درستگی برقرار رہے۔" },
      { title: "7۔ مہمان کی تیاری (اختیاری)", body: "کسی کا انٹرویو کر رہے ہیں؟ Guest Assistant مہمان پر ریسرچ کرتا ہے اور تعارف و بہترین سوالات تجویز کرتا ہے۔" },
      { title: "8۔ SEO اور سوشل", body: "مضبوط عنوان، تفصیل اور کلیدی الفاظ کے لیے SEO Engine اور شیئر کے لیے تیار پرومو کے لیے Social Posts استعمال کریں۔" },
      { title: "9۔ ایکسپورٹ اور شیڈول", body: "اپنا اسکرپٹ اور شو نوٹس مطلوبہ فارمیٹ میں ڈاؤن لوڈ کرنے کے لیے Export Center کھولیں، اور ایپیسوڈ شیڈول کرنے کے لیے Calendar استعمال کریں۔" },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "آپ کا مرکز — حالیہ پروجیکٹس، کریڈٹس، سرگرمی اور فوری اقدامات۔" },
      { name: "Topic Discovery", href: HREF.topics, body: "ٹرینڈنگ اور سامعین کے مطابق ایپیسوڈ آئیڈیاز تلاش کریں۔" },
      { name: "Episode Pipeline", href: HREF.agents, body: "پورا عمل — ریسرچ سے اسکرپٹ سے SEO تک — ایک ہی بار میں خودکار کریں۔" },
      { name: "Calendar", href: HREF.calendar, body: "ایپیسوڈز کی منصوبہ بندی اور شیڈولنگ، یاد دہانیوں کے ساتھ۔" },
      { name: "AI Chat", href: HREF.chat, body: "اپنے شو کے بارے میں AI سے کچھ بھی پوچھیں اور آئیڈیاز بنائیں۔" },
      { name: "AI Research", href: HREF.research, body: "کسی موضوع پر حقائق، پہلو اور حوالہ جات جمع کریں۔" },
      { name: "Outlines", href: HREF.outlines, body: "ریسرچ کو واضح حصوں کی ترتیب میں بدلیں۔" },
      { name: "Scripts", href: HREF.scripts, body: "پورا ایپیسوڈ اسکرپٹ لکھیں اور بہتر بنائیں۔" },
      { name: "Guest Assistant", href: HREF.guests, body: "مہمانوں پر ریسرچ اور تعارف و سوالات تیار کریں۔" },
      { name: "Fact Checker", href: HREF.fact, body: "اسکرپٹ کے دعوؤں کو حوالوں سے جانچیں۔" },
      { name: "SEO Engine", href: HREF.seo, body: "ایسے عنوان، تفصیل اور کلیدی الفاظ جو تلاش میں آئیں۔" },
      { name: "Social Posts", href: HREF.social, body: "ہر پلیٹ فارم کے لیے شیئر کے لیے تیار پرومو پوسٹس۔" },
      { name: "Projects", href: HREF.projects, body: "ہر ایپیسوڈ کی جگہ — ریسرچ، آؤٹ لائن، اسکرپٹ اور ایکسپورٹ ایک جگہ۔" },
      { name: "Knowledge Base", href: HREF.knowledge, body: "اپنے نوٹس اور دستاویزات اپ لوڈ کریں تاکہ AI آپ کا اپنا مواد استعمال کرے۔" },
      { name: "AI Memory", href: HREF.memory, body: "AI آپ کا انداز اور پرانے ایپیسوڈز یاد رکھتا ہے تاکہ یکسانی رہے۔" },
      { name: "Export Center", href: HREF.exports, body: "اسکرپٹ اور شو نوٹس کئی فارمیٹس میں ڈاؤن لوڈ کریں۔" },
      { name: "Analytics", href: HREF.analytics, body: "اپنا استعمال اور مواد کی کارکردگی دیکھیں۔" },
      { name: "Billing", href: HREF.billing, body: "اپنا پلان اور AI کریڈٹس منظم کریں۔" },
      { name: "API Keys", href: HREF.apiKeys, body: "اپنی AI پرووائیڈر کیز جوڑیں (اختیاری، ایڈوانسڈ)۔" },
      { name: "Settings", href: HREF.settings, body: "پروفائل، زبان اور اکاؤنٹ کی ترجیحات۔" },
    ],
    tips: [
      "ہر ٹول استعمال کرنا ضروری نہیں — ایک بہترین ایپیسوڈ صرف ریسرچ → آؤٹ لائن → اسکرپٹ سے بھی بن سکتا ہے۔",
      "ہر AI عمل کریڈٹس استعمال کرتا ہے؛ Dashboard پر آپ کا بیلنس ہمیشہ نظر آتا ہے۔",
      "اپنے نوٹس Knowledge Base میں شامل کریں تاکہ اسکرپٹ آپ کے انداز میں لگے۔",
      "اپنی پسندیدہ زبان Settings میں، اور جہاں دستیاب ہو ہر ماڈیول میں سیٹ کریں۔",
    ],
  },

  /* ------------------------------------------------------------------ Hindi */
  hi: {
    label: "हिन्दी",
    dir: "ltr",
    pageTitle: "उपयोग गाइड",
    pageSubtitle: "अपना पहला एपिसोड बनाने के लिए ज़रूरी सब कुछ।",
    languageLabel: "भाषा",
    episodeHeading: "पूरा एपिसोड कैसे बनाएँ",
    shortcut:
      "शॉर्टकट: Episode Pipeline एक ही प्रवाह में अपने-आप रिसर्च → आउटलाइन → स्क्रिप्ट → SEO कर देता है — जल्दी पहला ड्राफ़्ट बनाने के लिए बढ़िया।",
    featuresHeading: "हर फ़ीचर क्या करता है",
    tipsHeading: "सुझाव",
    openLabel: "खोलें",
    steps: [
      { title: "1. प्रोजेक्ट बनाएँ", body: "हर एपिसोड यहीं से शुरू होता है। Projects खोलकर एक शीर्षक और विषय के साथ प्रोजेक्ट बनाएँ। यही आपकी रिसर्च, आउटलाइन, स्क्रिप्ट और एक्सपोर्ट का ठिकाना बनेगा।" },
      { title: "2. विषय खोजें (वैकल्पिक)", body: "समझ नहीं आ रहा किस पर बात करें? Topic Discovery खोलें और ट्रेंडिंग, श्रोताओं के अनुकूल आइडिया पाएँ।" },
      { title: "3. रिसर्च", body: "अपने प्रोजेक्ट में AI Research खोलें। AI आपके विषय पर तथ्य, पहलू और स्रोत जुटाता है ताकि खाली पन्ने से शुरू न करना पड़े।" },
      { title: "4. आउटलाइन बनाएँ", body: "Outlines खोलें। AI आपकी रिसर्च को खंड-दर-खंड साफ़ ढाँचे में बदलता है। प्रवाह ठीक होने तक इसे संपादित करें।" },
      { title: "5. स्क्रिप्ट लिखें", body: "Scripts खोलें। आउटलाइन से AI पूरी स्क्रिप्ट लिखता है — इंट्रो, खंड, ट्रांज़िशन और आउट्रो। लहज़ा और शब्द निखारें।" },
      { title: "6. फ़ैक्ट-चेक", body: "अपनी स्क्रिप्ट पर Fact Checker चलाएँ। यह उन दावों को चिह्नित करता है जिन्हें स्रोत चाहिए या जो कमज़ोर लगते हैं, ताकि सटीकता बनी रहे।" },
      { title: "7. मेहमान की तैयारी (वैकल्पिक)", body: "किसी का इंटरव्यू ले रहे हैं? Guest Assistant मेहमान पर रिसर्च करता है और परिचय व अच्छे सवाल सुझाता है।" },
      { title: "8. SEO और सोशल", body: "मज़बूत शीर्षक, विवरण और कीवर्ड के लिए SEO Engine, और शेयर के लिए तैयार प्रोमो के लिए Social Posts इस्तेमाल करें।" },
      { title: "9. एक्सपोर्ट और शेड्यूल", body: "अपनी स्क्रिप्ट और शो नोट्स ज़रूरी फ़ॉर्मैट में डाउनलोड करने के लिए Export Center खोलें, और एपिसोड शेड्यूल करने के लिए Calendar इस्तेमाल करें।" },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "आपका केंद्र — हाल के प्रोजेक्ट, क्रेडिट, गतिविधि और त्वरित क्रियाएँ।" },
      { name: "Topic Discovery", href: HREF.topics, body: "ट्रेंडिंग और श्रोताओं के अनुकूल एपिसोड आइडिया खोजें।" },
      { name: "Episode Pipeline", href: HREF.agents, body: "पूरा प्रवाह — रिसर्च से स्क्रिप्ट से SEO तक — एक बार में स्वचालित करें।" },
      { name: "Calendar", href: HREF.calendar, body: "एपिसोड की योजना और शेड्यूलिंग, रिमाइंडर के साथ।" },
      { name: "AI Chat", href: HREF.chat, body: "अपने शो के बारे में AI से कुछ भी पूछें और आइडिया बनाएँ।" },
      { name: "AI Research", href: HREF.research, body: "किसी विषय पर तथ्य, पहलू और स्रोत जुटाएँ।" },
      { name: "Outlines", href: HREF.outlines, body: "रिसर्च को साफ़ खंड-ढाँचे में बदलें।" },
      { name: "Scripts", href: HREF.scripts, body: "पूरी एपिसोड स्क्रिप्ट लिखें और निखारें।" },
      { name: "Guest Assistant", href: HREF.guests, body: "मेहमानों पर रिसर्च और परिचय व सवाल तैयार करें।" },
      { name: "Fact Checker", href: HREF.fact, body: "स्क्रिप्ट के दावों को स्रोतों से जाँचें।" },
      { name: "SEO Engine", href: HREF.seo, body: "ऐसे शीर्षक, विवरण और कीवर्ड जो खोज में आएँ।" },
      { name: "Social Posts", href: HREF.social, body: "हर प्लेटफ़ॉर्म के लिए शेयर-रेडी प्रोमो पोस्ट।" },
      { name: "Projects", href: HREF.projects, body: "हर एपिसोड की जगह — रिसर्च, आउटलाइन, स्क्रिप्ट और एक्सपोर्ट एक साथ।" },
      { name: "Knowledge Base", href: HREF.knowledge, body: "अपने नोट्स और दस्तावेज़ अपलोड करें ताकि AI आपकी अपनी सामग्री इस्तेमाल करे।" },
      { name: "AI Memory", href: HREF.memory, body: "AI आपकी शैली और पुराने एपिसोड याद रखता है ताकि एकरूपता रहे।" },
      { name: "Export Center", href: HREF.exports, body: "स्क्रिप्ट और शो नोट्स कई फ़ॉर्मैट में डाउनलोड करें।" },
      { name: "Analytics", href: HREF.analytics, body: "अपना उपयोग और सामग्री का प्रदर्शन देखें।" },
      { name: "Billing", href: HREF.billing, body: "अपना प्लान और AI क्रेडिट प्रबंधित करें।" },
      { name: "API Keys", href: HREF.apiKeys, body: "अपनी AI प्रोवाइडर कीज़ जोड़ें (वैकल्पिक, एडवांस्ड)।" },
      { name: "Settings", href: HREF.settings, body: "प्रोफ़ाइल, भाषा और खाता प्राथमिकताएँ।" },
    ],
    tips: [
      "हर टूल इस्तेमाल करना ज़रूरी नहीं — बढ़िया एपिसोड सिर्फ़ रिसर्च → आउटलाइन → स्क्रिप्ट से भी बन सकता है।",
      "हर AI क्रिया क्रेडिट लेती है; Dashboard पर आपका बैलेंस हमेशा दिखता है।",
      "अपने नोट्स Knowledge Base में डालें ताकि स्क्रिप्ट आपके अंदाज़ में लगे।",
      "अपनी पसंदीदा भाषा Settings में, और जहाँ उपलब्ध हो हर मॉड्यूल में सेट करें।",
    ],
  },

  /* ------------------------------------------------------------------ Bengali */
  bn: {
    label: "বাংলা",
    dir: "ltr",
    pageTitle: "ব্যবহার নির্দেশিকা",
    pageSubtitle: "আপনার প্রথম এপিসোড তৈরির জন্য যা কিছু দরকার।",
    languageLabel: "ভাষা",
    episodeHeading: "সম্পূর্ণ এপিসোড কীভাবে তৈরি করবেন",
    shortcut:
      "শর্টকাট: Episode Pipeline একটি ধাপেই স্বয়ংক্রিয়ভাবে রিসার্চ → আউটলাইন → স্ক্রিপ্ট → SEO করে দেয় — দ্রুত প্রথম খসড়ার জন্য দারুণ।",
    featuresHeading: "প্রতিটি ফিচার কী করে",
    tipsHeading: "পরামর্শ",
    openLabel: "খুলুন",
    steps: [
      { title: "১. প্রজেক্ট তৈরি করুন", body: "প্রতিটি এপিসোড এখান থেকেই শুরু হয়। Projects খুলে একটি শিরোনাম ও বিষয় দিয়ে প্রজেক্ট তৈরি করুন। এটিই আপনার রিসার্চ, আউটলাইন, স্ক্রিপ্ট ও এক্সপোর্টের ঠিকানা হবে।" },
      { title: "২. বিষয় খুঁজুন (ঐচ্ছিক)", body: "কী নিয়ে বলবেন বুঝতে পারছেন না? Topic Discovery খুলে ট্রেন্ডিং, শ্রোতা-উপযোগী আইডিয়া নিন।" },
      { title: "৩. রিসার্চ", body: "আপনার প্রজেক্টে AI Research খুলুন। AI আপনার বিষয়ে তথ্য, দৃষ্টিকোণ ও সূত্র জোগাড় করে, যাতে ফাঁকা পাতা থেকে শুরু করতে না হয়।" },
      { title: "৪. আউটলাইন তৈরি করুন", body: "Outlines খুলুন। AI আপনার রিসার্চকে অংশে-অংশে পরিষ্কার কাঠামোয় সাজায়। প্রবাহ ঠিক না হওয়া পর্যন্ত সম্পাদনা করুন।" },
      { title: "৫. স্ক্রিপ্ট লিখুন", body: "Scripts খুলুন। আউটলাইন থেকে AI পুরো স্ক্রিপ্ট লেখে — ইন্ট্রো, অংশ, ট্রানজিশন ও আউট্রো। সুর ও শব্দ পরিমার্জন করুন।" },
      { title: "৬. ফ্যাক্ট-চেক", body: "আপনার স্ক্রিপ্টে Fact Checker চালান। এটি এমন দাবিগুলো চিহ্নিত করে যেগুলোর সূত্র দরকার বা দুর্বল মনে হয়, যাতে নির্ভুলতা বজায় থাকে।" },
      { title: "৭. অতিথির প্রস্তুতি (ঐচ্ছিক)", body: "কারও সাক্ষাৎকার নিচ্ছেন? Guest Assistant অতিথি সম্পর্কে রিসার্চ করে এবং পরিচিতি ও ভালো প্রশ্ন প্রস্তাব করে।" },
      { title: "৮. SEO ও সোশ্যাল", body: "শক্তিশালী শিরোনাম, বিবরণ ও কীওয়ার্ডের জন্য SEO Engine, আর শেয়ার-উপযোগী প্রোমোর জন্য Social Posts ব্যবহার করুন।" },
      { title: "৯. এক্সপোর্ট ও সময়সূচি", body: "আপনার স্ক্রিপ্ট ও শো নোট প্রয়োজনীয় ফরম্যাটে ডাউনলোড করতে Export Center খুলুন, আর এপিসোড শিডিউল করতে Calendar ব্যবহার করুন।" },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "আপনার কেন্দ্র — সাম্প্রতিক প্রজেক্ট, ক্রেডিট, কার্যকলাপ ও দ্রুত পদক্ষেপ।" },
      { name: "Topic Discovery", href: HREF.topics, body: "ট্রেন্ডিং ও শ্রোতা-উপযোগী এপিসোড আইডিয়া খুঁজুন।" },
      { name: "Episode Pipeline", href: HREF.agents, body: "পুরো প্রবাহ — রিসার্চ থেকে স্ক্রিপ্ট থেকে SEO — এক ধাপে স্বয়ংক্রিয় করুন।" },
      { name: "Calendar", href: HREF.calendar, body: "রিমাইন্ডারসহ এপিসোড পরিকল্পনা ও সময়সূচি।" },
      { name: "AI Chat", href: HREF.chat, body: "আপনার শো নিয়ে AI-কে যেকোনো কিছু জিজ্ঞাসা করুন ও আইডিয়া গড়ুন।" },
      { name: "AI Research", href: HREF.research, body: "কোনো বিষয়ে তথ্য, দৃষ্টিকোণ ও সূত্র জোগাড় করুন।" },
      { name: "Outlines", href: HREF.outlines, body: "রিসার্চকে পরিষ্কার অংশ-কাঠামোয় রূপ দিন।" },
      { name: "Scripts", href: HREF.scripts, body: "পুরো এপিসোড স্ক্রিপ্ট লিখুন ও পরিমার্জন করুন।" },
      { name: "Guest Assistant", href: HREF.guests, body: "অতিথিদের নিয়ে রিসার্চ এবং পরিচিতি ও প্রশ্ন তৈরি করুন।" },
      { name: "Fact Checker", href: HREF.fact, body: "স্ক্রিপ্টের দাবিগুলো সূত্রের সাথে যাচাই করুন।" },
      { name: "SEO Engine", href: HREF.seo, body: "এমন শিরোনাম, বিবরণ ও কীওয়ার্ড যা খুঁজে পাওয়া যায়।" },
      { name: "Social Posts", href: HREF.social, body: "প্রতিটি প্ল্যাটফর্মের জন্য শেয়ার-উপযোগী প্রোমো পোস্ট।" },
      { name: "Projects", href: HREF.projects, body: "প্রতিটি এপিসোডের কর্মস্থল — রিসার্চ, আউটলাইন, স্ক্রিপ্ট ও এক্সপোর্ট এক জায়গায়।" },
      { name: "Knowledge Base", href: HREF.knowledge, body: "আপনার নোট ও ডকুমেন্ট আপলোড করুন যাতে AI আপনার নিজের উপাদান ব্যবহার করে।" },
      { name: "AI Memory", href: HREF.memory, body: "AI আপনার ধরন ও পুরোনো এপিসোড মনে রাখে যাতে সামঞ্জস্য থাকে।" },
      { name: "Export Center", href: HREF.exports, body: "স্ক্রিপ্ট ও শো নোট একাধিক ফরম্যাটে ডাউনলোড করুন।" },
      { name: "Analytics", href: HREF.analytics, body: "আপনার ব্যবহার ও কনটেন্টের পারফরম্যান্স দেখুন।" },
      { name: "Billing", href: HREF.billing, body: "আপনার প্ল্যান ও AI ক্রেডিট পরিচালনা করুন।" },
      { name: "API Keys", href: HREF.apiKeys, body: "আপনার নিজের AI প্রোভাইডার কী যুক্ত করুন (ঐচ্ছিক, অ্যাডভান্সড)।" },
      { name: "Settings", href: HREF.settings, body: "প্রোফাইল, ভাষা ও অ্যাকাউন্ট পছন্দ।" },
    ],
    tips: [
      "প্রতিটি টুল ব্যবহার করা বাধ্যতামূলক নয় — একটি দারুণ এপিসোড শুধু রিসার্চ → আউটলাইন → স্ক্রিপ্ট দিয়েও হতে পারে।",
      "প্রতিটি AI পদক্ষেপ ক্রেডিট খরচ করে; Dashboard-এ আপনার ব্যালেন্স সবসময় দেখা যায়।",
      "আপনার নোট Knowledge Base-এ যোগ করুন যাতে স্ক্রিপ্ট আপনার মতো শোনায়।",
      "আপনার পছন্দের ভাষা Settings-এ, আর যেখানে আছে প্রতিটি মডিউলে সেট করুন।",
    ],
  },
};
