const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: { type: String, required: true },
    gender: { type: String, required: true },
    dob: { type: String, required: true },
    age: {
      type: Number,
      get: function () {
        const today = new Date();
        const birthDate = new Date(this.dob);
        let age = today.getFullYear() - birthDate.getFullYear();

        const hasBirthdayPassedThisYear =
          today.getMonth() > birthDate.getMonth() ||
          (today.getMonth() === birthDate.getMonth() &&
            today.getDate() >= birthDate.getDate());

        if (!hasBirthdayPassedThisYear) {
          age -= 1;
        }

        return Math.floor(age);
      },
    },
    height: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    religion: { type: String, required: true },
    caste: { type: String },
    mobile: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    // Status Field (from old code)
    status: {
      type: String,
      enum: [
        "Incomplete",
        "Pending",
        "Approved",
        "Expired",
        "Canceled",
        "Unapproved",
      ],
      default: "Unapproved",
    },

    // Personal Details
    marital_status: { type: String, required: true },
    mangalik: { type: String, default: "" },
    language: String,
    hobbies: [String],

    // New Optional About fields
    about_myself: { type: String, default: "", maxlength: 300 },
    looking_for: { type: String, default: "", maxlength: 300 },

    // Secondary contact (optional)
    secondary_contact: { type: String, default: "" },

    // Birth Details
    birth_details: {
      birth_time: String,
      birth_place: String,
    },

    // Physical Attributes
    physical_attributes: {
      skin_tone: String,
      body_type: String,
      physical_disability: { type: Boolean, default: false },
      disability_reason: String,
    },

    // Lifestyle
    lifestyle: {
      smoke: String,
      drink: String,
      veg_nonveg: String, // Keeping original field from old code
      nri_status: { type: Boolean, default: false },
      // Ready to move Abroad
      abroad_ready: { type: Boolean, default: null },
    },

    // Location
    location: {
      address: String, // New field from new code
      city: String,
      pincode: String,
    },

    // Metadata
    metadata: {
      register_date: { type: Date, default: Date.now },
      exp_date: {
        type: Date,
        default: () => new Date(+new Date() + 365 * 24 * 60 * 60 * 1000),
      }, // 1 year expiry
    },

    profile_pictures: [{ type: String }],

    // References to Related Collections
    family: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
    education: { type: mongoose.Schema.Types.ObjectId, ref: "Education" },
    profession: { type: mongoose.Schema.Types.ObjectId, ref: "Profession" },
    astrology: { type: mongoose.Schema.Types.ObjectId, ref: "Astrology" },
    preferences: { type: mongoose.Schema.Types.ObjectId, ref: "Preference" },

    is_deleted: { type: Boolean, default: false },
  },
  {
    toJSON: {
      getters: true,
      virtuals: true,
      transform: (doc, ret) => {
        // Ensure lifestyle object exists and abroad_ready serializes as null when undefined
        ret.lifestyle = ret.lifestyle || {};
        if (ret.lifestyle.abroad_ready === undefined) {
          ret.lifestyle.abroad_ready = null;
        }
        // Ensure new optional fields always present for legacy docs
        if (ret.about_myself === undefined || ret.about_myself === null) {
          ret.about_myself = "";
        }
        if (ret.looking_for === undefined || ret.looking_for === null) {
          ret.looking_for = "";
        }
        return ret;
      },
    },
    toObject: {
      getters: true,
      virtuals: true,
      transform: (doc, ret) => {
        ret.lifestyle = ret.lifestyle || {};
        if (ret.lifestyle.abroad_ready === undefined) {
          ret.lifestyle.abroad_ready = null;
        }
        if (ret.about_myself === undefined || ret.about_myself === null) {
          ret.about_myself = "";
        }
        if (ret.looking_for === undefined || ret.looking_for === null) {
          ret.looking_for = "";
        }
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

function checkFields(obj) {
  let filledFields = 0;
  let totalFields = 0;

  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      totalFields += obj.length;
      for (const item of obj) {
        if (item !== null && item !== undefined && item !== "") {
          filledFields++;
        }
      }
    } else {
      for (const key in obj) {
        // For each property, if it's an object, recurse; otherwise count it.
        if (obj[key] !== null && typeof obj[key] === "object") {
          const { filledFields: subFilled, totalFields: subTotal } =
            checkFields(obj[key]);
          filledFields += subFilled;
          totalFields += subTotal;
        } else {
          totalFields++;
          if (obj[key] !== null && obj[key] !== undefined && obj[key] !== "") {
            filledFields++;
          }
        }
      }
    }
  } else {
    // If not an object, count the value itself.
    totalFields++;
    if (obj !== null && obj !== undefined && obj !== "") {
      filledFields++;
    }
  }

  return { filledFields, totalFields };
}

userSchema.methods.calculateProfileCompletion = function () {
  // Build an object with only the fields you want to count.
  // For related documents (family, profession, etc.), use optional chaining (?.) to safely access their fields.
  const visibleProfile = {
    user: {
      name: this.name,
      gender: this.gender,
      dob: this.dob,
      height: this.height,
      religion: this.religion,
      caste: this.caste,
      mobile: this.mobile,
      email: this.email,
      marital_status: this.marital_status,
      mangalik: this.mangalik,
      language: this.language,
      hobbies: this.hobbies, // Assuming this is an array
      birth_details: {
        birth_time: this.birth_details?.birth_time,
        birth_place: this.birth_details?.birth_place,
      },
      physical_attributes: {
        skin_tone: this.physical_attributes?.skin_tone,
        body_type: this.physical_attributes?.body_type,
        physical_disability: this.physical_attributes?.physical_disability,
        disability_reason: this.physical_attributes?.disability_reason,
      },
      lifestyle: {
        smoke: this.lifestyle?.smoke,
        drink: this.lifestyle?.drink,
        veg_nonveg: this.lifestyle?.veg_nonveg,
        nri_status: this.lifestyle?.nri_status,
        abroad_ready: this.lifestyle?.abroad_ready ?? null,
      },
      location: {
        address: this.location?.address,
        city: this.location?.city,
        pincode: this.location?.pincode,
      },
      profile_pictures: this.profile_pictures, // Array of image URLs
      about_myself: this.about_myself,
      looking_for: this.looking_for,
    },
    family: this.family
      ? {
          // Ignore user and user_name
          family_value: this.family.family_value,
          family_type: this.family.family_type,
          mother: {
            name: this.family.mother?.name,
            occupation: this.family.mother?.occupation,
          },
          father: {
            name: this.family.father?.name,
            occupation: this.family.father?.occupation,
          },
          siblings: {
            brother_count: this.family.siblings?.brother_count,
            sister_count: this.family.siblings?.sister_count,
          },
        }
      : {},
    profession: this.profession
      ? {
          // Ignore user and user_name
          occupation: this.profession.occupation,
          designation: this.profession.designation,
          working_with: this.profession.working_with,
          income: this.profession.income,
          work_address: {
            address: this.profession.work_address?.address,
            city: this.profession.work_address?.city,
          },
        }
      : {},
    education: this.education
      ? {
          // Ignore user and user_name
          education_level: this.education.education_level,
          education_field: this.education.education_field,
          school_details: {
            name: this.education.school_details?.name,
            city: this.education.school_details?.city,
          },
          college_details: {
            name: this.education.college_details?.name,
            city: this.education.college_details?.city,
            passout_year: this.education.college_details?.passout_year,
          },
        }
      : {},
    astrology: this.astrology
      ? {
          // Ignore user and user_name
          rashi_nakshatra: this.astrology.rashi_nakshatra,
          gotra: this.astrology.gotra,
        }
      : {},
  };

  // Now use the helper to recursively count filled vs total fields.
  const { filledFields, totalFields } = checkFields(visibleProfile);

  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
};

const User = mongoose.model("User", userSchema);
module.exports = User;

// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");

// const userSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   gender: { type: String, required: true },
//   dob: { type: String, required: true },
//   age: {
//     type: Number,
//     get: function () {
//       return new Date().getFullYear() - new Date(this.dob).getFullYear();
//     }
//   },
//   height: String,
//   resetPasswordToken: String,
//   resetPasswordExpires: Date,
//   religion: { type: String, required: true },
//   caste: { type: String },  // ✅ Adding caste since it's used in search filters
//   mobile: { type: String, unique: true, required: true },
//   email: { type: String, unique: true, required: true },
//   password: { type: String, required: true },
//   location: {
//     city: String,
//     pincode: String,
//   },
//   hobbies: [String],
//   // status: { type: String, default: "Incomplete" },
//   status: {
//     type: String,
//     enum: ["Incomplete", "Pending", "Approved", "Expired", "Canceled"],
//     default: "Pending" // New users will now be "Pending" by default
//   },
//   mangalik: Boolean,
//   language: String,
//   marital_status: { type: String, required: true },
//   birth_details: {
//     birth_time: String,
//     birth_place: String,
//   },
//   physical_attributes: {
//     skin_tone: String,
//     body_type: String,
//     physical_disability: Boolean,
//     disability_reason: String,
//   },
//   lifestyle: {
//     smoke: Boolean,
//     drink: Boolean,
//     veg_nonveg: String,
//     nri_status: Boolean,
//   },
//   metadata: {
//     register_date: { type: Date, default: Date.now },
//     exp_date: { type: Date, default: () => new Date(+new Date() + 365 * 24 * 60 * 60 * 1000) } // 1 year expiry
//   },

//   profile_pictures: [{ type: String }],

//   // ✅ Add References to Related Collections
//   family: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
//   education: { type: mongoose.Schema.Types.ObjectId, ref: "Education" },
//   profession: { type: mongoose.Schema.Types.ObjectId, ref: "Profession" },
//   astrology: { type: mongoose.Schema.Types.ObjectId, ref: "Astrology" },
//   preferences: { type: mongoose.Schema.Types.ObjectId, ref: "Preference" }, // ✅ Added reference to `Preference`

//   is_deleted: { type: Boolean, default: false }

// });

// // ✅ Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// const User = mongoose.model("User", userSchema);
// module.exports = User;
