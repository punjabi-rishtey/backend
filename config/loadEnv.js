const path = require("path");
const dotenv = require("dotenv");

let loaded = false;

const loadEnv = () => {
  if (loaded) return;

  const envFile = process.env.ENV_FILE || ".env";
  const envPath = path.resolve(__dirname, "..", envFile);

  dotenv.config({ path: envPath });
  loaded = true;
};

module.exports = loadEnv;
