/* eslint-disable no-console */
/**
 * One-shot repair: dedupe related profile docs keyed by `user`, keep the richest
 * (then newest) document, delete extras, and relink User.<ref> ObjectIds.
 *
 * Usage (from backend/):
 *   DRY_RUN=1 node scripts/repairProfileRelatedDocs.js
 *   node scripts/repairProfileRelatedDocs.js
 *   ENV_FILE=.env.qa DRY_RUN=1 node scripts/repairProfileRelatedDocs.js
 *
 * Never prints MONGO_URI or other secrets.
 */
const loadEnv = require("../config/loadEnv");
loadEnv();

const mongoose = require("mongoose");
const User = require("../models/User");
const Preference = require("../models/Preference");
const {
  RELATED_KINDS,
  idString,
  pickCanonicalDoc,
  countFilledFields,
} = require("../services/relatedProfileDocs");

// Default to dry-run unless APPLY=1
const APPLY = String(process.env.APPLY || "").trim() === "1";

async function repairKind(kind, stats) {
  const grouped = await kind.model.aggregate([
    { $match: { user: { $ne: null } } },
    { $group: { _id: "$user", ids: { $push: "$_id" }, count: { $sum: 1 } } },
  ]);

  for (const group of grouped) {
    const userId = group._id;
    const docs = await kind.model.find({ user: userId }).exec();
    if (docs.length === 0) continue;

    const canonical = pickCanonicalDoc(docs);
    const extras = docs.filter((doc) => idString(doc._id) !== idString(canonical._id));

    stats[kind.key].usersTouched += 1;
    if (extras.length > 0) {
      stats[kind.key].duplicatesRemoved += extras.length;
      stats[kind.key].examples.push({
        userId: String(userId),
        keep: String(canonical._id),
        fillScore: countFilledFields(canonical.toObject?.() ?? canonical),
        delete: extras.map((doc) => String(doc._id)),
      });
      if (APPLY) {
        await kind.model.deleteMany({
          _id: { $in: extras.map((doc) => doc._id) },
        });
      }
    }

    const user = await User.findById(userId).select(`_id ${kind.userRef} name`);
    if (!user) continue;

    const currentRef = idString(user[kind.userRef]);
    const keepId = idString(canonical._id);
    if (currentRef !== keepId) {
      stats[kind.key].refsRelinked += 1;
      if (APPLY) {
        await User.findByIdAndUpdate(userId, {
          $set: { [kind.userRef]: canonical._id },
        });
      }
    }
  }

  // Users with a dangling/mismatched ref but no by-user docs: clear or leave?
  // Also relink users whose ref is null but a by-user doc exists (covered above via aggregate).
  // Users with only a ref pointing at a doc whose `user` field differs:
  const usersWithRef = await User.find({
    [kind.userRef]: { $ne: null },
  })
    .select(`_id name ${kind.userRef}`)
    .lean();

  for (const user of usersWithRef) {
    const refId = idString(user[kind.userRef]);
    const byUserDocs = await kind.model.find({ user: user._id }).exec();
    if (byUserDocs.length > 0) continue;

    const refDoc = await kind.model.findById(refId).exec();
    if (!refDoc) {
      stats[kind.key].danglingRefsCleared += 1;
      stats[kind.key].examples.push({
        userId: String(user._id),
        action: "clearDanglingRef",
        refId,
      });
      if (APPLY) {
        await User.findByIdAndUpdate(user._id, { $unset: { [kind.userRef]: 1 } });
      }
      continue;
    }

    // Ref doc exists but is not keyed by this user — adopt it if orphaned, else clear ref
    const refOwner = idString(refDoc.user);
    if (!refOwner || refOwner === String(user._id)) {
      stats[kind.key].refsAdopted += 1;
      if (APPLY) {
        refDoc.user = user._id;
        if (!refDoc.user_name) refDoc.user_name = user.name || "Unknown";
        await refDoc.save();
        await User.findByIdAndUpdate(user._id, {
          $set: { [kind.userRef]: refDoc._id },
        });
      }
    } else {
      // Points at another user's doc — clear and leave; member upsert will recreate
      stats[kind.key].crossUserRefsCleared += 1;
      if (APPLY) {
        await User.findByIdAndUpdate(user._id, { $unset: { [kind.userRef]: 1 } });
      }
    }
  }
}

async function deleteOrphanRelatedDocs(kind, allUserIdSet, stats) {
  const orphans = await kind.model
    .find({ user: { $ne: null } })
    .select("_id user")
    .lean();
  const orphanIds = orphans
    .filter((doc) => !allUserIdSet.has(String(doc.user)))
    .map((doc) => doc._id);

  stats[kind.key].orphanDocsDeleted += orphanIds.length;
  if (orphanIds.length && APPLY) {
    await kind.model.deleteMany({ _id: { $in: orphanIds } });
  }
}

async function repairPreferences(stats) {
  const grouped = await Preference.aggregate([
    { $match: { user: { $ne: null } } },
    { $group: { _id: "$user", count: { $sum: 1 }, ids: { $push: "$_id" } } },
  ]);

  for (const group of grouped) {
    const docs = await Preference.find({ user: group._id }).exec();
    const canonical = pickCanonicalDoc(docs);
    const extras = docs.filter((doc) => idString(doc._id) !== idString(canonical._id));
    stats.preferences.usersTouched += 1;
    if (extras.length) {
      stats.preferences.duplicatesRemoved += extras.length;
      if (APPLY) {
        await Preference.deleteMany({ _id: { $in: extras.map((d) => d._id) } });
      }
    }
    const user = await User.findById(group._id).select("preferences");
    if (user && idString(user.preferences) !== idString(canonical._id)) {
      stats.preferences.refsRelinked += 1;
      if (APPLY) {
        await User.findByIdAndUpdate(group._id, {
          $set: { preferences: canonical._id },
        });
      }
    }
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(
    `Connected to MongoDB (URI redacted). Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY_RUN (no writes)"}`
  );

  const stats = {};
  for (const kind of RELATED_KINDS) {
    stats[kind.key] = {
      usersTouched: 0,
      duplicatesRemoved: 0,
      refsRelinked: 0,
      danglingRefsCleared: 0,
      refsAdopted: 0,
      crossUserRefsCleared: 0,
      orphanDocsDeleted: 0,
      examples: [],
    };
  }
  stats.preferences = {
    usersTouched: 0,
    duplicatesRemoved: 0,
    refsRelinked: 0,
    orphanDocsDeleted: 0,
    examples: [],
  };

  const allUserIds = await User.find({}).select("_id").lean();
  const allUserIdSet = new Set(allUserIds.map((user) => String(user._id)));

  for (const kind of RELATED_KINDS) {
    await repairKind(kind, stats);
    await deleteOrphanRelatedDocs(kind, allUserIdSet, stats);
    // trim examples
    stats[kind.key].examples = stats[kind.key].examples.slice(0, 12);
  }
  await repairPreferences(stats);
  const orphanPrefs = await Preference.find({ user: { $ne: null } })
    .select("_id user")
    .lean();
  const orphanPrefIds = orphanPrefs
    .filter((doc) => !allUserIdSet.has(String(doc.user)))
    .map((doc) => doc._id);
  stats.preferences.orphanDocsDeleted = orphanPrefIds.length;
  if (orphanPrefIds.length && APPLY) {
    await Preference.deleteMany({ _id: { $in: orphanPrefIds } });
  }
  stats.preferences.examples = stats.preferences.examples.slice(0, 12);

  console.log("\n=== Repair summary ===");
  console.log(JSON.stringify({ apply: APPLY, stats }, null, 2));
  if (!APPLY) {
    console.log("\nRe-run with APPLY=1 to write changes.");
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Repair failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
