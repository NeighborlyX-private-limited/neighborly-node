const dotenv = require("dotenv");
const karmaLimit = process.env.KARMA_LIMIT;
exports.hasValidKarma = async(req, res, next) => {
    const user = req.user;
    if(user.karma < karmaLimit)
        res.status(403).send("Oops! Low karma");
    else
        next();
}