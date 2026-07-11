import jwt from "jsonwebtoken";

// Verifies the JWT token sent in the Authorization header
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Restricts access to specific roles, e.g. authorizeRoles("admin")
//
// "cao" is treated as an admin-equivalent role everywhere admin-only
// access is enforced — the CAO account is meant to have identical
// permissions to admin across the whole system, so rather than adding
// "cao" to every authorizeRoles("admin", ...) call site individually,
// it's normalized here once. If a route explicitly excludes "cao" in
// the future, that would need to be special-cased separately.
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    const effectiveRoles = role === "cao" ? [role, "admin"] : [role];

    if (!req.user || !effectiveRoles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
};