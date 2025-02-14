const bcrypt = require("bcryptjs");

const enteredPassword = "NEWbeginning@@"; // The password you are entering in Postman
const storedHash = "$2a$10$F52QbA3H6ssKWhOH5ztTtO5PTW9ACnZrwBP0UrVfYlqu7eAaXtMw6"; // Password hash from MongoDB

bcrypt.compare(enteredPassword, storedHash, (err, result) => {
  if (err) {
    console.error("❌ Error comparing passwords:", err);
  } else {
    console.log("✅ Password Match:", result);
  }
});
