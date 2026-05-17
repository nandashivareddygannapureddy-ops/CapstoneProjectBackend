import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { UserTypeModel } from "../Models/UserModel.js";
import { config } from "dotenv";

config();

// ================= REGISTER =================
export const register = async (userObj) => {

  // convert email to lowercase
  userObj.email = (userObj.email || "").toLowerCase();

  // create document
  const userDoc = new UserTypeModel(userObj);

  // validate
  await userDoc.validate();

  // hash password
  userDoc.password = await bcrypt.hash(userDoc.password, 10);

  // save user
  const created = await userDoc.save();

  // remove password from response
  const newUserObj = created.toObject();
  delete newUserObj.password;

  return newUserObj;
};


// ================= AUTHENTICATE =================
export const authenticate = async ({ email, password }) => {

  // convert email to lowercase
  email = email.toLowerCase();

  // find user
  const user = await UserTypeModel.findOne({ email });

  if (!user) {
    const err = new Error("Invalid email");
    err.status = 401;
    throw err;
  }

  // compare password
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const err = new Error("Invalid password");
    err.status = 401;
    throw err;
  }

  // check if user is blocked
  if (user.isActive === false) {
    const err = new Error("Your account is blocked by admin. Please contact admin");
    err.status = 403;
    throw err;
  }

  // generate JWT token
  const token = jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // remove password from response
  const userObj = user.toObject();
  delete userObj.password;

  return { token, user: userObj };
};