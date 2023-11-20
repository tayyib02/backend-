const mongoose = require("mongoose");
const validator = require("validator");
// const bcrypt = require('bcryptjs');
const slugify = require("slugify");

const businessSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A business must have a title"],
      unique: true,
      trim: true,
      maxlength: [
        40,
        "A business name must have less or equal than 40 characters",
      ],
      minlength: [
        4,
        "A business name must have more or equal than 4 characters",
      ],
    },
    slug: String,
    summary: {
      type: String,
      trim: true,
      required: [true, "A business must have a description"],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      // enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: "admin",
    },
    imageCover: {
      type: [String],
      required: [true, "A business must have imageCovers"],
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    deletionDate: {
      type: Number,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    language: {
      type: String,
      default: "English",
      enum: [
        "English",
        "Arabic",
        "Chinese",
        "German",
        "Spanish",
        "Italian",
        "Portuguese",
        "French",
        "Japanese",
        "Korean",
        "Indonesian",
        "Somali",
        "Kenyan",
        "Urdu",
        "Pashto",
        "Bengali",
        "Turkish",
        "Greek",
        "Polish",
        "Ukrainian",
        "Russian",
        "Hebrew",
        "Swedish",
        "Danish",
      ],
      select: false,
    },
    city: {
      type: String,
    },
    avgPrice: {
      type: Number,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

businessSchema.index({ city: "text" });
businessSchema.index({ ratingsAverage: 1 });
businessSchema.index({ language: 1 });
businessSchema.index({ slug: 1 });

// virtual populate
businessSchema.virtual("services", {
  ref: "Service",
  foreignField: "business",
  localField: "_id",
});

// virtual populate
businessSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "business",
  localField: "_id",
});

// businessSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'services'
//   })
//   next()
// });

businessSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
