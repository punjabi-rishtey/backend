const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const loadEnv = require("../config/loadEnv");
const {
  assertDemoIsolated,
  DEMO_DB_NAME,
  demoPublicBaseUrl,
} = require("../config/demoGuard");
const { addCalendarMonths } = require("../services/membershipPlanPolicy");
const User = require("../models/User");
const Family = require("../models/Family");
const Education = require("../models/Education");
const Profession = require("../models/Profession");
const Astrology = require("../models/Astrology");
const Membership = require("../models/Membership");
const Subscription = require("../models/Subscription");
const QrCode = require("../models/QRCode");

loadEnv();

const PASSWORD = "DemoLocal-2026";
const ASSET_ROOT = path.join(__dirname, "..", "demo", "assets");

const assetUrl = (relativePath) => {
  const absolute = path.join(ASSET_ROOT, relativePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing demo asset: demo/assets/${relativePath}`);
  }
  return `${demoPublicBaseUrl()}/demo-assets/${relativePath}`;
};

const baseProfile = (person) => ({
  password: PASSWORD,
  marital_status: "never_married",
  secondary_contact: "",
  language: "Punjabi, Hindi, English",
  hobbies: person.hobbies,
  mangalik: person.mangalik,
  birth_details: {
    birth_time: person.birthTime,
    birth_place: person.city,
  },
  physical_attributes: {
    skin_tone: person.skinTone,
    body_type: person.bodyType,
    physical_disability: false,
    disability_reason: "None",
  },
  lifestyle: {
    smoke: "no",
    drink: "no",
    veg_nonveg: person.diet,
    nri_status: person.nri,
    abroad_ready: person.abroad,
  },
  location: {
    address: person.address,
    city: person.city,
    pincode: person.pincode,
  },
  about_myself: person.about,
  looking_for: person.lookingFor,
  profile_visibility: "public",
  is_deleted: false,
});

const people = [
  {
    key: "payer",
    role: "payment",
    name: "Harpreet Kaur",
    email: "harpreet.payer@demo.punjabi-rishtey.test",
    mobile: "9000000002",
    gender: "female",
    dob: "1993-05-01",
    height: "5'5\"",
    religion: "sikh",
    caste: "khatri",
    status: "Unapproved",
    portrait: "portraits/payer-harpreet.jpg",
    city: "Chandigarh",
    address: "Sector 22, Chandigarh",
    pincode: "160022",
    mangalik: "non_manglik",
    skinTone: "wheatish",
    bodyType: "average",
    diet: "veg",
    nri: false,
    abroad: false,
    hobbies: ["Cooking", "Reading"],
    birthTime: "09:15 AM",
    about:
      "I live in Chandigarh with my parents and work in accounts. Family comes first in how I spend my time.",
    lookingFor:
      "A respectful match from a Punjabi family, with a clear intention for marriage.",
    family: {
      family_value: "traditional",
      family_type: "nuclear",
      mother: { name: "Kuldeep Kaur", occupation: "Homemaker" },
      father: { name: "Surjit Singh", occupation: "Shop owner" },
      siblings: { brother_count: 1, sister_count: 1 },
    },
    education: {
      education_level: "graduate",
      education_field: "Commerce",
      college_details: {
        name: "Government College for Girls",
        city: "Chandigarh",
        passout_year: "2014",
      },
      additional_info: "Bachelor of Commerce.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Accounts executive",
      working_with: "Private company",
      income: "8 Lakhs",
      work_address: { address: "Sector 17", city: "Chandigarh" },
      additional_info: "Works in a local accounts office.",
    },
    astrology: { rashi_nakshatra: "Kanya / Hasta", gotra: "Kashyap" },
  },
  {
    key: "browser",
    role: "browse",
    name: "Arjun Singh",
    email: "arjun.browser@demo.punjabi-rishtey.test",
    mobile: "9000000003",
    gender: "male",
    dob: "1995-09-12",
    height: "5'11\"",
    religion: "sikh",
    caste: "khatri",
    status: "Approved",
    portrait: "portraits/browser-arjun.jpg",
    city: "Chandigarh",
    address: "Sector 8, Chandigarh",
    pincode: "160009",
    mangalik: "non_manglik",
    skinTone: "wheatish",
    bodyType: "athletic",
    diet: "veg",
    nri: false,
    abroad: false,
    hobbies: ["Cricket", "Music"],
    birthTime: "06:40 AM",
    about:
      "I am a software engineer in Chandigarh. Family is close, and I am looking for marriage with the same seriousness.",
    lookingFor:
      "A kind partner who wants a steady home and is comfortable with both families staying involved.",
    family: {
      family_value: "modern",
      family_type: "nuclear",
      mother: { name: "Jasbir Kaur", occupation: "Teacher" },
      father: { name: "Manmohan Singh", occupation: "Engineer" },
      siblings: { brother_count: 0, sister_count: 1 },
    },
    education: {
      education_level: "post_graduate",
      education_field: "Computer Science",
      college_details: {
        name: "Punjab Engineering College",
        city: "Chandigarh",
        passout_year: "2018",
      },
      additional_info: "Post-graduate study in computer science.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Software engineer",
      working_with: "Private company",
      income: "18 Lakhs",
      work_address: { address: "IT Park", city: "Chandigarh" },
      additional_info: "Builds software for a product company.",
    },
    astrology: { rashi_nakshatra: "Mithun / Ardra", gotra: "Bhardwaj" },
  },
  {
    key: "meher",
    role: "discoverable",
    openInDemo: true,
    name: "Meher Kaur",
    email: "meher.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000011",
    gender: "female",
    dob: "1998-06-15",
    height: "5'5\"",
    religion: "sikh",
    caste: "khatri",
    status: "Approved",
    portrait: "portraits/meher.jpg",
    city: "Chandigarh",
    address: "Sector 15, Chandigarh",
    pincode: "160015",
    mangalik: "non_manglik",
    skinTone: "fair",
    bodyType: "slim",
    diet: "veg",
    nri: false,
    abroad: false,
    hobbies: ["Sketching", "Classical music"],
    birthTime: "07:20 AM",
    about:
      "I live with my parents in Chandigarh and work as an architect. I like a quiet routine, good food, and time with family.",
    lookingFor:
      "A kind partner from a respectful Punjabi family, ready for marriage and close to his parents.",
    family: {
      family_value: "traditional",
      family_type: "nuclear",
      mother: { name: "Paramjit Kaur", occupation: "Homemaker" },
      father: { name: "Harjit Singh", occupation: "Retired teacher" },
      siblings: { brother_count: 1, sister_count: 0 },
    },
    education: {
      education_level: "graduate",
      education_field: "Architecture",
      college_details: {
        name: "Chandigarh College of Architecture",
        city: "Chandigarh",
        passout_year: "2020",
      },
      additional_info: "Bachelor of Architecture.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Architect",
      working_with: "Private company",
      income: "12 Lakhs",
      work_address: { address: "Madhya Marg", city: "Chandigarh" },
      additional_info: "Works at a small architecture studio.",
    },
    astrology: { rashi_nakshatra: "Karka / Pushya", gotra: "Kashyap" },
  },
  {
    key: "amanpreet",
    role: "discoverable",
    name: "Amanpreet Kaur",
    email: "amanpreet.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000012",
    gender: "female",
    dob: "1999-02-02",
    height: "5'4\"",
    religion: "sikh",
    caste: "arora",
    status: "Approved",
    portrait: "portraits/amanpreet.jpg",
    city: "Ludhiana",
    address: "Sarabha Nagar, Ludhiana",
    pincode: "141001",
    mangalik: "non_manglik",
    skinTone: "wheatish",
    bodyType: "average",
    diet: "veg",
    nri: false,
    abroad: false,
    hobbies: ["Teaching", "Gardening"],
    birthTime: "10:05 AM",
    about:
      "I teach in Ludhiana and live with my parents. Weekends are for family meals and a little gardening.",
    lookingFor:
      "Someone grounded, with a steady job and respect for both families.",
    family: {
      family_value: "traditional",
      family_type: "joint",
      mother: { name: "Narinder Kaur", occupation: "Homemaker" },
      father: { name: "Rajinder Singh", occupation: "Cloth merchant" },
      siblings: { brother_count: 1, sister_count: 1 },
    },
    education: {
      education_level: "post_graduate",
      education_field: "Education",
      college_details: {
        name: "Government College for Women",
        city: "Ludhiana",
        passout_year: "2021",
      },
      additional_info: "Master's in education.",
    },
    profession: {
      occupation: "Government Job",
      designation: "School teacher",
      working_with: "Government",
      income: "7 Lakhs",
      work_address: { address: "Civil Lines", city: "Ludhiana" },
      additional_info: "Teaches at a government school.",
    },
    astrology: { rashi_nakshatra: "Makar / Shravana", gotra: "Vats" },
  },
  {
    key: "jasleen",
    role: "discoverable",
    name: "Jasleen Kaur",
    email: "jasleen.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000013",
    gender: "female",
    dob: "1996-11-20",
    height: "5'6\"",
    religion: "hindu",
    caste: "brahmin",
    status: "Approved",
    portrait: "portraits/jasleen.jpg",
    city: "Amritsar",
    address: "Ranjit Avenue, Amritsar",
    pincode: "143001",
    mangalik: "non_manglik",
    skinTone: "fair",
    bodyType: "average",
    diet: "veg",
    nri: true,
    abroad: true,
    hobbies: ["Travel", "Cooking"],
    birthTime: "04:50 PM",
    about:
      "My family is in Amritsar. I am currently working abroad and come home twice a year.",
    lookingFor:
      "A partner who is comfortable with family in Punjab and an honest conversation about where we would live.",
    family: {
      family_value: "liberal",
      family_type: "nuclear",
      mother: { name: "Sunita Sharma", occupation: "Homemaker" },
      father: { name: "Anil Sharma", occupation: "Doctor" },
      siblings: { brother_count: 0, sister_count: 0 },
    },
    education: {
      education_level: "post_graduate",
      education_field: "Medicine",
      college_details: {
        name: "Government Medical College",
        city: "Amritsar",
        passout_year: "2020",
      },
      additional_info: "Medical graduate, now in practice.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Doctor",
      working_with: "Private hospital",
      income: "24 Lakhs",
      work_address: { address: "Clinic district", city: "Toronto" },
      additional_info: "Practices medicine outside India.",
    },
    astrology: { rashi_nakshatra: "Vrishchik / Anuradha", gotra: "Sandilya" },
  },
  {
    key: "navjot",
    role: "discoverable",
    name: "Navjot Kaur",
    email: "navjot.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000014",
    gender: "female",
    dob: "2001-08-09",
    height: "5'3\"",
    religion: "sikh",
    caste: "khatri",
    status: "Approved",
    portrait: "portraits/navjot.jpg",
    city: "Jalandhar",
    address: "Model Town, Jalandhar",
    pincode: "144003",
    mangalik: "partial_manglik",
    skinTone: "wheatish",
    bodyType: "slim",
    diet: "veg",
    nri: false,
    abroad: false,
    hobbies: ["Dance", "Baking"],
    birthTime: "11:10 PM",
    about:
      "I grew up in Jalandhar and work in a family retail business. I am the younger daughter at home.",
    lookingFor:
      "A cheerful partner with a stable livelihood, and a family that is kind in person.",
    family: {
      family_value: "traditional",
      family_type: "joint",
      mother: { name: "Baljit Kaur", occupation: "Homemaker" },
      father: { name: "Gurpreet Singh", occupation: "Business owner" },
      siblings: { brother_count: 1, sister_count: 1 },
    },
    education: {
      education_level: "graduate",
      education_field: "Business",
      college_details: {
        name: "Lyallpur Khalsa College",
        city: "Jalandhar",
        passout_year: "2022",
      },
      additional_info: "Bachelor's in business.",
    },
    profession: {
      occupation: "Business Owner",
      designation: "Retail partner",
      working_with: "Family business",
      income: "10 Lakhs",
      work_address: { address: "Model Town market", city: "Jalandhar" },
      additional_info: "Helps run the family store.",
    },
    astrology: { rashi_nakshatra: "Simha / Magha", gotra: "Kashyap" },
  },
  {
    key: "gurleen",
    role: "discoverable",
    name: "Gurleen Kaur",
    email: "gurleen.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000015",
    gender: "female",
    dob: "1994-01-18",
    height: "5'7\"",
    religion: "hindu",
    caste: "arora",
    status: "Approved",
    portrait: "portraits/gurleen.jpg",
    city: "Delhi",
    address: "Rajouri Garden, Delhi",
    pincode: "110027",
    mangalik: "non_manglik",
    skinTone: "wheatish",
    bodyType: "average",
    diet: "occasionally_nonveg",
    nri: false,
    abroad: false,
    hobbies: ["Reading", "Theatre"],
    birthTime: "02:30 PM",
    about:
      "I live in Delhi with my mother. I work in publishing and like books more than large gatherings.",
    lookingFor:
      "An educated partner who is patient with family and clear about marriage.",
    family: {
      family_value: "liberal",
      family_type: "nuclear",
      mother: { name: "Anita Arora", occupation: "School principal" },
      father: { name: "Late Vinod Arora", occupation: "Lawyer" },
      siblings: { brother_count: 0, sister_count: 1 },
    },
    education: {
      education_level: "post_graduate",
      education_field: "English literature",
      college_details: {
        name: "Delhi University college",
        city: "Delhi",
        passout_year: "2017",
      },
      additional_info: "Master's in English literature.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Editor",
      working_with: "Private company",
      income: "14 Lakhs",
      work_address: { address: "Connaught Place", city: "Delhi" },
      additional_info: "Edits books for a publishing house.",
    },
    astrology: { rashi_nakshatra: "Dhanu / Mula", gotra: "Garg" },
  },
  {
    key: "harleen",
    role: "discoverable",
    name: "Harleen Kaur",
    email: "harleen.kaur@demo.punjabi-rishtey.test",
    mobile: "9000000016",
    gender: "female",
    dob: "1997-03-30",
    height: "5'4\"",
    religion: "sikh",
    caste: "khatri",
    status: "Approved",
    portrait: "portraits/harleen.jpg",
    city: "Mohali",
    address: "Phase 7, Mohali",
    pincode: "160062",
    mangalik: "non_manglik",
    skinTone: "fair",
    bodyType: "slim",
    diet: "veg",
    nri: false,
    abroad: true,
    hobbies: ["Yoga", "Photography"],
    birthTime: "08:00 AM",
    about:
      "I design textiles in Mohali. My parents live nearby, and Sunday lunch is usually at their home.",
    lookingFor:
      "A sincere partner with a calm temperament, whether he lives in Punjab or is willing to settle here.",
    family: {
      family_value: "modern",
      family_type: "nuclear",
      mother: { name: "Rupinder Kaur", occupation: "Designer" },
      father: { name: "Tejinder Singh", occupation: "Bank manager" },
      siblings: { brother_count: 0, sister_count: 1 },
    },
    education: {
      education_level: "graduate",
      education_field: "Design",
      college_details: {
        name: "Northern India Institute of Fashion Technology",
        city: "Mohali",
        passout_year: "2019",
      },
      additional_info: "Graduate diploma in textile design.",
    },
    profession: {
      occupation: "Private Job",
      designation: "Textile designer",
      working_with: "Private company",
      income: "9 Lakhs",
      work_address: { address: "Phase 8", city: "Mohali" },
      additional_info: "Designs textiles for a studio in Mohali.",
    },
    astrology: { rashi_nakshatra: "Meen / Revati", gotra: "Kashyap" },
  },
];

const createMember = async (person, expiresAt) => {
  const portraitUrl = assetUrl(person.portrait);
  const user = new User({
    ...baseProfile(person),
    name: person.name,
    email: person.email,
    mobile: person.mobile,
    gender: person.gender,
    dob: person.dob,
    height: person.height,
    religion: person.religion,
    caste: person.caste,
    status: person.status,
    profile_pictures: [portraitUrl],
    profile_picture: portraitUrl,
    metadata: {
      register_date: new Date("2026-10-01T00:00:00.000Z"),
      exp_date: person.status === "Approved" ? expiresAt : null,
    },
  });
  await user.save();

  const [family, education, profession, astrology] = await Promise.all([
    Family.create({ user: user._id, user_name: person.name, ...person.family }),
    Education.create({
      user: user._id,
      user_name: person.name,
      ...person.education,
    }),
    Profession.create({
      user: user._id,
      user_name: person.name,
      ...person.profession,
    }),
    Astrology.create({
      user: user._id,
      user_name: person.name,
      ...person.astrology,
    }),
  ]);

  user.family = family._id;
  user.education = education._id;
  user.profession = profession._id;
  user.astrology = astrology._id;
  await user.save();

  const loaded = await User.findById(user._id)
    .populate("family")
    .populate("education")
    .populate("profession")
    .populate("astrology");
  const completion = loaded.calculateProfileCompletion();
  if (completion < 70) {
    throw new Error(
      `${person.name} profile is ${completion}% complete. Demo profiles must clear 70%.`
    );
  }

  return { user: loaded, completion };
};

const main = async () => {
  const target = assertDemoIsolated();
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    const refused =
      error?.code === "ECONNREFUSED" || /ECONNREFUSED/.test(error.message || "");
    if (refused) {
      throw new Error(
        "Could not connect to MongoDB on 127.0.0.1:27017. Start a local MongoDB server, then run npm run seed:demo again."
      );
    }
    throw new Error("Could not connect to the local demo database.");
  }

  if (mongoose.connection.name !== DEMO_DB_NAME) {
    throw new Error(
      "Refusing to drop a database that is not punjabi-rishtey-demo."
    );
  }

  await mongoose.connection.dropDatabase();

  const expiresAt = addCalendarMonths(new Date(), 12);
  const created = [];
  for (const person of people) {
    created.push(await createMember(person, expiresAt));
  }

  await Membership.create([
    {
      name: "Gold",
      price: 2000,
      duration: 12,
      premiumProfilesView: "Unlimited",
    },
    {
      name: "Hallmark",
      price: 3000,
      duration: 18,
      premiumProfilesView: "Unlimited",
    },
  ]);

  await QrCode.create({
    name: "demo@local",
    imageUrl: assetUrl("qr/demo-upi.png"),
  });

  const browser = created.find((entry) => entry.user.email.startsWith("arjun."));
  await Subscription.create({
    user: browser.user._id,
    fullName: browser.user.name,
    phoneNumber: browser.user.mobile,
    screenshotUrl: assetUrl("payments/gold-receipt.png"),
    membershipDurationMonths: 12,
    planName: "Gold",
    planPrice: 2000,
    reviewStatus: "approved",
    source: "admin_manual",
    expiresAt,
  });

  const discoverable = created.filter((entry) => entry.user.gender === "female" && entry.user.status === "Approved");
  console.log(
    `Seeded ${target.databaseName} on ${target.host}. ${discoverable.length} profiles are ready to browse.`
  );
  for (const entry of created) {
    console.log(`${entry.completion}%  ${entry.user.name}  ${entry.user.email}`);
  }
};

main()
  .catch((error) => {
    console.error(error.message || "Demo seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
