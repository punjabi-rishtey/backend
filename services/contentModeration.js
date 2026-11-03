/**
 * Post-approval free-text content moderation.
 * Rules hard-block; OpenAI Moderation runs in shadow mode only (v1).
 */

const { parsePhoneNumberFromString } = require("libphonenumber-js");
const validator = require("validator");
const ContentModerationLog = require("../models/ContentModerationLog");
const User = require("../models/User");
const {
  ALLOWLIST_PHRASES,
  SOLICITATION_PATTERNS,
  DOWRY_PATTERNS,
  ABUSE_TERMS,
} = require("./moderation/ruleLists");

const FIELD_REGISTRY = {
  about_myself: { tier: "narrative", label: "About" },
  looking_for: { tier: "narrative", label: "Looking for" },
  hobbies: { tier: "narrative", label: "Hobbies" },
  "location.address": { tier: "narrative", label: "Address" },
  name: { tier: "name", label: "Name" },
  secondary_contact: { tier: "contact_like", label: "Secondary contact" },
  additional_info: { tier: "narrative", label: "Additional info" },
  "mother.name": { tier: "name", label: "Mother name" },
  "father.name": { tier: "name", label: "Father name" },
  "mother.occupation": { tier: "narrative", label: "Mother occupation" },
  "father.occupation": { tier: "narrative", label: "Father occupation" },
};

const BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000;
const FLAG_THRESHOLD = 3;
const OPENAI_TIMEOUT_MS = 2000;
const ALLOW_SAMPLE_RATE = 0.08;

let circuitOpenUntil = 0;
let consecutiveOpenAiFailures = 0;

function normalizeText(input) {
  if (input === null || input === undefined) return "";
  let text = String(input);
  try {
    text = text.normalize("NFKC");
  } catch {
    // ignore
  }
  // Strip zero-width / bidi controls
  text = text.replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "");
  // Collapse whitespace and excessive repeats (fuuuuck -> fuuuck)
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/(.)\1{3,}/g, "$1$1$1");
  return text;
}

function maskAllowlisted(normalizedLower) {
  let masked = normalizedLower;
  for (const phrase of ALLOWLIST_PHRASES) {
    const p = phrase.toLowerCase();
    if (!p) continue;
    masked = masked.split(p).join(" ".repeat(p.length));
  }
  return masked;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhones(text) {
  const hits = [];
  // Digits / + with separators — feed chunks to libphonenumber
  const candidates = text.match(
    /(?:\+?\d[\d\s().-]{7,}\d)/g
  ) || [];
  for (const raw of candidates) {
    const compact = raw.replace(/[^\d+]/g, "");
    try {
      const parsed =
        parsePhoneNumberFromString(compact, "IN") ||
        parsePhoneNumberFromString(compact);
      if (parsed && parsed.isValid()) {
        hits.push(parsed.format("E.164"));
      }
    } catch {
      // ignore
    }
  }
  // Spaced digit runs that look Indian mobile (10 digits)
  const digitRuns = text.replace(/\D/g, " ").match(/\b\d{10}\b/g) || [];
  for (const run of digitRuns) {
    try {
      const parsed = parsePhoneNumberFromString(run, "IN");
      if (parsed && parsed.isValid()) hits.push(parsed.format("E.164"));
    } catch {
      // ignore
    }
  }
  return [...new Set(hits)];
}

function findEmails(text) {
  const parts = text.split(/\s+/);
  const found = [];
  for (const part of parts) {
    const cleaned = part.replace(/^[<(["']+|[>)\]"',.;:!?]+$/g, "");
    if (cleaned && validator.isEmail(cleaned)) found.push(cleaned);
  }
  // also "name at gmail.com"
  if (/\b[\w.+-]+\s+at\s+[\w-]+\s*dot\s*\w+\b/i.test(text)) {
    found.push("obfuscated-email");
  }
  return found;
}

function findUrls(text) {
  const urls = [];
  const httpMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
  urls.push(...httpMatches);
  if (/\bwww\.[^\s]+/i.test(text)) urls.push("www");
  if (/\b[\w-]+\s*dot\s*com\b/i.test(text)) urls.push("obfuscated-url");
  return urls;
}

function matchAbuse(maskedLower) {
  const hits = [];
  for (const term of ABUSE_TERMS) {
    const re = new RegExp(
      `(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(term)}(?:$|[^\\p{L}\\p{N}_])`,
      "iu"
    );
    if (re.test(maskedLower)) hits.push(term);
  }
  return hits;
}

function matchPatterns(text, patterns) {
  return patterns.filter((re) => re.test(text));
}

function snippetOf(text, max = 120) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Evaluate a single field value.
 * @returns {{ verdict: 'allow'|'block'|'flag', ruleIds: string[], reasonLabel: string, message: string }}
 */
function evaluateField(fieldKey, rawValue) {
  const meta = FIELD_REGISTRY[fieldKey];
  if (!meta) {
    return { verdict: "allow", ruleIds: [], reasonLabel: "", message: "" };
  }

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  const joined = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => normalizeText(v))
    .filter(Boolean)
    .join(" ");

  if (!joined) {
    return { verdict: "allow", ruleIds: [], reasonLabel: "", message: "" };
  }

  const lower = joined.toLowerCase();
  const masked = maskAllowlisted(lower);
  const tier = meta.tier;
  const ruleIds = [];
  let reasonLabel = "";
  let message = "";
  let hardBlock = false;
  let softFlag = false;

  if (tier === "narrative" || tier === "name") {
    const phones = findPhones(joined);
    if (phones.length) {
      hardBlock = true;
      ruleIds.push("contact.phone");
      reasonLabel = reasonLabel || `phone in ${meta.label.toLowerCase()}`;
      message =
        message ||
        `Please remove phone numbers from ${meta.label.toLowerCase()}. Use the contact fields instead.`;
    }
    const emails = findEmails(joined);
    if (emails.length) {
      hardBlock = true;
      ruleIds.push("contact.email");
      reasonLabel = reasonLabel || `email in ${meta.label.toLowerCase()}`;
      message =
        message ||
        `Please remove email addresses from ${meta.label.toLowerCase()}.`;
    }
    const urls = findUrls(joined);
    if (urls.length) {
      hardBlock = true;
      ruleIds.push("contact.url");
      reasonLabel = reasonLabel || `link in ${meta.label.toLowerCase()}`;
      message =
        message || `Please remove website links from ${meta.label.toLowerCase()}.`;
    }
  }

  // Solicitation / social handles — all free-text tiers including contact_like
  const solicitHits = matchPatterns(joined, SOLICITATION_PATTERNS);
  // For contact_like, allow plain phones; still block "add me on insta" patterns
  // and @handles when the whole field is not just a phone number.
  if (solicitHits.length) {
    const onlyPhone =
      tier === "contact_like" &&
      findPhones(joined).length > 0 &&
      !/@[\w.]{2,}/.test(joined) &&
      !/(insta|instagram|telegram|snap|whats\s*app)/i.test(joined);
    if (!onlyPhone) {
      hardBlock = true;
      ruleIds.push("solicitation");
      reasonLabel = reasonLabel || "solicitation";
      message =
        message ||
        "Please don’t advertise WhatsApp, Instagram, or other social accounts in this field.";
    }
  }

  const abuseHits = matchAbuse(masked);
  if (abuseHits.length) {
    hardBlock = true;
    ruleIds.push("abuse.term");
    reasonLabel = reasonLabel || "inappropriate language";
    message =
      message ||
      "Please revise this text. It includes language that isn’t allowed on Punjabi Rishtey.";
  }

  const dowryHits = matchPatterns(joined, DOWRY_PATTERNS);
  if (dowryHits.length) {
    softFlag = true;
    ruleIds.push("dowry.pattern");
    if (!reasonLabel) reasonLabel = "money/dowry language";
  }

  if (hardBlock) {
    return {
      verdict: "block",
      ruleIds: [...new Set(ruleIds)],
      reasonLabel,
      message,
      snippet: snippetOf(joined),
    };
  }

  if (softFlag) {
    return {
      verdict: "flag",
      ruleIds: [...new Set(ruleIds)],
      reasonLabel,
      message: "",
      snippet: snippetOf(joined),
    };
  }

  return {
    verdict: "allow",
    ruleIds: [],
    reasonLabel: "",
    message: "",
    snippet: snippetOf(joined),
  };
}

/**
 * Collect moderated field values from a flat or nested update payload.
 */
function extractFieldsFromPayload(kind, body) {
  const out = {};
  if (!body || typeof body !== "object") return out;

  if (kind === "user") {
    for (const key of [
      "about_myself",
      "looking_for",
      "secondary_contact",
      "name",
      "hobbies",
    ]) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        out[key] = body[key];
      }
    }
    if (
      body.location &&
      typeof body.location === "object" &&
      Object.prototype.hasOwnProperty.call(body.location, "address")
    ) {
      out["location.address"] = body.location.address;
    }
  }

  if (kind === "education" || kind === "profession") {
    if (Object.prototype.hasOwnProperty.call(body, "additional_info")) {
      out.additional_info = body.additional_info;
    }
  }

  if (kind === "family") {
    if (body.mother?.name !== undefined) out["mother.name"] = body.mother.name;
    if (body.father?.name !== undefined) out["father.name"] = body.father.name;
    if (body.mother?.occupation !== undefined)
      out["mother.occupation"] = body.mother.occupation;
    if (body.father?.occupation !== undefined)
      out["father.occupation"] = body.father.occupation;
  }

  return out;
}

async function writeLog(entry) {
  try {
    await ContentModerationLog.create(entry);
  } catch (err) {
    console.error("[contentModeration] log failed:", err.message);
  }
}

async function bumpOffenderState(userId, { hardBlock, softFlag, reasonLabel, field }) {
  const user = await User.findById(userId).select(
    "content_screening"
  );
  if (!user) return null;

  const screening = user.content_screening || {};
  const now = new Date();
  let blockTimestamps = Array.isArray(screening.recent_block_at)
    ? screening.recent_block_at.map((d) => new Date(d)).filter(Boolean)
    : [];

  if (hardBlock) {
    blockTimestamps.push(now);
    blockTimestamps = blockTimestamps.filter(
      (d) => now - d <= 7 * BLOCK_WINDOW_MS
    );
  }

  const blocks24h = blockTimestamps.filter(
    (d) => now - d <= BLOCK_WINDOW_MS
  ).length;
  const blocks7d = blockTimestamps.length;

  let flagged = Boolean(screening.flagged);
  if (softFlag || blocks24h >= FLAG_THRESHOLD) {
    flagged = true;
  }

  const update = {
    content_screening: {
      flagged,
      flagged_at: flagged
        ? screening.flagged_at || now
        : screening.flagged_at || null,
      recent_block_at: blockTimestamps,
      blocks_24h: blocks24h,
      blocks_7d: blocks7d,
      last_block_field: hardBlock ? field : screening.last_block_field || "",
      last_block_reason: hardBlock
        ? reasonLabel
        : screening.last_block_reason || "",
      last_block_at: hardBlock ? now : screening.last_block_at || null,
    },
  };

  await User.findByIdAndUpdate(userId, { $set: update });
  return update.content_screening;
}

/**
 * Shadow OpenAI Moderation — never blocks. Fail-open.
 */
async function shadowOpenAiModeration(text) {
  if (!process.env.OPENAI_API_KEY) {
    return { skipped: true, reason: "no_api_key" };
  }
  if (Date.now() < circuitOpenUntil) {
    return { skipped: true, reason: "circuit_open" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: text.slice(0, 4000),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`openai_http_${res.status}`);
    }

    const data = await res.json();
    consecutiveOpenAiFailures = 0;
    const result = data?.results?.[0] || null;
    return {
      skipped: false,
      flagged: Boolean(result?.flagged),
      categories: result?.categories || null,
      category_scores: result?.category_scores || null,
    };
  } catch (err) {
    consecutiveOpenAiFailures += 1;
    if (consecutiveOpenAiFailures >= 3) {
      circuitOpenUntil = Date.now() + 60_000;
      consecutiveOpenAiFailures = 0;
    }
    return {
      skipped: true,
      reason: err.name === "AbortError" ? "timeout" : err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Main entry: screen payload fields if user is Approved (and not admin bypass).
 *
 * @returns {{
 *   allowed: boolean,
 *   fields?: Record<string, { reason: string, message: string, ruleIds: string[] }>,
 *   code?: string
 * }}
 */
async function screenProfileContent({
  userId,
  userStatus,
  kind,
  body,
  bypass = false,
  source = "member",
}) {
  if (bypass || userStatus !== "Approved") {
    return { allowed: true, skipped: true };
  }

  const fieldMap = extractFieldsFromPayload(kind, body);
  const keys = Object.keys(fieldMap);
  if (keys.length === 0) {
    return { allowed: true, skipped: true };
  }

  const rejected = {};
  let anyBlock = false;
  let anyFlag = false;
  const textsForShadow = [];

  for (const [field, value] of Object.entries(fieldMap)) {
    const result = evaluateField(field, value);
    if (result.verdict === "block") {
      anyBlock = true;
      rejected[field] = {
        reason: result.reasonLabel,
        message: result.message,
        ruleIds: result.ruleIds,
      };
      await writeLog({
        user: userId,
        field,
        verdict: "block",
        ruleIds: result.ruleIds,
        reasonLabel: result.reasonLabel,
        message: result.message,
        snippet: result.snippet,
        source,
      });
      await bumpOffenderState(userId, {
        hardBlock: true,
        softFlag: false,
        reasonLabel: result.reasonLabel,
        field,
      });
    } else if (result.verdict === "flag") {
      anyFlag = true;
      await writeLog({
        user: userId,
        field,
        verdict: "flag",
        ruleIds: result.ruleIds,
        reasonLabel: result.reasonLabel,
        snippet: result.snippet,
        source,
      });
      await bumpOffenderState(userId, {
        hardBlock: false,
        softFlag: true,
        reasonLabel: result.reasonLabel,
        field,
      });
      textsForShadow.push(result.snippet);
    } else {
      textsForShadow.push(result.snippet);
      if (Math.random() < ALLOW_SAMPLE_RATE) {
        await writeLog({
          user: userId,
          field,
          verdict: "allow",
          ruleIds: [],
          snippet: result.snippet,
          source,
        });
      }
    }
  }

  if (anyBlock) {
    return {
      allowed: false,
      code: "content_rejected",
      fields: rejected,
      message: "Please revise the highlighted fields and try again.",
    };
  }

  // Shadow AI on concatenated changed text (non-blocking decision)
  const shadowText = textsForShadow.filter(Boolean).join("\n").trim();
  if (shadowText) {
    const shadow = await shadowOpenAiModeration(shadowText);
    if (shadow.skipped) {
      if (shadow.reason && shadow.reason !== "no_api_key") {
        await writeLog({
          user: userId,
          field: keys.join(","),
          verdict: "degraded",
          ruleIds: ["openai.shadow"],
          reasonLabel: shadow.reason,
          snippet: snippetOf(shadowText),
          source,
        });
      }
    } else {
      await writeLog({
        user: userId,
        field: keys.join(","),
        verdict: "shadow",
        ruleIds: shadow.flagged ? ["openai.flagged"] : ["openai.clear"],
        reasonLabel: shadow.flagged ? "model_flagged" : "model_clear",
        snippet: snippetOf(shadowText),
        modelScores: {
          flagged: shadow.flagged,
          categories: shadow.categories,
          category_scores: shadow.category_scores,
        },
        source,
      });
      if (shadow.flagged) {
        await bumpOffenderState(userId, {
          hardBlock: false,
          softFlag: true,
          reasonLabel: "model_flagged",
          field: keys[0],
        });
      }
    }
  }

  if (anyFlag) {
    return { allowed: true, flagged: true };
  }

  return { allowed: true };
}

async function clearContentFlag(userId) {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "content_screening.flagged": false,
        "content_screening.flagged_at": null,
      },
    },
    { new: true }
  ).select("content_screening name");
}

async function getScreeningSummary(userId) {
  const user = await User.findById(userId).select("content_screening").lean();
  const screening = user?.content_screening || {};
  const now = Date.now();
  const recent = Array.isArray(screening.recent_block_at)
    ? screening.recent_block_at.map((d) => new Date(d))
    : [];
  return {
    flagged: Boolean(screening.flagged),
    flagged_at: screening.flagged_at || null,
    blocks_24h: recent.filter((d) => now - d <= BLOCK_WINDOW_MS).length,
    blocks_7d: recent.filter((d) => now - d <= 7 * BLOCK_WINDOW_MS).length,
    last_block_field: screening.last_block_field || "",
    last_block_reason: screening.last_block_reason || "",
    last_block_at: screening.last_block_at || null,
  };
}

module.exports = {
  FIELD_REGISTRY,
  normalizeText,
  evaluateField,
  extractFieldsFromPayload,
  screenProfileContent,
  clearContentFlag,
  getScreeningSummary,
  shadowOpenAiModeration,
};
