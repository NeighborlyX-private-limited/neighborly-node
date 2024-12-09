const express = require("express");
const { isAuthenticated } = require("../middlewares/auth");
const {
  createOrder,
  verifyPayment,
  fetchTransactionDetails,
} = require("../controllers/paymentController.js");

const router = express.Router();

router.post("/create-order", isAuthenticated, createOrder);
router.post("/verify-payment", isAuthenticated, verifyPayment);
router.get(
  "/transactions/:transactionId",
  isAuthenticated,
  fetchTransactionDetails
);

module.exports = router;
