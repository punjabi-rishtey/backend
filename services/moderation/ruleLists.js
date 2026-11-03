/**
 * Starter curated lists for post-approval free-text screening.
 * Expand from labeled exports (scripts/exportFreeTextSamples.js).
 */

/** Phrases that should never trip abuse matching in matrimonial bios. */
const ALLOWLIST_PHRASES = [
  "caste no bar",
  "no caste bar",
  "homely",
  "sanskari",
  "wheatish",
  "wheatish complexion",
  "convent educated",
  "teetotaller",
  "teetotaler",
  "pure vegetarian",
  "veg by choice",
  "god fearing",
  "well settled",
  "settled abroad",
  "nri",
  "looking for a matching alliance",
  "looking for a suitable match",
  "respectful family",
  "joint family",
  "nuclear family",
];

/**
 * Off-platform / contact solicitation in narrative fields.
 * Matched after normalization (lowercase, collapsed spaces).
 */
const SOLICITATION_PATTERNS = [
  /\bwhats\s*app\s*(me|karo|karo|pe|par|number|no\.?)\b/i,
  /\bwa\.me\b/i,
  /\b(telegram|signal)\s*(me|id|handle|username)?\b/i,
  /\b(dm|direct\s*message)\s*(me|on)?\b/i,
  /\b(insta|instagram|ig|snap|snapchat|fb|facebook)\s*(me|id|handle|username|account|profile)?\b/i,
  /\badd\s*me\s*on\s*(insta|instagram|whatsapp|wa|telegram|snap)\b/i,
  /\bfollow\s*me\s*on\b/i,
  /\bmy\s*(insta|instagram|whatsapp|telegram|snap)\s*(id|handle|is|:)\b/i,
  /\bcontact\s*(me\s*)?(on|via)\s*(whatsapp|insta|instagram|telegram)\b/i,
  /\bcall\s*(me\s*)?(on|at)\s*\+?\d/i,
  /\btext\s*me\s*(on|at)\b/i,
  /@[\w.]{2,}/,
];

/** Soft dowry / money demand — log + flag in v1, do not hard-block yet. */
const DOWRY_PATTERNS = [
  /\bdowry\b/i,
  /\bdahej\b/i,
  /\bexpecting\s+\d+(\.\d+)?\s*(lakh|lac|crore|cr)\b/i,
  /\b(want|needs?|expect(ing)?)\s+(a\s+)?(car|bmw|audi|mercedes)\b/i,
  /\bgive\s+\d+(\.\d+)?\s*(lakh|lac)\b/i,
];

/**
 * Abuse / sexual / harassment terms (English + common Hinglish/roman Punjabi).
 * Word-boundary style matching applied in the scanner.
 */
const ABUSE_TERMS = [
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "cock",
  "pussy",
  "slut",
  "whore",
  "porn",
  "pornography",
  "nude",
  "nudes",
  "sex",
  "sexy",
  "hookup",
  "hook up",
  "one night",
  "ons",
  "randi",
  "rando",
  "chudai",
  "chodu",
  "chod",
  "madarchod",
  "behenchod",
  "bhenchod",
  "bhosdike",
  "bhosdi",
  "gaand",
  "gand",
  "harami",
  "kutta",
  "kutti",
  "saala",
  "sala",
  "hijra",
  "hijda",
  "chutiya",
  "chutia",
  "lund",
  "lauda",
  "lawda",
  "boobs",
  "tits",
  "rape",
  "rapist",
];

module.exports = {
  ALLOWLIST_PHRASES,
  SOLICITATION_PATTERNS,
  DOWRY_PATTERNS,
  ABUSE_TERMS,
};
