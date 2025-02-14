const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const swaggerDocs = require("./swagger");  // Import Swagger docs


const userRoutes = require("./routes/userRoutes");
const familyRoutes = require("./routes/familyRoutes");
const educationRoutes = require("./routes/educationRoutes");
const professionRoutes = require("./routes/professionRoutes");
const astrologyRoutes = require("./routes/astrologyRoutes");
const adminRoutes = require("./routes/adminRoutes");


dotenv.config();
connectDB();

const app = express();
// app.use(cors({ origin: "*" }));  // ✅ Allow all origins
app.use(express.json());



// const allowedOrigins = [
//   process.env.FRONTEND_URL?.trim() || "https://matka-betting-consumer-hazel.vercel.app",
//   "https://matka-betting-admin.vercel.app",
//   "http://localhost:5173",
//   "http://localhost:5174",
// ];


const corsOptions = {
  origin: (origin, callback) => {
    console.log('Incoming Request Origin: ${origin}'); // ✅ Debugging Log
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }

  },
  credentials: true, // ✅ Allow cookies & authentication headers
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));



app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/educations", educationRoutes);
app.use("/api/professions", professionRoutes);
app.use("/api/astrologies", astrologyRoutes);

app.use("/api/admin/auth", adminRoutes);

app.listen(8080, () => console.log(`Server running on port 8080`));

app.get("/", (req, res) => {
    res.send("API is running...");
  });
  

swaggerDocs(app);
