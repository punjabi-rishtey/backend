// const mongoose = require("mongoose");

// const familySchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true }, // ✅ Matches User schema
//   user_name: { type: String, required: true },
//   family_value: String,
//   family_size: Number,
//   mother: {
//     name: String,
//     occupation: String,
//   },
//   father: {
//     name: String,
//     occupation: String,
//   },
//   siblings: {
//     brother_count: Number,
//     sister_count: Number,
//   },
// });

// const Family = mongoose.model("Family", familySchema);
// module.exports = Family;


const mongoose = require("mongoose");

const familySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Matches User schema
  user_name: { type: String, required: true },

  family_value: { type: String, default: "" },  // ✅ Added default value
  family_type: { type: String, default: "" },   // ✅ Added family_type to match frontend

  mother: {
    name: { type: String, default: "" },        // ✅ Matches frontend
    occupation: { type: String, default: "" },
  },

  father: {
    name: { type: String, default: "" },
    occupation: { type: String, default: "" },
  },

  siblings: {
    brother_count: { type: Number, default: 0 }, // ✅ Matches frontend (default 0)
    sister_count: { type: Number, default: 0 },
  },
});

const Family = mongoose.model("Family", familySchema);
module.exports = Family;
