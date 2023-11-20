const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const factory = require("./handlerFactory");
const cron = require("node-cron");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Gets user data
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  // if (req.body.Password || req.body.ConfirmPassword) {
  //   return next(
  //     new AppError(
  //       "This route is not for password updates. Please use /updateMyPassword.",
  //       400
  //     )
  //   );
  // }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "FirstName", "LastName", "Email");

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// For the deactivate me, i need to put a safety measure, the user must be logged in to deactivate.

exports.deactivateMe = catchAsync(async (req, res, next) => {
  const { Email, Password } = req.body;

  // 1) Check if email, password, and confirmPassword exist
  if (!Email || !Password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 3) Check if user exists and password is correct
  const user = await User.findOne({ Email }).select("+Password");

  if (!user || !(await user.correctPassword(Password, user.Password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  await User.findByIdAndUpdate(
    user._id,
    { active: false, deletionDate: 30 },
    { new: true }
  );

  return res.status(200).json({
    status: "success",
    message: "Account deactivated successfully.",
    data: null,
  });
});

// cron.schedule('* * * * *', async () => {
//   try {
//     const result = await User.deleteMany({ active: false, deletionDate: { $lte:Date.now() }});
//     console.log(`${result.deletedCount} accounts deleted`);
//   } catch (err) {
//     console.error(err);
//   }
// });

const deleteInactiveUsers = async () => {
  try {
    const result = await User.deleteMany({
      active: false,
      deletionDate: { $eq: 0 },
    });

    console.log(`Deleted ${result.deletedCount} inactive users`);
  } catch (error) {
    console.error("Error deleting inactive users:", error);
  }
};

// Run once every day at midnight (00:00)
cron.schedule("0 0 * * *", async () => {
  try {
    // Update deletionDate for all users
    const result = await User.updateMany(
      { deletionDate: { $gt: 0 } }, // Filter users with deletionDate > 0
      { $inc: { deletionDate: -1 } } // Decrease deletionDate by 1
    );
    await deleteInactiveUsers();
    console.log(`Updated deletionDate for ${result.modifiedCount} users`);
  } catch (error) {
    console.error("Error updating deletionDate:", error);
  }
});

exports.reactivateMe = catchAsync(async (req, res, next) => {
  const { Email, Password } = req.body;

  // 1) Check if email, password exist
  if (!Email || !Password) {
    return next(new AppError("Please provide email and password", 400));
  }

  // 3) Check if user exists and password is correct
  const user = await User.findOne({ Email }).select("+Password");

  if (!user || !(await user.correctPassword(Password, user.Password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 4) Reactivate the user account
  await User.findByIdAndUpdate(user._id, { active: true, deletionDate: null });

  res.status(200).json({
    status: "success",
    message: "Account reactivated successfully.",
    data: user,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /sign up instead",
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
// Do NOT update password with this!!
exports.updateUser = factory.updateOne(User);
