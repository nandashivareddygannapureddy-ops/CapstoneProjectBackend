import exp from "express";
import { authenticate, register } from "../services/authService.js";
import { ArticleModel } from "../Models/ArticleModel.js";
import { checkAuthor } from "../middlewares/checkauthor.js";
import { verifyToken } from "../middlewares/verifyTokens.js";
import { upload } from "../config/multer.js";
import { uploadToCloudinary } from "../config/cloudinaryUpload.js";
import { cloudinary } from "../config/cloudinary.js";

export const authorRoute = exp.Router();


// ================= REGISTER AUTHOR =================
authorRoute.post("/users", upload.single("profilePic"), async (req, res) => {
  let cloudinaryResult;

  try {

    const userObj = req.body;

    // upload image to cloudinary
    if (req.file) {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    }

    const newUser = await register({
      ...userObj,
      role: "AUTHOR",
      profileImageUrl: cloudinaryResult?.secure_url,
    });

    res.status(201).json({
      message: "Author registered successfully",
      payload: newUser
    });

  } catch (err) {
    console.error("Author register error:", err);

    // Rollback cloudinary image if DB registration fails
    if (cloudinaryResult?.public_id) {
      await cloudinary.uploader.destroy(cloudinaryResult.public_id);
    }

    res.status(500).json({
      message: err.message || "Author registration failed"
    });

  }
});



// ================= AUTHOR LOGIN =================
authorRoute.post("/login", async (req, res) => {

  try {

    const result = await authenticate(req.body);

    res.cookie("token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    });

    res.status(200).json({
      message: "Login successful",
      user: result.user
    });

  } catch (err) {

    res.status(err.status || 500).json({
      message: err.message
    });

  }

});


// ================= CREATE ARTICLE =================
authorRoute.post(
  "/articles",
  verifyToken("AUTHOR"),
  checkAuthor,
  upload.single("image"),
  async (req, res) => {

    try {

      const article = req.body;
      let cloudinaryResult;

      // handles cover image if uploaded
      if (req.file) {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      }

      const newArticle = new ArticleModel({
        ...article,
        author: req.user.userId,
        ArticleImage: cloudinaryResult?.secure_url || article.ArticleImage,
        isArticleActive: true
      });

      const savedArticle = await newArticle.save();

      res.status(201).json({
        message: "Article created successfully",
        payload: savedArticle
      });

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// ================= GET AUTHOR ARTICLES =================
authorRoute.get(
  "/articles",
  verifyToken("AUTHOR"),
  checkAuthor,
  async (req, res) => {

    try {

      const articles = await ArticleModel.find({
        author: req.user.userId,
      })
      .populate("author", "firstName lastName profileImageUrl")
      .populate("comments.user", "firstName lastName profileImageUrl role")
      .sort({ createdAt: -1 });

      res.status(200).json({
        message: "Articles fetched successfully",
        payload: articles
      });

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// ================= UPDATE ARTICLE =================
authorRoute.put(
  "/articles/:id",
  verifyToken("AUTHOR"),
  checkAuthor,
  upload.single("image"),
  async (req, res) => {

    try {

      const { id } = req.params;
      const { title, category, content, isArticleActive, isPremium, ArticleImage } = req.body;
      let cloudinaryResult;

      const article = await ArticleModel.findOne({
        _id: id,
        author: req.user.userId
      });

      if (!article) {
        return res.status(404).json({
          message: "Article not found"
        });
      }

      // upload new image if provided
      if (req.file) {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      }

      const updatedArticle = await ArticleModel.findByIdAndUpdate(
        id,
        { 
          title, 
          category, 
          content, 
          isArticleActive, 
          isPremium, 
          ArticleImage: cloudinaryResult?.secure_url || ArticleImage || article.ArticleImage 
        },
        { new: true }
      );

      res.status(200).json({
        message: "Article updated successfully",
        payload: updatedArticle
      });

    } catch (err) {
      res.status(500).json({
        message: err.message
      });
    }
  }
);


// ================= ADD IMAGE TO ARTICLE =================
authorRoute.post(
  "/articles/:id/images",
  verifyToken("AUTHOR"),
  checkAuthor,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.file) return res.status(400).json({ message: "No image file provided" });

      const article = await ArticleModel.findOne({ _id: id, author: req.user.userId });
      if (!article) return res.status(404).json({ message: "Article not found" });

      const result = await uploadToCloudinary(req.file.buffer);
      if (!article.images) article.images = [];
      article.images.push(result.secure_url);
      await article.save();

      const updatedArticle = await ArticleModel.findById(id)
        .populate("author", "firstName lastName profileImageUrl")
        .populate("comments.user", "firstName lastName profileImageUrl role");

      res.status(200).json({ message: "Image added", payload: updatedArticle });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= DELETE IMAGE FROM GALLERY =================
authorRoute.delete(
  "/articles/:id/images/:index",
  verifyToken("AUTHOR"),
  checkAuthor,
  async (req, res) => {
    try {
      const { id, index } = req.params;
      const article = await ArticleModel.findOne({ _id: id, author: req.user.userId });

      if (!article) return res.status(404).json({ message: "Article not found" });
      
      const imageIdx = parseInt(index);
      if (imageIdx < 0 || imageIdx >= (article.images?.length || 0)) {
        return res.status(400).json({ message: "Invalid image index" });
      }

      // Optional: Destroy on cloudinary if you want to be thorough
      // const imageUrl = article.images[imageIdx];
      
      article.images.splice(imageIdx, 1);
      await article.save();

      const updatedArticle = await ArticleModel.findById(id)
        .populate("author", "firstName lastName profileImageUrl")
        .populate("comments.user", "firstName lastName profileImageUrl role");

      res.status(200).json({ message: "Image removed", payload: updatedArticle });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= REPLACE IMAGE IN GALLERY =================
authorRoute.put(
  "/articles/:id/images/:index",
  verifyToken("AUTHOR"),
  checkAuthor,
  upload.single("image"),
  async (req, res) => {
    try {
      const { id, index } = req.params;
      if (!req.file) return res.status(400).json({ message: "No image file provided" });

      const article = await ArticleModel.findOne({ _id: id, author: req.user.userId });
      if (!article) return res.status(404).json({ message: "Article not found" });

      const imageIdx = parseInt(index);
      if (imageIdx < 0 || imageIdx >= (article.images?.length || 0)) {
        return res.status(400).json({ message: "Invalid image index" });
      }

      const result = await uploadToCloudinary(req.file.buffer);
      article.images[imageIdx] = result.secure_url;
      await article.save();

      const updatedArticle = await ArticleModel.findById(id)
        .populate("author", "firstName lastName profileImageUrl")
        .populate("comments.user", "firstName lastName profileImageUrl role");

      res.status(200).json({ message: "Image replaced", payload: updatedArticle });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);


// ================= DELETE / RESTORE ARTICLE =================
authorRoute.patch(
  "/articles/:id/status",
  verifyToken("AUTHOR"),
  checkAuthor,
  async (req, res) => {

    try {

      const { id } = req.params;
      const { isArticleActive } = req.body;

      const article = await ArticleModel.findById(id);

      if (!article) {
        return res.status(404).json({
          message: "Article not found"
        });
      }

      if (article.author.toString() !== req.user.userId) {
        return res.status(403).json({
          message: "Forbidden: You can modify only your articles"
        });
      }

      article.isArticleActive = isArticleActive;

      await article.save();

      const updatedArticle = await ArticleModel.findById(id)
        .populate("author", "firstName lastName profileImageUrl")
        .populate("comments.user", "firstName lastName profileImageUrl role");

      res.status(200).json({
        message: isArticleActive
          ? "Article restored successfully"
          : "Article deleted successfully",
        payload: updatedArticle
      });

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);