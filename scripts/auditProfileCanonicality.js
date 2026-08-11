/* eslint-disable no-console */
/**
 * Read-only audit: User ObjectId refs vs related docs keyed by `user`.
 *
 * Usage (from backend/):
 *   node scripts/auditProfileCanonicality.js
 *   ENV_FILE=.env.qa node scripts/auditProfileCanonicality.js
 *   SAMPLE=20 node scripts/auditProfileCanonicality.js
 *
 * Never prints MONGO_URI or other secrets.
 */
const loadEnv = require("../config/loadEnv");
loadEnv();

const mongoose = require("mongoose");
const User = require("../models/User");
const Family = require("../models/Family");
const Education = require("../models/Education");
const Profession = require("../models/Profession");
const Astrology = require("../models/Astrology");
const Preference = require("../models/Preference");
const {
  RELATED_KINDS,
  idString,
  loadRelatedProfileDocs,
} = require("../services/relatedProfileDocs");

const EXAMPLE_LIMIT = Number(process.env.EXAMPLE_LIMIT || 8);
const SAMPLE = process.env.SAMPLE ? Number(process.env.SAMPLE) : null;

function pushExample(bucket, item) {
  if (bucket.length < EXAMPLE_LIMIT) bucket.push(item);
}

async function countDuplicates(model, label, summary) {
  const rows = await model.aggregate([
    { $match: { user: { $ne: null } } },
    { $group: { _id: "$user", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  summary.duplicates[label] = {
    usersWithDuplicates: rows.length,
    totalExtraDocs: rows.reduce((sum, row) => sum + (row.count - 1), 0),
    examples: rows.slice(0, EXAMPLE_LIMIT).map((row) => ({
      userId: String(row._id),
      count: row.count,
    })),
  };
}

async function countOrphanRelatedDocs(model, label, userIdSet, summary) {
  const docs = await model.find({ user: { $ne: null } }).select("_id user").lean();
  const orphans = docs.filter((doc) => !userIdSet.has(String(doc.user)));
  summary.orphanRelatedDocs[label] = {
    count: orphans.length,
    examples: orphans.slice(0, EXAMPLE_LIMIT).map((doc) => ({
      docId: String(doc._id),
      userId: String(doc.user),
    })),
  };
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Load .env via ENV_FILE or default .env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB (URI redacted). Read-only audit starting…");

  const query = { is_deleted: { $ne: true } };
  let usersQuery = User.find(query).select(
    "_id name email mobile family education profession astrology preferences about_myself looking_for secondary_contact"
  );
  if (SAMPLE && Number.isFinite(SAMPLE) && SAMPLE > 0) {
    usersQuery = usersQuery.limit(SAMPLE);
  }

  const users = await usersQuery.lean();
  const userIdSet = new Set(users.map((user) => String(user._id)));

  // Full user id set for orphan detection (related docs may point at deleted users)
  const allUserIds = await User.find({}).select("_id").lean();
  const allUserIdSet = new Set(allUserIds.map((user) => String(user._id)));

  const summary = {
    usersScanned: users.length,
    sampleMode: Boolean(SAMPLE),
    refMismatch: {},
    missingRefButByUserExists: {},
    missingByUserButRefExists: {},
    missingBoth: {},
    duplicates: {},
    orphanRelatedDocs: {},
    orphanUserRefs: {},
    preferences: {
      refMismatch: 0,
      missingRefButByUserExists: 0,
      missingByUserButRefExists: 0,
      missingBoth: 0,
      examples: [],
    },
    scalarSpotCheck: [],
  };

  for (const kind of RELATED_KINDS) {
    summary.refMismatch[kind.key] = { count: 0, examples: [] };
    summary.missingRefButByUserExists[kind.key] = { count: 0, examples: [] };
    summary.missingByUserButRefExists[kind.key] = { count: 0, examples: [] };
    summary.missingBoth[kind.key] = { count: 0, examples: [] };
    summary.orphanUserRefs[kind.key] = { count: 0, examples: [] };
  }

  for (const user of users) {
    const related = await loadRelatedProfileDocs(user._id, {
      userRefIds: {
        family: user.family,
        education: user.education,
        profession: user.profession,
        astrology: user.astrology,
        preferences: user.preferences,
      },
    });

    for (const kind of RELATED_KINDS) {
      const drift = related.drift[kind.key];
      const refId = idString(user[kind.userRef]);
      const byUserId = idString(related[kind.key]?._id);

      if (drift.refMismatch) {
        summary.refMismatch[kind.key].count += 1;
        pushExample(summary.refMismatch[kind.key].examples, {
          userId: String(user._id),
          name: user.name,
          refId,
          byUserId,
          duplicateCount: drift.duplicateCount,
        });
      }

      if (!refId && byUserId) {
        summary.missingRefButByUserExists[kind.key].count += 1;
        pushExample(summary.missingRefButByUserExists[kind.key].examples, {
          userId: String(user._id),
          name: user.name,
          byUserId,
        });
      }

      if (refId && !byUserId) {
        // Ref may point at a doc with wrong/missing user field
        const refDoc = await kind.model.findById(refId).select("_id user").lean();
        if (!refDoc) {
          summary.orphanUserRefs[kind.key].count += 1;
          pushExample(summary.orphanUserRefs[kind.key].examples, {
            userId: String(user._id),
            name: user.name,
            refId,
          });
        } else {
          summary.missingByUserButRefExists[kind.key].count += 1;
          pushExample(summary.missingByUserButRefExists[kind.key].examples, {
            userId: String(user._id),
            name: user.name,
            refId,
            refDocUser: idString(refDoc.user),
          });
        }
      }

      if (!refId && !byUserId) {
        summary.missingBoth[kind.key].count += 1;
      }
    }

    const prefDrift = related.drift.preferences;
    const prefRef = idString(user.preferences);
    const prefByUser = idString(related.preferences?._id);
    if (prefDrift?.refMismatch) {
      summary.preferences.refMismatch += 1;
      pushExample(summary.preferences.examples, {
        type: "refMismatch",
        userId: String(user._id),
        name: user.name,
        refId: prefRef,
        byUserId: prefByUser,
      });
    } else if (!prefRef && prefByUser) {
      summary.preferences.missingRefButByUserExists += 1;
      pushExample(summary.preferences.examples, {
        type: "missingRefButByUserExists",
        userId: String(user._id),
        name: user.name,
        byUserId: prefByUser,
      });
    } else if (prefRef && !prefByUser) {
      summary.preferences.missingByUserButRefExists += 1;
      pushExample(summary.preferences.examples, {
        type: "missingByUserButRefExists",
        userId: String(user._id),
        name: user.name,
        refId: prefRef,
      });
    } else if (!prefRef && !prefByUser) {
      summary.preferences.missingBoth += 1;
    }
  }

  await countDuplicates(Family, "family", summary);
  await countDuplicates(Education, "education", summary);
  await countDuplicates(Profession, "profession", summary);
  await countDuplicates(Astrology, "astrology", summary);
  await countDuplicates(Preference, "preferences", summary);

  await countOrphanRelatedDocs(Family, "family", allUserIdSet, summary);
  await countOrphanRelatedDocs(Education, "education", allUserIdSet, summary);
  await countOrphanRelatedDocs(Profession, "profession", allUserIdSet, summary);
  await countOrphanRelatedDocs(Astrology, "astrology", allUserIdSet, summary);
  await countOrphanRelatedDocs(Preference, "preferences", allUserIdSet, summary);

  // Spot-check: core scalars come from one User doc (should always be identical across surfaces)
  for (const user of users.slice(0, Math.min(5, users.length))) {
    summary.scalarSpotCheck.push({
      userId: String(user._id),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      secondary_contact: user.secondary_contact || "",
      about_myself_len: (user.about_myself || "").length,
      looking_for_len: (user.looking_for || "").length,
    });
  }

  const driftTotals = RELATED_KINDS.reduce(
    (acc, kind) => {
      acc.refMismatch += summary.refMismatch[kind.key].count;
      acc.missingRefButByUserExists +=
        summary.missingRefButByUserExists[kind.key].count;
      acc.missingByUserButRefExists +=
        summary.missingByUserButRefExists[kind.key].count;
      acc.orphanUserRefs += summary.orphanUserRefs[kind.key].count;
      return acc;
    },
    {
      refMismatch: 0,
      missingRefButByUserExists: 0,
      missingByUserButRefExists: 0,
      orphanUserRefs: 0,
    }
  );

  console.log("\n=== Profile canonicality audit ===");
  console.log(JSON.stringify({ ...summary, driftTotals }, null, 2));
  console.log("\nDone. No writes were performed.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Audit failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
