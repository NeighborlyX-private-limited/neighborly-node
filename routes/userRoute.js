const express = require("express");
const { loginUser, registerUser, loggedInUser, logoutUser, validateUserGroup, userinfo, getUserGroups, updatePic, deleteUser } = require("../controllers/userController");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/validate-user-group").post(validateUserGroup);
router.route("/me").get(isAuthenticated, loggedInUser);
router.route("/logout").get(isAuthenticated, logoutUser);
router.route("/user-info").get(isAuthenticated,userinfo);
router.route("/get-user-groups").get(isAuthenticated, getUserGroups);
router.route("/update-user-pic").put(isAuthenticated, updatePic);
router.route("/delete-user").delete(isAuthenticated, deleteUser);

module.exports = router;