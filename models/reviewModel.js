// review / rating / createdAt / ref to tour / ref to user
const mongoose = require("mongoose");
const Business = require("./businessModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty!"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    business: {
      type: mongoose.Schema.ObjectId,
      ref: "Business",
      required: [true, "Review must belong to a business."],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ user: 1 }, { unique: true });

// parent referencing
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'business',
  //   select: 'title'
  // }).populate({
  //   path: 'user',
  //   select: 'FirstName LastName Photo'
  // });

  this.populate({
    path: "user",
    select: "FirstName LastName Photo",
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (businessUserId) {
  const stats = await this.aggregate([
    {
      $match: { business: businessUserId },
    },
    {
      $group: {
        _id: "$business",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  console.log(stats);

  if (stats.length > 0) {
    await Business.findByIdAndUpdate(businessUserId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Business.findByIdAndUpdate(businessUserId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post("save", function () {
  //  this points to current review
  this.constructor.calcAverageRatings(this.business);
});

reviewSchema.post(/^findOneAnd/, async (doc) => {
  await doc.constructor.calcAverageRatings(doc.business);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
