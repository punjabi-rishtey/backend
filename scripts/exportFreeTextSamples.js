/**
 * Export free-text profile samples for manual labeling / rule tuning.
 *
 *   node scripts/exportFreeTextSamples.js
 *   ENV_FILE=.env.qa SAMPLE=300 node scripts/exportFreeTextSamples.js
 *
 * Writes JSONL to scripts/out/free-text-samples.jsonl (gitignored recommendation).
 */

const fs = require("fs");
const path = require("path");
const loadEnv = require("../config/loadEnv");
const connectDB = require("../config/db");
const User = require("../models/User");
const Education = require("../models/Education");
const Profession = require("../models/Profession");

loadEnv();

const SAMPLE = Math.min(
  Math.max(Number(process.env.SAMPLE) || 200, 50),
  500
);

async function main() {
  await connectDB();

  const users = await User.find({
    $or: [
      { about_myself: { $exists: true, $nin: [null, ""] } },
      { looking_for: { $exists: true, $nin: [null, ""] } },
      { secondary_contact: { $exists: true, $nin: [null, ""] } },
    ],
  })
    .select(
      "name status about_myself looking_for secondary_contact hobbies location.address"
    )
    .limit(SAMPLE)
    .lean();

  const userIds = users.map((u) => u._id);
  const [edus, profs] = await Promise.all([
    Education.find({ user: { $in: userIds } })
      .select("user additional_info")
      .lean(),
    Profession.find({ user: { $in: userIds } })
      .select("user additional_info")
      .lean(),
  ]);

  const eduByUser = new Map(edus.map((e) => [String(e.user), e]));
  const profByUser = new Map(profs.map((p) => [String(p.user), p]));

  const outDir = path.join(__dirname, "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "free-text-samples.jsonl");
  const lines = [];

  for (const u of users) {
    const edu = eduByUser.get(String(u._id));
    const prof = profByUser.get(String(u._id));
    const fields = {
      about_myself: u.about_myself || "",
      looking_for: u.looking_for || "",
      secondary_contact: u.secondary_contact || "",
      hobbies: Array.isArray(u.hobbies) ? u.hobbies.join(", ") : "",
      address: u.location?.address || "",
      education_additional_info: edu?.additional_info || "",
      profession_additional_info: prof?.additional_info || "",
    };

    for (const [field, text] of Object.entries(fields)) {
      if (!String(text).trim()) continue;
      lines.push(
        JSON.stringify({
          userId: String(u._id),
          status: u.status,
          field,
          text: String(text).slice(0, 500),
          label: null,
          notes: "",
        })
      );
    }
  }

  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${lines.length} samples from ${users.length} users → ${outPath}`);
  console.log(
    "Hand-label `label` as: clean | abuse | solicitation | contact_leak | dowry | other"
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
