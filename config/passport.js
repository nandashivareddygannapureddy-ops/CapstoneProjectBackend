import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserTypeModel } from "../Models/UserModel.js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Explicitly load .env from the root directory to avoid path issues
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

console.log("Loading Passport Configuration...");
const clientId = process.env.GOOGLE_CLIENT_ID;

if (!clientId) {
  console.error("CRITICAL ERROR: GOOGLE_CLIENT_ID is not defined in .env");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: clientId,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await UserTypeModel.findOne({ googleId: profile.id });

        if (!user) {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }
          user = await UserTypeModel.findOne({ email });

          if (user) {
            // Update existing user with googleId
            user.googleId = profile.id;
            if (!user.profileImageUrl) {
              user.profileImageUrl = profile.photos[0].value;
            }
            await user.save();
          } else {
            // Create new user
            user = new UserTypeModel({
              googleId: profile.id,
              firstName: profile.name?.givenName || "User",
              lastName: profile.name?.familyName || "",
              email: profile.emails?.[0]?.value?.toLowerCase(),
              profileImageUrl: profile.photos?.[0]?.value || "",
              role: "USER", // Default role
            });
            await user.save();
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserTypeModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
