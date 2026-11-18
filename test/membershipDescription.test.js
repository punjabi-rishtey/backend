const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Membership = require("../models/Membership");
const {
  getAllMemberships,
  addMembership,
  editMembership,
} = require("../controllers/membershipController");

const queryResult = (docs) => {
  const query = Promise.resolve(docs);
  query.sort = () => query;
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
  const planId = new mongoose.Types.ObjectId();
  const savedMemberships = [];

  Membership.findOne = async () => null;
  Membership.prototype.save = async function save() {
    savedMemberships.push(this);
    return this;
  };

  const addRes = mockRes();
  await addMembership(
    {
      body: {
        name: `Desc Plan ${Date.now()}`,
        price: 1500,
        duration: 12,
        description: "  Premium visibility for one year.  ",
      },
    },
    addRes
  );

  assert.equal(addRes.statusCode, 201);
  assert.equal(addRes.body.membership.description, "Premium visibility for one year.");

  const blankAddRes = mockRes();
  await addMembership(
    {
      body: {
        name: `Blank Desc ${Date.now()}`,
        price: 1200,
        duration: 12,
        description: "   ",
      },
    },
    blankAddRes
  );

  assert.equal(blankAddRes.statusCode, 201);
  assert.equal(blankAddRes.body.membership.description, "");

  const tooLong = "x".repeat(201);
  const rejectAddRes = mockRes();
  await addMembership(
    {
      body: {
        name: `Too Long Desc ${Date.now()}`,
        price: 1200,
        duration: 12,
        description: tooLong,
      },
    },
    rejectAddRes
  );

  assert.equal(rejectAddRes.statusCode, 400);
  assert.match(rejectAddRes.body.error, /at most 200 characters/i);

  const updatedDoc = {
    _id: planId,
    name: "Edited Plan",
    price: 2000,
    duration: 12,
    isLifetime: false,
    premiumProfilesView: "Unlimited",
    description: "Updated plan blurb",
  };

  Membership.findByIdAndUpdate = async (_id, update) => ({
    ...updatedDoc,
    ...update,
  });

  const editRes = mockRes();
  await editMembership(
    {
      params: { id: planId.toString() },
      body: {
        name: "Edited Plan",
        price: 2000,
        duration: 12,
        description: "  Updated plan blurb  ",
      },
    },
    editRes
  );

  assert.equal(editRes.statusCode, 200);
  assert.equal(editRes.body.membership.description, "Updated plan blurb");

  const rejectEditRes = mockRes();
  await editMembership(
    {
      params: { id: planId.toString() },
      body: {
        name: "Edited Plan",
        price: 2000,
        duration: 12,
        description: tooLong,
      },
    },
    rejectEditRes
  );

  assert.equal(rejectEditRes.statusCode, 400);
  assert.match(rejectEditRes.body.error, /at most 200 characters/i);

  const listDocs = [
    {
      _id: planId,
      name: "Listed Plan",
      price: 2500,
      duration: 12,
      isLifetime: false,
      premiumProfilesView: "Unlimited",
      description: "Shown under the plan name",
    },
  ];

  Membership.find = () => queryResult(listDocs);

  const listRes = mockRes();
  await getAllMemberships({}, listRes);

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.body.length, 1);
  const plan = listRes.body[0];
  assert.equal(plan.description, "Shown under the plan name");
  assert.equal(plan.isLifetime, false);
  assert.ok(Object.prototype.hasOwnProperty.call(plan, "isLifetime"));
  assert.ok(Object.prototype.hasOwnProperty.call(plan, "description"));
  const isLifetimeIndex = Object.keys(plan).indexOf("isLifetime");
  const descriptionIndex = Object.keys(plan).indexOf("description");
  assert.equal(
    descriptionIndex,
    isLifetimeIndex + 1,
    "description should appear immediately after isLifetime"
  );

  console.log("membership description ok");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});