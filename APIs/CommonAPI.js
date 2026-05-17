import exp from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticate } from "../services/authService.js";
import { UserTypeModel } from "../Models/UserModel.js";
import { verifyToken } from "../middlewares/verifyTokens.js";
import { upload } from "../config/multer.js";
import { uploadToCloudinary } from "../config/cloudinaryUpload.js";
import { cloudinary } from "../config/cloudinary.js";
import { sendResetEmail } from "../utils/emailService.js";

export const commonRouter = exp.Router();

//  DIRECT RESET (No Email Link)
commonRouter.post("/direct-reset", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserTypeModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist" });
    }

    // Hash new password and save directly
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully! Redirecting to login..." });
  } catch (err) {
    console.error("Direct reset error:", err);
    res.status(500).json({ message: "Error updating password" });
  }
});

//  LOGIN 
commonRouter.post("/login", async (req, res) => {
  try {
    const userCred = req.body;

    const { token, user } = await authenticate(userCred);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });

    res.status(200).json({
      message: "Login success",
      payload: user,
    });


  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
});

//  CHECK AUTH
commonRouter.get(
  "/check-auth",
  verifyToken("ADMIN", "AUTHOR", "USER"),
  async (req, res) => {
    try {
      const user = await UserTypeModel.findById(req.user.userId).select("-password -__v");

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.status(200).json({
        message: "Authorized",
        payload: user
      });
    } catch (err) {
      res.status(500).json({
        message: err.message
      });
    }
  }
);


//  LOGOUT 
commonRouter.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

//  CHANGE PASSWORD 
commonRouter.put(
  "/change-password",
  verifyToken("ADMIN", "AUTHOR", "USER"),
  async (req, res) => {
    try {

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          message: "New password is required",
        });
      }

      // get user id from token
      const userId = req.user.userId;

      const user = await UserTypeModel.findById(userId);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // check current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(401).json({
          message: "Current password is incorrect",
        });
      }

      // hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;

      await user.save();

      res.status(200).json({
        message: "Password updated successfully",
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }

  }
);


//  UPDATE PROFILE PIC
commonRouter.put(
  "/update-profile-pic",
  verifyToken("ADMIN", "AUTHOR", "USER"),
  upload.single("profilePic"),
  async (req, res) => {
    let cloudinaryResult;
    try {
      const userId = req.user.userId;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // upload to cloudinary
      cloudinaryResult = await uploadToCloudinary(req.file.buffer);

      // update user in DB
      const updatedUser = await UserTypeModel.findByIdAndUpdate(
        userId,
        { profileImageUrl: cloudinaryResult.secure_url },
        { new: true }
      ).select("-password -__v");

      res.status(200).json({
        message: "Profile picture updated successfully",
        payload: updatedUser,
      });

    } catch (err) {
      console.error("Profile pic update error:", err);
      if (cloudinaryResult?.public_id) {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      }
      res.status(500).json({
        message: err.message || "Failed to update profile picture",
      });
    }
  }
);
