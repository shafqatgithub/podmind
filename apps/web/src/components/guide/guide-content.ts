/**
 * User-guide content, kept as data so the same structure renders in any
 * language. Adding a language is adding one key here — the UI reads whatever
 * is present. `dir` drives right-to-left rendering (Urdu).
 */

export type GuideLang =
  | "en" | "ur" | "hi" | "bn"
  | "ar" | "fa" | "ps" | "pa" | "ta"
  | "fr" | "es" | "pt" | "de" | "it"
  | "tr" | "ru" | "id" | "ms" | "sw" | "tl"
  | "zh" | "ja" | "ko" | "vi" | "th";

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

export const GUIDE_LANGS: GuideLang[] = [
  "en", "ur", "hi", "bn",
  "ar", "fa", "ps", "pa", "ta",
  "fr", "es", "pt", "de", "it",
  "tr", "ru", "id", "ms", "sw", "tl",
  "zh", "ja", "ko", "vi", "th",
];

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

  /* ------------------------------------------------------------------ Arabic */
  ar: {
    label: "العربية",
    dir: "rtl",
    pageTitle: "دليل الاستخدام",
    pageSubtitle: "كل ما تحتاجه لصنع أول حلقة لك.",
    languageLabel: "اللغة",
    episodeHeading: "كيف تصنع حلقة كاملة",
    shortcut:
      "اختصار: يقوم Episode Pipeline تلقائيًا بالبحث ← المخطط ← النص ← تحسين محركات البحث في تدفق واحد — مثالي لمسودة أولى سريعة.",
    featuresHeading: "ماذا تفعل كل ميزة",
    tipsHeading: "نصائح",
    openLabel: "افتح",
    steps: [
      { title: "١. أنشئ مشروعًا", body: "كل حلقة تبدأ من هنا. افتح Projects وأنشئ مشروعًا بعنوان وموضوع. سيصبح هذا المكان لبحثك ومخططك ونصك وتصديراتك." },
      { title: "٢. ابحث عن موضوع (اختياري)", body: "لست متأكدًا ماذا تغطي؟ افتح Topic Discovery للحصول على أفكار رائجة تناسب جمهورك." },
      { title: "٣. البحث", body: "افتح AI Research داخل مشروعك. يجمع الذكاء الاصطناعي الحقائق والزوايا والمصادر حول موضوعك حتى لا تبدأ من صفحة فارغة أبدًا." },
      { title: "٤. بناء المخطط", body: "افتح Outlines. يحوّل الذكاء الاصطناعي بحثك إلى هيكل واضح مقسّم إلى أجزاء. عدّله حتى يصبح التسلسل مناسبًا." },
      { title: "٥. كتابة النص", body: "افتح Scripts. من مخططك، يكتب الذكاء الاصطناعي نص الحلقة كاملاً — مقدمة، أجزاء، انتقالات وخاتمة. حسّن النبرة والصياغة." },
      { title: "٦. التحقق من الحقائق", body: "شغّل Fact Checker على نصك. يشير إلى الادعاءات التي تحتاج مصدرًا أو تبدو غير موثوقة، حتى تبقى دقيقًا." },
      { title: "٧. تجهيز ضيف (اختياري)", body: "تجري مقابلة مع أحدهم؟ يبحث Guest Assistant عن الضيف ويقترح نبذة تعريفية وأسئلة ذكية." },
      { title: "٨. تحسين محركات البحث والسوشيال", body: "استخدم SEO Engine لعنوان ووصف وكلمات مفتاحية قوية، وSocial Posts لمنشورات ترويجية جاهزة للمشاركة." },
      { title: "٩. التصدير والجدولة", body: "افتح Export Center لتنزيل نصك وملاحظات الحلقة بالصيغة التي تحتاجها، واستخدم Calendar لجدولة الحلقة." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "قاعدتك الرئيسية — المشاريع الأخيرة، الأرصدة، النشاط والإجراءات السريعة." },
      { name: "Topic Discovery", href: HREF.topics, body: "اعثر على أفكار حلقات رائجة تناسب جمهورك." },
      { name: "Episode Pipeline", href: HREF.agents, body: "أتمتة العملية بأكملها — من البحث إلى النص إلى تحسين محركات البحث — في تشغيل واحد." },
      { name: "Calendar", href: HREF.calendar, body: "خطط وجدول حلقاتك مع تذكيرات." },
      { name: "AI Chat", href: HREF.chat, body: "اسأل الذكاء الاصطناعي عن أي شيء يخص برنامجك وابتكر أفكارًا مباشرة." },
      { name: "AI Research", href: HREF.research, body: "اجمع الحقائق والزوايا والمصادر حول موضوع ما." },
      { name: "Outlines", href: HREF.outlines, body: "حوّل البحث إلى هيكل أجزاء واضح." },
      { name: "Scripts", href: HREF.scripts, body: "اكتب نص الحلقة كاملاً وحسّنه." },
      { name: "Guest Assistant", href: HREF.guests, body: "ابحث عن الضيوف وأنشئ نبذًا وأسئلة." },
      { name: "Fact Checker", href: HREF.fact, body: "تحقق من الادعاءات في نصك مقابل مصادر." },
      { name: "SEO Engine", href: HREF.seo, body: "عناوين وأوصاف وكلمات مفتاحية يمكن العثور عليها." },
      { name: "Social Posts", href: HREF.social, body: "منشورات ترويجية جاهزة للمشاركة على كل منصة." },
      { name: "Projects", href: HREF.projects, body: "مساحة عمل كل حلقة — البحث والمخطط والنص والتصدير في مكان واحد." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "ارفع ملاحظاتك ومستنداتك ليستخدم الذكاء الاصطناعي موادك الخاصة." },
      { name: "AI Memory", href: HREF.memory, body: "يتذكر الذكاء الاصطناعي أسلوبك وحلقاتك السابقة للحفاظ على الاتساق." },
      { name: "Export Center", href: HREF.exports, body: "نزّل النصوص وملاحظات الحلقات بصيغ متعددة." },
      { name: "Analytics", href: HREF.analytics, body: "اطّلع على استخدامك وأداء محتواك." },
      { name: "Billing", href: HREF.billing, body: "أدر خطتك وأرصدة الذكاء الاصطناعي." },
      { name: "API Keys", href: HREF.apiKeys, body: "اربط مفاتيح مزوّد الذكاء الاصطناعي الخاصة بك (اختياري، متقدم)." },
      { name: "Settings", href: HREF.settings, body: "الملف الشخصي واللغة وتفضيلات الحساب." },
    ],
    tips: [
      "لست مضطرًا لاستخدام كل أداة — يمكن أن تُصنع حلقة رائعة بمجرد البحث ← المخطط ← النص.",
      "كل إجراء ذكاء اصطناعي يستهلك أرصدة؛ تعرض لوحة التحكم رصيدك دائمًا.",
      "أضف ملاحظاتك إلى Knowledge Base ليبدو النص وكأنك أنت من كتبه.",
      "اضبط لغتك المفضلة في Settings، وفي كل وحدة تتيح ذلك.",
    ],
  },

  /* ------------------------------------------------------------------ Persian/Farsi */
  fa: {
    label: "فارسی",
    dir: "rtl",
    pageTitle: "راهنمای استفاده",
    pageSubtitle: "هر آنچه برای ساخت اولین قسمت‌تان نیاز دارید.",
    languageLabel: "زبان",
    episodeHeading: "چگونه یک قسمت کامل بسازیم",
    shortcut:
      "میان‌بر: Episode Pipeline به‌طور خودکار تحقیق ← طرح‌کلی ← اسکریپت ← سئو را در یک مرحله انجام می‌دهد — عالی برای پیش‌نویس سریع اول.",
    featuresHeading: "هر ویژگی چه کاری انجام می‌دهد",
    tipsHeading: "نکات",
    openLabel: "باز کردن",
    steps: [
      { title: "۱. یک پروژه بسازید", body: "هر قسمت از اینجا شروع می‌شود. Projects را باز کنید و با عنوان و موضوع پروژه‌ای بسازید. این خانه‌ی تحقیق، طرح‌کلی، اسکریپت و خروجی‌های شما می‌شود." },
      { title: "۲. موضوع پیدا کنید (اختیاری)", body: "نمی‌دانید درباره چه چیزی صحبت کنید؟ Topic Discovery را باز کنید تا ایده‌های داغ و متناسب با مخاطب پیدا کنید." },
      { title: "۳. تحقیق", body: "AI Research را در پروژه‌تان باز کنید. هوش مصنوعی حقایق، زاویه‌ها و منابع را درباره موضوع شما جمع‌آوری می‌کند تا هرگز از صفحه خالی شروع نکنید." },
      { title: "۴. ساخت طرح‌کلی", body: "Outlines را باز کنید. هوش مصنوعی تحقیق شما را به ساختاری واضح و بخش‌بندی‌شده تبدیل می‌کند. آن را ویرایش کنید تا روند مناسب شود." },
      { title: "۵. نوشتن اسکریپت", body: "Scripts را باز کنید. از روی طرح‌کلی، هوش مصنوعی کل اسکریپت قسمت را می‌نویسد — مقدمه، بخش‌ها، انتقال‌ها و پایان. لحن و کلمات را اصلاح کنید." },
      { title: "۶. راستی‌آزمایی", body: "Fact Checker را روی اسکریپت خود اجرا کنید. ادعاهایی که نیاز به منبع دارند یا مشکوک به‌نظر می‌رسند را علامت‌گذاری می‌کند." },
      { title: "۷. آماده‌سازی مهمان (اختیاری)", body: "با کسی مصاحبه می‌کنید؟ Guest Assistant درباره مهمان تحقیق می‌کند و بیوگرافی و سؤالات هوشمندانه پیشنهاد می‌دهد." },
      { title: "۸. سئو و شبکه‌های اجتماعی", body: "از SEO Engine برای عنوان، توضیحات و کلمات کلیدی قوی و از Social Posts برای متن تبلیغاتی آماده استفاده کنید." },
      { title: "۹. خروجی و زمان‌بندی", body: "Export Center را باز کنید تا اسکریپت و یادداشت‌های نمایش را در فرمت موردنیاز دانلود کنید و از Calendar برای زمان‌بندی قسمت استفاده کنید." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "پایگاه اصلی شما — پروژه‌های اخیر، اعتبار، فعالیت و اقدامات سریع." },
      { name: "Topic Discovery", href: HREF.topics, body: "ایده‌های قسمت داغ و متناسب با مخاطب پیدا کنید." },
      { name: "Episode Pipeline", href: HREF.agents, body: "کل روند — از تحقیق تا اسکریپت تا سئو — را در یک اجرا خودکار کنید." },
      { name: "Calendar", href: HREF.calendar, body: "برنامه‌ریزی و زمان‌بندی قسمت‌ها، همراه با یادآوری." },
      { name: "AI Chat", href: HREF.chat, body: "هر چیزی درباره برنامه‌تان از هوش مصنوعی بپرسید و ایده‌پردازی کنید." },
      { name: "AI Research", href: HREF.research, body: "حقایق، زاویه‌ها و منابع را برای یک موضوع جمع‌آوری کنید." },
      { name: "Outlines", href: HREF.outlines, body: "تحقیق را به ساختار بخش‌بندی‌شده واضح تبدیل کنید." },
      { name: "Scripts", href: HREF.scripts, body: "اسکریپت کامل قسمت را بنویسید و اصلاح کنید." },
      { name: "Guest Assistant", href: HREF.guests, body: "درباره مهمانان تحقیق کنید و بیوگرافی و سؤالات بسازید." },
      { name: "Fact Checker", href: HREF.fact, body: "ادعاهای اسکریپت را در برابر منابع بررسی کنید." },
      { name: "SEO Engine", href: HREF.seo, body: "عناوین، توضیحات و کلمات کلیدی که پیدا می‌شوند." },
      { name: "Social Posts", href: HREF.social, body: "پست‌های تبلیغاتی آماده اشتراک‌گذاری برای هر پلتفرم." },
      { name: "Projects", href: HREF.projects, body: "فضای کاری هر قسمت — تحقیق، طرح‌کلی، اسکریپت و خروجی در یک جا." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "یادداشت‌ها و اسناد خود را آپلود کنید تا هوش مصنوعی از مطالب خودتان استفاده کند." },
      { name: "AI Memory", href: HREF.memory, body: "هوش مصنوعی سبک و قسمت‌های قبلی شما را برای هماهنگی به‌خاطر می‌سپارد." },
      { name: "Export Center", href: HREF.exports, body: "اسکریپت‌ها و یادداشت‌های نمایش را در چند فرمت دانلود کنید." },
      { name: "Analytics", href: HREF.analytics, body: "استفاده و عملکرد محتوای خود را ببینید." },
      { name: "Billing", href: HREF.billing, body: "پلن و اعتبار هوش مصنوعی خود را مدیریت کنید." },
      { name: "API Keys", href: HREF.apiKeys, body: "کلیدهای ارائه‌دهنده هوش مصنوعی خودتان را متصل کنید (اختیاری، پیشرفته)." },
      { name: "Settings", href: HREF.settings, body: "پروفایل، زبان و تنظیمات حساب." },
    ],
    tips: [
      "لازم نیست از هر ابزاری استفاده کنید — یک قسمت عالی می‌تواند فقط از تحقیق ← طرح‌کلی ← اسکریپت ساخته شود.",
      "هر عملیات هوش مصنوعی از اعتبار شما استفاده می‌کند؛ داشبورد همیشه موجودی شما را نشان می‌دهد.",
      "یادداشت‌های خود را به Knowledge Base اضافه کنید تا اسکریپت‌ها شبیه صدای شما باشند.",
      "زبان مورد نظر خود را در Settings و در هر ماژولی که ارائه می‌شود تنظیم کنید.",
    ],
  },

  /* ------------------------------------------------------------------ Pashto */
  ps: {
    label: "پښتو",
    dir: "rtl",
    pageTitle: "د کارونې لارښود",
    pageSubtitle: "هر هغه څه چې تاسو ته د خپلې لومړۍ برخې جوړولو لپاره اړین دي.",
    languageLabel: "ژبه",
    episodeHeading: "بشپړه برخه څنګه جوړه کړئ",
    shortcut:
      "لنډلاره: Episode Pipeline په اتوماتيک ډول یوځای کې لټون ← طرحه ← سکرېپټ ← SEO ترسره کوي — د چټک لومړي مسودې لپاره غوره.",
    featuresHeading: "هره ځانګړتیا څه کوي",
    tipsHeading: "مشورې",
    openLabel: "پرانیزئ",
    steps: [
      { title: "۱. یو پروژکټ جوړ کړئ", body: "هره برخه له دې ځایه پیل کیږي. Projects پرانیزئ او د سرلیک او موضوع سره یو پروژکټ جوړ کړئ. دا به ستاسو د لټون، طرحې، سکرېپټ او صادراتو کور شي." },
      { title: "۲. موضوع ومومئ (اختیاري)", body: "ډاډه نه یاست چې څه پوښښ ورکړئ؟ Topic Discovery پرانیزئ ترڅو د لیدونکو سره اړوند نظرونه ومومئ." },
      { title: "۳. لټون", body: "په خپل پروژکټ کې AI Research پرانیزئ. AI ستاسو د موضوع په اړه حقایق، زاویې او سرچینې راټولوي." },
      { title: "۴. طرحه جوړه کړئ", body: "Outlines پرانیزئ. AI ستاسو لټون یوې روښانه ساختماني بڼې ته اړوي. تر هغه یې ایډیټ کړئ چې بهیر سم شي." },
      { title: "۵. سکرېپټ ولیکئ", body: "Scripts پرانیزئ. له طرحې څخه AI بشپړ سکرېپټ لیکي — پیل، برخې، انتقالونه او پای. لهجه او الفاظ ښه کړئ." },
      { title: "۶. حقیقت وګورئ", body: "پر خپل سکرېپټ Fact Checker چل کړئ. دا هغه ادعاوې نښه کوي چې سرچینې ته اړتیا لري یا کمزورې ښکاري." },
      { title: "۷. د مېلمه چمتووالی (اختیاري)", body: "له چا سره مرکه کوئ؟ Guest Assistant د مېلمه په اړه لټون کوي او پېژندنه او هوښیار پوښتنې وړاندې کوي." },
      { title: "۸. SEO او ټولنیز رسنۍ", body: "د قوي سرلیک، تشریح او کلیدي کلمو لپاره SEO Engine او د شریکولو لپاره چمتو پروموشني پوسټونو لپاره Social Posts وکاروئ." },
      { title: "۹. صادرول او مهالويش", body: "خپل سکرېپټ او د شو یادښتونه اړین بڼه کې ډاونلوډ کولو لپاره Export Center پرانیزئ، او د برخې مهالویش لپاره Calendar وکاروئ." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "ستاسو اصلي ځای — وروستي پروژکټونه، کریډیټونه، فعالیت او چټک کارونه." },
      { name: "Topic Discovery", href: HREF.topics, body: "د لیدونکو سره اړوند خپاره شوي د برخې نظرونه ومومئ." },
      { name: "Episode Pipeline", href: HREF.agents, body: "ټول بهیر — له لټون څخه تر سکرېپټ او SEO پورې — په یو چل کې اتوماتیک کړئ." },
      { name: "Calendar", href: HREF.calendar, body: "د یادونو سره د برخو پلان جوړونه او مهالویش." },
      { name: "AI Chat", href: HREF.chat, body: "د خپل شو په اړه له AI څخه هر څه وپوښتئ او سمدلاسه نظرونه جوړ کړئ." },
      { name: "AI Research", href: HREF.research, body: "د یوې موضوع لپاره حقایق، زاویې او سرچینې راټولې کړئ." },
      { name: "Outlines", href: HREF.outlines, body: "لټون یوې روښانې برخې ساختماني بڼې ته واړوئ." },
      { name: "Scripts", href: HREF.scripts, body: "بشپړ د برخې سکرېپټ ولیکئ او ښه یې کړئ." },
      { name: "Guest Assistant", href: HREF.guests, body: "د مېلمنو په اړه لټون وکړئ او پېژندنې او پوښتنې جوړې کړئ." },
      { name: "Fact Checker", href: HREF.fact, body: "د سکرېپټ ادعاوې د سرچینو سره وګورئ." },
      { name: "SEO Engine", href: HREF.seo, body: "سرلیکونه، تشریحات او کلیدي کلمې چې موندل کیدی شي." },
      { name: "Social Posts", href: HREF.social, body: "د هرې پلیټ فارم لپاره د شریکولو لپاره چمتو پروموشني پوسټونه." },
      { name: "Projects", href: HREF.projects, body: "د هرې برخې کاري ځای — لټون، طرحه، سکرېپټ او صادرات په یو ځای کې." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "خپل یادښتونه او اسناد اپلوډ کړئ ترڅو AI ستاسو خپل مواد وکاروي." },
      { name: "AI Memory", href: HREF.memory, body: "AI ستاسو سبک او پخوانۍ برخې د همغږۍ لپاره په یاد لري." },
      { name: "Export Center", href: HREF.exports, body: "سکرېپټونه او د شو یادښتونه په ډیرو بڼو ډاونلوډ کړئ." },
      { name: "Analytics", href: HREF.analytics, body: "خپل کارونه او د منځپانګې فعالیت وګورئ." },
      { name: "Billing", href: HREF.billing, body: "خپل پلان او د AI کریډیټونه اداره کړئ." },
      { name: "API Keys", href: HREF.apiKeys, body: "خپلې د AI چمتوونکي کلیدونه وصل کړئ (اختیاري، پرمختللی)." },
      { name: "Settings", href: HREF.settings, body: "پروفایل، ژبه او د حساب غوراوي." },
    ],
    tips: [
      "اړینه نه ده چې هر وسیله وکاروئ — یوه غوره برخه یوازې د لټون ← طرحې ← سکرېپټ سره هم جوړیدی شي.",
      "هر AI کړنه کریډیټونه کاروي؛ Dashboard تل ستاسو بیلانس ښیي.",
      "خپل یادښتونه Knowledge Base ته اضافه کړئ ترڅو سکرېپټونه ستاسو غوندې ښکاره شي.",
      "خپله غوره ژبه Settings کې، او هرچیرې چې شتون ولري هر موډول کې وټاکئ.",
    ],
  },

  /* ------------------------------------------------------------------ Punjabi (Gurmukhi) */
  pa: {
    label: "ਪੰਜਾਬੀ",
    dir: "ltr",
    pageTitle: "ਵਰਤੋਂ ਗਾਈਡ",
    pageSubtitle: "ਆਪਣੀ ਪਹਿਲੀ ਐਪੀਸੋਡ ਬਣਾਉਣ ਲਈ ਲੋੜੀਂਦੀ ਹਰ ਚੀਜ਼।",
    languageLabel: "ਭਾਸ਼ਾ",
    episodeHeading: "ਪੂਰੀ ਐਪੀਸੋਡ ਕਿਵੇਂ ਬਣਾਈਏ",
    shortcut:
      "ਸ਼ਾਰਟਕੱਟ: Episode Pipeline ਆਪਣੇ ਆਪ ਇੱਕੋ ਵਹਾਅ ਵਿੱਚ ਖੋਜ ← ਆਉਟਲਾਈਨ ← ਸਕ੍ਰਿਪਟ ← SEO ਕਰ ਦਿੰਦਾ ਹੈ — ਤੇਜ਼ ਪਹਿਲੇ ਖਰੜੇ ਲਈ ਬਿਹਤਰੀਨ।",
    featuresHeading: "ਹਰ ਫੀਚਰ ਕੀ ਕਰਦਾ ਹੈ",
    tipsHeading: "ਸੁਝਾਅ",
    openLabel: "ਖੋਲ੍ਹੋ",
    steps: [
      { title: "੧. ਪ੍ਰੋਜੈਕਟ ਬਣਾਓ", body: "ਹਰ ਐਪੀਸੋਡ ਇੱਥੋਂ ਸ਼ੁਰੂ ਹੁੰਦੀ ਹੈ। Projects ਖੋਲ੍ਹੋ ਅਤੇ ਸਿਰਲੇਖ ਤੇ ਵਿਸ਼ੇ ਨਾਲ ਇੱਕ ਪ੍ਰੋਜੈਕਟ ਬਣਾਓ। ਇਹ ਤੁਹਾਡੀ ਖੋਜ, ਆਉਟਲਾਈਨ, ਸਕ੍ਰਿਪਟ ਅਤੇ ਐਕਸਪੋਰਟ ਦਾ ਟਿਕਾਣਾ ਬਣ ਜਾਂਦਾ ਹੈ।" },
      { title: "੨. ਵਿਸ਼ਾ ਲੱਭੋ (ਵਿਕਲਪਿਕ)", body: "ਸਮਝ ਨਹੀਂ ਆ ਰਿਹਾ ਕਿਸ ਬਾਰੇ ਗੱਲ ਕਰਨੀ ਹੈ? Topic Discovery ਖੋਲ੍ਹੋ ਅਤੇ ਟ੍ਰੈਂਡਿੰਗ, ਦਰਸ਼ਕਾਂ ਦੇ ਅਨੁਕੂਲ ਵਿਚਾਰ ਲਵੋ।" },
      { title: "੩. ਖੋਜ", body: "ਆਪਣੇ ਪ੍ਰੋਜੈਕਟ ਵਿੱਚ AI Research ਖੋਲ੍ਹੋ। AI ਤੁਹਾਡੇ ਵਿਸ਼ੇ ਬਾਰੇ ਤੱਥ, ਪਹਿਲੂ ਅਤੇ ਸਰੋਤ ਇਕੱਠੇ ਕਰਦਾ ਹੈ।" },
      { title: "੪. ਆਉਟਲਾਈਨ ਬਣਾਓ", body: "Outlines ਖੋਲ੍ਹੋ। AI ਤੁਹਾਡੀ ਖੋਜ ਨੂੰ ਸਾਫ਼ ਖੰਡ-ਦਰ-ਖੰਡ ਢਾਂਚੇ ਵਿੱਚ ਬਦਲਦਾ ਹੈ। ਵਹਾਅ ਠੀਕ ਹੋਣ ਤੱਕ ਇਸਨੂੰ ਸੋਧੋ।" },
      { title: "੫. ਸਕ੍ਰਿਪਟ ਲਿਖੋ", body: "Scripts ਖੋਲ੍ਹੋ। ਆਉਟਲਾਈਨ ਤੋਂ AI ਪੂਰੀ ਸਕ੍ਰਿਪਟ ਲਿਖਦਾ ਹੈ — ਇੰਟਰੋ, ਖੰਡ, ਟ੍ਰਾਂਜ਼ਿਸ਼ਨ ਅਤੇ ਆਊਟਰੋ। ਲਹਿਜ਼ਾ ਤੇ ਸ਼ਬਦ ਨਿਖਾਰੋ।" },
      { title: "੬. ਤੱਥ-ਜਾਂਚ", body: "ਆਪਣੀ ਸਕ੍ਰਿਪਟ 'ਤੇ Fact Checker ਚਲਾਓ। ਇਹ ਉਹਨਾਂ ਦਾਅਵਿਆਂ ਨੂੰ ਨਿਸ਼ਾਨਬੱਧ ਕਰਦਾ ਹੈ ਜਿਨ੍ਹਾਂ ਨੂੰ ਸਰੋਤ ਦੀ ਲੋੜ ਹੈ।" },
      { title: "੭. ਮਹਿਮਾਨ ਦੀ ਤਿਆਰੀ (ਵਿਕਲਪਿਕ)", body: "ਕਿਸੇ ਦਾ ਇੰਟਰਵਿਊ ਲੈ ਰਹੇ ਹੋ? Guest Assistant ਮਹਿਮਾਨ 'ਤੇ ਖੋਜ ਕਰਦਾ ਹੈ ਅਤੇ ਜਾਣ-ਪਛਾਣ ਤੇ ਵਧੀਆ ਸਵਾਲ ਸੁਝਾਉਂਦਾ ਹੈ।" },
      { title: "੮. SEO ਅਤੇ ਸੋਸ਼ਲ", body: "ਮਜ਼ਬੂਤ ਸਿਰਲੇਖ, ਵੇਰਵੇ ਅਤੇ ਕੀਵਰਡਸ ਲਈ SEO Engine, ਅਤੇ ਸਾਂਝਾ ਕਰਨ ਲਈ ਤਿਆਰ ਪ੍ਰੋਮੋ ਲਈ Social Posts ਵਰਤੋ।" },
      { title: "੯. ਐਕਸਪੋਰਟ ਅਤੇ ਸ਼ਡਿਊਲ", body: "ਆਪਣੀ ਸਕ੍ਰਿਪਟ ਅਤੇ ਸ਼ੋਅ ਨੋਟਸ ਲੋੜੀਂਦੇ ਫਾਰਮੈਟ ਵਿੱਚ ਡਾਊਨਲੋਡ ਕਰਨ ਲਈ Export Center ਖੋਲ੍ਹੋ, ਅਤੇ ਐਪੀਸੋਡ ਸ਼ਡਿਊਲ ਕਰਨ ਲਈ Calendar ਵਰਤੋ।" },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "ਤੁਹਾਡਾ ਕੇਂਦਰ — ਹਾਲੀਆ ਪ੍ਰੋਜੈਕਟ, ਕ੍ਰੈਡਿਟ, ਗਤੀਵਿਧੀ ਅਤੇ ਤੁਰੰਤ ਕਾਰਵਾਈਆਂ।" },
      { name: "Topic Discovery", href: HREF.topics, body: "ਟ੍ਰੈਂਡਿੰਗ, ਦਰਸ਼ਕਾਂ ਦੇ ਅਨੁਕੂਲ ਐਪੀਸੋਡ ਵਿਚਾਰ ਲੱਭੋ।" },
      { name: "Episode Pipeline", href: HREF.agents, body: "ਪੂਰਾ ਵਹਾਅ — ਖੋਜ ਤੋਂ ਸਕ੍ਰਿਪਟ ਤੋਂ SEO ਤੱਕ — ਇੱਕ ਵਾਰ ਵਿੱਚ ਸਵੈਚਾਲਿਤ ਕਰੋ।" },
      { name: "Calendar", href: HREF.calendar, body: "ਯਾਦ-ਦਹਾਨੀਆਂ ਨਾਲ ਐਪੀਸੋਡਾਂ ਦੀ ਯੋਜਨਾ ਤੇ ਸ਼ਡਿਊਲਿੰਗ।" },
      { name: "AI Chat", href: HREF.chat, body: "ਆਪਣੇ ਸ਼ੋਅ ਬਾਰੇ AI ਤੋਂ ਕੁਝ ਵੀ ਪੁੱਛੋ ਅਤੇ ਵਿਚਾਰ ਬਣਾਓ।" },
      { name: "AI Research", href: HREF.research, body: "ਕਿਸੇ ਵਿਸ਼ੇ ਲਈ ਤੱਥ, ਪਹਿਲੂ ਤੇ ਸਰੋਤ ਇਕੱਠੇ ਕਰੋ।" },
      { name: "Outlines", href: HREF.outlines, body: "ਖੋਜ ਨੂੰ ਸਾਫ਼ ਖੰਡ-ਢਾਂਚੇ ਵਿੱਚ ਬਦਲੋ।" },
      { name: "Scripts", href: HREF.scripts, body: "ਪੂਰੀ ਐਪੀਸੋਡ ਸਕ੍ਰਿਪਟ ਲਿਖੋ ਤੇ ਨਿਖਾਰੋ।" },
      { name: "Guest Assistant", href: HREF.guests, body: "ਮਹਿਮਾਨਾਂ 'ਤੇ ਖੋਜ ਕਰੋ ਅਤੇ ਜਾਣ-ਪਛਾਣ ਤੇ ਸਵਾਲ ਬਣਾਓ।" },
      { name: "Fact Checker", href: HREF.fact, body: "ਸਕ੍ਰਿਪਟ ਦੇ ਦਾਅਵਿਆਂ ਨੂੰ ਸਰੋਤਾਂ ਨਾਲ ਜਾਂਚੋ।" },
      { name: "SEO Engine", href: HREF.seo, body: "ਸਿਰਲੇਖ, ਵੇਰਵੇ ਤੇ ਕੀਵਰਡ ਜੋ ਖੋਜ ਵਿੱਚ ਆਉਣ।" },
      { name: "Social Posts", href: HREF.social, body: "ਹਰ ਪਲੇਟਫਾਰਮ ਲਈ ਸਾਂਝਾ ਕਰਨ ਲਈ ਤਿਆਰ ਪ੍ਰੋਮੋ ਪੋਸਟਾਂ।" },
      { name: "Projects", href: HREF.projects, body: "ਹਰ ਐਪੀਸੋਡ ਦੀ ਥਾਂ — ਖੋਜ, ਆਉਟਲਾਈਨ, ਸਕ੍ਰਿਪਟ ਤੇ ਐਕਸਪੋਰਟ ਇੱਕ ਥਾਂ।" },
      { name: "Knowledge Base", href: HREF.knowledge, body: "ਆਪਣੇ ਨੋਟਸ ਤੇ ਦਸਤਾਵੇਜ਼ ਅੱਪਲੋਡ ਕਰੋ ਤਾਂ AI ਤੁਹਾਡੀ ਆਪਣੀ ਸਮੱਗਰੀ ਵਰਤੇ।" },
      { name: "AI Memory", href: HREF.memory, body: "AI ਤੁਹਾਡੀ ਸ਼ੈਲੀ ਤੇ ਪੁਰਾਣੀਆਂ ਐਪੀਸੋਡਾਂ ਯਾਦ ਰੱਖਦਾ ਹੈ।" },
      { name: "Export Center", href: HREF.exports, body: "ਸਕ੍ਰਿਪਟਾਂ ਤੇ ਸ਼ੋਅ ਨੋਟਸ ਕਈ ਫਾਰਮੈਟਾਂ ਵਿੱਚ ਡਾਊਨਲੋਡ ਕਰੋ।" },
      { name: "Analytics", href: HREF.analytics, body: "ਆਪਣੀ ਵਰਤੋਂ ਤੇ ਸਮੱਗਰੀ ਦੀ ਕਾਰਗੁਜ਼ਾਰੀ ਵੇਖੋ।" },
      { name: "Billing", href: HREF.billing, body: "ਆਪਣਾ ਪਲਾਨ ਤੇ AI ਕ੍ਰੈਡਿਟ ਸੰਭਾਲੋ।" },
      { name: "API Keys", href: HREF.apiKeys, body: "ਆਪਣੀਆਂ AI ਪ੍ਰੋਵਾਈਡਰ ਕੀਜ਼ ਜੋੜੋ (ਵਿਕਲਪਿਕ, ਐਡਵਾਂਸਡ)।" },
      { name: "Settings", href: HREF.settings, body: "ਪ੍ਰੋਫਾਈਲ, ਭਾਸ਼ਾ ਤੇ ਖਾਤਾ ਤਰਜੀਹਾਂ।" },
    ],
    tips: [
      "ਹਰ ਟੂਲ ਵਰਤਣਾ ਜ਼ਰੂਰੀ ਨਹੀਂ — ਵਧੀਆ ਐਪੀਸੋਡ ਸਿਰਫ਼ ਖੋਜ ← ਆਉਟਲਾਈਨ ← ਸਕ੍ਰਿਪਟ ਨਾਲ ਵੀ ਬਣ ਸਕਦੀ ਹੈ।",
      "ਹਰ AI ਕਾਰਵਾਈ ਕ੍ਰੈਡਿਟ ਵਰਤਦੀ ਹੈ; Dashboard 'ਤੇ ਤੁਹਾਡਾ ਬੈਲੈਂਸ ਹਮੇਸ਼ਾ ਦਿਖਦਾ ਹੈ।",
      "ਆਪਣੇ ਨੋਟਸ Knowledge Base ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ ਤਾਂ ਸਕ੍ਰਿਪਟਾਂ ਤੁਹਾਡੇ ਵਰਗੀਆਂ ਲੱਗਣ।",
      "ਆਪਣੀ ਪਸੰਦੀਦਾ ਭਾਸ਼ਾ Settings ਵਿੱਚ, ਅਤੇ ਜਿੱਥੇ ਉਪਲਬਧ ਹੋਵੇ ਹਰ ਮੋਡਿਊਲ ਵਿੱਚ ਸੈੱਟ ਕਰੋ।",
    ],
  },

  /* ------------------------------------------------------------------ Tamil */
  ta: {
    label: "தமிழ்",
    dir: "ltr",
    pageTitle: "பயன்பாட்டு வழிகாட்டி",
    pageSubtitle: "உங்கள் முதல் எபிசோடை உருவாக்க தேவையான அனைத்தும்.",
    languageLabel: "மொழி",
    episodeHeading: "முழு எபிசோடை எப்படி உருவாக்குவது",
    shortcut:
      "குறுக்குவழி: Episode Pipeline தானாகவே ஒரே ஓட்டத்தில் ஆராய்ச்சி ← அவுட்லைன் ← ஸ்கிரிப்ட் ← SEO ஆகியவற்றை செய்கிறது — வேகமான முதல் வரைவுக்கு சிறந்தது.",
    featuresHeading: "ஒவ்வொரு அம்சமும் என்ன செய்கிறது",
    tipsHeading: "குறிப்புகள்",
    openLabel: "திற",
    steps: [
      { title: "1. ஒரு திட்டத்தை உருவாக்கவும்", body: "ஒவ்வொரு எபிசோடும் இங்கிருந்தே தொடங்குகிறது. Projects ஐத் திறந்து தலைப்பு மற்றும் தலைப்புடன் ஒரு திட்டத்தை உருவாக்கவும். இது உங்கள் ஆராய்ச்சி, அவுட்லைன், ஸ்கிரிப்ட் மற்றும் ஏற்றுமதிகளின் இடமாக மாறும்." },
      { title: "2. தலைப்பைக் கண்டறியவும் (விருப்பத்தேர்வு)", body: "எதைப் பற்றி பேசுவது என்று தெரியவில்லையா? டிரெண்டிங், பார்வையாளர்களுக்கு ஏற்ற யோசனைகளுக்கு Topic Discovery ஐத் திறக்கவும்." },
      { title: "3. ஆராய்ச்சி", body: "உங்கள் திட்டத்தில் AI Research ஐத் திறக்கவும். AI உங்கள் தலைப்பில் உண்மைகள், கோணங்கள் மற்றும் ஆதாரங்களை சேகரிக்கிறது." },
      { title: "4. அவுட்லைனை உருவாக்கவும்", body: "Outlines ஐத் திறக்கவும். AI உங்கள் ஆராய்ச்சியை தெளிவான, பிரிவு வாரியான கட்டமைப்பாக மாற்றுகிறது." },
      { title: "5. ஸ்கிரிப்ட் எழுதவும்", body: "Scripts ஐத் திறக்கவும். உங்கள் அவுட்லைனிலிருந்து AI முழு எபிசோட் ஸ்கிரிப்டையும் எழுதுகிறது — அறிமுகம், பிரிவுகள், மாற்றங்கள் மற்றும் முடிவு." },
      { title: "6. உண்மை சரிபார்ப்பு", body: "உங்கள் ஸ்கிரிப்டில் Fact Checker ஐ இயக்கவும். மூலம் தேவைப்படும் அல்லது சந்தேகத்திற்குரிய கூற்றுகளைக் குறிக்கிறது." },
      { title: "7. விருந்தினரைத் தயார்படுத்துதல் (விருப்பத்தேர்வு)", body: "யாரையாவது நேர்காணல் செய்கிறீர்களா? Guest Assistant விருந்தினரை ஆராய்ந்து சுயவிவரம் மற்றும் புத்திசாலி கேள்விகளை பரிந்துரைக்கிறது." },
      { title: "8. SEO & சமூக ஊடகம்", body: "வலுவான தலைப்பு, விளக்கம் மற்றும் முக்கிய வார்த்தைகளுக்கு SEO Engine ஐயும், பகிர தயாரான விளம்பரங்களுக்கு Social Posts ஐயும் பயன்படுத்தவும்." },
      { title: "9. ஏற்றுமதி & திட்டமிடல்", body: "உங்கள் ஸ்கிரிப்ட் மற்றும் ஷோ குறிப்புகளை பதிவிறக்க Export Center ஐத் திறந்து, எபிசோடைத் திட்டமிட Calendar ஐப் பயன்படுத்தவும்." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "உங்கள் மையம் — சமீபத்திய திட்டங்கள், கிரெடிட்கள், செயல்பாடு மற்றும் விரைவு நடவடிக்கைகள்." },
      { name: "Topic Discovery", href: HREF.topics, body: "டிரெண்டிங், பார்வையாளர்களுக்கு ஏற்ற எபிசோட் யோசனைகளைக் கண்டறியவும்." },
      { name: "Episode Pipeline", href: HREF.agents, body: "ஆராய்ச்சியிலிருந்து ஸ்கிரிப்ட் வரை SEO வரை — ஒரே இயக்கத்தில் தானியங்குபடுத்தவும்." },
      { name: "Calendar", href: HREF.calendar, body: "நினைவூட்டல்களுடன் எபிசோடுகளைத் திட்டமிடவும்." },
      { name: "AI Chat", href: HREF.chat, body: "உங்கள் நிகழ்ச்சி பற்றி AI யிடம் எதையும் கேட்டு யோசனைகளை உருவாக்கவும்." },
      { name: "AI Research", href: HREF.research, body: "ஒரு தலைப்பிற்கான உண்மைகள், கோணங்கள் மற்றும் ஆதாரங்களை சேகரிக்கவும்." },
      { name: "Outlines", href: HREF.outlines, body: "ஆராய்ச்சியை தெளிவான பிரிவு கட்டமைப்பாக மாற்றவும்." },
      { name: "Scripts", href: HREF.scripts, body: "முழு எபிசோட் ஸ்கிரிப்டையும் எழுதி மேம்படுத்தவும்." },
      { name: "Guest Assistant", href: HREF.guests, body: "விருந்தினர்களை ஆராய்ந்து சுயவிவரங்கள் மற்றும் கேள்விகளை உருவாக்கவும்." },
      { name: "Fact Checker", href: HREF.fact, body: "ஸ்கிரிப்டிலுள்ள கூற்றுகளை ஆதாரங்களுடன் சரிபார்க்கவும்." },
      { name: "SEO Engine", href: HREF.seo, body: "கண்டுபிடிக்கக்கூடிய தலைப்புகள், விளக்கங்கள் மற்றும் முக்கிய வார்த்தைகள்." },
      { name: "Social Posts", href: HREF.social, body: "ஒவ்வொரு தளத்திற்கும் பகிர தயாரான விளம்பர இடுகைகள்." },
      { name: "Projects", href: HREF.projects, body: "ஒவ்வொரு எபிசோடின் பணியிடம் — ஆராய்ச்சி, அவுட்லைன், ஸ்கிரிப்ட் மற்றும் ஏற்றுமதிகள் ஒரே இடத்தில்." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "AI உங்கள் சொந்த பொருளைப் பயன்படுத்த உங்கள் குறிப்புகள் மற்றும் ஆவணங்களை பதிவேற்றவும்." },
      { name: "AI Memory", href: HREF.memory, body: "நிலைத்தன்மைக்காக AI உங்கள் பாணி மற்றும் கடந்த எபிசோடுகளை நினைவில் வைத்திருக்கும்." },
      { name: "Export Center", href: HREF.exports, body: "ஸ்கிரிப்ட்கள் மற்றும் ஷோ குறிப்புகளை பல வடிவங்களில் பதிவிறக்கவும்." },
      { name: "Analytics", href: HREF.analytics, body: "உங்கள் பயன்பாடு மற்றும் உள்ளடக்க செயல்திறனைப் பார்க்கவும்." },
      { name: "Billing", href: HREF.billing, body: "உங்கள் திட்டம் மற்றும் AI கிரெடிட்களை நிர்வகிக்கவும்." },
      { name: "API Keys", href: HREF.apiKeys, body: "உங்கள் சொந்த AI வழங்குநர் விசைகளை இணைக்கவும் (விருப்பத்தேர்வு, மேம்பட்டது)." },
      { name: "Settings", href: HREF.settings, body: "சுயவிவரம், மொழி மற்றும் கணக்கு விருப்பத்தேர்வுகள்." },
    ],
    tips: [
      "ஒவ்வொரு கருவியையும் நீங்கள் பயன்படுத்த வேண்டியதில்லை — ஆராய்ச்சி ← அவுட்லைன் ← ஸ்கிரிப்ட் மட்டுமே ஒரு சிறந்த எபிசோடை உருவாக்கலாம்.",
      "ஒவ்வொரு AI செயலும் கிரெடிட்களைப் பயன்படுத்துகிறது; Dashboard எப்போதும் உங்கள் இருப்பைக் காட்டுகிறது.",
      "ஸ்கிரிப்ட்கள் உங்களைப் போல் ஒலிக்க உங்கள் குறிப்புகளை Knowledge Base இல் சேர்க்கவும்.",
      "உங்கள் விருப்பமான மொழியை Settings இலும், கிடைக்கும் இடங்களில் ஒவ்வொரு தொகுதியிலும் அமைக்கவும்.",
    ],
  },

  /* ------------------------------------------------------------------ French */
  fr: {
    label: "Français",
    dir: "ltr",
    pageTitle: "Guide d'utilisation",
    pageSubtitle: "Tout ce dont vous avez besoin pour créer votre premier épisode.",
    languageLabel: "Langue",
    episodeHeading: "Comment créer un épisode complet",
    shortcut:
      "Raccourci : Episode Pipeline enchaîne automatiquement recherche → plan → script → SEO en un seul passage — idéal pour un premier brouillon rapide.",
    featuresHeading: "Ce que fait chaque fonctionnalité",
    tipsHeading: "Astuces",
    openLabel: "Ouvrir",
    steps: [
      { title: "1. Créez un projet", body: "Chaque épisode commence ici. Ouvrez Projects et créez-en un avec un titre et un sujet. Il devient le lieu central de votre recherche, plan, script et exports." },
      { title: "2. Trouvez un sujet (optionnel)", body: "Pas sûr de quoi parler ? Ouvrez Topic Discovery pour des idées tendance et pertinentes pour votre audience." },
      { title: "3. Recherche", body: "Ouvrez AI Research dans votre projet. L'IA rassemble faits, angles et sources sur votre sujet, vous ne partez jamais d'une page blanche." },
      { title: "4. Construisez un plan", body: "Ouvrez Outlines. L'IA transforme votre recherche en une structure claire, segment par segment. Modifiez-la jusqu'à ce que le déroulé vous convienne." },
      { title: "5. Rédigez le script", body: "Ouvrez Scripts. À partir de votre plan, l'IA rédige le script complet de l'épisode — intro, segments, transitions et outro. Affinez le ton et les mots." },
      { title: "6. Vérifiez les faits", body: "Lancez Fact Checker sur votre script. Il signale les affirmations qui nécessitent une source ou semblent fragiles." },
      { title: "7. Préparez un invité (optionnel)", body: "Vous interviewez quelqu'un ? Guest Assistant recherche l'invité et suggère une bio et des questions pertinentes." },
      { title: "8. SEO et réseaux sociaux", body: "Utilisez SEO Engine pour un titre, une description et des mots-clés solides, et Social Posts pour des textes promotionnels prêts à partager." },
      { title: "9. Exportez et planifiez", body: "Ouvrez Export Center pour télécharger votre script et vos notes d'émission dans le format voulu, et utilisez Calendar pour planifier l'épisode." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "Votre point de départ — projets récents, crédits, activité et actions rapides." },
      { name: "Topic Discovery", href: HREF.topics, body: "Trouvez des idées d'épisodes tendance et pertinentes pour votre audience." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automatisez tout le flux — recherche, script, SEO — en une seule exécution." },
      { name: "Calendar", href: HREF.calendar, body: "Planifiez vos épisodes, avec des rappels." },
      { name: "AI Chat", href: HREF.chat, body: "Posez n'importe quelle question à l'IA sur votre émission et brainstormez en direct." },
      { name: "AI Research", href: HREF.research, body: "Rassemblez faits, angles et sources sur un sujet." },
      { name: "Outlines", href: HREF.outlines, body: "Transformez la recherche en structure claire par segments." },
      { name: "Scripts", href: HREF.scripts, body: "Rédigez et affinez le script complet de l'épisode." },
      { name: "Guest Assistant", href: HREF.guests, body: "Recherchez vos invités et générez bios et questions." },
      { name: "Fact Checker", href: HREF.fact, body: "Vérifiez les affirmations de votre script à partir de sources." },
      { name: "SEO Engine", href: HREF.seo, body: "Titres, descriptions et mots-clés qui se font trouver." },
      { name: "Social Posts", href: HREF.social, body: "Publications promotionnelles prêtes à partager pour chaque plateforme." },
      { name: "Projects", href: HREF.projects, body: "L'espace de travail de chaque épisode — recherche, plan, script et exports au même endroit." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Importez vos notes et documents pour que l'IA utilise votre propre matière." },
      { name: "AI Memory", href: HREF.memory, body: "L'IA se souvient de votre style et de vos épisodes passés pour rester cohérente." },
      { name: "Export Center", href: HREF.exports, body: "Téléchargez scripts et notes d'émission dans plusieurs formats." },
      { name: "Analytics", href: HREF.analytics, body: "Suivez votre utilisation et la performance de votre contenu." },
      { name: "Billing", href: HREF.billing, body: "Gérez votre forfait et vos crédits IA." },
      { name: "API Keys", href: HREF.apiKeys, body: "Connectez vos propres clés de fournisseur IA (optionnel, avancé)." },
      { name: "Settings", href: HREF.settings, body: "Profil, langue et préférences de compte." },
    ],
    tips: [
      "Vous n'êtes pas obligé d'utiliser tous les outils — un excellent épisode peut naître de Recherche → Plan → Script seulement.",
      "Chaque action IA consomme des crédits ; le Dashboard affiche toujours votre solde.",
      "Ajoutez vos notes à la Knowledge Base pour que les scripts vous ressemblent.",
      "Définissez votre langue préférée dans Settings, et dans chaque module où c'est proposé.",
    ],
  },

  /* ------------------------------------------------------------------ Spanish */
  es: {
    label: "Español",
    dir: "ltr",
    pageTitle: "Guía de uso",
    pageSubtitle: "Todo lo que necesitas para crear tu primer episodio.",
    languageLabel: "Idioma",
    episodeHeading: "Cómo crear un episodio completo",
    shortcut:
      "Atajo: Episode Pipeline ejecuta automáticamente investigación → guion esquemático → script → SEO en un solo flujo — perfecto para un primer borrador rápido.",
    featuresHeading: "Qué hace cada función",
    tipsHeading: "Consejos",
    openLabel: "Abrir",
    steps: [
      { title: "1. Crea un proyecto", body: "Cada episodio empieza aquí. Abre Projects y crea uno con un título y un tema. Se convierte en el hogar de tu investigación, esquema, script y exportaciones." },
      { title: "2. Encuentra un tema (opcional)", body: "¿No sabes de qué hablar? Abre Topic Discovery para ideas de tendencia relevantes para tu audiencia." },
      { title: "3. Investigación", body: "Abre AI Research en tu proyecto. La IA reúne datos, ángulos y fuentes sobre tu tema, así nunca partes de una página en blanco." },
      { title: "4. Construye un esquema", body: "Abre Outlines. La IA convierte tu investigación en una estructura clara, segmento por segmento. Edítala hasta que el flujo te convenza." },
      { title: "5. Escribe el guion", body: "Abre Scripts. A partir de tu esquema, la IA redacta el guion completo del episodio: intro, segmentos, transiciones y cierre. Ajusta el tono y las palabras." },
      { title: "6. Verifica los hechos", body: "Ejecuta Fact Checker en tu script. Señala afirmaciones que necesitan fuente o parecen poco sólidas." },
      { title: "7. Prepara un invitado (opcional)", body: "¿Entrevistas a alguien? Guest Assistant investiga al invitado y sugiere una biografía y preguntas inteligentes." },
      { title: "8. SEO y redes sociales", body: "Usa SEO Engine para un título, descripción y palabras clave sólidos, y Social Posts para textos promocionales listos para compartir." },
      { title: "9. Exporta y programa", body: "Abre Export Center para descargar tu script y notas del programa en el formato que necesites, y usa Calendar para programar el episodio." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "Tu base — proyectos recientes, créditos, actividad y acciones rápidas." },
      { name: "Topic Discovery", href: HREF.topics, body: "Encuentra ideas de episodios en tendencia y relevantes para tu audiencia." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automatiza todo el flujo — de investigación a script a SEO — en una sola ejecución." },
      { name: "Calendar", href: HREF.calendar, body: "Planifica y programa episodios, con recordatorios." },
      { name: "AI Chat", href: HREF.chat, body: "Pregúntale a la IA cualquier cosa sobre tu programa y haz lluvia de ideas en vivo." },
      { name: "AI Research", href: HREF.research, body: "Reúne datos, ángulos y fuentes sobre un tema." },
      { name: "Outlines", href: HREF.outlines, body: "Convierte la investigación en una estructura de segmentos clara." },
      { name: "Scripts", href: HREF.scripts, body: "Redacta y perfecciona el guion completo del episodio." },
      { name: "Guest Assistant", href: HREF.guests, body: "Investiga invitados y genera biografías y preguntas." },
      { name: "Fact Checker", href: HREF.fact, body: "Verifica las afirmaciones de tu script frente a fuentes." },
      { name: "SEO Engine", href: HREF.seo, body: "Títulos, descripciones y palabras clave que se encuentran." },
      { name: "Social Posts", href: HREF.social, body: "Publicaciones promocionales listas para compartir en cada plataforma." },
      { name: "Projects", href: HREF.projects, body: "El espacio de trabajo de cada episodio — investigación, esquema, script y exportaciones en un solo lugar." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Sube tus notas y documentos para que la IA use tu propio material." },
      { name: "AI Memory", href: HREF.memory, body: "La IA recuerda tu estilo y episodios anteriores para mantener la coherencia." },
      { name: "Export Center", href: HREF.exports, body: "Descarga scripts y notas del programa en varios formatos." },
      { name: "Analytics", href: HREF.analytics, body: "Consulta tu uso y el rendimiento de tu contenido." },
      { name: "Billing", href: HREF.billing, body: "Gestiona tu plan y créditos de IA." },
      { name: "API Keys", href: HREF.apiKeys, body: "Conecta tus propias claves de proveedor de IA (opcional, avanzado)." },
      { name: "Settings", href: HREF.settings, body: "Perfil, idioma y preferencias de cuenta." },
    ],
    tips: [
      "No tienes que usar todas las herramientas — un gran episodio puede salir solo de Investigación → Esquema → Script.",
      "Cada acción de IA consume créditos; el Dashboard siempre muestra tu saldo.",
      "Añade tus notas a la Knowledge Base para que los scripts suenen como tú.",
      "Define tu idioma preferido en Settings, y en cada módulo donde esté disponible.",
    ],
  },

  /* ------------------------------------------------------------------ Portuguese */
  pt: {
    label: "Português",
    dir: "ltr",
    pageTitle: "Guia de uso",
    pageSubtitle: "Tudo o que você precisa para criar seu primeiro episódio.",
    languageLabel: "Idioma",
    episodeHeading: "Como criar um episódio completo",
    shortcut:
      "Atalho: o Episode Pipeline executa automaticamente pesquisa → roteiro-esboço → script → SEO em um único fluxo — perfeito para um primeiro rascunho rápido.",
    featuresHeading: "O que cada recurso faz",
    tipsHeading: "Dicas",
    openLabel: "Abrir",
    steps: [
      { title: "1. Crie um projeto", body: "Todo episódio começa aqui. Abra Projects e crie um com título e tema. Ele se torna a base da sua pesquisa, esboço, script e exportações." },
      { title: "2. Encontre um tema (opcional)", body: "Não sabe sobre o que falar? Abra Topic Discovery para ideias em alta relevantes para o seu público." },
      { title: "3. Pesquisa", body: "Abra AI Research no seu projeto. A IA reúne fatos, ângulos e fontes sobre o tema, então você nunca começa do zero." },
      { title: "4. Monte um esboço", body: "Abra Outlines. A IA transforma sua pesquisa em uma estrutura clara, segmento por segmento. Edite até o fluxo ficar certo." },
      { title: "5. Escreva o script", body: "Abra Scripts. A partir do esboço, a IA redige o script completo do episódio — introdução, segmentos, transições e encerramento." },
      { title: "6. Verifique os fatos", body: "Execute o Fact Checker no seu script. Ele sinaliza afirmações que precisam de fonte ou parecem frágeis." },
      { title: "7. Prepare um convidado (opcional)", body: "Vai entrevistar alguém? O Guest Assistant pesquisa o convidado e sugere uma bio e perguntas inteligentes." },
      { title: "8. SEO e redes sociais", body: "Use o SEO Engine para título, descrição e palavras-chave fortes, e Social Posts para textos promocionais prontos para compartilhar." },
      { title: "9. Exporte e agende", body: "Abra o Export Center para baixar seu script e notas do programa no formato desejado, e use o Calendar para agendar o episódio." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "Sua base — projetos recentes, créditos, atividade e ações rápidas." },
      { name: "Topic Discovery", href: HREF.topics, body: "Encontre ideias de episódios em alta relevantes para seu público." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automatize todo o fluxo — de pesquisa a script a SEO — em uma única execução." },
      { name: "Calendar", href: HREF.calendar, body: "Planeje e agende episódios, com lembretes." },
      { name: "AI Chat", href: HREF.chat, body: "Pergunte qualquer coisa à IA sobre seu programa e faça brainstorming ao vivo." },
      { name: "AI Research", href: HREF.research, body: "Reúna fatos, ângulos e fontes sobre um tema." },
      { name: "Outlines", href: HREF.outlines, body: "Transforme a pesquisa em uma estrutura de segmentos clara." },
      { name: "Scripts", href: HREF.scripts, body: "Redija e refine o script completo do episódio." },
      { name: "Guest Assistant", href: HREF.guests, body: "Pesquise convidados e gere bios e perguntas." },
      { name: "Fact Checker", href: HREF.fact, body: "Verifique as afirmações do seu script com fontes." },
      { name: "SEO Engine", href: HREF.seo, body: "Títulos, descrições e palavras-chave que são encontrados." },
      { name: "Social Posts", href: HREF.social, body: "Publicações promocionais prontas para compartilhar em cada plataforma." },
      { name: "Projects", href: HREF.projects, body: "O espaço de trabalho de cada episódio — pesquisa, esboço, script e exportações em um só lugar." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Envie suas notas e documentos para a IA usar seu próprio material." },
      { name: "AI Memory", href: HREF.memory, body: "A IA lembra seu estilo e episódios anteriores para manter a consistência." },
      { name: "Export Center", href: HREF.exports, body: "Baixe scripts e notas do programa em vários formatos." },
      { name: "Analytics", href: HREF.analytics, body: "Veja seu uso e o desempenho do seu conteúdo." },
      { name: "Billing", href: HREF.billing, body: "Gerencie seu plano e créditos de IA." },
      { name: "API Keys", href: HREF.apiKeys, body: "Conecte suas próprias chaves de provedor de IA (opcional, avançado)." },
      { name: "Settings", href: HREF.settings, body: "Perfil, idioma e preferências de conta." },
    ],
    tips: [
      "Você não precisa usar todas as ferramentas — um ótimo episódio pode nascer só de Pesquisa → Esboço → Script.",
      "Cada ação de IA consome créditos; o Dashboard sempre mostra seu saldo.",
      "Adicione suas notas à Knowledge Base para os scripts soarem como você.",
      "Defina seu idioma preferido em Settings, e em cada módulo onde estiver disponível.",
    ],
  },

  /* ------------------------------------------------------------------ German */
  de: {
    label: "Deutsch",
    dir: "ltr",
    pageTitle: "Benutzerhandbuch",
    pageSubtitle: "Alles, was du für deine erste Episode brauchst.",
    languageLabel: "Sprache",
    episodeHeading: "So erstellst du eine komplette Episode",
    shortcut:
      "Abkürzung: Episode Pipeline erledigt Recherche → Gliederung → Skript → SEO automatisch in einem Durchlauf — perfekt für einen schnellen ersten Entwurf.",
    featuresHeading: "Was jede Funktion macht",
    tipsHeading: "Tipps",
    openLabel: "Öffnen",
    steps: [
      { title: "1. Projekt erstellen", body: "Jede Episode beginnt hier. Öffne Projects und erstelle eines mit Titel und Thema. Es wird die Heimat für Recherche, Gliederung, Skript und Exporte." },
      { title: "2. Thema finden (optional)", body: "Unsicher, worüber du sprechen sollst? Öffne Topic Discovery für angesagte, publikumsrelevante Ideen." },
      { title: "3. Recherche", body: "Öffne AI Research in deinem Projekt. Die KI sammelt Fakten, Blickwinkel und Quellen zu deinem Thema." },
      { title: "4. Gliederung erstellen", body: "Öffne Outlines. Die KI verwandelt deine Recherche in eine klare, segmentweise Struktur. Bearbeite sie, bis der Ablauf stimmt." },
      { title: "5. Skript schreiben", body: "Öffne Scripts. Aus deiner Gliederung entwirft die KI das komplette Episodenskript — Intro, Segmente, Übergänge und Outro." },
      { title: "6. Fakten prüfen", body: "Lasse den Fact Checker über dein Skript laufen. Er markiert Behauptungen, die eine Quelle brauchen oder unsicher wirken." },
      { title: "7. Gast vorbereiten (optional)", body: "Interviewst du jemanden? Guest Assistant recherchiert den Gast und schlägt eine Bio sowie kluge Fragen vor." },
      { title: "8. SEO & Social", body: "Nutze SEO Engine für starken Titel, Beschreibung und Keywords, und Social Posts für teilfertige Promo-Texte." },
      { title: "9. Exportieren & planen", body: "Öffne Export Center, um Skript und Show-Notizen im gewünschten Format herunterzuladen, und nutze Calendar zur Terminplanung." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "Deine Zentrale — aktuelle Projekte, Guthaben, Aktivität und Schnellaktionen." },
      { name: "Topic Discovery", href: HREF.topics, body: "Finde angesagte, publikumsrelevante Episodenideen." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automatisiere den gesamten Ablauf — von Recherche über Skript bis SEO — in einem Durchlauf." },
      { name: "Calendar", href: HREF.calendar, body: "Plane und terminiere Episoden, mit Erinnerungen." },
      { name: "AI Chat", href: HREF.chat, body: "Frag die KI alles zu deiner Show und brainstorme live." },
      { name: "AI Research", href: HREF.research, body: "Sammle Fakten, Blickwinkel und Quellen zu einem Thema." },
      { name: "Outlines", href: HREF.outlines, body: "Verwandle Recherche in eine klare Segmentstruktur." },
      { name: "Scripts", href: HREF.scripts, body: "Entwirf und verfeinere das komplette Episodenskript." },
      { name: "Guest Assistant", href: HREF.guests, body: "Recherchiere Gäste und erstelle Bios und Fragen." },
      { name: "Fact Checker", href: HREF.fact, body: "Prüfe Behauptungen im Skript anhand von Quellen." },
      { name: "SEO Engine", href: HREF.seo, body: "Titel, Beschreibungen und Keywords, die gefunden werden." },
      { name: "Social Posts", href: HREF.social, body: "Teilfertige Promo-Beiträge für jede Plattform." },
      { name: "Projects", href: HREF.projects, body: "Der Arbeitsbereich jeder Episode — Recherche, Gliederung, Skript und Exporte an einem Ort." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Lade deine Notizen und Dokumente hoch, damit die KI dein eigenes Material nutzt." },
      { name: "AI Memory", href: HREF.memory, body: "Die KI merkt sich deinen Stil und frühere Episoden für Konsistenz." },
      { name: "Export Center", href: HREF.exports, body: "Lade Skripte und Show-Notizen in mehreren Formaten herunter." },
      { name: "Analytics", href: HREF.analytics, body: "Sieh deine Nutzung und die Performance deiner Inhalte." },
      { name: "Billing", href: HREF.billing, body: "Verwalte deinen Plan und deine KI-Guthaben." },
      { name: "API Keys", href: HREF.apiKeys, body: "Verbinde eigene KI-Anbieter-Schlüssel (optional, fortgeschritten)." },
      { name: "Settings", href: HREF.settings, body: "Profil, Sprache und Kontoeinstellungen." },
    ],
    tips: [
      "Du musst nicht jedes Tool nutzen — eine großartige Episode entsteht schon aus Recherche → Gliederung → Skript.",
      "Jede KI-Aktion verbraucht Guthaben; das Dashboard zeigt immer deinen Kontostand.",
      "Füge deine Notizen zur Knowledge Base hinzu, damit Skripte nach dir klingen.",
      "Lege deine bevorzugte Sprache in Settings fest, und in jedem Modul, wo verfügbar.",
    ],
  },

  /* ------------------------------------------------------------------ Italian */
  it: {
    label: "Italiano",
    dir: "ltr",
    pageTitle: "Guida all'uso",
    pageSubtitle: "Tutto ciò che serve per creare il tuo primo episodio.",
    languageLabel: "Lingua",
    episodeHeading: "Come creare un episodio completo",
    shortcut:
      "Scorciatoia: Episode Pipeline esegue automaticamente ricerca → scaletta → script → SEO in un unico flusso — perfetto per una prima bozza veloce.",
    featuresHeading: "Cosa fa ogni funzione",
    tipsHeading: "Consigli",
    openLabel: "Apri",
    steps: [
      { title: "1. Crea un progetto", body: "Ogni episodio inizia qui. Apri Projects e creane uno con titolo e argomento. Diventa la sede di ricerca, scaletta, script ed esportazioni." },
      { title: "2. Trova un argomento (opzionale)", body: "Non sai di cosa parlare? Apri Topic Discovery per idee di tendenza rilevanti per il tuo pubblico." },
      { title: "3. Ricerca", body: "Apri AI Research nel tuo progetto. L'IA raccoglie fatti, angolazioni e fonti sul tuo argomento." },
      { title: "4. Costruisci una scaletta", body: "Apri Outlines. L'IA trasforma la tua ricerca in una struttura chiara, segmento per segmento." },
      { title: "5. Scrivi lo script", body: "Apri Scripts. Dalla scaletta, l'IA scrive lo script completo dell'episodio — intro, segmenti, transizioni e finale." },
      { title: "6. Verifica i fatti", body: "Esegui Fact Checker sul tuo script. Segnala affermazioni che necessitano di una fonte o sembrano deboli." },
      { title: "7. Prepara un ospite (opzionale)", body: "Intervisti qualcuno? Guest Assistant ricerca l'ospite e suggerisce una bio e domande intelligenti." },
      { title: "8. SEO e social", body: "Usa SEO Engine per titolo, descrizione e parole chiave forti, e Social Posts per testi promozionali pronti da condividere." },
      { title: "9. Esporta e pianifica", body: "Apri Export Center per scaricare script e note dello show nel formato desiderato, e usa Calendar per pianificare l'episodio." },
    ],
    features: [
      { name: "Dashboard", href: HREF.dashboard, body: "La tua base — progetti recenti, crediti, attività e azioni rapide." },
      { name: "Topic Discovery", href: HREF.topics, body: "Trova idee di episodi di tendenza rilevanti per il tuo pubblico." },
      { name: "Episode Pipeline", href: HREF.agents, body: "Automatizza l'intero flusso — da ricerca a script a SEO — in un'unica esecuzione." },
      { name: "Calendar", href: HREF.calendar, body: "Pianifica e programma gli episodi, con promemoria." },
      { name: "AI Chat", href: HREF.chat, body: "Chiedi qualsiasi cosa all'IA sul tuo show e fai brainstorming in tempo reale." },
      { name: "AI Research", href: HREF.research, body: "Raccogli fatti, angolazioni e fonti su un argomento." },
      { name: "Outlines", href: HREF.outlines, body: "Trasforma la ricerca in una chiara struttura a segmenti." },
      { name: "Scripts", href: HREF.scripts, body: "Scrivi e perfeziona lo script completo dell'episodio." },
      { name: "Guest Assistant", href: HREF.guests, body: "Ricerca gli ospiti e genera bio e domande." },
      { name: "Fact Checker", href: HREF.fact, body: "Verifica le affermazioni dello script rispetto alle fonti." },
      { name: "SEO Engine", href: HREF.seo, body: "Titoli, descrizioni e parole chiave che si fanno trovare." },
      { name: "Social Posts", href: HREF.social, body: "Post promozionali pronti da condividere per ogni piattaforma." },
      { name: "Projects", href: HREF.projects, body: "Lo spazio di lavoro di ogni episodio — ricerca, scaletta, script ed esportazioni in un unico posto." },
      { name: "Knowledge Base", href: HREF.knowledge, body: "Carica i tuoi appunti e documenti perché l'IA usi il tuo materiale." },
      { name: "AI Memory", href: HREF.memory, body: "L'IA ricorda il tuo stile e gli episodi passati per coerenza." },
      { name: "Export Center", href: HREF.exports, body: "Scarica script e note dello show in più formati." },
      { name: "Analytics", href: HREF.analytics, body: "Guarda il tuo utilizzo e le prestazioni dei contenuti." },
      { name: "Billing", href: HREF.billing, body: "Gestisci il tuo piano e i crediti IA." },
      { name: "API Keys", href: HREF.apiKeys, body: "Collega le tue chiavi del provider IA (opzionale, avanzato)." },
      { name: "Settings", href: HREF.settings, body: "Profilo, lingua e preferenze account." },
    ],
    tips: [
      "Non devi usare ogni strumento — un ottimo episodio può nascere solo da Ricerca → Scaletta → Script.",
      "Ogni azione IA consuma crediti; il Dashboard mostra sempre il tuo saldo.",
      "Aggiungi i tuoi appunti alla Knowledge Base perché gli script suonino come te.",
      "Imposta la lingua preferita in Settings, e in ogni modulo dove disponibile.",
    ],
  },

  ru: {
  "label": "Русский",
  "dir": "ltr",
  "pageTitle": "Руководство пользователя",
  "pageSubtitle": "Всё необходимое для создания первого эпизода.",
  "languageLabel": "Язык",
  "episodeHeading": "Как создать полноценный эпизод",
  "shortcut": "Быстрый путь: Episode Pipeline автоматически выполняет исследование → план → сценарий → SEO за один проход — отлично для быстрого первого черновика.",
  "featuresHeading": "Что делает каждая функция",
  "tipsHeading": "Советы",
  "openLabel": "Открыть",
  "steps": [
    {
      "title": "1. Создайте проект",
      "body": "Каждый эпизод начинается здесь. Откройте Projects и создайте проект с названием и темой. Это будет основой для исследования, плана, сценария и экспорта."
    },
    {
      "title": "2. Найдите тему (необязательно)",
      "body": "Не знаете, о чём говорить? Откройте Topic Discovery для трендовых идей, актуальных для вашей аудитории."
    },
    {
      "title": "3. Исследование",
      "body": "Откройте AI Research в проекте. ИИ собирает факты, ракурсы и источники по вашей теме."
    },
    {
      "title": "4. Составьте план",
      "body": "Откройте Outlines. ИИ превращает исследование в чёткую посегментную структуру. Редактируйте, пока не будет хорошо звучать."
    },
    {
      "title": "5. Напишите сценарий",
      "body": "Откройте Scripts. На основе плана ИИ создаёт полный сценарий эпизода — вступление, сегменты, переходы и финал."
    },
    {
      "title": "6. Проверьте факты",
      "body": "Запустите Fact Checker на своём сценарии. Он отмечает утверждения, требующие источника или выглядящие сомнительно."
    },
    {
      "title": "7. Подготовьте гостя (необязательно)",
      "body": "Берёте интервью? Guest Assistant изучает гостя и предлагает биографию и хорошие вопросы."
    },
    {
      "title": "8. SEO и соцсети",
      "body": "Используйте SEO Engine для сильного заголовка, описания и ключевых слов, а Social Posts — для готовых промо-постов."
    },
    {
      "title": "9. Экспорт и планирование",
      "body": "Откройте Export Center, чтобы скачать сценарий и заметки к эпизоду в нужном формате, и используйте Calendar для планирования выпуска."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Ваш центр управления — последние проекты, кредиты, активность и быстрые действия."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Находите трендовые идеи эпизодов, актуальные для аудитории."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Автоматизируйте весь процесс — от исследования до сценария и SEO — за один запуск."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Планируйте и назначайте эпизоды с напоминаниями."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Спрашивайте ИИ что угодно о вашем шоу и придумывайте идеи в реальном времени."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Собирайте факты, ракурсы и источники по теме."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Превращайте исследование в чёткую посегментную структуру."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Пишите и дорабатывайте полный сценарий эпизода."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Изучайте гостей и создавайте биографии и вопросы."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Проверяйте утверждения в сценарии по источникам."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Заголовки, описания и ключевые слова, которые находят."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Готовые промо-посты для каждой платформы."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Рабочее пространство каждого эпизода — исследование, план, сценарий и экспорт в одном месте."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Загружайте заметки и документы, чтобы ИИ использовал ваши материалы."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "ИИ запоминает ваш стиль и прошлые эпизоды для единообразия."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Скачивайте сценарии и заметки к эпизодам в разных форматах."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Смотрите статистику использования и эффективность контента."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Управляйте тарифом и кредитами ИИ."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Подключайте собственные ключи провайдера ИИ (необязательно, для продвинутых)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Профиль, язык и настройки аккаунта."
    }
  ],
  "tips": [
    "Необязательно использовать все инструменты — отличный эпизод может получиться просто из Исследования → Плана → Сценария.",
    "Каждое действие ИИ расходует кредиты; баланс всегда виден на Dashboard.",
    "Добавляйте заметки в Knowledge Base, чтобы сценарий звучал в вашем стиле.",
    "Установите предпочитаемый язык в Settings и в каждом модуле, где это доступно."
  ]
},
  zh: {
  "label": "中文",
  "dir": "ltr",
  "pageTitle": "使用指南",
  "pageSubtitle": "制作你的第一集所需的一切。",
  "languageLabel": "语言",
  "episodeHeading": "如何制作完整一集",
  "shortcut": "快捷方式：Episode Pipeline 会在一个流程中自动完成 研究 → 大纲 → 脚本 → SEO —— 非常适合快速完成初稿。",
  "featuresHeading": "每个功能的作用",
  "tipsHeading": "小贴士",
  "openLabel": "打开",
  "steps": [
    {
      "title": "1. 创建项目",
      "body": "每一集都从这里开始。打开 Projects，创建一个带标题和主题的项目。它将成为你的研究、大纲、脚本和导出文件的所在地。"
    },
    {
      "title": "2. 寻找主题（可选）",
      "body": "不确定要讲什么？打开 Topic Discovery，获取与你的受众相关的热门创意。"
    },
    {
      "title": "3. 研究",
      "body": "在项目中打开 AI Research。AI 会收集与你主题相关的事实、角度和来源。"
    },
    {
      "title": "4. 构建大纲",
      "body": "打开 Outlines。AI 会把你的研究整理成清晰的分段结构。反复编辑直到流程顺畅。"
    },
    {
      "title": "5. 撰写脚本",
      "body": "打开 Scripts。AI 会根据大纲起草完整的一集脚本——开场、各段落、过渡和结尾。"
    },
    {
      "title": "6. 事实核查",
      "body": "在脚本上运行 Fact Checker。它会标出需要来源或看起来不可靠的说法。"
    },
    {
      "title": "7. 准备嘉宾（可选）",
      "body": "要采访嘉宾？Guest Assistant 会研究嘉宾并建议简介和好问题。"
    },
    {
      "title": "8. SEO 与社交媒体",
      "body": "使用 SEO Engine 生成有力的标题、描述和关键词，用 Social Posts 生成可直接分享的推广文案。"
    },
    {
      "title": "9. 导出与排期",
      "body": "打开 Export Center，以所需格式下载脚本和节目笔记，并使用 Calendar 安排该集的发布时间。"
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "你的主页——最近的项目、积分、活动和快捷操作。"
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "寻找与受众相关的热门单集创意。"
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "一次运行自动完成从研究到脚本再到 SEO 的全部流程。"
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "规划和安排单集发布时间，附带提醒。"
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "就你的节目向 AI 提问，实时构思创意。"
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "收集某个主题的事实、角度和来源。"
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "把研究转化为清晰的分段结构。"
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "撰写并完善完整的单集脚本。"
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "研究嘉宾并生成简介和问题。"
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "核对脚本中的说法与来源是否相符。"
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "让人更容易找到的标题、描述和关键词。"
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "可直接分享的各平台推广文案。"
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "每一集的工作区——研究、大纲、脚本和导出集中一处。"
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "上传你的笔记和文档，让 AI 使用你自己的素材。"
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI 记住你的风格和过往单集，保持一致性。"
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "以多种格式下载脚本和节目笔记。"
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "查看你的使用情况和内容表现。"
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "管理你的套餐和 AI 积分。"
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "连接你自己的 AI 提供商密钥（可选，进阶功能）。"
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "个人资料、语言和账户偏好设置。"
    }
  ],
  "tips": [
    "不必用上每一个工具——好的一集也可以只靠 研究 → 大纲 → 脚本 完成。",
    "每次 AI 操作都会消耗积分；Dashboard 始终显示你的余额。",
    "把笔记加入 Knowledge Base，让脚本更像你自己的风格。",
    "在 Settings 中设置你偏好的语言，各模块支持的地方也可单独设置。"
  ]
},
  ja: {
  "label": "日本語",
  "dir": "ltr",
  "pageTitle": "使い方ガイド",
  "pageSubtitle": "最初のエピソードを作るために必要なすべて。",
  "languageLabel": "言語",
  "episodeHeading": "完全なエピソードの作り方",
  "shortcut": "ショートカット：Episode Pipeline はリサーチ→アウトライン→台本→SEOを一つの流れで自動的に行います —— 素早く初稿を作るのに最適です。",
  "featuresHeading": "各機能の役割",
  "tipsHeading": "ヒント",
  "openLabel": "開く",
  "steps": [
    {
      "title": "1. プロジェクトを作成",
      "body": "すべてのエピソードはここから始まります。Projects を開き、タイトルとテーマでプロジェクトを作成しましょう。ここがリサーチ、アウトライン、台本、書き出しの拠点になります。"
    },
    {
      "title": "2. テーマを見つける（任意）",
      "body": "何を話すか迷ったら、Topic Discovery を開いて、視聴者に合ったトレンドのアイデアを見つけましょう。"
    },
    {
      "title": "3. リサーチ",
      "body": "プロジェクト内で AI Research を開きます。AI がテーマに関する事実、切り口、情報源を集めます。"
    },
    {
      "title": "4. アウトラインを作成",
      "body": "Outlines を開きます。AI がリサーチを明確なセグメント構成に変換します。流れが良くなるまで編集しましょう。"
    },
    {
      "title": "5. 台本を書く",
      "body": "Scripts を開きます。アウトラインをもとに、AI が導入・各セグメント・転換・締めくくりを含む完全な台本を作成します。"
    },
    {
      "title": "6. ファクトチェック",
      "body": "台本に対して Fact Checker を実行します。出典が必要な主張や不確かな内容を指摘します。"
    },
    {
      "title": "7. ゲストの準備（任意）",
      "body": "誰かにインタビューしますか？Guest Assistant がゲストを調査し、プロフィールと良い質問を提案します。"
    },
    {
      "title": "8. SEOとソーシャル",
      "body": "SEO Engine で強力なタイトル・説明・キーワードを、Social Posts で共有しやすいプロモーション文を作成しましょう。"
    },
    {
      "title": "9. 書き出しとスケジュール",
      "body": "Export Center を開いて、台本と番組ノートを必要な形式でダウンロードし、Calendar でエピソードを予定に入れましょう。"
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "あなたのホーム — 最近のプロジェクト、クレジット、アクティビティ、クイックアクション。"
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "視聴者に合ったトレンドのエピソードアイデアを見つけます。"
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "リサーチから台本、SEOまでの流れを一度の実行で自動化します。"
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "リマインダー付きでエピソードを計画・スケジュールします。"
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "番組について何でもAIに質問し、その場でアイデアを出します。"
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "テーマに関する事実、切り口、情報源を集めます。"
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "リサーチを明確なセグメント構成に変換します。"
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "完全なエピソード台本を作成・推敲します。"
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "ゲストを調査し、プロフィールと質問を作成します。"
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "台本の主張を情報源と照らし合わせて確認します。"
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "見つけてもらいやすいタイトル・説明・キーワード。"
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "各プラットフォーム向けの共有しやすいプロモーション投稿。"
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "各エピソードの作業場所 — リサーチ、アウトライン、台本、書き出しを一箇所に。"
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "ノートや資料をアップロードし、AIがあなた自身の素材を使えるようにします。"
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AIがあなたのスタイルや過去のエピソードを記憶し、一貫性を保ちます。"
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "台本と番組ノートを複数の形式でダウンロードします。"
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "利用状況とコンテンツのパフォーマンスを確認します。"
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "プランとAIクレジットを管理します。"
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "独自のAIプロバイダーキーを接続します（任意・上級者向け）。"
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "プロフィール、言語、アカウント設定。"
    }
  ],
  "tips": [
    "すべてのツールを使う必要はありません — リサーチ→アウトライン→台本だけでも良いエピソードは作れます。",
    "AIの操作はクレジットを消費します。Dashboard で残高を常に確認できます。",
    "ノートを Knowledge Base に追加すると、台本があなたらしい仕上がりになります。",
    "Settings で使用言語を設定でき、対応している各モジュールでも設定できます。"
  ]
},
  ko: {
  "label": "한국어",
  "dir": "ltr",
  "pageTitle": "사용 가이드",
  "pageSubtitle": "첫 에피소드를 만드는 데 필요한 모든 것.",
  "languageLabel": "언어",
  "episodeHeading": "완전한 에피소드를 만드는 방법",
  "shortcut": "단축키: Episode Pipeline은 리서치 → 개요 → 대본 → SEO를 하나의 흐름으로 자동 실행합니다 — 빠른 초안 작성에 최적입니다.",
  "featuresHeading": "각 기능이 하는 일",
  "tipsHeading": "팁",
  "openLabel": "열기",
  "steps": [
    {
      "title": "1. 프로젝트 만들기",
      "body": "모든 에피소드는 여기서 시작합니다. Projects를 열고 제목과 주제로 프로젝트를 만드세요. 이곳이 리서치, 개요, 대본, 내보내기의 기반이 됩니다."
    },
    {
      "title": "2. 주제 찾기(선택)",
      "body": "무엇을 다룰지 모르겠나요? Topic Discovery를 열어 청중에게 맞는 인기 아이디어를 찾아보세요."
    },
    {
      "title": "3. 리서치",
      "body": "프로젝트에서 AI Research를 여세요. AI가 주제에 대한 사실, 관점, 출처를 모아줍니다."
    },
    {
      "title": "4. 개요 작성",
      "body": "Outlines를 여세요. AI가 리서치를 명확한 세그먼트별 구조로 바꿔줍니다. 흐름이 맞을 때까지 편집하세요."
    },
    {
      "title": "5. 대본 작성",
      "body": "Scripts를 여세요. 개요를 바탕으로 AI가 인트로, 세그먼트, 전환, 아웃트로가 포함된 전체 대본을 작성합니다."
    },
    {
      "title": "6. 팩트체크",
      "body": "대본에 Fact Checker를 실행하세요. 출처가 필요하거나 불확실해 보이는 주장을 표시해 줍니다."
    },
    {
      "title": "7. 게스트 준비(선택)",
      "body": "인터뷰를 진행하나요? Guest Assistant가 게스트를 조사하고 소개와 좋은 질문을 제안합니다."
    },
    {
      "title": "8. SEO 및 소셜",
      "body": "강력한 제목, 설명, 키워드를 위해 SEO Engine을, 공유하기 좋은 홍보 문구를 위해 Social Posts를 사용하세요."
    },
    {
      "title": "9. 내보내기 및 일정",
      "body": "Export Center를 열어 필요한 형식으로 대본과 쇼 노트를 다운로드하고, Calendar로 에피소드 일정을 잡으세요."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "당신의 홈베이스 — 최근 프로젝트, 크레딧, 활동, 빠른 작업."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "청중에게 맞는 인기 에피소드 아이디어를 찾습니다."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "리서치부터 대본, SEO까지 전체 흐름을 한 번에 자동화합니다."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "알림과 함께 에피소드를 계획하고 일정을 잡습니다."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "쇼에 대해 AI에게 무엇이든 물어보고 실시간으로 아이디어를 구상합니다."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "주제에 대한 사실, 관점, 출처를 모읍니다."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "리서치를 명확한 세그먼트 구조로 바꿉니다."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "전체 에피소드 대본을 작성하고 다듬습니다."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "게스트를 조사하고 소개와 질문을 생성합니다."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "대본의 주장을 출처와 대조해 확인합니다."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "검색에 잘 노출되는 제목, 설명, 키워드."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "각 플랫폼에 맞는 공유 준비된 홍보 게시물."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "각 에피소드의 작업 공간 — 리서치, 개요, 대본, 내보내기를 한곳에서."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "노트와 문서를 업로드해 AI가 당신만의 자료를 사용하게 합니다."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI가 당신의 스타일과 이전 에피소드를 기억해 일관성을 유지합니다."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "대본과 쇼 노트를 여러 형식으로 다운로드합니다."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "사용량과 콘텐츠 성과를 확인합니다."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "요금제와 AI 크레딧을 관리합니다."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "자신의 AI 제공업체 키를 연결합니다(선택, 고급 기능)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "프로필, 언어, 계정 환경설정."
    }
  ],
  "tips": [
    "모든 도구를 사용할 필요는 없습니다 — 훌륭한 에피소드는 리서치 → 개요 → 대본만으로도 충분합니다.",
    "모든 AI 작업은 크레딧을 사용합니다. Dashboard에서 잔액을 항상 확인할 수 있습니다.",
    "Knowledge Base에 노트를 추가하면 대본이 당신다운 스타일로 완성됩니다.",
    "Settings에서 선호 언어를 설정하고, 지원되는 각 모듈에서도 설정할 수 있습니다."
  ]
},
  tr: {
  "label": "Türkçe",
  "dir": "ltr",
  "pageTitle": "Kullanım Kılavuzu",
  "pageSubtitle": "İlk bölümünü oluşturmak için ihtiyacın olan her şey.",
  "languageLabel": "Dil",
  "episodeHeading": "Eksiksiz bir bölüm nasıl oluşturulur",
  "shortcut": "Kısayol: Episode Pipeline, araştırma → taslak → senaryo → SEO adımlarını tek akışta otomatik olarak yapar — hızlı bir ilk taslak için ideal.",
  "featuresHeading": "Her özellik ne yapar",
  "tipsHeading": "İpuçları",
  "openLabel": "Aç",
  "steps": [
    {
      "title": "1. Proje oluştur",
      "body": "Her bölüm burada başlar. Projects'i aç ve bir başlık ile konu vererek proje oluştur. Burası araştırma, taslak, senaryo ve dışa aktarımların evi olacak."
    },
    {
      "title": "2. Konu bul (isteğe bağlı)",
      "body": "Ne anlatacağından emin değil misin? Kitleye uygun trend fikirler için Topic Discovery'yi aç."
    },
    {
      "title": "3. Araştırma",
      "body": "Projenin içinde AI Research'ü aç. Yapay zeka konunla ilgili gerçekleri, açıları ve kaynakları toplar."
    },
    {
      "title": "4. Taslak oluştur",
      "body": "Outlines'ı aç. Yapay zeka araştırmanı bölüm bölüm net bir yapıya dönüştürür. Akış doğru hissettirene kadar düzenle."
    },
    {
      "title": "5. Senaryoyu yaz",
      "body": "Scripts'i aç. Taslağından yola çıkarak yapay zeka giriş, bölümler, geçişler ve kapanışı olan tam bir senaryo hazırlar."
    },
    {
      "title": "6. Gerçekleri kontrol et",
      "body": "Senaryonda Fact Checker'ı çalıştır. Kaynağa ihtiyaç duyan veya şüpheli görünen iddiaları işaretler."
    },
    {
      "title": "7. Konuk hazırlığı (isteğe bağlı)",
      "body": "Biriyle röportaj mı yapıyorsun? Guest Assistant konuğu araştırır, biyografi ve iyi sorular önerir."
    },
    {
      "title": "8. SEO ve sosyal medya",
      "body": "Güçlü bir başlık, açıklama ve anahtar kelimeler için SEO Engine'i, paylaşıma hazır tanıtım metinleri için Social Posts'u kullan."
    },
    {
      "title": "9. Dışa aktar ve planla",
      "body": "İhtiyacın olan formatta senaryonu ve bölüm notlarını indirmek için Export Center'ı aç, bölümü planlamak için Calendar'ı kullan."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Ana merkezin — son projeler, krediler, etkinlik ve hızlı işlemler."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Kitleye uygun trend bölüm fikirleri bul."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Araştırmadan senaryoya, SEO'ya kadar tüm akışı tek seferde otomatikleştir."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Bölümleri hatırlatıcılarla planla ve programla."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Programın hakkında yapay zekaya her şeyi sor ve canlı fikir üret."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Bir konuyla ilgili gerçekleri, açıları ve kaynakları topla."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Araştırmanı net bir bölüm yapısına dönüştür."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Tam bölüm senaryosunu yaz ve geliştir."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Konukları araştır, biyografi ve sorular oluştur."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Senaryondaki iddiaları kaynaklarla doğrula."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Bulunmayı sağlayan başlıklar, açıklamalar ve anahtar kelimeler."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Her platform için paylaşıma hazır tanıtım gönderileri."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Her bölümün çalışma alanı — araştırma, taslak, senaryo ve dışa aktarımlar tek yerde."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Yapay zekanın kendi materyalini kullanması için notlarını ve dokümanlarını yükle."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "Yapay zeka tutarlılık için tarzını ve önceki bölümleri hatırlar."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Senaryoları ve bölüm notlarını birden çok formatta indir."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Kullanımını ve içeriğinin performansını gör."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Planını ve yapay zeka kredilerini yönet."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Kendi yapay zeka sağlayıcı anahtarlarını bağla (isteğe bağlı, ileri düzey)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Profil, dil ve hesap tercihleri."
    }
  ],
  "tips": [
    "Her aracı kullanmak zorunda değilsin — harika bir bölüm sadece Araştırma → Taslak → Senaryo olabilir.",
    "Her yapay zeka işlemi kredi kullanır; Dashboard bakiyeni her zaman gösterir.",
    "Senaryoların sana benzemesi için notlarını Knowledge Base'e ekle.",
    "Tercih ettiğin dili Settings'te ve sunulduğu her modülde ayarla."
  ]
},
  id: {
  "label": "Bahasa Indonesia",
  "dir": "ltr",
  "pageTitle": "Panduan Pengguna",
  "pageSubtitle": "Semua yang kamu butuhkan untuk membuat episode pertamamu.",
  "languageLabel": "Bahasa",
  "episodeHeading": "Cara membuat episode lengkap",
  "shortcut": "Jalan pintas: Episode Pipeline otomatis menjalankan riset → outline → naskah → SEO dalam satu alur — cocok untuk draf pertama yang cepat.",
  "featuresHeading": "Fungsi setiap fitur",
  "tipsHeading": "Tips",
  "openLabel": "Buka",
  "steps": [
    {
      "title": "1. Buat proyek",
      "body": "Setiap episode dimulai di sini. Buka Projects dan buat satu dengan judul dan topik. Ini akan menjadi tempat riset, outline, naskah, dan ekspormu."
    },
    {
      "title": "2. Temukan topik (opsional)",
      "body": "Belum yakin mau bahas apa? Buka Topic Discovery untuk ide-ide tren yang relevan dengan audiensmu."
    },
    {
      "title": "3. Riset",
      "body": "Buka AI Research di proyekmu. AI mengumpulkan fakta, sudut pandang, dan sumber tentang topikmu."
    },
    {
      "title": "4. Buat outline",
      "body": "Buka Outlines. AI mengubah risetmu menjadi struktur per segmen yang jelas. Edit sampai alurnya pas."
    },
    {
      "title": "5. Tulis naskah",
      "body": "Buka Scripts. Dari outline, AI menyusun naskah episode lengkap — intro, segmen, transisi, dan penutup."
    },
    {
      "title": "6. Periksa fakta",
      "body": "Jalankan Fact Checker pada naskahmu. Ini menandai klaim yang perlu sumber atau terlihat kurang meyakinkan."
    },
    {
      "title": "7. Siapkan tamu (opsional)",
      "body": "Akan mewawancarai seseorang? Guest Assistant meriset tamu dan menyarankan bio serta pertanyaan bagus."
    },
    {
      "title": "8. SEO & sosial media",
      "body": "Gunakan SEO Engine untuk judul, deskripsi, dan kata kunci yang kuat, serta Social Posts untuk konten promosi siap bagikan."
    },
    {
      "title": "9. Ekspor & jadwalkan",
      "body": "Buka Export Center untuk mengunduh naskah dan catatan acara dalam format yang kamu butuhkan, dan gunakan Calendar untuk menjadwalkan episode."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Pusat utamamu — proyek terbaru, kredit, aktivitas, dan aksi cepat."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Temukan ide episode tren yang relevan dengan audiensmu."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Otomatiskan seluruh alur — dari riset ke naskah ke SEO — dalam satu jalan."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Rencanakan dan jadwalkan episode, dengan pengingat."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Tanyakan apa saja tentang acaramu ke AI dan brainstorming secara langsung."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Kumpulkan fakta, sudut pandang, dan sumber untuk sebuah topik."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Ubah risetmu menjadi struktur segmen yang jelas."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Susun dan sempurnakan naskah episode lengkap."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Riset tamu dan buat bio serta pertanyaan."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Verifikasi klaim dalam naskahmu dengan sumber."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Judul, deskripsi, dan kata kunci yang mudah ditemukan."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Postingan promosi siap bagikan untuk setiap platform."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Ruang kerja setiap episode — riset, outline, naskah, dan ekspor dalam satu tempat."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Unggah catatan dan dokumenmu agar AI menggunakan materimu sendiri."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI mengingat gaya dan episode sebelumnya untuk menjaga konsistensi."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Unduh naskah dan catatan acara dalam berbagai format."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Lihat penggunaan dan performa kontenmu."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Kelola paket dan kredit AI-mu."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Hubungkan kunci penyedia AI milikmu sendiri (opsional, lanjutan)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Profil, bahasa, dan preferensi akun."
    }
  ],
  "tips": [
    "Kamu tidak harus memakai semua alat — episode yang bagus bisa cukup dengan Riset → Outline → Naskah.",
    "Setiap aksi AI menggunakan kredit; Dashboard selalu menampilkan saldomu.",
    "Tambahkan catatanmu ke Knowledge Base agar naskah terdengar seperti gayamu.",
    "Atur bahasa pilihanmu di Settings, dan di setiap modul yang menyediakannya."
  ]
},
  ms: {
  "label": "Bahasa Melayu",
  "dir": "ltr",
  "pageTitle": "Panduan Pengguna",
  "pageSubtitle": "Semua yang anda perlukan untuk membuat episod pertama anda.",
  "languageLabel": "Bahasa",
  "episodeHeading": "Cara membuat episod yang lengkap",
  "shortcut": "Jalan pintas: Episode Pipeline menjalankan penyelidikan → garis besar → skrip → SEO secara automatik dalam satu aliran — sesuai untuk draf pertama yang pantas.",
  "featuresHeading": "Fungsi setiap ciri",
  "tipsHeading": "Petua",
  "openLabel": "Buka",
  "steps": [
    {
      "title": "1. Cipta projek",
      "body": "Setiap episod bermula di sini. Buka Projects dan cipta satu dengan tajuk dan topik. Ia akan menjadi tempat untuk penyelidikan, garis besar, skrip dan eksport anda."
    },
    {
      "title": "2. Cari topik (pilihan)",
      "body": "Tidak pasti apa yang hendak dibincangkan? Buka Topic Discovery untuk idea trend yang relevan dengan penonton anda."
    },
    {
      "title": "3. Penyelidikan",
      "body": "Buka AI Research dalam projek anda. AI mengumpul fakta, sudut pandangan dan sumber tentang topik anda."
    },
    {
      "title": "4. Bina garis besar",
      "body": "Buka Outlines. AI menukar penyelidikan anda kepada struktur segmen yang jelas. Edit sehingga alirannya sesuai."
    },
    {
      "title": "5. Tulis skrip",
      "body": "Buka Scripts. Daripada garis besar, AI merangka skrip episod lengkap — pengenalan, segmen, peralihan dan penutup."
    },
    {
      "title": "6. Semak fakta",
      "body": "Jalankan Fact Checker pada skrip anda. Ia menandakan dakwaan yang memerlukan sumber atau kelihatan meragukan."
    },
    {
      "title": "7. Sediakan tetamu (pilihan)",
      "body": "Menemuramah seseorang? Guest Assistant menyelidik tetamu dan mencadangkan bio serta soalan yang baik."
    },
    {
      "title": "8. SEO & sosial",
      "body": "Gunakan SEO Engine untuk tajuk, penerangan dan kata kunci yang kukuh, dan Social Posts untuk kandungan promosi sedia kongsi."
    },
    {
      "title": "9. Eksport & jadual",
      "body": "Buka Export Center untuk memuat turun skrip dan nota rancangan dalam format yang anda perlukan, dan gunakan Calendar untuk menjadualkan episod."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Pusat utama anda — projek terkini, kredit, aktiviti dan tindakan pantas."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Cari idea episod trend yang relevan dengan penonton anda."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Automasikan keseluruhan aliran — daripada penyelidikan kepada skrip dan SEO — dalam satu larian."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Rancang dan jadualkan episod, dengan peringatan."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Tanya AI apa sahaja tentang rancangan anda dan hasilkan idea secara langsung."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Kumpul fakta, sudut pandangan dan sumber untuk sesuatu topik."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Tukar penyelidikan anda kepada struktur segmen yang jelas."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Rangka dan perhalusi skrip episod lengkap."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Selidik tetamu dan hasilkan bio serta soalan."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Sahkan dakwaan dalam skrip anda berdasarkan sumber."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Tajuk, penerangan dan kata kunci yang mudah dijumpai."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Siaran promosi sedia kongsi untuk setiap platform."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Ruang kerja setiap episod — penyelidikan, garis besar, skrip dan eksport di satu tempat."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Muat naik nota dan dokumen anda supaya AI menggunakan bahan anda sendiri."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI mengingati gaya dan episod lepas anda untuk konsistensi."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Muat turun skrip dan nota rancangan dalam pelbagai format."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Lihat penggunaan anda dan prestasi kandungan anda."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Urus pelan dan kredit AI anda."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Sambungkan kunci pembekal AI anda sendiri (pilihan, lanjutan)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Profil, bahasa dan keutamaan akaun."
    }
  ],
  "tips": [
    "Anda tidak perlu guna setiap alat — episod yang hebat boleh jadi hanya Penyelidikan → Garis besar → Skrip.",
    "Setiap tindakan AI menggunakan kredit; Dashboard sentiasa menunjukkan baki anda.",
    "Tambah nota anda ke Knowledge Base supaya skrip berbunyi seperti gaya anda.",
    "Tetapkan bahasa pilihan anda dalam Settings, dan pada setiap modul yang menawarkannya."
  ]
},
  sw: {
  "label": "Kiswahili",
  "dir": "ltr",
  "pageTitle": "Mwongozo wa Matumizi",
  "pageSubtitle": "Kila kitu unachohitaji kutengeneza kipindi chako cha kwanza.",
  "languageLabel": "Lugha",
  "episodeHeading": "Jinsi ya kutengeneza kipindi kamili",
  "shortcut": "Njia ya mkato: Episode Pipeline hufanya utafiti → muhtasari → maandishi → SEO kiotomatiki katika mtiririko mmoja — nzuri kwa rasimu ya kwanza ya haraka.",
  "featuresHeading": "Kila kipengele hufanya nini",
  "tipsHeading": "Vidokezo",
  "openLabel": "Fungua",
  "steps": [
    {
      "title": "1. Unda mradi",
      "body": "Kila kipindi huanza hapa. Fungua Projects na uunde mmoja wenye kichwa na mada. Hapa ndipo utafiti, muhtasari, maandishi na uhamishaji wako utakapokuwa."
    },
    {
      "title": "2. Tafuta mada (si lazima)",
      "body": "Huna uhakika wa nini cha kuzungumzia? Fungua Topic Discovery kupata mawazo maarufu yanayolingana na hadhira yako."
    },
    {
      "title": "3. Utafiti",
      "body": "Fungua AI Research kwenye mradi wako. AI hukusanya ukweli, mitazamo na vyanzo kuhusu mada yako."
    },
    {
      "title": "4. Jenga muhtasari",
      "body": "Fungua Outlines. AI hubadilisha utafiti wako kuwa muundo wazi wa sehemu kwa sehemu. Hariri hadi mtiririko uwe sahihi."
    },
    {
      "title": "5. Andika maandishi",
      "body": "Fungua Scripts. Kutoka kwenye muhtasari, AI huandaa maandishi kamili ya kipindi — utangulizi, sehemu, mabadiliko na hitimisho."
    },
    {
      "title": "6. Hakiki ukweli",
      "body": "Endesha Fact Checker kwenye maandishi yako. Huweka alama kwa madai yanayohitaji chanzo au yanayoonekana kuwa na shaka."
    },
    {
      "title": "7. Andaa mgeni (si lazima)",
      "body": "Unahoji mtu? Guest Assistant hufanya utafiti kuhusu mgeni na kupendekeza wasifu na maswali mazuri."
    },
    {
      "title": "8. SEO na mitandao ya kijamii",
      "body": "Tumia SEO Engine kwa kichwa, maelezo na maneno muhimu imara, na Social Posts kwa machapisho ya matangazo tayari kushirikiwa."
    },
    {
      "title": "9. Hamisha na ratibu",
      "body": "Fungua Export Center kupakua maandishi na maelezo ya kipindi katika muundo unaohitaji, na tumia Calendar kuratibu kipindi."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Kituo chako kikuu — miradi ya hivi karibuni, mikopo, shughuli na vitendo vya haraka."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Tafuta mawazo ya vipindi maarufu yanayolingana na hadhira yako."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Fanya mtiririko wote kuwa wa kiotomatiki — kutoka utafiti hadi maandishi hadi SEO — kwa mzunguko mmoja."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Panga na ratibu vipindi, na vikumbusho."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Uliza AI chochote kuhusu kipindi chako na fikiria mawazo moja kwa moja."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Kusanya ukweli, mitazamo na vyanzo kuhusu mada."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Badilisha utafiti wako kuwa muundo wazi wa sehemu."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Andika na uboreshe maandishi kamili ya kipindi."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Fanya utafiti kuhusu wageni na tengeneza wasifu na maswali."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Hakiki madai ya maandishi yako dhidi ya vyanzo."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Vichwa, maelezo na maneno muhimu yanayopatikana kwa urahisi."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Machapisho ya matangazo tayari kushirikiwa kwa kila jukwaa."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Nafasi ya kazi ya kila kipindi — utafiti, muhtasari, maandishi na uhamishaji mahali pamoja."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Pakia maelezo na hati zako ili AI itumie nyenzo zako mwenyewe."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI hukumbuka mtindo wako na vipindi vya awali kwa uthabiti."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Pakua maandishi na maelezo ya vipindi katika miundo mingi."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Ona matumizi yako na utendaji wa maudhui yako."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Simamia mpango wako na mikopo ya AI."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Unganisha funguo zako za mtoa huduma wa AI (si lazima, kwa wataalamu)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Wasifu, lugha na mapendeleo ya akaunti."
    }
  ],
  "tips": [
    "Huhitaji kutumia kila zana — kipindi kizuri kinaweza kuwa Utafiti → Muhtasari → Maandishi tu.",
    "Kila kitendo cha AI hutumia mikopo; Dashboard huonyesha salio lako kila wakati.",
    "Ongeza maelezo yako kwenye Knowledge Base ili maandishi yasikike kama wewe.",
    "Weka lugha unayopendelea katika Settings, na katika kila moduli inayotolewa."
  ]
},
  tl: {
  "label": "Filipino",
  "dir": "ltr",
  "pageTitle": "Gabay sa Paggamit",
  "pageSubtitle": "Lahat ng kailangan mo para gawin ang unang episode mo.",
  "languageLabel": "Wika",
  "episodeHeading": "Paano gumawa ng kumpletong episode",
  "shortcut": "Shortcut: Awtomatikong ginagawa ng Episode Pipeline ang research → outline → script → SEO sa isang daloy — perpekto para sa mabilis na unang draft.",
  "featuresHeading": "Ano ang ginagawa ng bawat feature",
  "tipsHeading": "Mga tip",
  "openLabel": "Buksan",
  "steps": [
    {
      "title": "1. Gumawa ng proyekto",
      "body": "Dito nagsisimula ang bawat episode. Buksan ang Projects at gumawa ng isa gamit ang pamagat at paksa. Ito ang magiging tahanan ng iyong research, outline, script, at mga export."
    },
    {
      "title": "2. Maghanap ng paksa (opsyonal)",
      "body": "Hindi sigurado kung ano ang pag-uusapan? Buksan ang Topic Discovery para sa mga trending na ideyang angkop sa audience mo."
    },
    {
      "title": "3. Research",
      "body": "Buksan ang AI Research sa proyekto mo. Nangangalap ang AI ng mga katotohanan, anggulo, at sanggunian tungkol sa paksa mo."
    },
    {
      "title": "4. Gumawa ng outline",
      "body": "Buksan ang Outlines. Ginagawang malinaw na istraktura ng AI ang research mo, segment by segment. I-edit hanggang tama ang daloy."
    },
    {
      "title": "5. Isulat ang script",
      "body": "Buksan ang Scripts. Mula sa outline, gagawa ang AI ng kumpletong script ng episode — intro, mga segment, transition, at outro."
    },
    {
      "title": "6. I-fact-check",
      "body": "Patakbuhin ang Fact Checker sa script mo. Minamarkahan nito ang mga claim na kailangan ng sanggunian o mukhang hindi sigurado."
    },
    {
      "title": "7. Ihanda ang bisita (opsyonal)",
      "body": "May kakausapin ka bang bisita? Nagsasaliksik ang Guest Assistant tungkol sa bisita at nagmumungkahi ng bio at magagandang tanong."
    },
    {
      "title": "8. SEO at social",
      "body": "Gamitin ang SEO Engine para sa malakas na pamagat, deskripsyon, at keywords, at ang Social Posts para sa handa-nang-i-share na promo."
    },
    {
      "title": "9. I-export at i-schedule",
      "body": "Buksan ang Export Center para i-download ang script at show notes sa kailangang format, at gamitin ang Calendar para i-schedule ang episode."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Ang iyong home base — mga kamakailang proyekto, credits, aktibidad, at mabilis na aksyon."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Maghanap ng trending na ideya para sa episode na angkop sa audience mo."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "I-automate ang buong daloy — mula research hanggang script hanggang SEO — sa isang takbo."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Magplano at mag-schedule ng mga episode, may paalala."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Tanungin ang AI ng kahit ano tungkol sa show mo at mag-brainstorm nang live."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Mangalap ng mga katotohanan, anggulo, at sanggunian tungkol sa isang paksa."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Gawing malinaw na istraktura ng segment ang research mo."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Isulat at pinuhin ang kumpletong script ng episode."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Magsaliksik tungkol sa mga bisita at gumawa ng bio at mga tanong."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "I-verify ang mga claim sa script mo laban sa mga sanggunian."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Mga pamagat, deskripsyon, at keyword na madaling mahanap."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Handa-nang-i-share na mga promo post para sa bawat platform."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Ang workspace ng bawat episode — research, outline, script, at export sa isang lugar."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "I-upload ang mga tala at dokumento mo para gamitin ng AI ang sarili mong materyal."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "Naaalala ng AI ang istilo mo at mga nakaraang episode para sa pagkakapare-pareho."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "I-download ang mga script at show notes sa iba't ibang format."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Tingnan ang paggamit mo at performance ng content mo."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Pamahalaan ang plano at AI credits mo."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Ikonekta ang sarili mong AI provider keys (opsyonal, advanced)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Profile, wika, at mga kagustuhan sa account."
    }
  ],
  "tips": [
    "Hindi mo kailangang gamitin ang lahat ng tool — puwedeng maging Research → Outline → Script lang ang isang magandang episode.",
    "Bawat aksyon ng AI ay gumagamit ng credits; palaging ipinapakita ng Dashboard ang balanse mo.",
    "Idagdag ang mga tala mo sa Knowledge Base para maging katulad mo ang tunog ng script.",
    "Itakda ang gustong wika mo sa Settings, at sa bawat module na nag-aalok nito."
  ]
},
  vi: {
  "label": "Tiếng Việt",
  "dir": "ltr",
  "pageTitle": "Hướng dẫn sử dụng",
  "pageSubtitle": "Mọi thứ bạn cần để tạo tập đầu tiên của mình.",
  "languageLabel": "Ngôn ngữ",
  "episodeHeading": "Cách tạo một tập hoàn chỉnh",
  "shortcut": "Lối tắt: Episode Pipeline tự động chạy nghiên cứu → dàn ý → kịch bản → SEO trong một luồng duy nhất — hoàn hảo để có bản nháp đầu tiên nhanh chóng.",
  "featuresHeading": "Mỗi tính năng làm gì",
  "tipsHeading": "Mẹo",
  "openLabel": "Mở",
  "steps": [
    {
      "title": "1. Tạo dự án",
      "body": "Mỗi tập bắt đầu từ đây. Mở Projects và tạo một dự án với tiêu đề và chủ đề. Đây sẽ là nơi lưu trữ nghiên cứu, dàn ý, kịch bản và các bản xuất của bạn."
    },
    {
      "title": "2. Tìm chủ đề (tuỳ chọn)",
      "body": "Chưa chắc nên nói về gì? Mở Topic Discovery để tìm ý tưởng thịnh hành phù hợp với khán giả của bạn."
    },
    {
      "title": "3. Nghiên cứu",
      "body": "Mở AI Research trong dự án của bạn. AI thu thập sự kiện, góc nhìn và nguồn về chủ đề của bạn."
    },
    {
      "title": "4. Xây dựng dàn ý",
      "body": "Mở Outlines. AI biến nghiên cứu của bạn thành cấu trúc rõ ràng theo từng phần. Chỉnh sửa cho đến khi mạch nội dung hợp lý."
    },
    {
      "title": "5. Viết kịch bản",
      "body": "Mở Scripts. Từ dàn ý, AI soạn kịch bản đầy đủ cho tập — mở đầu, các phần, chuyển tiếp và kết thúc."
    },
    {
      "title": "6. Kiểm tra sự thật",
      "body": "Chạy Fact Checker trên kịch bản của bạn. Nó đánh dấu các tuyên bố cần nguồn hoặc có vẻ chưa chắc chắn."
    },
    {
      "title": "7. Chuẩn bị khách mời (tuỳ chọn)",
      "body": "Bạn đang phỏng vấn ai đó? Guest Assistant nghiên cứu khách mời và đề xuất tiểu sử cùng những câu hỏi hay."
    },
    {
      "title": "8. SEO & mạng xã hội",
      "body": "Dùng SEO Engine để có tiêu đề, mô tả và từ khoá mạnh, và Social Posts để có bài quảng bá sẵn sàng chia sẻ."
    },
    {
      "title": "9. Xuất & lên lịch",
      "body": "Mở Export Center để tải kịch bản và ghi chú chương trình theo định dạng bạn cần, và dùng Calendar để lên lịch phát hành tập."
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "Trung tâm của bạn — các dự án gần đây, tín dụng, hoạt động và thao tác nhanh."
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "Tìm ý tưởng tập thịnh hành phù hợp với khán giả của bạn."
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "Tự động hoá toàn bộ quy trình — từ nghiên cứu đến kịch bản đến SEO — chỉ trong một lần chạy."
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "Lên kế hoạch và lịch trình cho các tập, kèm nhắc nhở."
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "Hỏi AI bất cứ điều gì về chương trình của bạn và lên ý tưởng trực tiếp."
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "Thu thập sự kiện, góc nhìn và nguồn về một chủ đề."
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "Biến nghiên cứu của bạn thành cấu trúc từng phần rõ ràng."
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "Soạn thảo và hoàn thiện kịch bản đầy đủ của tập."
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "Nghiên cứu khách mời và tạo tiểu sử cùng câu hỏi."
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "Xác minh các tuyên bố trong kịch bản của bạn dựa trên nguồn."
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "Tiêu đề, mô tả và từ khoá giúp dễ được tìm thấy."
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "Bài đăng quảng bá sẵn sàng chia sẻ cho từng nền tảng."
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "Không gian làm việc của mỗi tập — nghiên cứu, dàn ý, kịch bản và xuất bản ở một nơi."
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "Tải lên ghi chú và tài liệu của bạn để AI sử dụng tài liệu riêng của bạn."
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI ghi nhớ phong cách và các tập trước đó của bạn để đảm bảo nhất quán."
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "Tải xuống kịch bản và ghi chú chương trình theo nhiều định dạng."
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "Xem mức sử dụng và hiệu suất nội dung của bạn."
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "Quản lý gói và tín dụng AI của bạn."
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "Kết nối khoá nhà cung cấp AI của riêng bạn (tuỳ chọn, nâng cao)."
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "Hồ sơ, ngôn ngữ và tuỳ chọn tài khoản."
    }
  ],
  "tips": [
    "Bạn không cần dùng mọi công cụ — một tập hay có thể chỉ cần Nghiên cứu → Dàn ý → Kịch bản.",
    "Mỗi hành động AI đều dùng tín dụng; Dashboard luôn hiển thị số dư của bạn.",
    "Thêm ghi chú của bạn vào Knowledge Base để kịch bản nghe giống phong cách của bạn.",
    "Đặt ngôn ngữ ưa thích của bạn trong Settings, và ở mỗi mô-đun có hỗ trợ."
  ]
},
  th: {
  "label": "ไทย",
  "dir": "ltr",
  "pageTitle": "คู่มือการใช้งาน",
  "pageSubtitle": "ทุกสิ่งที่คุณต้องการเพื่อสร้างตอนแรกของคุณ",
  "languageLabel": "ภาษา",
  "episodeHeading": "วิธีสร้างตอนที่สมบูรณ์",
  "shortcut": "ทางลัด: Episode Pipeline จะทำการค้นคว้า → โครงร่าง → สคริปต์ → SEO ให้อัตโนมัติในขั้นตอนเดียว — เหมาะสำหรับร่างแรกที่รวดเร็ว",
  "featuresHeading": "แต่ละฟีเจอร์ทำอะไรบ้าง",
  "tipsHeading": "เคล็ดลับ",
  "openLabel": "เปิด",
  "steps": [
    {
      "title": "1. สร้างโปรเจกต์",
      "body": "ทุกตอนเริ่มต้นที่นี่ เปิด Projects แล้วสร้างโปรเจกต์พร้อมชื่อเรื่องและหัวข้อ นี่จะเป็นที่เก็บการค้นคว้า โครงร่าง สคริปต์ และไฟล์ส่งออกของคุณ"
    },
    {
      "title": "2. ค้นหาหัวข้อ (ไม่บังคับ)",
      "body": "ไม่แน่ใจว่าจะพูดเรื่องอะไร? เปิด Topic Discovery เพื่อหาไอเดียยอดนิยมที่เหมาะกับผู้ฟังของคุณ"
    },
    {
      "title": "3. ค้นคว้า",
      "body": "เปิด AI Research ในโปรเจกต์ของคุณ AI จะรวบรวมข้อเท็จจริง มุมมอง และแหล่งอ้างอิงเกี่ยวกับหัวข้อของคุณ"
    },
    {
      "title": "4. สร้างโครงร่าง",
      "body": "เปิด Outlines AI จะเปลี่ยนการค้นคว้าของคุณให้เป็นโครงสร้างที่ชัดเจนแบบแบ่งส่วน แก้ไขจนกว่าลำดับจะลงตัว"
    },
    {
      "title": "5. เขียนสคริปต์",
      "body": "เปิด Scripts จากโครงร่าง AI จะร่างสคริปต์ตอนที่สมบูรณ์ — บทนำ ส่วนต่าง ๆ การเปลี่ยนช่วง และบทสรุป"
    },
    {
      "title": "6. ตรวจสอบข้อเท็จจริง",
      "body": "รัน Fact Checker กับสคริปต์ของคุณ ระบบจะทำเครื่องหมายข้อความที่ต้องการแหล่งอ้างอิงหรือดูไม่น่าเชื่อถือ"
    },
    {
      "title": "7. เตรียมแขกรับเชิญ (ไม่บังคับ)",
      "body": "กำลังสัมภาษณ์ใครสักคนอยู่ใช่ไหม? Guest Assistant จะค้นคว้าข้อมูลแขกรับเชิญและแนะนำประวัติย่อพร้อมคำถามดี ๆ"
    },
    {
      "title": "8. SEO และโซเชียล",
      "body": "ใช้ SEO Engine เพื่อสร้างชื่อเรื่อง คำอธิบาย และคำสำคัญที่ทรงพลัง และใช้ Social Posts สำหรับโพสต์โปรโมทที่พร้อมแชร์"
    },
    {
      "title": "9. ส่งออกและกำหนดตาราง",
      "body": "เปิด Export Center เพื่อดาวน์โหลดสคริปต์และโน้ตรายการในรูปแบบที่คุณต้องการ และใช้ Calendar เพื่อกำหนดตารางตอน"
    }
  ],
  "features": [
    {
      "name": "Dashboard",
      "href": "/dashboard",
      "body": "ศูนย์กลางของคุณ — โปรเจกต์ล่าสุด เครดิต กิจกรรม และการดำเนินการด่วน"
    },
    {
      "name": "Topic Discovery",
      "href": "/topics",
      "body": "ค้นหาไอเดียตอนยอดนิยมที่เหมาะกับผู้ฟังของคุณ"
    },
    {
      "name": "Episode Pipeline",
      "href": "/agents",
      "body": "ทำให้ทั้งกระบวนการเป็นอัตโนมัติ — จากการค้นคว้าไปจนถึงสคริปต์และ SEO — ในการรันครั้งเดียว"
    },
    {
      "name": "Calendar",
      "href": "/calendar",
      "body": "วางแผนและกำหนดตารางตอนต่าง ๆ พร้อมการแจ้งเตือน"
    },
    {
      "name": "AI Chat",
      "href": "/chat",
      "body": "ถาม AI อะไรก็ได้เกี่ยวกับรายการของคุณและระดมความคิดแบบสด"
    },
    {
      "name": "AI Research",
      "href": "/research",
      "body": "รวบรวมข้อเท็จจริง มุมมอง และแหล่งอ้างอิงเกี่ยวกับหัวข้อหนึ่ง ๆ"
    },
    {
      "name": "Outlines",
      "href": "/outlines",
      "body": "เปลี่ยนการค้นคว้าของคุณให้เป็นโครงสร้างส่วนที่ชัดเจน"
    },
    {
      "name": "Scripts",
      "href": "/scripts",
      "body": "ร่างและปรับปรุงสคริปต์ตอนที่สมบูรณ์"
    },
    {
      "name": "Guest Assistant",
      "href": "/guests",
      "body": "ค้นคว้าข้อมูลแขกรับเชิญและสร้างประวัติย่อพร้อมคำถาม"
    },
    {
      "name": "Fact Checker",
      "href": "/fact-checks",
      "body": "ตรวจสอบข้อความในสคริปต์ของคุณกับแหล่งอ้างอิง"
    },
    {
      "name": "SEO Engine",
      "href": "/seo",
      "body": "ชื่อเรื่อง คำอธิบาย และคำสำคัญที่ค้นหาเจอได้ง่าย"
    },
    {
      "name": "Social Posts",
      "href": "/social",
      "body": "โพสต์โปรโมทที่พร้อมแชร์สำหรับทุกแพลตฟอร์ม"
    },
    {
      "name": "Projects",
      "href": "/projects",
      "body": "พื้นที่ทำงานของแต่ละตอน — การค้นคว้า โครงร่าง สคริปต์ และการส่งออกในที่เดียว"
    },
    {
      "name": "Knowledge Base",
      "href": "/knowledge",
      "body": "อัปโหลดโน้ตและเอกสารของคุณเพื่อให้ AI ใช้เนื้อหาของคุณเอง"
    },
    {
      "name": "AI Memory",
      "href": "/memory",
      "body": "AI จดจำสไตล์และตอนก่อนหน้าของคุณเพื่อความสม่ำเสมอ"
    },
    {
      "name": "Export Center",
      "href": "/exports",
      "body": "ดาวน์โหลดสคริปต์และโน้ตรายการในหลายรูปแบบ"
    },
    {
      "name": "Analytics",
      "href": "/analytics",
      "body": "ดูการใช้งานและประสิทธิภาพของเนื้อหาของคุณ"
    },
    {
      "name": "Billing",
      "href": "/billing",
      "body": "จัดการแผนและเครดิต AI ของคุณ"
    },
    {
      "name": "API Keys",
      "href": "/api-keys",
      "body": "เชื่อมต่อคีย์ผู้ให้บริการ AI ของคุณเอง (ไม่บังคับ ขั้นสูง)"
    },
    {
      "name": "Settings",
      "href": "/settings",
      "body": "โปรไฟล์ ภาษา และการตั้งค่าบัญชี"
    }
  ],
  "tips": [
    "คุณไม่จำเป็นต้องใช้ทุกเครื่องมือ — ตอนที่ยอดเยี่ยมอาจมีแค่ ค้นคว้า → โครงร่าง → สคริปต์ ก็ได้",
    "ทุกการทำงานของ AI ใช้เครดิต Dashboard จะแสดงยอดคงเหลือของคุณเสมอ",
    "เพิ่มโน้ตของคุณลงใน Knowledge Base เพื่อให้สคริปต์ฟังดูเป็นสไตล์ของคุณ",
    "ตั้งค่าภาษาที่คุณต้องการใน Settings และในแต่ละโมดูลที่รองรับ"
  ]
},
};
