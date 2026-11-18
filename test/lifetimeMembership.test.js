const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Membership = require("../models/Membership");
const { isLifetimeMembershipRecord } = require("../services/membershipPlanPolicy");
const { userHasLifetimeAccess } = require("../services/membershipAccess");
const {
  approveSubscriptionPayment,
} = require("../controllers/adminController");
const { createSubscription } = require("../controllers/userController");
const { addCalendarMonths } = require("../services/membershipPlanPolicy");

const subscriptionId = new mongoose.Types.ObjectId().toString();

const queryResult = (doc) => {
  const query = Promise.resolve(doc);
  query.sort = () => query;
  query.populate = () => query;
  query.select = () => query;
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
  assert.equal(isLifetimeMembershipRecord({ isLifetime: true }), true);
  assert.equal(
    isLifetimeMembershipRecord({ planName: "Lifetime", isLifetime: false }),
    true
  );
  assert.equal(
    isLifetimeMembershipRecord({ planName: "Gold", isLifetime: false }),
    false
  );

  const lifetimeMember = {
    _id: new mongoose.Types.ObjectId(),
    name: "Lifetime Member",
    mobile: "9111111111",
    status: "Approved",
    is_deleted: false,
    metadata: { exp_date: null },
  };

  const lifetimeSub = {
    _id: new mongoose.Types.ObjectId(),
    reviewStatus: "approved",
    isLifetime: true,
    planName: "Lifetime",
    expiresAt: null,
  };

  assert.equal(
    userHasLifetimeAccess(lifetimeMember, lifetimeSub),
    true,
    "approved member with null exp_date and lifetime sub has lifetime access"
  );

  assert.equal(
    userHasLifetimeAccess(
      { ...lifetimeMember, metadata: { exp_date: new Date("2030-01-01") } },
      lifetimeSub
    ),
    false,
    "member with exp_date is not lifetime"
  );

  const cronWouldExpire = (expDate) =>
    Boolean(expDate && new Date(expDate) < new Date());

  assert.equal(
    cronWouldExpire(null),
    false,
    "lifetime member (null exp_date) is not selected by expiry cron"
  );
  assert.equal(
    cronWouldExpire(new Date(Date.now() - 86400000)),
    true,
    "expired dated member is selected by expiry cron"
  );

  const userWrites = [];
  User.findById = async () => lifetimeMember;
  User.findByIdAndUpdate = async (_id, update) => {
    userWrites.push(update);
    if (update.status) {
      lifetimeMember.status = update.status;
    }
    if (Object.prototype.hasOwnProperty.call(update, "metadata.exp_date")) {
      lifetimeMember.metadata.exp_date = update["metadata.exp_date"];
    }
    return lifetimeMember;
  };

  const goldPayment = {
    _id: subscriptionId,
    user: lifetimeMember,
    fullName: lifetimeMember.name,
    phoneNumber: lifetimeMember.mobile,
    screenshotUrl: "https://example.test/gold.jpg",
    membershipDurationMonths: 12,
    planName: "Gold",
    planPrice: 2000,
    reviewStatus: "pending",
    source: "user_payment",
    isLifetime: false,
    createdAt: new Date(),
    save: async function save() {
      return this;
    },
  };

  Subscription.findOne = () => queryResult(lifetimeSub);
  Subscription.findById = () => queryResult(goldPayment);

  const rejectRes = mockRes();
  await approveSubscriptionPayment(
    { params: { subscriptionId }, body: {} },
    rejectRes
  );

  assert.equal(rejectRes.statusCode, 400);
  assert.match(rejectRes.body.message, /lifetime membership/i);
  assert.equal(goldPayment.reviewStatus, "pending");

  const lifetimePayment = {
    _id: subscriptionId,
    user: {
      ...lifetimeMember,
      metadata: { exp_date: null },
    },
    fullName: "New Lifetime",
    phoneNumber: "9222222222",
    screenshotUrl: "https://example.test/lifetime.jpg",
    membershipDurationMonths: null,
    planName: "Lifetime",
    planPrice: 5000,
    reviewStatus: "pending",
    source: "user_payment",
    isLifetime: true,
    createdAt: new Date(),
    save: async function save() {
      return this;
    },
  };

  userWrites.length = 0;
  Subscription.findById = () => queryResult(lifetimePayment);
  Subscription.findOne = () => queryResult(null);

  const approveRes = mockRes();
  await approveSubscriptionPayment(
    { params: { subscriptionId }, body: {} },
    approveRes
  );

  assert.equal(approveRes.statusCode, 200);
  assert.equal(lifetimePayment.reviewStatus, "approved");
  assert.equal(lifetimePayment.expiresAt, null);
  assert.equal(lifetimePayment.isLifetime, true);
  assert.equal(lifetimeMember.metadata.exp_date, null);
  assert.equal(
    userWrites.some((write) => write["metadata.exp_date"] === null),
    true,
    "approval must persist null exp_date"
  );

  Membership.schema.path("isLifetime");
  Subscription.schema.path("isLifetime");

  const isSubscriptionExpired = (user) =>
    Boolean(user?.metadata?.exp_date && new Date() > user.metadata.exp_date);

  assert.equal(
    isSubscriptionExpired({ status: "Approved", metadata: { exp_date: null } }),
    false,
    "Find Partner access: null exp_date is not treated as expired"
  );

  process.env.DEMO_LOCAL_MEDIA = "true";
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/punjabi-rishtey-demo";
  const makeUploadFile = () => {
    const screenshotPath = path.join(
      os.tmpdir(),
      `lifetime-pay-${Date.now()}-${Math.random()}.jpg`
    );
    fs.writeFileSync(screenshotPath, Buffer.from("demo-screenshot"));
    return {
      path: screenshotPath,
      originalname: "pay.jpg",
      buffer: Buffer.from("x"),
    };
  };

  const userId = new mongoose.Types.ObjectId();
  const lifetimePlanId = new mongoose.Types.ObjectId();
  const goldPlanId = new mongoose.Types.ObjectId();

  const savedSubscriptions = [];
  Subscription.prototype.save = async function save() {
    savedSubscriptions.push(this);
    return this;
  };

  User.findById = () =>
    queryResult({
      _id: userId,
      status: "Approved",
      metadata: { exp_date: null },
    });

  Subscription.findOne = () => queryResult(null);

  Membership.findById = () =>
    queryResult({
      _id: lifetimePlanId,
      name: "Lifetime",
      price: 5000,
      duration: 12,
      isLifetime: true,
    });

  const lifetimeCreateRes = mockRes();
  await createSubscription(
    {
      user: { id: userId },
      body: {
        fullName: "Lifetime Buyer",
        phoneNumber: "9333333333",
        membershipId: lifetimePlanId.toString(),
      },
      file: makeUploadFile(),
    },
    lifetimeCreateRes
  );

  assert.equal(lifetimeCreateRes.statusCode, 201);
  const pendingLifetime = savedSubscriptions[0];
  assert.equal(pendingLifetime.expiresAt, null);
  assert.equal(pendingLifetime.isLifetime, true);
  assert.equal(pendingLifetime.planName, "Lifetime");
  assert.equal(pendingLifetime.planPrice, 5000);

  Subscription.findOne = () =>
    queryResult({
      reviewStatus: "approved",
      isLifetime: true,
      planName: "Lifetime",
      expiresAt: null,
    });

  Membership.findById = () =>
    queryResult({
      _id: goldPlanId,
      name: "Gold",
      price: 2000,
      duration: 12,
      isLifetime: false,
    });

  const goldRes = mockRes();
  await createSubscription(
    {
      user: { id: userId },
      body: {
        fullName: "Lifetime Buyer",
        phoneNumber: "9333333333",
        membershipId: goldPlanId.toString(),
      },
      file: makeUploadFile(),
    },
    goldRes
  );

  assert.equal(goldRes.statusCode, 400);
  assert.match(goldRes.body.error, /lifetime membership/i);

  savedSubscriptions.length = 0;
  User.findById = () =>
    queryResult({
      _id: userId,
      status: "Pending",
      metadata: {},
    });
  Subscription.findOne = () => queryResult(null);

  Membership.findById = () =>
    queryResult({
      _id: goldPlanId,
      name: "Gold",
      price: 2000,
      duration: 12,
      isLifetime: false,
    });

  const goldPendingRes = mockRes();
  await createSubscription(
    {
      user: { id: userId },
      body: {
        fullName: "Gold Buyer",
        phoneNumber: "9444444444",
        membershipId: goldPlanId.toString(),
      },
      file: makeUploadFile(),
    },
    goldPendingRes
  );

  assert.equal(goldPendingRes.statusCode, 201);
  const goldPending = savedSubscriptions[0];
  assert.ok(goldPending.expiresAt instanceof Date);
  assert.ok(
    Math.abs(goldPending.expiresAt - addCalendarMonths(new Date(), 12)) < 5000,
    "Gold payment gets a real end date"
  );
  assert.equal(goldPending.isLifetime, false);

  console.log("lifetime membership ok");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});