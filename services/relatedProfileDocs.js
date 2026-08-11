const Family = require("../models/Family");
const Education = require("../models/Education");
const Profession = require("../models/Profession");
const Astrology = require("../models/Astrology");
const Preference = require("../models/Preference");
const User = require("../models/User");

const RELATED_KINDS = [
  {
    key: "family",
    model: Family,
    userRef: "family",
  },
  {
    key: "education",
    model: Education,
    userRef: "education",
  },
  {
    key: "profession",
    model: Profession,
    userRef: "profession",
  },
  {
    key: "astrology",
    model: Astrology,
    userRef: "astrology",
  },
];

const emptyStubs = {
  family: {
    family_value: "",
    family_type: "",
    mother: {},
    father: {},
    siblings: {},
  },
  education: {
    education_level: "",
    college_details: { passout_year: "" },
    school_details: {},
  },
  profession: {
    occupation: "",
    work_address: { address: "", city: "" },
  },
  astrology: { rashi_nakshatra: "", gotra: "" },
};

function idString(value) {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function countFilledFields(value, depth = 0) {
  if (depth > 6) return 0;
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value !== "object") return 1;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countFilledFields(item, depth + 1), 0);
  }

  let filled = 0;
  for (const [key, nested] of Object.entries(value)) {
    if (["_id", "user", "user_name", "__v", "createdAt", "updatedAt"].includes(key)) {
      continue;
    }
    filled += countFilledFields(nested, depth + 1);
  }
  return filled;
}

function pickCanonicalDoc(docs) {
  if (!docs || docs.length === 0) return null;
  if (docs.length === 1) return docs[0];

  return [...docs].sort((a, b) => {
    const fillDiff = countFilledFields(b.toObject?.() ?? b) - countFilledFields(a.toObject?.() ?? a);
    if (fillDiff !== 0) return fillDiff;
    return String(b._id).localeCompare(String(a._id));
  })[0];
}

async function findDocsByUser(model, userId) {
  return model.find({ user: userId }).exec();
}

/**
 * Prefer related docs keyed by `user` (how member/admin upserts write).
 * Returns plain docs (or null) plus drift flags vs User ObjectId refs.
 */
async function loadRelatedProfileDocs(userId, options = {}) {
  const includePreferences = options.includePreferences !== false;
  const userRefIds = options.userRefIds || {};

  const relatedEntries = await Promise.all(
    RELATED_KINDS.map(async ({ key, model, userRef }) => {
      const docs = await findDocsByUser(model, userId);
      const byUser = pickCanonicalDoc(docs);
      const refId = idString(userRefIds[userRef]);
      const byUserId = idString(byUser?._id);
      let byRef = null;

      if (refId) {
        byRef = docs.find((doc) => idString(doc._id) === refId) || null;
        if (!byRef) {
          byRef = await model.findById(refId).exec();
        }
      }

      const drift = {
        missingRef: Boolean(refId) && !byRef,
        missingByUser: !byUser,
        refMismatch: Boolean(refId && byUserId && refId !== byUserId),
        duplicateCount: docs.length,
      };

      return {
        key,
        userRef,
        doc: byUser,
        byRef,
        docs,
        drift,
      };
    })
  );

  const result = {
    family: null,
    education: null,
    profession: null,
    astrology: null,
    preferences: null,
    drift: {},
  };

  for (const entry of relatedEntries) {
    result[entry.key] = entry.doc;
    result.drift[entry.key] = entry.drift;
  }

  if (includePreferences) {
    const preferenceDocs = await Preference.find({ user: userId }).exec();
    const byUserPref = pickCanonicalDoc(preferenceDocs);
    const refId = idString(userRefIds.preferences);
    let byRefPref = null;
    if (refId) {
      byRefPref =
        preferenceDocs.find((doc) => idString(doc._id) === refId) ||
        (await Preference.findById(refId).exec());
    }

    result.preferences = byUserPref;
    result.drift.preferences = {
      missingRef: Boolean(refId) && !byRefPref,
      missingByUser: !byUserPref,
      refMismatch: Boolean(refId && byUserPref && refId !== idString(byUserPref._id)),
      duplicateCount: preferenceDocs.length,
    };
  }

  return result;
}

async function syncUserRelatedRef(userId, userRefField, relatedDocId) {
  if (!relatedDocId) return null;
  return User.findByIdAndUpdate(
    userId,
    { $set: { [userRefField]: relatedDocId } },
    { new: true }
  ).select(`_id ${userRefField}`);
}

/**
 * Upsert a related profile doc by user id, ensure user/user_name on insert,
 * and keep the matching User.<ref> ObjectId in sync.
 */
async function upsertRelatedProfileDoc({
  kind,
  userId,
  body,
}) {
  const kindConfig = RELATED_KINDS.find((item) => item.key === kind);
  if (!kindConfig) {
    throw new Error(`Unknown related profile kind: ${kind}`);
  }

  const owner = await User.findById(userId).select("name");
  if (!owner) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const update = { ...(body || {}) };
  delete update._id;
  delete update.__v;

  // Keep user linkage authoritative; ensure required user_name for upserts.
  update.user = userId;
  if (!update.user_name) {
    update.user_name = owner.name || "Unknown";
  }

  const updated = await kindConfig.model.findOneAndUpdate(
    { user: userId },
    update,
    {
      new: true,
      runValidators: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  await syncUserRelatedRef(userId, kindConfig.userRef, updated._id);
  return updated;
}

function withAdminStubs(related) {
  return {
    family: related.family || { ...emptyStubs.family },
    education: related.education || { ...emptyStubs.education },
    profession: related.profession || { ...emptyStubs.profession },
    astrology: related.astrology || { ...emptyStubs.astrology },
    preferences: related.preferences || null,
  };
}

module.exports = {
  RELATED_KINDS,
  emptyStubs,
  idString,
  countFilledFields,
  pickCanonicalDoc,
  loadRelatedProfileDocs,
  syncUserRelatedRef,
  upsertRelatedProfileDoc,
  withAdminStubs,
};
