import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

export const verifyToken = (...allowedRoles) => {

  return (req, res, next) => {

    try {

      const token = req.cookies.token;

      if (!token) {
        return res.status(401).json({
          message: "Unauthorized request. Please login"
        });
      }

      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decodedToken);

      if (!allowedRoles.includes(decodedToken.role)) {
        return res.status(403).json({
          message: "Forbidden. You don't have permission"
        });
      }

      req.user = decodedToken;

      next();

    } catch (err) {

      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token expired. Please login again"
        });
      }

      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid token"
        });
      }

      next(err);

    }

  };

};