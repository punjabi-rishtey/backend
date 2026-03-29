// const express = require("express");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const swaggerDocs = require("./swagger");  // Import Swagger docs

// const userRoutes = require("./routes/userRoutes");
// const familyRoutes = require("./routes/familyRoutes");
// const educationRoutes = require("./routes/educationRoutes");
// const professionRoutes = require("./routes/professionRoutes");
// const astrologyRoutes = require("./routes/astrologyRoutes");
// const adminRoutes = require("./routes/adminRoutes");

// dotenv.config();
// connectDB();

// const app = express();
// // app.use(cors({ origin: "*" }));  // ✅ Allow all origins
// app.use(express.json());

// const allowedOrigins = [
//   process.env.FRONTEND_URL?.trim() || "https://admin-frontend-punjabi-rishteys-projects.vercel.app/",
//   "https://admin-frontend-git-main-punjabi-rishteys-projects.vercel.app/",
//   "https://admin-frontend-two-vert.vercel.app/",
//   "http://localhost:5173",
//   "http://localhost:5174",
// ];

// const corsOptions = {
//   origin: (origin, callback) => {
//     console.log(`Incoming Request Origin: ${origin}`);
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("❌ Not allowed by CORS"));
//     }

//   },
//   credentials: true, // ✅ Allow cookies & authentication headers
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// };

// app.use(cors(corsOptions));

// app.use("/api/users", userRoutes);
// app.use("/api/families", familyRoutes);
// app.use("/api/educations", educationRoutes);
// app.use("/api/professions", professionRoutes);
// app.use("/api/astrologies", astrologyRoutes);

// app.use("/api/admin/auth", adminRoutes);

// app.listen(8080, () => console.log(`Server running on port 8080`));

// app.get("/", (req, res) => {
//     res.send("API is running...");
//   });

// swaggerDocs(app);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const swaggerDocs = require("./swagger");

// Import Routes
const userRoutes = require("./routes/userRoutes");
const familyRoutes = require("./routes/familyRoutes");
const educationRoutes = require("./routes/educationRoutes");
const professionRoutes = require("./routes/professionRoutes");
const astrologyRoutes = require("./routes/astrologyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes"); // ✅ Added Testimonial Routes
const reviewRoutes = require("./routes/reviewRoutes"); // ✅ Added Testimonial Routes
const membershipRoutes = require("./routes/membershipRoutes");
const couponRoutes = require("./routes/couponRoutes");
const startExpiryCheckCron = require("./utils/checkExpiryCron");
const messageRoutes = require("./routes/messageRoutes");

dotenv.config();
connectDB();
startExpiryCheckCron();

const app = express();

// ✅ Move CORS Middleware Before Other Middleware
const exactAllowedOrigins = new Set([
  "https://admin-frontend-punjabi-rishteys-projects.vercel.app",
  "https://admin-frontend-git-main-punjabi-rishteys-projects.vercel.app",
  "https://admin-frontend-two-vert.vercel.app",
  "https://admin-frontend-revised.vercel.app",
  "https://user-frontend-seven-virid.vercel.app",
  "https://www.punjabi-rishtey.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
]);

const allowedPreviewHostnameRules = [
  {
    prefix: "user-frontend-",
    suffix: "-punjabi-rishteys-projects.vercel.app",
  },
  {
    prefix: "admin-frontend-revised-",
    suffix: "-punjabi-rishteys-projects.vercel.app",
  },
];

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    const normalizedOrigin = `${parsedOrigin.protocol}//${parsedOrigin.host}`;

    if (exactAllowedOrigins.has(normalizedOrigin)) {
      return true;
    }

    return allowedPreviewHostnameRules.some(
      ({ prefix, suffix }) =>
        parsedOrigin.hostname.startsWith(prefix) &&
        parsedOrigin.hostname.endsWith(suffix)
    );
  } catch (error) {
    console.error("❌ Invalid CORS origin:", origin, error.message);
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // console.log(`🌐 Incoming Request Origin: ${origin}`);
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }
  },
  credentials: true, // ✅ Allow authentication headers & cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS Middleware at the top
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // ✅ Handle Preflight Requests

app.use(express.json());

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/educations", educationRoutes);
app.use("/api/professions", professionRoutes);
app.use("/api/astrologies", astrologyRoutes);
app.use("/api/admin/auth", adminRoutes);
app.use("/api/testimonials", testimonialRoutes); // ✅ Added Testimonial Routes
app.use("/api/review", reviewRoutes); // ✅ Added Review Routes
app.use("/api/memberships", membershipRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ message: "Server error!" });
});

// ✅ Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));

// ✅ Swagger Docs
swaggerDocs(app);
