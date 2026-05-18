import "dotenv/config";
import exp from "express";
import { connect } from "mongoose";
import { userRoute } from "./APIs/userAPI.js";
import cookieParser from "cookie-parser";
import { adminRoute } from "./APIs/AdminAPI.js";
import { authorRoute } from "./APIs/AuthorAPI.js";
import { commonRouter } from "./APIs/CommonAPI.js";
import cors from "cors";
import session from "express-session";
import passport from "./config/passport.js";
import jwt from "jsonwebtoken";
import { playFaaah } from "./utils/playSound.js";

const app = exp();

// Catch sync crashes
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  playFaaah();
});

// Catch async crashes
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  playFaaah();
});

// Detect abnormal exit
process.on("exit", (code) => {
  if (code !== 0) {
    playFaaah();
  }
});


// ================= CORS =================
app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        origin.includes("vercel.app") ||
        origin.includes("localhost")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);



// ================= BODY PARSER =================
app.use(exp.json());

// ================= COOKIE PARSER =================
app.use(cookieParser());

// ================= SESSION & PASSPORT =================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "blogappsessionsecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ================= GOOGLE AUTH ROUTES =================
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "http://localhost:5173/login" }),
  (req, res) => {
    // Successful authentication
    const user = req.user;
    const token = jwt.sign(
      { userId: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    // Redirect back to frontend based on role
    if (user.role === "AUTHOR") {
      res.redirect("http://localhost:5173/author-profile");
    } else {
      res.redirect("http://localhost:5173/user-profile");
    }
  }
);

// ================= CONNECT APIs =================
app.use("/user-api", userRoute);
app.use("/author-api", authorRoute);
app.use("/admin-api", adminRoute);
app.use("/common-api", commonRouter);


// ================= CONNECT DB =================
const connectDB = async () => {
  try {

    await connect(process.env.DB_URL || process.env.MONGODB_URI);

    console.log("DB connection success");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });


  } catch (err) {

    console.log("Error in DB connection", err);

  }
};

connectDB();


// ================= INVALID PATH =================
app.use((req, res) => {
  res.status(404).json({
    message: `${req.url} is an invalid path`
  });
});


// ================= ERROR HANDLER =================
app.use((err, req, res, next) => {

  console.log("Error name:", err.name);
  console.log("Error code:", err.code);
  console.log("Full error:", err);

  // 🔥 ADD THIS LINE
  playFaaah();

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "error occurred",
      error: err.message
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "error occurred",
      error: err.message
    });
  }

  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = keyValue ? Object.keys(keyValue)[0] : "unknown";
    const value = keyValue ? keyValue[field] : "unknown";

    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`
    });
  }

  if (err.status) {
    return res.status(err.status).json({
      message: "error occurred",
      error: err.message
    });
  }

  res.status(err.status || 500).json({
    message: "error occurred",
    error: err.message || "Server side error"
  });

});
