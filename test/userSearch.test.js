const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const User = require("../models/User");
const Profession = require("../models/Profession");
const { searchMatches } = require("../controllers/userController");

const mockRes = () => {
  let statusCode = 200;
  let body = null;

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
  };
};

const membershipUser = {
  _id: new mongoose.Types.ObjectId(),
  gender: "male",
  status: "Approved",
  metadata: { exp_date: new Date(Date.now() + 86400000) },
};

const stubUserSearch = ({ total, pageResults, onFind }) => {
  User.countDocuments = async (query) => {
    onFind.countQuery = query;
    return total;
  };

  User.find = (query) => {
    onFind.query = query;
    const chain = {
      select(selection) {
        onFind.select = selection;
        return chain;
      },
      sort(value) {
        onFind.sort = value;
        return chain;
      },
      skip(value) {
        onFind.skip = value;
        return chain;
      },
      limit(value) {
        onFind.limit = value;
        return chain;
      },
      then(resolve, reject) {
        return Promise.resolve(pageResults).then(resolve, reject);
      },
    };
    return chain;
  };
};

const stubUserSearchPaginated = (allProfiles) => {
  const sorted = [...allProfiles].sort((left, right) =>
    String(left._id).localeCompare(String(right._id))
  );

  User.countDocuments = async () => sorted.length;

  User.find = () => {
    const chain = {
      select() {
        return chain;
      },
      sort() {
        return chain;
      },
      skip(value) {
        chain.skip = value;
        return chain;
      },
      limit(value) {
        chain.limit = value;
        return chain;
      },
      then(resolve, reject) {
        const start = chain.skip || 0;
        const end = start + (chain.limit || 0);
        return Promise.resolve(sorted.slice(start, end)).then(resolve, reject);
      },
    };
    return chain;
  };
};

async function runTests() {
  console.log("Starting userSearch tests...");

  const manyProfiles = Array.from({ length: 100 }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(),
    name: `Member ${index + 1}`,
    gender: "female",
  }));
  const defaultPageSlice = manyProfiles.slice(0, 20);
  const findCapture = {};
  stubUserSearch({ total: manyProfiles.length, pageResults: defaultPageSlice, onFind: findCapture });

  const defaultRes = mockRes();
  await searchMatches(
    {
      query: { religion: "Sikh" },
      membershipUser,
    },
    defaultRes
  );

  assert.equal(defaultRes.statusCode, 200);
  assert.deepEqual(Object.keys(defaultRes.body).sort(), ["page", "pages", "results", "total"]);
  assert.equal(defaultRes.body.total, 100);
  assert.equal(defaultRes.body.page, 1);
  assert.equal(defaultRes.body.pages, 5);
  assert.equal(defaultRes.body.results.length, 20);
  assert.equal(findCapture.limit, 20, "missing limit must use default page size");
  assert.equal(findCapture.skip, 0);
  assert.deepEqual(findCapture.sort, { _id: 1 }, "search must use stable _id sort");
  assert.equal(findCapture.select, "-password");
  assert.equal(findCapture.query.religion, "Sikh");
  assert.ok(findCapture.query.gender, "discoverable gender filter must remain");

  const cappedCapture = {};
  stubUserSearch({
    total: 200,
    pageResults: manyProfiles.slice(0, 50),
    onFind: cappedCapture,
  });

  const cappedRes = mockRes();
  await searchMatches(
    {
      query: { limit: "999", page: "2" },
      membershipUser,
    },
    cappedRes
  );

  assert.equal(cappedRes.body.page, 2);
  assert.equal(cappedRes.body.pages, 4);
  assert.equal(cappedCapture.limit, 50, "limit must be capped at 50");
  assert.equal(cappedCapture.skip, 50);
  assert.equal(cappedRes.body.results.length, 50);

  stubUserSearchPaginated(manyProfiles);

  const pageOneRes = mockRes();
  await searchMatches(
    {
      query: { page: "1", limit: "20" },
      membershipUser,
    },
    pageOneRes
  );

  const pageTwoRes = mockRes();
  await searchMatches(
    {
      query: { page: "2", limit: "20" },
      membershipUser,
    },
    pageTwoRes
  );

  const pageOneIds = new Set(
    pageOneRes.body.results.map((profile) => String(profile._id))
  );
  const pageTwoIds = pageTwoRes.body.results.map((profile) => String(profile._id));
  const overlap = pageTwoIds.filter((id) => pageOneIds.has(id));
  assert.equal(overlap.length, 0, "consecutive pages must not return overlapping profiles");
  assert.equal(pageOneRes.body.results.length, 20);
  assert.equal(pageTwoRes.body.results.length, 20);

  const supplementalCapture = {};
  stubUserSearch({
    total: 3,
    pageResults: [],
    onFind: supplementalCapture,
  });

  await searchMatches(
    {
      query: {
        manglik: "true",
        nri_status: "false",
        search: "Kaur",
      },
      membershipUser,
    },
    mockRes()
  );

  assert.ok(
    supplementalCapture.query.mangalik instanceof RegExp,
    "manglik=true must filter mangalik field"
  );
  assert.equal(
    supplementalCapture.query.mangalik.test("manglik"),
    true,
    "manglik filter must match mangalik value"
  );
  assert.equal(
    supplementalCapture.query.mangalik.test("non_manglik"),
    false
  );
  assert.deepEqual(supplementalCapture.query["lifestyle.nri_status"], {
    $ne: true,
  });
  assert.ok(
    supplementalCapture.query.name instanceof RegExp,
    "search must apply case-insensitive name filter"
  );
  assert.equal(supplementalCapture.query.name.test("Simran Kaur"), true);

  const manglikFalseCapture = {};
  stubUserSearch({
    total: 0,
    pageResults: [],
    onFind: manglikFalseCapture,
  });
  await searchMatches(
    {
      query: { manglik: "false" },
      membershipUser,
    },
    mockRes()
  );
  assert.deepEqual(manglikFalseCapture.query.mangalik, /^non_manglik$/i);

  const partialCapture = {};
  stubUserSearch({
    total: 1,
    pageResults: [],
    onFind: partialCapture,
  });
  await searchMatches(
    {
      query: { manglik: "partial_manglik" },
      membershipUser,
    },
    mockRes()
  );
  assert.ok(
    partialCapture.query.mangalik instanceof RegExp,
    "partial_manglik must filter mangalik field"
  );
  assert.equal(partialCapture.query.mangalik.test("partial_manglik"), true);
  assert.equal(partialCapture.query.mangalik.test("manglik"), false);

  const occupationUserId = new mongoose.Types.ObjectId();
  Profession.find = () => ({
    distinct() {
      return Promise.resolve([occupationUserId]);
    },
  });

  const occupationCapture = {};
  stubUserSearch({
    total: 1,
    pageResults: [{ _id: occupationUserId, name: "Dev" }],
    onFind: occupationCapture,
  });

  await searchMatches(
    {
      query: { occupation: "Private Job" },
      membershipUser,
    },
    mockRes()
  );

  assert.ok(
    Array.isArray(occupationCapture.query.$and),
    "occupation must intersect discoverable users with profession matches"
  );
  const inClause = occupationCapture.query.$and.find(
    (clause) => clause._id?.$in
  );
  assert.equal(inClause._id.$in.length, 1);
  assert.equal(String(inClause._id.$in[0]), String(occupationUserId));

  Profession.find = () => ({
    distinct() {
      return Promise.resolve([]);
    },
  });

  const emptyOccupationRes = mockRes();
  await searchMatches(
    {
      query: { occupation: "Astronaut" },
      membershipUser,
    },
    emptyOccupationRes
  );

  assert.deepEqual(emptyOccupationRes.body, {
    results: [],
    total: 0,
    page: 1,
    pages: 0,
  });

  console.log("userSearch tests passed ✅");
}

runTests().catch((err) => {
  console.error("Test failed ❌", err);
  process.exit(1);
});