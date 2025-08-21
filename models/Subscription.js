const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  screenshotUrl: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  couponCode: {
    type: String,
    default: null,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
});

// Pre-save hook: Automatically set expiresAt to one year after the payment date.
// subscriptionSchema.pre("save", function (next) {
//   if (!this.expiresAt) {
//     this.expiresAt = new Date(
//       this.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000
//     );
//   }
//   next();
// });

module.exports = mongoose.model("Subscription", subscriptionSchema);
