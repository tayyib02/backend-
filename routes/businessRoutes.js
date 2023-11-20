const express = require("express");
const businessController = require("./../controllers/businessController");
const businessAuthController = require("./../controllers/businessAuthController");
const authController = require("./../controllers/authController");
const reviewRouter = require("./../routes/reviewRoutes");
// const serviceRouter = require('./../routes/serviceRoutes');

const router = express.Router();

router.route("/business-stats").get(businessController.getBusinessStats);

router.use("/:businessId/reviews", reviewRouter);
// router.use('/:businessId/service', serviceRouter);

router.post("/auth/signup", businessAuthController.signup);
router.post("/auth/login", businessAuthController.login);

router.post("/auth/forgotPassword", businessAuthController.forgotPassword);
router.patch(
  "/auth/resetPassword/:token",
  businessAuthController.resetPassword
);

router.patch(
  "/auth/updateMyPassword",
  businessAuthController.protect,
  businessAuthController.updatePassword
);
router.get(
  "/auth/me",
  businessAuthController.protect,
  businessAuthController.getMe,
  businessAuthController.getBusinessAuth
);
// router.patch("/updateMe", businessAuthController.protect, businessAuthController.updateMe)
router.patch(
  "/auth/deactivateMe",
  businessAuthController.protect,
  businessAuthController.deactivateMe
);
router.patch(
  "/auth/reactivateMe",
  businessAuthController.protect,
  businessAuthController.reactivateMe
);

router.route("/auth/").get(businessAuthController.getAllBusinessAuth);
// i think the below post should be deleted as the route is a copy of signup and has no purpose, collides with below route for building business.
// .post(businessAuthController.createBusinessUser);

router
  .route("/auth/:id")
  // .get(businessAuthController.getBusinessAuth)
  .patch(businessAuthController.updateBusinessAuth);
// .delete(businessAuthController.deleteBusinessAuth);

router.route("/:id").get(businessController.getBusiness).patch(
  businessAuthController.protect,
  businessAuthController.restrictTo("admin"),
  // businessController.uploadBusinessImages,
  // businessController.resizeBusinessImages,
  businessController.updateBusiness
);

router
  .route("/")
  .get(businessController.getAllBusiness)
  .post(
    businessAuthController.protect,
    businessAuthController.restrictTo("admin"),
    businessController.createBusiness
  );

router
  .route("/top-rated")
  .get(
    businessController.aliasTopRatedBusiness,
    businessController.getAllBusiness
  );

router
  .route("/most-popular")
  .get(
    businessController.aliasMostPopularBusiness,
    businessController.getAllBusiness
  );

router
  .route("/language")
  .get(businessController.aliasTopLanguage, businessController.getAllBusiness);

router
  .route("/monthly/:year")
  .get(
    businessAuthController.protect,
    businessAuthController.restrictTo("admin"),
    businessController.getMonthlyPlan
  );

// router
// .route('/business-within/:distance/center/:latlng/unit/:unit')
// .get(businessController.getBusinessWithin);
// /business-within?distance=233&center=-40,45&unit=mi
// /business-within/233/center/-40,45/unit/mi

// router.route('/distances/:latlng/unit/:unit').get(businessController.getDistances);

module.exports = router;
