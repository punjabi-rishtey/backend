const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const adminAuth = async (req, res, next) => {
  try {
    // ✅ Check if token is provided
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied, no token provided" });

    // ✅ Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Find admin user
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(403).json({ message: "Not authorized as admin" });

    // ✅ Attach admin user to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin authentication failed:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuth;
