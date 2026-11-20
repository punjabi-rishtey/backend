const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const User = require("../models/User");
const requireApprovedMembershipAccess = require("../middleware/requireApprovedMembershipAccess");
const checkProfileCompletion = require("../middleware/checkProfileCompletion");
const ACCESS_ERROR_CODES = require("../constants/accessErrorCodes");

const NOT_APPROVED_MESSAGE =
  "Your profile is not active yet. Please wait for approval to access this feature.";
const EXPIRED_MESSAGE =
  "Your subscription has expired. Please renew to access this feature.";
const PROFILE_INCOMPLETE_MESSAGE =
  "Profile must be at least 70% complete to access this feature.";

const mockRes = () => {
  let statusCode = 200;
  let body = null;
  let nextCalled = false;

  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    markNext() {
      nextCalled = true;
    },
    get nextCalled() {
      return nextCalled;
    },
  };
};

const stubFindByIdWithSelect = (user) => {
  User.findById = (id) => ({
    select() {
      return Promise.resolve(user);
    },
  });
};

const stubFindByIdWithPopulate = (user) => {
  User.findById = () => {
    const chain = {
      populate() {
        return chain;
      },
      then(resolve, reject) {
        return Promise.resolve(user).then(resolve, reject);
      },
    };
    return chain;
  };
};

const main = async () => {
  const userId = new mongoose.Types.ObjectId();
  const req = { user: { id: userId.toString() } };

  stubFindByIdWithSelect(null);
  let res = mockRes();
  let next = () => res.markNext();
  await requireApprovedMembershipAccess(req, res, next);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "User not found" });
  assert.equal(res.nextCalled, false);

  stubFindByIdWithSelect({
    status: "Pending",
    metadata: { exp_date: new Date(Date.now() + 86400000) },
  });
  res = mockRes();
  next = () => res.markNext();
  await requireApprovedMembershipAccess(req, res, next);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, NOT_APPROVED_MESSAGE);
  assert.equal(res.body.code, ACCESS_ERROR_CODES.NOT_APPROVED);
  assert.equal(res.nextCalled, false);

  stubFindByIdWithSelect({
    status: "Approved",
    metadata: { exp_date: new Date(Date.now() - 86400000) },
  });
  res = mockRes();
  next = () => res.markNext();
  await requireApprovedMembershipAccess(req, res, next);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, EXPIRED_MESSAGE);
  assert.equal(res.body.code, ACCESS_ERROR_CODES.EXPIRED);
  assert.equal(res.nextCalled, false);

  const approvedUser = {
    status: "Approved",
    metadata: { exp_date: new Date(Date.now() + 86400000) },
    gender: "male",
  };
  stubFindByIdWithSelect(approvedUser);
  res = mockRes();
  next = () => res.markNext();
  await requireApprovedMembershipAccess(req, res, next);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, null);
  assert.equal(res.nextCalled, true);
  assert.equal(req.membershipUser, approvedUser);

  stubFindByIdWithPopulate({
    calculateProfileCompletion() {
      return 50;
    },
  });
  res = mockRes();
  next = () => res.markNext();
  await checkProfileCompletion(req, res, next);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, PROFILE_INCOMPLETE_MESSAGE);
  assert.equal(res.body.code, ACCESS_ERROR_CODES.PROFILE_INCOMPLETE);
  assert.equal(res.nextCalled, false);

  stubFindByIdWithPopulate({
    calculateProfileCompletion() {
      return 90;
    },
  });
  res = mockRes();
  next = () => res.markNext();
  await checkProfileCompletion(req, res, next);
  assert.equal(res.statusCode, 200);
  assert.equal(res.nextCalled, true);

  console.log(
    "membership and profile-completion 403 responses include machine-readable codes"
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});