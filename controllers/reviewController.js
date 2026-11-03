const Review = require("../models/Review");

// ✅ Add Review
const addReview = async (req, res) => {
  try {
    const { user_name, message, ratings, order } = req.body;

    if (!user_name || !message || ratings === undefined || ratings === null) {
      return res
        .status(400)
        .json({ error: "User Name, message, and ratings are required" });
    }

    let assignedOrder = Number(order);
    if (isNaN(assignedOrder) || order === undefined || order === null || order === "") {
      const lastReview = await Review.findOne().sort({ order: -1 });
      assignedOrder =
        lastReview && typeof lastReview.order === "number"
          ? lastReview.order + 1
          : 1;
    }

    const newReview = new Review({
      user_name: user_name.trim(),
      message: message.trim(),
      ratings: Number(ratings),
      order: assignedOrder,
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
    const reviews = await Review.find().sort({ order: 1, created_at: -1 });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

const editReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_name, message, ratings, order } = req.body;

    const updatedFields = {};

    if (user_name !== undefined) updatedFields.user_name = user_name.trim();
    if (message !== undefined) updatedFields.message = message.trim();
    if (ratings !== undefined && ratings !== null && ratings !== "") {
      updatedFields.ratings = Number(ratings);
    }
    if (order !== undefined && order !== null && order !== "") {
      updatedFields.order = Number(order);
    }

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

// ✅ Reorder Reviews (Update sequence positions)
const reorderReviews = async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds array is required" });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));

    if (bulkOps.length > 0) {
      await Review.bulkWrite(bulkOps);
    }

    const updatedReviews = await Review.find().sort({ order: 1, created_at: -1 });
    res.status(200).json({
      message: "Reviews reordered successfully",
      reviews: updatedReviews,
    });
  } catch (error) {
    console.error("Error reordering reviews:", error);
    res.status(500).json({ error: "Server error!", details: error.message });
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
  reorderReviews,
  deleteReview,
};
