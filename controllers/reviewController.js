const Review = require("../models/Review");

// ✅ Add Review
const addReview = async (req, res) => {
  try {
    const { user_name, message, ratings } = req.body;

    if (!user_name || !message || !ratings) {
      return res
        .status(400)
        .json({ error: "User Name and message are required" });
    }

    const newReview = new Review({
      user_name,
      message,
      ratings,
    });

    await newReview.save();

    res
      .status(201)
      .json({ message: "Review added successfully", review: newReview });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ error: "Server error!", details: error.message });
  }
};

// ✅ Get All Reviews
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ created_at: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

const editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, message, ratings } = req.body;

    const updatedFields = {};

    if (user_name) updatedFields.user_name = user_name;
    if (message) updatedFields.message = message;
    if (ratings) updatedFields.ratings = ratings;

    const updatedReview = await Review.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });

    if (!updatedReview) {
      return res.status(404).json({ error: "Review not found!" });
    }

    res.status(200).json({
      message: "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

// ✅ Delete Review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ error: "Review not found!" });

    await Review.findByIdAndDelete(id);
    res.status(200).json({ message: "Review deleted successfully!" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

module.exports = {
  addReview,
  getAllReviews,
  editReview,
  deleteReview,
};
