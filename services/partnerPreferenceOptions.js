/**
 * Canonical partner-preference choices for preference1–preference3.
 * Admin Add User previously accepted free text; new writes must use these values.
 * GET /api/options/preferences exposes this list (single source of truth).
 */
const PARTNER_PREFERENCE_OPTIONS = [
  { value: "similar_age", label: "Similar age group" },
  { value: "age_older", label: "Slightly older partner" },
  { value: "age_younger", label: "Slightly younger partner" },
  { value: "height_tall", label: "Taller height preferred" },
  { value: "height_average", label: "Average height preferred" },
  { value: "graduate_plus", label: "Graduate or higher education" },
  { value: "professional", label: "Professional / stable career" },
  { value: "business_family", label: "Business or family business background" },
  { value: "govt_job", label: "Government / PSU job preferred" },
  { value: "nri_abroad", label: "Open to NRI / settled abroad" },
  { value: "india_based", label: "India-based match preferred" },
  { value: "traditional_family", label: "Traditional family values" },
  { value: "modern_family", label: "Modern / liberal family values" },
  { value: "joint_family_ok", label: "Comfortable with joint family" },
  { value: "nuclear_family", label: "Nuclear family preferred" },
  { value: "vegetarian", label: "Vegetarian lifestyle" },
  { value: "caste_no_bar", label: "Caste no bar" },
  { value: "same_community", label: "Same community preferred" },
];

const ALLOWED_VALUES = new Set(
  PARTNER_PREFERENCE_OPTIONS.map((option) => option.value)
);

function normalizePreferenceField(value, fieldName) {
  if (value === undefined || value === null) {
    return { ok: false, message: `${fieldName} is required.` };
  }
  if (typeof value !== "string") {
    return { ok: false, message: `${fieldName} must be a string.` };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: `${fieldName} cannot be empty.` };
  }
  if (!ALLOWED_VALUES.has(trimmed)) {
    return {
      ok: false,
      message: `${fieldName} must be one of the allowed partner preference options.`,
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * @returns {{ ok: true, preference1: string, preference2: string, preference3: string } | { ok: false, message: string }}
 */
function validatePartnerPreferenceBody(body) {
  const source = body && typeof body === "object" ? body : {};
  const p1 = normalizePreferenceField(source.preference1, "preference1");
  if (!p1.ok) return p1;
  const p2 = normalizePreferenceField(source.preference2, "preference2");
  if (!p2.ok) return p2;
  const p3 = normalizePreferenceField(source.preference3, "preference3");
  if (!p3.ok) return p3;

  return {
    ok: true,
    preference1: p1.value,
    preference2: p2.value,
    preference3: p3.value,
  };
}

function listPartnerPreferenceOptions() {
  return PARTNER_PREFERENCE_OPTIONS.map((option) => ({ ...option }));
}

module.exports = {
  PARTNER_PREFERENCE_OPTIONS,
  ALLOWED_VALUES,
  listPartnerPreferenceOptions,
  validatePartnerPreferenceBody,
};