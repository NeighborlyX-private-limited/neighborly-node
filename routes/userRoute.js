const express = require("express");
const { loginUser, registerUser, loggedInUser } = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);

router.route("/me").get(isAuthenticated, loggedInUser);

module.exports = router;