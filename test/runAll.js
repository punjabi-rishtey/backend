const { readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const testDir = __dirname;
const files = readdirSync(testDir)
  .filter((name) => name.endsWith(".test.js"))
  .sort();

if (files.length === 0) {
  console.error("No test files found in test/");
  process.exit(1);
}

let failed = false;
for (const file of files) {
  console.log(`\n>> ${file}`);
  const result = spawnSync(process.execPath, [path.join(testDir, file)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error("\nOne or more test files failed.");
  process.exit(1);
}

console.log(`\nAll ${files.length} test file(s) passed.`);