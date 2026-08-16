/**
 * Output languages.
 *
 * This list was previously copied into nine prompt files and the web app, each
 * with its own ten entries — so adding a language meant ten edits and missing
 * one meant a module silently writing English while the rest obeyed. It lives
 * here once now, and every prompt and picker reads it.
 *
 * `name` is what gets sent to the model, in English, because that is what the
 * instruction "write in X" is reliably understood as. `native` is what the
 * user sees, because someone choosing Urdu should see اردو.
 *
 * Scope is deliberate rather than exhaustive: these are the languages with
 * enough training data behind them that a model produces publishable prose
 * rather than stilted translation. Adding a language with thin coverage would
 * mean offering a choice the product cannot honour — the picker would look
 * complete while the output quietly disappointed. Anything missing here can be
 * added once its output has been checked.
 */

export interface OutputLanguage {
  /** BCP-47 primary subtag. */
  code: string;
  /** English name — sent to the model. */
  name: string;
  /** Endonym — shown to the user. */
  native: string;
}

export const OUTPUT_LANGUAGES: readonly OutputLanguage[] = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "zh", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "jv", name: "Javanese", native: "Basa Jawa" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "fr", name: "French", native: "Français" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "kk", name: "Kazakh", native: "Қазақша" },
  { code: "uz", name: "Uzbek", native: "Oʻzbekcha" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ps", name: "Pashto", native: "پښتو" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "mt", name: "Maltese", native: "Malti" },
] as const;

/** Fallback for anything unrecognised, so output never silently loses a language. */
export const DEFAULT_LANGUAGE_CODE = "en";

const BY_CODE = new Map(OUTPUT_LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

/**
 * English name for a language code, for use in prompts.
 *
 * Falls back through the region subtag (so "es-MX" resolves via "es") before
 * defaulting to English — a regional variant should still produce Spanish
 * rather than quietly switching language.
 */
export function languageName(code: string | null | undefined): string {
  if (!code) return "English";
  const lower = code.toLowerCase();
  const exact = BY_CODE.get(lower);
  if (exact) return exact.name;
  const base = BY_CODE.get(lower.split("-")[0] ?? "");
  return base?.name ?? "English";
}

/** True when the code is one this product offers. */
export function isSupportedLanguage(code: string | null | undefined): boolean {
  if (!code) return false;
  return BY_CODE.has(code.toLowerCase());
}

/**
 * Countries, for narrowing a guest search.
 *
 * A free-text box invited typos and half-names ("UAE", "the Emirates",
 * "Dubai") that a model then had to interpret, which is one more place for a
 * search to quietly go wrong. A fixed list makes the constraint unambiguous.
 *
 * Names are the common English forms rather than official long titles,
 * because that is what people type and what sources use.
 */
export const COUNTRIES: readonly string[] = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Bulgaria", "Cambodia", "Cameroon",
  "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czechia", "Denmark", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Estonia", "Ethiopia", "Finland", "France", "Georgia", "Germany", "Ghana", "Greece",
  "Guatemala", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Libya", "Lithuania", "Luxembourg", "Malaysia", "Maldives", "Malta", "Mexico",
  "Moldova", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palestine", "Panama", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia",
  "Senegal", "Serbia", "Singapore", "Slovakia", "Slovenia", "Somalia", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Tunisia", "Turkey", "Turkmenistan",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
] as const;

/**
 * Default IANA timezone for each country.
 *
 * Timezone is a field people get wrong — "Asia/Karachi" is not something
 * anyone types from memory, and a wrong one silently shifts every reminder.
 * Picking a country is easy and implies the answer, so the country choice
 * fills this in.
 *
 * Countries spanning several zones get their most populous one, which is the
 * right guess for most users and still editable by the rest.
 */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  Afghanistan: "Asia/Kabul", Albania: "Europe/Tirane", Algeria: "Africa/Algiers",
  Argentina: "America/Argentina/Buenos_Aires", Armenia: "Asia/Yerevan",
  Australia: "Australia/Sydney", Austria: "Europe/Vienna", Azerbaijan: "Asia/Baku",
  Bahrain: "Asia/Bahrain", Bangladesh: "Asia/Dhaka", Belarus: "Europe/Minsk",
  Belgium: "Europe/Brussels", Bolivia: "America/La_Paz",
  "Bosnia and Herzegovina": "Europe/Sarajevo", Botswana: "Africa/Gaborone",
  Brazil: "America/Sao_Paulo", Bulgaria: "Europe/Sofia", Cambodia: "Asia/Phnom_Penh",
  Cameroon: "Africa/Douala", Canada: "America/Toronto", Chile: "America/Santiago",
  China: "Asia/Shanghai", Colombia: "America/Bogota", "Costa Rica": "America/Costa_Rica",
  Croatia: "Europe/Zagreb", Cuba: "America/Havana", Cyprus: "Asia/Nicosia",
  Czechia: "Europe/Prague", Denmark: "Europe/Copenhagen",
  "Dominican Republic": "America/Santo_Domingo", Ecuador: "America/Guayaquil",
  Egypt: "Africa/Cairo", "El Salvador": "America/El_Salvador", Estonia: "Europe/Tallinn",
  Ethiopia: "Africa/Addis_Ababa", Finland: "Europe/Helsinki", France: "Europe/Paris",
  Georgia: "Asia/Tbilisi", Germany: "Europe/Berlin", Ghana: "Africa/Accra",
  Greece: "Europe/Athens", Guatemala: "America/Guatemala", Honduras: "America/Tegucigalpa",
  "Hong Kong": "Asia/Hong_Kong", Hungary: "Europe/Budapest", Iceland: "Atlantic/Reykjavik",
  India: "Asia/Kolkata", Indonesia: "Asia/Jakarta", Iran: "Asia/Tehran",
  Iraq: "Asia/Baghdad", Ireland: "Europe/Dublin", Israel: "Asia/Jerusalem",
  Italy: "Europe/Rome", "Ivory Coast": "Africa/Abidjan", Jamaica: "America/Jamaica",
  Japan: "Asia/Tokyo", Jordan: "Asia/Amman", Kazakhstan: "Asia/Almaty",
  Kenya: "Africa/Nairobi", Kuwait: "Asia/Kuwait", Kyrgyzstan: "Asia/Bishkek",
  Laos: "Asia/Vientiane", Latvia: "Europe/Riga", Lebanon: "Asia/Beirut",
  Libya: "Africa/Tripoli", Lithuania: "Europe/Vilnius", Luxembourg: "Europe/Luxembourg",
  Malaysia: "Asia/Kuala_Lumpur", Maldives: "Indian/Maldives", Malta: "Europe/Malta",
  Mexico: "America/Mexico_City", Moldova: "Europe/Chisinau", Mongolia: "Asia/Ulaanbaatar",
  Montenegro: "Europe/Podgorica", Morocco: "Africa/Casablanca", Mozambique: "Africa/Maputo",
  Myanmar: "Asia/Yangon", Nepal: "Asia/Kathmandu", Netherlands: "Europe/Amsterdam",
  "New Zealand": "Pacific/Auckland", Nicaragua: "America/Managua", Nigeria: "Africa/Lagos",
  "North Macedonia": "Europe/Skopje", Norway: "Europe/Oslo", Oman: "Asia/Muscat",
  Pakistan: "Asia/Karachi", Palestine: "Asia/Hebron", Panama: "America/Panama",
  Paraguay: "America/Asuncion", Peru: "America/Lima", Philippines: "Asia/Manila",
  Poland: "Europe/Warsaw", Portugal: "Europe/Lisbon", Qatar: "Asia/Qatar",
  Romania: "Europe/Bucharest", Russia: "Europe/Moscow", Rwanda: "Africa/Kigali",
  "Saudi Arabia": "Asia/Riyadh", Senegal: "Africa/Dakar", Serbia: "Europe/Belgrade",
  Singapore: "Asia/Singapore", Slovakia: "Europe/Bratislava", Slovenia: "Europe/Ljubljana",
  Somalia: "Africa/Mogadishu", "South Africa": "Africa/Johannesburg", "South Korea": "Asia/Seoul",
  Spain: "Europe/Madrid", "Sri Lanka": "Asia/Colombo", Sudan: "Africa/Khartoum",
  Sweden: "Europe/Stockholm", Switzerland: "Europe/Zurich", Syria: "Asia/Damascus",
  Taiwan: "Asia/Taipei", Tajikistan: "Asia/Dushanbe", Tanzania: "Africa/Dar_es_Salaam",
  Thailand: "Asia/Bangkok", Tunisia: "Africa/Tunis", Turkey: "Europe/Istanbul",
  Turkmenistan: "Asia/Ashgabat", Uganda: "Africa/Kampala", Ukraine: "Europe/Kyiv",
  "United Arab Emirates": "Asia/Dubai", "United Kingdom": "Europe/London",
  "United States": "America/New_York", Uruguay: "America/Montevideo",
  Uzbekistan: "Asia/Tashkent", Venezuela: "America/Caracas", Vietnam: "Asia/Ho_Chi_Minh",
  Yemen: "Asia/Aden", Zambia: "Africa/Lusaka", Zimbabwe: "Africa/Harare",
};
