const express = require("express");
const { loginUser, registerUser, loggedInUser, logoutUser } = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);

router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/logout").get(isAuthenticated, logoutUser);

module.exports = router;