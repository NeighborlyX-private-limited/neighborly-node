const ErrorHandler = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");


exports.isAuthenticated = async (req, res, next) => {
    const {token} = req.cookies;

    if(!token)
        return next(new ErrorHandler("You must login first", 401));

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decodedData.id);

    next();

}
