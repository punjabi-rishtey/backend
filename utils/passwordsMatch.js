const bcrypt = require("bcryptjs");

const DUMMY_PASSWORD_HASH =
  "$2a$10$DIbNau/GZAcjEB57CLimye3GNc/T15blwY6jKsL.ArGWA7Is.Cid.";

const passwordsMatch = async (password, storedHash) => {
  const candidate = typeof password === "string" ? password : "";
  const hash =
    typeof storedHash === "string" && storedHash.startsWith("$2")
      ? storedHash
      : DUMMY_PASSWORD_HASH;
  const matches = await bcrypt.compare(candidate, hash);
  return hash === storedHash && matches;
};

module.exports = { passwordsMatch };
