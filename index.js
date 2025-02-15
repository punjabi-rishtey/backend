const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");  // ✅ Supports cookies (authentication)
const connectDB = require("./config/db");
const swaggerDocs = require("./swagger");  // Swagger docs

// Import Routes
const userRoutes = require("./routes/userRoutes");
const familyRoutes = require("./routes/familyRoutes");
const educationRoutes = require("./routes/educationRoutes");
const professionRoutes = require("./routes/professionRoutes");
const astrologyRoutes = require("./routes/astrologyRoutes");
const adminRoutes = require("./routes/adminRoutes");

dotenv.config();
connectDB();

const app = express();

// ✅ Correct CORS Setup (Move it above express.json)
const allowedOrigins = [
  process.env.FRONTEND_URL?.trim() || "https://admin-frontend-punjabi-rishteys-projects.vercel.app",
  "https://admin-frontend-git-main-punjabi-rishteys-projects.vercel.app",
  "https://admin-frontend-two-vert.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

const corsOptions = {
  origin: (origin, callback) => {
    console.log(`🌐 Incoming Request Origin: ${origin}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }
  },
  credentials: true, // ✅ Allows cookies & authentication headers
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS Middleware Before JSON Parsing
app.use(cors(corsOptions));
app.use(cookieParser()); // ✅ Allow authentication via cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Handle Preflight Requests (Fix CORS Issues)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigins.join(","));
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ✅ API Routes
app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/educations", educationRoutes);
app.use("/api/professions", professionRoutes);
app.use("/api/astrologies", astrologyRoutes);
app.use("/api/admin/auth", adminRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ message: "Server error!" });
});

// ✅ Start the Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));

// ✅ Swagger Docs
swaggerDocs(app);
