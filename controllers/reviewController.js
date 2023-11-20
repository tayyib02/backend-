// const catchAsync = require('../utils/catchAsync');
const catchAsync = require("../utils/catchAsync");
const Review = require("./../models/reviewModel");
const factory = require("./handlerFactory");

exports.setBusinessUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.business) req.body.business = req.params.businessUserId;
  if (!req.body.user) req.body.user = req.user.id;
  if (!req.body.createdAt) req.body.createdAt = new Date();
  next();
};

exports.matchId = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (review.user._id.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You may only delete or update your own review", 400)
    );
  }
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

// exports.deleteReview = catchAsync(async (req, res, next) => {
//   const review = await Review.findByIdAndDelete(req.params.id);

//   if (!review) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });
