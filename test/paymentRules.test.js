const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { addCalendarMonths } = require("../services/membershipPlanPolicy");
const {
  approveSubscriptionPayment,
  rejectSubscriptionPayment,
} = require("../controllers/adminController");

const subscriptionId = "6ada3c168a78ac324034cdf5";

const queryResult = (doc) => {
  const query = Promise.resolve(doc);
  query.populate = () => query;
  return query;
};

const mockRes = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const main = async () => {
  const member = {
    _id: new mongoose.Types.ObjectId(),
    name: "Hallmark Member",
    mobile: "9000000000",
    status: "Approved",
    is_deleted: false,
    metadata: {},
  };
  const userWrites = [];

  User.findByIdAndUpdate = async (_id, update) => {
    userWrites.push(update);
    if (update.status) {
      member.status = update.status;
    }
    if (update["metadata.exp_date"]) {
      member.metadata.exp_date = update["metadata.exp_date"];
    }
    return member;
  };

  const payment = {
    _id: subscriptionId,
    user: member,
    fullName: member.name,
    phoneNumber: member.mobile,
    screenshotUrl: "https://example.test/screenshot.jpg",
    membershipDurationMonths: 18,
    planName: "Hallmark",
    planPrice: 3000,
    reviewStatus: "pending",
    source: "user_payment",
    createdAt: new Date("2026-08-31T00:00:00.000Z"),
    save: async function save() {
      return this;
    },
  };

  Subscription.findById = () => queryResult(payment);

  const approveRes = mockRes();
  await approveSubscriptionPayment(
    {
      params: { subscriptionId },
      body: { membershipDurationMonths: 6 },
    },
    approveRes
  );

  assert.equal(approveRes.statusCode, 200);
  assert.equal(payment.membershipDurationMonths, 18);
  assert.equal(payment.reviewStatus, "approved");
  assert.equal(member.status, "Approved");

  const eighteenMonthEnd = addCalendarMonths(new Date(), 18);
  const sixMonthEnd = addCalendarMonths(new Date(), 6);
  assert.ok(
    Math.abs(payment.expiresAt - eighteenMonthEnd) < 5000,
    "approval expiry must be 18 months from approval"
  );
  assert.ok(
    Math.abs(payment.expiresAt - sixMonthEnd) > 24 * 60 * 60 * 1000,
    "approval must ignore a shorter duration sent with the request"
  );

  const renewal = {
    _id: subscriptionId,
    reviewStatus: "pending",
    membershipDurationMonths: 18,
    planName: "Hallmark",
    save: async function save() {
      return this;
    },
  };
  member.status = "Approved";
  userWrites.length = 0;
  Subscription.findById = () => queryResult(renewal);

  const rejectRes = mockRes();
  await rejectSubscriptionPayment(
    { params: { subscriptionId }, body: {} },
    rejectRes
  );

  assert.equal(rejectRes.statusCode, 200);
  assert.equal(renewal.reviewStatus, "rejected");
  assert.equal(member.status, "Approved");
  assert.deepEqual(userWrites, []);
  console.log("payment rules ok");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
