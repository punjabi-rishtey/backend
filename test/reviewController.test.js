const assert = require("node:assert/strict");
const { addReview, reorderReviews } = require("../controllers/reviewController");

async function runTests() {
  console.log("Starting reviewController tests...");

  // 1. Validation test for addReview
  let badStatus = null;
  let badJson = null;
  const mockBadRes = {
    status(s) {
      badStatus = s;
      return {
        json(j) {
          badJson = j;
        },
      };
    },
  };

  await addReview({ body: { user_name: "", message: "", ratings: 5 } }, mockBadRes);
  assert.strictEqual(badStatus, 400, "Should return 400 when user_name is missing");
  assert.ok(badJson && badJson.error, "Should return error message");

  // 2. Validation test for reorderReviews
  let reorderStatus = null;
  let reorderJson = null;
  const mockReorderRes = {
    status(s) {
      reorderStatus = s;
      return {
        json(j) {
          reorderJson = j;
        },
      };
    },
  };

  await reorderReviews({ body: { orderedIds: "not-an-array" } }, mockReorderRes);
  assert.strictEqual(reorderStatus, 400, "Should return 400 when orderedIds is not an array");

  console.log("reviewController tests passed ✅");
}

runTests().catch((err) => {
  console.error("Test failed ❌", err);
  process.exit(1);
});
