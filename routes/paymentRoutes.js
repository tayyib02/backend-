const express = require("express");
const paymentController = require("./../controllers/paymentController");

const router = express.Router({ mergeParams: true });

router.route("/").post(paymentController.payment);

module.exports = router;
