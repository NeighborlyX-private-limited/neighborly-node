const express = require("express");
const router = express.Router();

const { searchAll } = require("../controllers/searchController");

router.route("/search").get(searchAll);

module.exports = router;
