exports.checkActiveAccount = async (req, res, next) => {
  const user = req.query.userId || req.user._id.toString();
  if (!user || user.isDeleted) {
    return res.status(403).json({ msg: "Account is inactive or deleted" });
  }
  next();
};
