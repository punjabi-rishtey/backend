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
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/educations", educationRoutes);
app.use("/api/professions", professionRoutes);
app.use("/api/astrologies", astrologyRoutes);

app.use("/api/admin/auth", adminRoutes);

app.listen(8080, () => console.log(`Server running on port 8080`));

swaggerDocs(app);
