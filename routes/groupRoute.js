const express = require("express");
const { createGroup, makeGroupPermanent } = require("../controllers/groupController");

const router = express.Router();

router.route("/create_group").post(createGroup);
router.route("/make-group-permanent").put(makeGroupPermanent);
module.exports = router;