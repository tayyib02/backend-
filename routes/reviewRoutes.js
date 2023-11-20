const express = require("express");
const reviewController = require("./../controllers/reviewController");
const authController = require("./../controllers/authController");

const router = express.Router({ mergeParams: true });

// router.route('/:businessId/reviews')
//   .post(businessAuthController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview)

router.use(authController.protect);

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo("user"),
    reviewController.setBusinessUserIds,
    reviewController.createReview
  );

router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(
    reviewController.matchId,
    authController.restrictTo("user", "admin"),
    reviewController.updateReview
  )
  .delete(
    reviewController.matchId,
    authController.restrictTo("user", "admin"),
    reviewController.deleteReview
  );

module.exports = router;
