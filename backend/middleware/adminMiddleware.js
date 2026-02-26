import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "online_voting_system_secret";

/**
 * Admin middleware to protect admin-only routes
 * Checks if user has is_admin = true
 */
export function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;

    // Check if authorization header exists
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized - missing token",
      });
    }

    // Extract token
    const token = auth.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user is admin
    if (decoded.is_admin !== true) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - admin access required",
      });
    }

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token error",
      error: err.message,
    });
  }
}

/**
 * Optional: Stricter admin role check (requires role = "admin")
 */
export function requireAdminRole(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized - missing token",
      });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check both is_admin flag AND role field
    if (decoded.is_admin !== true && decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden - admin role required",
      });
    }

    req.user = decoded;
    req.userId = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token error",
      error: err.message,
    });
  }
}

/**
 * Protected route middleware - requires valid token
 * Used for all authenticated routes
 */
export function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized - missing token",
      });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    req.userId = decoded.id;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Token error",
      error: err.message,
    });
  }
}

export default { requireAdmin, protect };
