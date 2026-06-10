// const Testimonial = require("../models/Testimonial");
// const cloudinary = require("../config/cloudinary");

// const addTestimonial = async (req, res) => {
//     try {
//       console.log("🔥 Incoming request body:", req.body);
//       console.log("📸 Incoming file:", req.file);
  
//       const { user_name, message } = req.body;
  
//       if (!user_name || !message) {
//         console.error("❌ Missing fields: user_name or message");
//         return res.status(400).json({ error: "User Name and message are required" });
//       }
  
//       if (!req.file) {
//         console.error("❌ No file uploaded!");
//         return res.status(400).json({ error: "Image file is required!" });
//       }
  
//       let image_url = null;
//       let image_public_id = null;
  
//       try {
//         image_url = req.file.path;
//         image_public_id = req.file.filename?.split('.')[0] || null;
//       } catch (cloudinaryError) {
//         console.error("❌ Cloudinary Upload Error:", cloudinaryError);
//         return res.status(500).json({ error: "Cloudinary upload failed!", details: cloudinaryError.message });
//       }
  
//       const newTestimonial = new Testimonial({
//         user_name,
//         message,
//         image_url,
//         image_public_id
//       });
  
//       await newTestimonial.save();
  
//       res.status(201).json({ message: "Testimonial added successfully", testimonial: newTestimonial });
//     } catch (error) {
//       console.error("❌ Error adding testimonial:", error);
//       res.status(500).json({ error: "Server error!", details: error.message });
//     }
//   };
  
// // ✅ Get All Testimonials
// const getAllTestimonials = async (req, res) => {
//   try {
//     const testimonials = await Testimonial.find().sort({ created_at: -1 });
//     res.status(200).json(testimonials);
//   } catch (error) {
//     console.error("Error fetching testimonials:", error);
//     res.status(500).json({ error: "Server error!" });
//   }
// };

// // ✅ Edit Testimonial
// const editTestimonial = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { user_name, message } = req.body;

//     const updatedFields = { user_name, message };

//     if (req.file) {
//       const image_url = req.file.path;
//       const image_public_id = req.file.filename.split('.')[0];

//       updatedFields.image_url = image_url;
//       updatedFields.image_public_id = image_public_id;
//     }

//     const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, updatedFields, { new: true });

//     if (!updatedTestimonial) return res.status(404).json({ error: "Testimonial not found!" });

//     res.status(200).json({ message: "Testimonial updated successfully", testimonial: updatedTestimonial });
//   } catch (error) {
//     console.error("Error updating testimonial:", error);
//     res.status(500).json({ error: "Server error!" });
//   }
// };

// // ✅ Delete Testimonial
// const deleteTestimonial = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const testimonial = await Testimonial.findById(id);
//     if (!testimonial) return res.status(404).json({ error: "Testimonial not found!" });

//     try {
//       if (testimonial.image_public_id) {
//         await cloudinary.uploader.destroy(testimonial.image_public_id);
//       }
//     } catch (cloudinaryError) {
//       console.error("Cloudinary deletion error:", cloudinaryError);
//     }

//     await Testimonial.findByIdAndDelete(id);
//     res.status(200).json({ message: "Testimonial deleted successfully!" });
//   } catch (error) {
//     console.error("Error deleting testimonial:", error);
//     res.status(500).json({ error: "Server error!" });
//   }
// };

// module.exports = { addTestimonial, getAllTestimonials, editTestimonial, deleteTestimonial };





const Testimonial = require("../models/Testimonial");
const cloudinary = require("../config/cloudinary");

const sanitizeRequiredText = (value, fieldName) => {
  const sanitized = String(value || "").trim();
  if (!sanitized) {
    throw new Error(`${fieldName} is required.`);
  }
  return sanitized;
};

const normalizeOptionalDate = (value, fieldLabel) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldLabel} must be a valid date.`);
  }

  return value;
};

// ✅ Add Testimonial
const addTestimonial = async (req, res) => {
  try {
    const {
      user_name,
      message,
      groom_registration_date,
      bride_registration_date,
      marriage_date
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required!" });
    }

    const newTestimonial = new Testimonial({
      user_name: sanitizeRequiredText(user_name, "User name"),
      message: sanitizeRequiredText(message, "Message"),
      image_url: req.file.path,
      image_public_id: req.file.filename || null,
      groom_registration_date: normalizeOptionalDate(
        groom_registration_date,
        "Groom registration date"
      ),
      bride_registration_date: normalizeOptionalDate(
        bride_registration_date,
        "Bride registration date"
      ),
      marriage_date: normalizeOptionalDate(marriage_date, "Marriage date"),
    });

    await newTestimonial.save();

    res.status(201).json({ message: "Testimonial added successfully", testimonial: newTestimonial });
  } catch (error) {
    console.error("Error adding testimonial:", error);
    const statusCode = error.message?.endsWith("is required.") || error.message?.includes("must be a valid date")
      ? 400
      : 500;
    res.status(statusCode).json({
      error: statusCode === 400 ? error.message : "Server error!",
      details: statusCode === 500 ? error.message : undefined,
    });
  }
};

// ✅ Get All Testimonials
const getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ created_at: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({ error: "Server error!" });
  }
};


// // ✅ Edit Testimonial
// const editTestimonial = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       user_name,
//       message,
//       groom_registration_date,
//       bride_registration_date,
//       marriage_date
//     } = req.body;

//     const updatedFields = {
//       user_name,
//       message,
//       groom_registration_date,
//       bride_registration_date,
//       marriage_date
//     };

//     if (req.file) {
//       const image_url = req.file.path;
//       const image_public_id = req.file.filename.split('.')[0];

//       updatedFields.image_url = image_url;
//       updatedFields.image_public_id = image_public_id;
//     }

//     const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, updatedFields, { new: true });

//     if (!updatedTestimonial) return res.status(404).json({ error: "Testimonial not found!" });

//     res.status(200).json({ message: "Testimonial updated successfully", testimonial: updatedTestimonial });
//   } catch (error) {
//     console.error("Error updating testimonial:", error);
//     res.status(500).json({ error: "Server error!" });
//   }
// };


const editTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_name,
      message,
      groom_registration_date,
      bride_registration_date,
      marriage_date
    } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
      return res.status(404).json({ error: "Testimonial not found!" });
    }

    const updatedFields = {};

    if (user_name !== undefined) {
      updatedFields.user_name = sanitizeRequiredText(user_name, "User name");
    }

    if (message !== undefined) {
      updatedFields.message = sanitizeRequiredText(message, "Message");
    }

    const nextGroomDate = normalizeOptionalDate(
      groom_registration_date,
      "Groom registration date"
    );
    const nextBrideDate = normalizeOptionalDate(
      bride_registration_date,
      "Bride registration date"
    );
    const nextMarriageDate = normalizeOptionalDate(
      marriage_date,
      "Marriage date"
    );

    if (nextGroomDate !== undefined) {
      updatedFields.groom_registration_date = nextGroomDate;
    }
    if (nextBrideDate !== undefined) {
      updatedFields.bride_registration_date = nextBrideDate;
    }
    if (nextMarriageDate !== undefined) {
      updatedFields.marriage_date = nextMarriageDate;
    }

    if (req.file) {
      const image_url = req.file.path;
      const image_public_id = req.file.filename || null;

      updatedFields.image_url = image_url;
      updatedFields.image_public_id = image_public_id;
    }

    const previousImagePublicId = testimonial.image_public_id;
    const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });

    if (
      req.file &&
      previousImagePublicId &&
      previousImagePublicId !== updatedTestimonial.image_public_id
    ) {
      try {
        await cloudinary.uploader.destroy(previousImagePublicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error while replacing testimonial image:", cloudinaryError);
      }
    }

    res.status(200).json({
      message: "Testimonial updated successfully",
      testimonial: updatedTestimonial
    });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    const statusCode = error.message?.endsWith("is required.") || error.message?.includes("must be a valid date")
      ? 400
      : 500;
    res.status(statusCode).json({
      error: statusCode === 400 ? error.message : "Server error!",
    });
  }
};


// ✅ Delete Testimonial
const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) return res.status(404).json({ error: "Testimonial not found!" });

    try {
      if (testimonial.image_public_id) {
        await cloudinary.uploader.destroy(testimonial.image_public_id);
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
    }

    await Testimonial.findByIdAndDelete(id);
    res.status(200).json({ message: "Testimonial deleted successfully!" });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({ error: "Server error!" });
  }
};

module.exports = {
  addTestimonial,
  getAllTestimonials,
  editTestimonial,
  deleteTestimonial
};
