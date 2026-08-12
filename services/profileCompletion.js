/**
 * Match-readiness and profile-strength scoring.
 *
 * Find Partner is gated on must-haves (photo, education, profession, family),
 * not on the percentage. The percentage is a display meter of fields families
 * actually read. Astrology, account, and default booleans are excluded.
 *
 * Extra JSON fields are additive so older frontends keep working.
 */

function asObject(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return doc;
}

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) {
    return value.some((item) => isFilled(item));
  }
  return false;
}

function hasPhoto(user) {
  const pictures = Array.isArray(user.profile_pictures)
    ? user.profile_pictures
    : [];
  if (pictures.some((url) => isFilled(url))) return true;
  return isFilled(user.profile_picture);
}

function hasHobby(user) {
  return Array.isArray(user.hobbies) && user.hobbies.some((item) => isFilled(item));
}

function strengthEntries(user) {
  const family = asObject(user.family) || {};
  const education = asObject(user.education) || {};
  const profession = asObject(user.profession) || {};
  const mother = family.mother || {};
  const father = family.father || {};
  const siblings = family.siblings || {};
  const college = education.college_details || {};
  const work = profession.work_address || {};
  const birth = user.birth_details || {};
  const physical = user.physical_attributes || {};
  const lifestyle = user.lifestyle || {};
  const location = user.location || {};

  return [
    user.name,
    user.gender,
    user.dob,
    user.height,
    user.religion,
    user.caste,
    user.mobile,
    user.email,
    user.marital_status,
    user.mangalik,
    user.language,
    user.about_myself,
    user.looking_for,
    lifestyle.smoke,
    lifestyle.drink,
    lifestyle.veg_nonveg,
    lifestyle.abroad_ready,
    location.city,
    location.address,
    physical.skin_tone,
    physical.body_type,
    birth.birth_time,
    birth.birth_place,
    hasPhoto(user) ? "yes" : "",
    hasHobby(user) ? "yes" : "",
    family.family_value,
    family.family_type,
    mother.name,
    mother.occupation,
    father.name,
    father.occupation,
    siblings.brother_count,
    siblings.sister_count,
    education.education_level,
    education.education_field,
    college.name,
    college.city,
    profession.occupation,
    profession.designation,
    profession.working_with,
    profession.income,
    work.address,
    work.city,
  ];
}

function missingRequirements(user) {
  const family = asObject(user.family) || {};
  const education = asObject(user.education) || {};
  const profession = asObject(user.profession) || {};
  const motherName = family.mother?.name;
  const fatherName = family.father?.name;
  const missing = [];

  if (!hasPhoto(user)) {
    missing.push({ id: "photo", label: "a photo" });
  }
  if (!isFilled(education.education_level)) {
    missing.push({ id: "education", label: "education" });
  }
  if (!isFilled(profession.occupation)) {
    missing.push({ id: "profession", label: "profession" });
  }
  if (!isFilled(family.family_type) || (!isFilled(motherName) && !isFilled(fatherName))) {
    missing.push({ id: "family", label: "family" });
  }

  return missing;
}

function formatMissingMessage(missing) {
  const labels = missing.map((item) => item.label);
  if (labels.length === 0) return "";
  if (labels.length === 1) {
    return `Add ${labels[0]} before you can search.`;
  }
  if (labels.length === 2) {
    return `Add ${labels[0]} and ${labels[1]} before you can search.`;
  }
  return `Add ${labels.slice(0, -1).join(", ")}, and ${
    labels[labels.length - 1]
  } before you can search.`;
}

function evaluateProfileCompletion(user) {
  const source = asObject(user) || {};
  const entries = strengthEntries(source);
  const total = entries.length;
  const filled = entries.filter((value) => isFilled(value)).length;
  const completionPercentage =
    total > 0 ? Math.round((filled / total) * 100) : 0;
  const missing = missingRequirements(source);
  const readyForMatches = missing.length === 0;
  const message = readyForMatches
    ? ""
    : formatMissingMessage(missing);

  return {
    completionPercentage,
    readyForMatches,
    missing,
    message,
  };
}

module.exports = {
  evaluateProfileCompletion,
  formatMissingMessage,
  isFilled,
};
