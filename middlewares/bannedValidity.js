exports.isBanned = async(req, res, next) => {
    const user = req.user;
    const date = new Date();
    if (user.isBanned && date <= user.bannedExpiry)
        return res.status(403).send("Sorry, you are banned");
    else
        next();
}