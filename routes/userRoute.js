const express = require("express");
const { loginUser, registerUser, loggedInUser, logoutUser, validateUserGroup } = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/validate-user-group").post(validateUserGroup);
router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/logout").get(isAuthenticated, logoutUser);
router.route("/user-info").get(isAuthenticated,userinfo);

module.exports = router;