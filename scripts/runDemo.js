const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const backendRoot = path.join(__dirname, "..");
const mode = process.argv[2];

if (mode !== "dev" && mode !== "seed") {
  console.error("Usage: node scripts/runDemo.js <dev|seed>");
  process.exit(1);
}

const envFile = fs.existsSync(path.join(backendRoot, ".env.demo"))
  ? ".env.demo"
  : ".env.demo.example";

const env = { ...process.env, ENV_FILE: envFile, DEMO_LOCAL_MEDIA: "true" };
for (const key of Object.keys(env)) {
  if (
    key === "MONGO_URI" ||
    key === "EMAIL_USER" ||
    key === "EMAIL_PASS" ||
    key === "OPENAI_API_KEY" ||
    key.startsWith("CLOUDINARY_")
  ) {
    delete env[key];
  }
}

const command =
  mode === "seed"
    ? process.execPath
    : path.join(backendRoot, "node_modules", ".bin", "nodemon");
const args = mode === "seed" ? ["scripts/seedDemo.js"] : ["index.js"];

const child = spawn(command, args, {
  cwd: backendRoot,
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
