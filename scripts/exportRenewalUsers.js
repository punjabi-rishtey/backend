/**
 * Read-only export of members who need a subscription renewal.
 *
 *   node scripts/exportRenewalUsers.js
 *   ENV_FILE=.env.qa node scripts/exportRenewalUsers.js
 *
 * Writes a CSV to ~/Downloads. Never prints MONGO_URI or contact fields.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const mongoose = require("mongoose");
const loadEnv = require("../config/loadEnv");
const User = require("../models/User");

loadEnv();

const TZ = "Asia/Kolkata";
const OUT_PATH = path.join(
  os.homedir(),
  "Downloads",
  "punjabi-rishtey-renewals-2026-10-22.csv"
);

const COLUMNS = [
  "name",
  "mobile",
  "email",
  "secondary_contact",
  "gender",
  "city",
  "status",
  "expiry_date",
  "days_until_expiry",
  "renewal_group",
];

function kolkataDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calendarDaysUntil(expDate, now) {
  const expKey = kolkataDateKey(expDate);
  const nowKey = kolkataDateKey(now);
  const expMs = Date.parse(`${expKey}T00:00:00Z`);
  const nowMs = Date.parse(`${nowKey}T00:00:00Z`);
  return Math.round((expMs - nowMs) / 86400000);
}

function renewalGroup(user, now) {
  if (user.status === "Expired") return "expired";

  const expDate = user.metadata?.exp_date
    ? new Date(user.metadata.exp_date)
    : null;
  if (expDate && !Number.isNaN(expDate.getTime()) && expDate < now) {
    return "expired";
  }

  return "expiring_soon";
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toRow(user, now) {
  const expRaw = user.metadata?.exp_date
    ? new Date(user.metadata.exp_date)
    : null;
  const expDate =
    expRaw && !Number.isNaN(expRaw.getTime()) ? expRaw : null;

  return {
    name: user.name || "",
    mobile: user.mobile || "",
    email: user.email || "",
    secondary_contact: user.secondary_contact || "",
    gender: user.gender || "",
    city: user.location?.city || "",
    status: user.status || "",
    expiry_date: expDate ? kolkataDateKey(expDate) : "",
    days_until_expiry: expDate ? calendarDaysUntil(expDate, now) : "",
    renewal_group: renewalGroup(user, now),
  };
}

function compareRows(a, b) {
  const groupDelta =
    (a.renewal_group === "expired" ? 0 : 1) -
    (b.renewal_group === "expired" ? 0 : 1);
  if (groupDelta !== 0) return groupDelta;

  const aDays =
    a.days_until_expiry === "" ? Number.POSITIVE_INFINITY : a.days_until_expiry;
  const bDays =
    b.days_until_expiry === "" ? Number.POSITIVE_INFINITY : b.days_until_expiry;
  if (aDays !== bDays) return aDays - bDays;

  return String(a.name).localeCompare(String(b.name));
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set. Load .env via ENV_FILE or default .env.");
    process.exit(1);
  }

  const now = new Date();
  const expiringCutoff = new Date(now);
  expiringCutoff.setDate(expiringCutoff.getDate() + 7);

  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch {
    console.error("MongoDB connection failed.");
    process.exit(1);
  }

  console.log("Connected to MongoDB (URI redacted). Read-only export starting.");

  const users = await User.find({
    is_deleted: { $ne: true },
    $or: [
      { status: "Expired" },
      {
        status: "Approved",
        "metadata.exp_date": { $ne: null, $lte: expiringCutoff },
      },
    ],
  })
    .select(
      "name mobile email secondary_contact gender location.city status metadata.exp_date"
    )
    .lean();

  const rows = users.map((user) => toRow(user, now)).sort(compareRows);
  const counts = rows.reduce(
    (totals, row) => {
      totals[row.renewal_group] += 1;
      return totals;
    },
    { expired: 0, expiring_soon: 0 }
  );

  const csv = [
    COLUMNS.map(csvCell).join(","),
    ...rows.map((row) => COLUMNS.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");

  fs.writeFileSync(OUT_PATH, `\uFEFF${csv}\n`, "utf8");

  console.log(`expired: ${counts.expired}`);
  console.log(`expiring_soon: ${counts.expiring_soon}`);
  console.log(`Wrote ${OUT_PATH}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  const message = err && err.message ? String(err.message) : "Export failed.";
  console.error(/mongodb(\+srv)?:\/\//i.test(message) ? "Export failed." : message);
  try {
    await mongoose.disconnect();
  } catch {
    // already disconnected
  }
  process.exit(1);
});
