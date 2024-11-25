const Razorpay = require("razorpay");
const { Transaction } = require("../models/TransactionModel");
const User = require("../models/userModel");
const { activityLogger, errorLogger } = require("../utils/logger");
const {
  VALIDAWARDTYPES,
  RANDOM_AWARD_COST,
  SPECIFIC_AWARD_COST,
} = require("../utils/constants");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const crypto = require("crypto");

exports.createOrder = async (req, res) => {
  try {
    activityLogger.info("Initiating order creation...");

    const { awardType, quantity } = req.body;

    if (
      !awardType ||
      (!VALIDAWARDTYPES.has(awardType) && awardType !== "random")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid award type. Please select a valid award.",
      });
    }

    // Calculate the total cost
    const amount =
      awardType === "random" ? RANDOM_AWARD_COST : SPECIFIC_AWARD_COST;
    const totalAmount = amount * quantity * 100; // Convert to paise

    const options = {
      amount: totalAmount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    // Create a Razorpay order
    const order = await razorpay.orders.create(options);
    activityLogger.info(`Razorpay order created with ID: ${order.id}`);

    // Save order details to the database
    await Transaction.create({
      userId: req.user.id,
      orderId: order.id,
      amount: totalAmount,
      status: "created",
      awardType,
      quantity,
    });

    activityLogger.info(
      `Transaction saved for user ${req.user.id} with order ID: ${order.id}`
    );

    // Respond with order details
    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      currency: "INR",
    });

    // Increment user's award count
    try {
      const update = {};
      if (awardType === "random") {
        // Assign a random award
        const randomAward =
          Array.from(VALIDAWARDTYPES)[
            Math.floor(Math.random() * VALIDAWARDTYPES.size)
          ];
        update[`awards.${randomAward}`] = quantity;
        activityLogger.info(
          `Random award "${randomAward}" assigned to user ${req.user.id}.`
        );
      } else {
        // Increment the specific award's count
        update[`awards.${awardType}`] = quantity;
        activityLogger.info(
          `Specific award "${awardType}" assigned to user ${req.user.id}.`
        );
      }

      // Update the user's awards in the database
      await User.updateOne({ _id: req.user.id }, { $inc: update });
      activityLogger.info(
        `Award count updated for user ${req.user.id}: ${JSON.stringify(update)}`
      );
    } catch (awardUpdateError) {
      errorLogger.error(
        `Failed to update awards for user ${req.user.id}: ${JSON.stringify(
          awardUpdateError,
          Object.getOwnPropertyNames(awardUpdateError)
        )}`
      );
    }
  } catch (err) {
    try {
      console.log(err);
      errorLogger.error(
        "Error creating order:",
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );
    } catch (loggerError) {
      console.error("Logger failed:", loggerError);
    }
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    activityLogger.info("Initiating payment verification...");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    activityLogger.info(
      `Payment details received: order_id=${razorpay_order_id}, payment_id=${razorpay_payment_id}`
    );

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      activityLogger.info("Payment signature verified successfully.");

      // Update transaction status in the database
      const transaction = await Transaction.findOne({
        where: { orderId: razorpay_order_id },
      });

      if (!transaction) {
        activityLogger.warn(
          `Transaction not found for order_id=${razorpay_order_id}.`
        );
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      }

      await transaction.update({
        status: "successful",
        paymentId: razorpay_payment_id,
      });

      activityLogger.info(
        `Transaction updated successfully: order_id=${razorpay_order_id}, payment_id=${razorpay_payment_id}`
      );

      return res
        .status(200)
        .json({ success: true, message: "Payment verified successfully" });
    } else {
      activityLogger.warn(
        `Payment verification failed for order_id=${razorpay_order_id}.`
      );
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }
  } catch (err) {
    errorLogger.error(
      `Error during payment verification: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
    );
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// Controller to fetch transaction details
exports.fetchTransactionDetails = async (req, res) => {
  try {
    activityLogger.info("Fetching transaction details...");

    const { transactionId } = req.params;

    activityLogger.info(`Fetching details for transaction_id=${transactionId}`);

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
      activityLogger.warn(
        `Transaction not found for transaction_id=${transactionId}.`
      );
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    activityLogger.info(
      `Transaction details fetched successfully for transaction_id=${transactionId}.`
    );

    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    errorLogger.error(
      `Error fetching transaction details: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch transaction" });
  }
};
