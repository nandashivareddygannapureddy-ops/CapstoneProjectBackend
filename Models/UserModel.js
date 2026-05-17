import mongoose from "mongoose";
const { Schema, model, models } = mongoose;


const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true
    },
    googleId: {
      type: String,
    },
    password: {
      type: String,
      required: function() {
        return !this.googleId;
      },
    },
    profileImageUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ["AUTHOR", "USER", "ADMIN"],
      required: [true, "{Value} is an invalid role"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    purchasedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "article"
    }],
  },
  {
    timestamps: true,
    strict: "true",
    versionKey: false,
  },
);

//create model
export const UserTypeModel = models.user || model("user", userSchema);