const express = require("express");
const businessController = require("../controllers/businessController");
const businessAuthController = require("../controllers/businessAuthController");
const authController = require("../controllers/authController");
const serviceController = require("../controllers/serviceController");

const router = express.Router();

// router.use(authController.protect)

router
  .route("/:businessId")
  .get(serviceController.getAllServices)
  .post(serviceController.createService);

router
  .route("/:id")
  .get(serviceController.getService)
  .patch(businessAuthController.protect, serviceController.updateService)
  .delete(businessAuthController.protect, serviceController.deleteService);

module.exports = router;
