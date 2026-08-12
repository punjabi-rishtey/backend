const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { evaluateProfileCompletion } = require("../services/profileCompletion");

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
        default: null,
      }, // set when membership is approved
    },

    profile_pictures: [{ type: String }],

    profile_picture_assets: {
      type: [
        {
          url: { type: String, required: true },
          public_id: { type: String },
          uploaded_at: { type: Date },
          source: {
            type: String,
            enum: ["user", "admin", "registration", "legacy"],
            default: "legacy",
          },
        },
      ],
      select: false,
      default: [],
    },

    // Selected profile picture (falls back to first in profile_pictures if not set)
    profile_picture: { type: String, default: "" },

    profile_visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    // References to Related Collections
    family: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
    education: { type: mongoose.Schema.Types.ObjectId, ref: "Education" },
    profession: { type: mongoose.Schema.Types.ObjectId, ref: "Profession" },
    astrology: { type: mongoose.Schema.Types.ObjectId, ref: "Astrology" },
    preferences: { type: mongoose.Schema.Types.ObjectId, ref: "Preference" },

    is_deleted: { type: Boolean, default: false },
    deletion_metadata: {
      deleted_at: { type: Date },
      deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      previous_status: {
        type: String,
        enum: [
          "Incomplete",
          "Pending",
          "Approved",
          "Expired",
          "Canceled",
          "Unapproved",
        ],
      },
      restored_at: { type: Date },
      restored_by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    },
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
        // Fallback profile_picture to first in profile_pictures if not set
        if (!ret.profile_picture && Array.isArray(ret.profile_pictures) && ret.profile_pictures.length > 0) {
          ret.profile_picture = ret.profile_pictures[0];
        }
        ret.profile_visibility = ret.profile_visibility || "public";
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.profile_picture_assets;
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
        // Fallback profile_picture to first in profile_pictures if not set
        if (!ret.profile_picture && Array.isArray(ret.profile_pictures) && ret.profile_pictures.length > 0) {
          ret.profile_picture = ret.profile_pictures[0];
        }
        ret.profile_visibility = ret.profile_visibility || "public";
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.profile_picture_assets;
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

userSchema.methods.evaluateProfileCompletion = function () {
  return evaluateProfileCompletion(this);
};

userSchema.methods.calculateProfileCompletion = function () {
  return evaluateProfileCompletion(this).completionPercentage;
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
