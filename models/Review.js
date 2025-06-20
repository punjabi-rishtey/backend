const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user_name: { type: String, required: true },
  message: { type: String, required: true },
  ratings: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
