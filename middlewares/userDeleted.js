const User = require("../models/userModel");
exports.checkActiveAccount = async (req, res, next) => {
  const userid = req.query.userId || req.user._id.toString();
  const user = await User.findById(userid);
  if (!user || user.isDeleted) {
    return res.status(403).json({ msg: "Account is inactive or deleted" });
  }
  next();
};
