const DEMO_DB_NAME = "punjabi-rishtey-demo";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

const isDemoModeRequested = () => {
  const envFile = String(process.env.ENV_FILE || "");
  return (
    envFile.includes(".env.demo") || process.env.DEMO_LOCAL_MEDIA === "true"
  );
};

const parseDemoMongoUri = (uri) => {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch (error) {
    throw new Error("Demo mode refused: MONGO_URI is not a valid URL.");
  }

  if (parsed.protocol !== "mongodb:") {
    throw new Error(
      "Demo mode refused: only a mongodb:// URI on localhost is allowed."
    );
  }

  if (uri.includes(",")) {
    throw new Error(
      "Demo mode refused: multiple MongoDB hosts are not allowed."
    );
  }

  const host = parsed.hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      "Demo mode refused: MongoDB host must be 127.0.0.1 or localhost."
    );
  }

  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\//, "").split("/")[0] || ""
  );
  if (databaseName !== DEMO_DB_NAME) {
    throw new Error(
      `Demo mode refused: database name must be ${DEMO_DB_NAME}.`
    );
  }

  return { host, databaseName };
};

const assertDemoDatabase = () => {
  const uri = String(process.env.MONGO_URI || "").trim();
  if (!uri) {
    throw new Error("Demo mode refused: MONGO_URI is not set.");
  }

  const lower = uri.toLowerCase();
  if (lower.includes("mongodb.net") || lower.includes("mongodb+srv")) {
    throw new Error("Demo mode refused: remote MongoDB hosts are not allowed.");
  }

  return parseDemoMongoUri(uri);
};

const assertDemoIsolated = () => {
  const target = assertDemoDatabase();

  const cloudinaryKeys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_URL",
  ].filter((key) => process.env[key]);
  if (cloudinaryKeys.length > 0) {
    throw new Error(
      "Demo mode refused: Cloudinary credentials are loaded. Remove them from the demo environment."
    );
  }

  if (process.env.EMAIL_USER || process.env.EMAIL_PASS) {
    throw new Error(
      "Demo mode refused: email credentials are loaded. Remove them from the demo environment."
    );
  }

  if (process.env.OPENAI_API_KEY) {
    throw new Error(
      "Demo mode refused: an OpenAI key is loaded. Remove it from the demo environment."
    );
  }

  return target;
};

const demoPublicBaseUrl = () => {
  const port = String(process.env.PORT || "8080").trim() || "8080";
  return `http://127.0.0.1:${port}`;
};

module.exports = {
  DEMO_DB_NAME,
  assertDemoDatabase,
  assertDemoIsolated,
  demoPublicBaseUrl,
  isDemoModeRequested,
};
