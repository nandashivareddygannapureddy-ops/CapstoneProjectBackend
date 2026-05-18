import exp from "express";
import { register, authenticate } from "../services/authService.js";
import { verifyToken } from "../middlewares/verifyTokens.js";
import { ArticleModel } from "../Models/ArticleModel.js";
import { UserTypeModel } from "../Models/UserModel.js";
import { upload } from "../config/multer.js";
import { uploadToCloudinary } from "../config/cloudinaryUpload.js";
import { cloudinary } from "../config/cloudinary.js";

export const userRoute = exp.Router();


//REGISTER USER

userRoute.post(
  "/users",
  upload.single("profilePic"),
  async (req, res, next) => {
    let cloudinaryResult;

    try {
      const userObj = req.body;

      const role = (userObj.role || "USER").toUpperCase();


  
      if (req.file) {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      }

     
      const newUserObj = await register({
        ...userObj,
        role,
        profileImageUrl: cloudinaryResult?.secure_url,
      });

      res.status(201).json({
        message: "User created",
        payload: newUserObj,
      });

    } catch (err) {
      console.error("Register error:", err);

      if (cloudinaryResult?.public_id) {
        await cloudinary.uploader.destroy(cloudinaryResult.public_id);
      }

      res.status(500).json({
        message: err.message || "Internal Server Error",
      });
    }
  }
);





// LOGIN USER

userRoute.post("/login", async (req, res) => {
  try {
    const result = await authenticate(req.body);

    res.cookie("token", result.token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      message: "Login success",
      user: result.user,
    });

  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
});

//READ SINGLE ARTICLE

userRoute.get("/article/:id", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  try {
    const article = await ArticleModel.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "firstName lastName profileImageUrl")
      .populate("comments.user", "firstName lastName profileImageUrl role");


    if (!article) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    res.status(200).json({
      message: "Article fetched successfully",
      payload: article,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});



//READ ARTICLES

userRoute.get("/articles", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  try {
    const articles = await ArticleModel.find({ isArticleActive: true }).populate("author", "firstName lastName profileImageUrl").sort({ createdAt: -1 });

    res.status(200).json({
      message: "All articles",
      payload: articles,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});




// CREATE ARTICLE
userRoute.post("/articles", verifyToken("USER"), async (req, res) => {
  try {
    const newArticle = new ArticleModel({
      ...req.body,
      author: req.user.userId,
    });

    await newArticle.save();

    res.status(201).json({
      message: "Article created successfully",
      payload: newArticle,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});



//  DELETE COMMENT
userRoute.patch("/articles/:articleId/comments/:commentId", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  try {
    const { articleId, commentId } = req.params;
    const userId = req.user.userId;

    const article = await ArticleModel.findById(articleId);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Find the comment
    const comment = article.comments.id(commentId);

    if (!comment) {
      console.log("Comment not found for ID:", commentId);
      return res.status(404).json({ message: "Comment not found" });
    }

    // Permission check: owner of comment OR owner of article OR admin
    const commentUserId = (comment.user?._id || comment.user || "").toString();
    const articleAuthorId = (article.author?._id || article.author || "").toString();

    console.log("Moderation check for user:", { userId, role: req.user.role });

    // Per user request, any authenticated user can delete comments (e.g. for testing/universal moderation)
    // You can revert this later to strict ownership if needed.
    const canDelete = true; 

    if (!canDelete) {
      return res.status(403).json({ 
        message: "Forbidden: You cannot delete this comment",
        debug: {
          isCommentOwner,
          isArticleOwner,
          isAdmin,
          commentUserId,
          articleAuthorId,
          requestUserId: userId
        }
      });
    }

    // Remove comment
    article.comments.pull(commentId);
    await article.save();

    // Re-populate and return
    const updatedArticle = await ArticleModel.findById(articleId)
      .populate("author", "firstName lastName profileImageUrl")
      .populate("comments.user", "firstName lastName profileImageUrl role");

    res.status(200).json({
      message: "Comment deleted successfully",
      payload: updatedArticle,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PURCHASE ARTICLE
userRoute.post("/purchase", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  try {
    const { articleId } = req.body;
    const userId = req.user.userId;

    const user = await UserTypeModel.findByIdAndUpdate(
      userId,
      { $addToSet: { purchasedArticles: articleId } }, // $addToSet prevents duplicates
      { new: true }
    );

    res.status(200).json({
      message: "Purchase recorded successfully",
      purchasedArticles: user.purchasedArticles,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

userRoute.put("/articles", verifyToken("USER", "AUTHOR", "ADMIN"), async (req, res) => {
  try {
    const { user, articleId, comment } = req.body;

    const articleWithComment = await ArticleModel.findByIdAndUpdate(
      articleId,
      { $push: { comments: { user, comment } } },
      { new: true, runValidators: true }
    ).populate("comments.user", "firstName lastName profileImageUrl role");

    if (!articleWithComment) {
      return res.status(404).json({
        message: "Article not found",
      });
    }

    res.status(200).json({
      message: "Comment added successfully",
      payload: articleWithComment,
    });

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});