const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");
const Mongoose = require("mongoose");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    console.log(req.body);
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.find({
      business: new Mongoose.Types.ObjectId(req.params.id),
    }).populate("business");
    // query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on business (hack)
    let filter = {};
    let sort = {};
    if (req.params.businessId) filter = { business: req.params.businessId };
    if (req.query.title) {
      filter = { title: { $regex: new RegExp(req.query.title, "gi") } };
    }

    // if (req.query.city !== "") {
    //   filter = { city: { $regex: new RegExp(req.query.city, "gi") } };
    // }

    if (req && req.query && req.query.topRated === "true") {
      sort = { ratingsAverage: -1 };
    }

    if (req && req.query && req.query.mostPopular === "true") {
      sort = { ratingsQuantity: -1 };
    }

    if (req.query.topRated === "true" && req.query.mostPopular === "true") {
      sort = { ratingsQuantity: -1, ratingsQuantity: -1 };
    }

    const features = new APIFeatures(Model.find(filter).sort(sort), {})
      // .filter()
      // .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    return res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });

    // const business = Model.aggregate([
    //   {
    //     $match: filter,
    //   },
    // {
    //   $lookup: {
    //     from: "services",
    //     localField: "_id",
    //     foreignField: "business",
    //     as: "services",
    //   },
    // },
    //   {
    //     $unwind: "$services",
    //   },
    // ]);

    // const services = Model.aggregate([
    //   {
    //     $match: filter,
    //   },
    //   {
    //     $lookup: {
    //       from: "services",
    //       localField: "_id",
    //       foreignField: "business",
    //       as: "services",
    //     },
    //   },
    //   {
    //     $unwind: "$services",
    //   },
    // ]);

    // Promise.all([business, services])
    //   .then((features) => {
    //     // SEND RESPONSE
    //     return res.status(200).json({
    //       status: "success",
    //       results: features[0].length,
    //       data: {
    //         data: features[0],
    //       },
    //       services: features[1],
    //     });
    //   })
    //   .catch((err) => {
    //     return res.status(400).json({ message: "Error! ", error: err });
    //   });
  });

exports.getAllBusiness = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on business (hack)
    const filter = {};
    const sort = {};
    if (req.query.title) {
      filter = { title: { $regex: new RegExp(req.query.title, "gi") } };
    }

    if (req.query.city) {
      filter = {};
    }

    if (req.query.topRated) {
      sort = { ratingsAverage: -1 };
    }

    const business = Model.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "business",
          as: "services",
        },
      },
      {
        $unwind: "$services",
      },
      {
        $project: {
          title: 1,
          summary: 1,
          ratingsAverage: 1,
          ratingsQuantity: 1,
          role: 1,
          imageCover: 1,
          active: 1,
          deletionDate: 1,
          createdAt: 1,
          language: 1,
          slug: 1,
          services: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: "success",
      results: business[0].length,
      data: {
        data: business,
      },
    });

    // const services = Model.aggregate([
    //   {
    //     $match: filter,
    //   },
    //   {
    //     $lookup: {
    //       from: "services",
    //       localField: "_id",
    //       foreignField: "business",
    //       as: "services",
    //     },
    //   },
    //   {
    //     $unwind: "$services",
    //   },
    // ]);

    // Promise.all([business, services])
    //   .then((features) => {
    //     // SEND RESPONSE
    //     return res.status(200).json({
    //       status: "success",
    //       results: features[0].length,
    //       data: {
    //         data: features[0],
    //       },
    //       services: features[1],
    //     });
    //   })
    //   .catch((err) => {
    //     return res.status(400).json({ message: "Error! ", error: err });
    //   });
  });
