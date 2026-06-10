const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
        type: String,
        enum: ["open", "replied", "closed"],
        default: "open",
    },
    replies: [{
        message: { type: String, required: true },
        sentAt: { type: Date, default: Date.now },
        admin: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
            email: { type: String },
        },
    }],
    closedAt: { type: Date },
    closedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        email: { type: String },
    },
}, { timestamps: true });

const Inquiry = mongoose.model("Inquiry", inquirySchema);
module.exports = Inquiry;
