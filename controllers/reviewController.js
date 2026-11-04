const mongoose = require("mongoose");
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

    const totalReviews = await Review.countDocuments();
    const maxPosition = totalReviews + 1;

    let assignedOrder = Number(order);
    if (isNaN(assignedOrder) || order === undefined || order === null || order === "") {
      assignedOrder = maxPosition;
    } else {
      // Clamp position between 1 and total + 1
      assignedOrder = Math.max(1, Math.min(maxPosition, assignedOrder));
    }

    // Shift reviews at or after assignedOrder down by +1 to prevent duplicate orders
    await Review.updateMany(
      { order: { $gte: assignedOrder } },
      { $inc: { order: 1 } }
    );

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

    const existingReview = await Review.findById(id);
    if (!existingReview) {
      return res.status(404).json({ error: "Review not found!" });
    }

    const updatedFields = {};

    if (user_name !== undefined) updatedFields.user_name = user_name.trim();
    if (message !== undefined) updatedFields.message = message.trim();
    if (ratings !== undefined && ratings !== null && ratings !== "") {
      updatedFields.ratings = Number(ratings);
    }

    if (order !== undefined && order !== null && order !== "") {
      const totalReviews = await Review.countDocuments();
      const targetOrder = Math.max(1, Math.min(totalReviews, Number(order)));
      const currentOrder = existingReview.order || totalReviews;

      if (targetOrder !== currentOrder) {
        if (targetOrder < currentOrder) {
          // Moving up to earlier position (e.g. from 4 to 2): shift items in [2, 3] down (+1)
          await Review.updateMany(
            { _id: { $ne: id }, order: { $gte: targetOrder, $lt: currentOrder } },
            { $inc: { order: 1 } }
          );
        } else {
          // Moving down to later position (e.g. from 2 to 4): shift items in [3, 4] up (-1)
          await Review.updateMany(
            { _id: { $ne: id }, order: { $gt: currentOrder, $lte: targetOrder } },
            { $inc: { order: -1 } }
          );
        }
        updatedFields.order = targetOrder;
      }
    }

    const updatedReview = await Review.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });

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

    const validOps = orderedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id, index) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) },
          update: { $set: { order: index + 1 } },
        },
      }));

    if (validOps.length > 0) {
      await Review.bulkWrite(validOps);
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

    const deletedOrder = review.order;
    await Review.findByIdAndDelete(id);

    // Shift reviews after deletedOrder down by -1 to keep sequence contiguous
    if (typeof deletedOrder === "number" && deletedOrder > 0) {
      await Review.updateMany(
        { order: { $gt: deletedOrder } },
        { $inc: { order: -1 } }
      );
    }

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
