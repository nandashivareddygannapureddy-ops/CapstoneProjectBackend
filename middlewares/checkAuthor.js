import { UserTypeModel } from "../Models/UserModel.js";

export const checkAuthor = async (req, res, next) => {

  try {

    // get author id from token
    const aid = req.user.userId;

    const author = await UserTypeModel.findById(aid);

    if (!author) {
      return res.status(401).json({
        message: "Invalid Author"
      });
    }

    if (author.role !== "AUTHOR") {
      return res.status(403).json({
        message: "User is not an Author"
      });
    }

    if (!author.isActive) {
      return res.status(403).json({
        message: "Author account is not active"
      });
    }

    next();

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};