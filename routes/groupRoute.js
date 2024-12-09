const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const { singleFileUpload } = require("../middlewares/fileUpload");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
  createGroup,
  addUser,
  makeGroupPermanent,
  removeUser,
  fetchGroupDetails,
  nearbyUsers,
  updateGroupDetails,
  deleteGroup,
  addAdmin,
  searchGroups,
  reportGroup,
  blockUser,
  fetchUserGroups,
  fetchNearbyGroups,
  storeMessage,
  muteGroup,
  removeAdmin,
} = require("../controllers/groupController");

router.route("/remove-user").post(isAuthenticated, removeUser);
router.route("/make-group-permanent").put(isAuthenticated, makeGroupPermanent);
router.route("/fetch-nearby-users").get(isAuthenticated, nearbyUsers);
router.route("/add-user/:groupId?").post(isAuthenticated, addUser);
router.route("/add-user").post(isAuthenticated, addUser);
router.route("/delete-group/:groupId").delete(isAuthenticated, deleteGroup);
router
  .route("/create")
  .post(isAuthenticated, upload.single("icon"), createGroup);
router.route("/search-group").get(isAuthenticated, searchGroups);
router.route("/report-group").post(isAuthenticated, reportGroup);
router
  .route("/store-message")
  .post(isAuthenticated, singleFileUpload, storeMessage);
router
  .route("/fetch-group-details/:groupId")
  .get(isAuthenticated, fetchGroupDetails);
router
  .route("/update-group-details")
  .post(isAuthenticated, singleFileUpload, updateGroupDetails);
router.route("/add-admin").post(isAuthenticated, addAdmin);
router.route("/remove-admin").put(isAuthenticated, removeAdmin);
router.route("/block-user").put(isAuthenticated, blockUser);
router.route("/user-groups").get(isAuthenticated, fetchUserGroups);
router.route("/nearby-groups").get(isAuthenticated, fetchNearbyGroups);
router.route("/mute-group").put(isAuthenticated, muteGroup);

module.exports = router;
