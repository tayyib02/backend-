const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const BusinessAuth = require('./../models/businessAuthModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const cron = require('node-cron');
const Business = require('./../models/businessModel');
const factory = require('./../controllers/handlerFactory');
const Service = require('../models/servicesModel');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (businessUser, statusCode, req, res) => {
  const token = signToken(businessUser._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove password from output
  businessUser.BusinessPassword = undefined;
  // Remove from output except first name, lastname, email address 
  businessUser.role = undefined
  businessUser.active = undefined
  businessUser.BusinessAddress = undefined
  businessUser.deletionDate = undefined




  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      businessUser
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newBusinessUser = await BusinessAuth.create({
    BusinessName: req.body.BusinessName,
    BusinessEmail: req.body.BusinessEmail,
    BusinessAddress: req.body.BusinessAddress,
    BusinessPostcode: req.body.BusinessPostcode,
    BusinessPhoneNumber: req.body.BusinessPhoneNumber,
    BusinessPassword: req.body.BusinessPassword,
    ConfirmBusinessPassword: req.body.ConfirmBusinessPassword,
    businesses: req.body.businesses
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newBusinessUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { BusinessEmail, BusinessPassword } = req.body;

  // 1) Check if email and password exist
  if (!BusinessEmail || !BusinessPassword) {
    return next(new AppError('Please provide business email and password!', 400));
  }
  // 2) Check if businessUser exists && password is correct
  const businessUser = await BusinessAuth.findOne({ BusinessEmail }).select('+BusinessPassword');

  // console.log(businessUser)

  if (!businessUser || !(await businessUser.correctPassword(BusinessPassword, businessUser.BusinessPassword))) {
    return next(new AppError('Incorrect business email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(businessUser, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentBusinessUser = await BusinessAuth.findById(decoded.id);
  if (!currentBusinessUser) {
    return next(
      new AppError(
        'The business belonging to this token no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentBusinessUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.businessUser = currentBusinessUser;
  res.locals.businessUser = currentBusinessUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentBusinessUser = await BusinessAuth.findById(decoded.id);
      if (!currentBusinessUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentBusinessUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.businessUser = currentBusinessUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.businessUser.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const businessUser = await BusinessAuth.findOne({ BusinessEmail: req.body.BusinessEmail });
  if (!businessUser) {
    return next(new AppError('There is no business with the email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = businessUser.createPasswordResetToken();
  await businessUser.save({ validateBeforeSave: false });

  // 3) Send it to business email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/businessAuth/resetPassword/${resetToken}`;

    // await new Email(businessUser, resetURL).sendPasswordReset();

    await Email({
      Email: user.Email,
      subject: 'Your password reset token (valid for 10 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    businessUser.passwordResetToken = undefined;
    businessUser.passwordResetExpires = undefined;
    await businessUser.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const businessUser = await BusinessAuth.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is business, set the new password
  if (!businessUser) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  businessUser.BusinessPassword = req.body.BusinessPassword;
  businessUser.ConfirmBusinessPassword = req.body.ConfirmBusinessPassword;
  businessUser.passwordResetToken = undefined;
  businessUser.passwordResetExpires = undefined;
  await businessUser.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(businessUser, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const businessUser = await BusinessAuth.findById(req.businessUser.id).select('+BusinessPassword');

  // 2) Check if POSTed current password is correct
  if (!(await businessUser.correctPassword(req.body.passwordCurrent, businessUser.BusinessPassword))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  businessUser.BusinessPassword = req.body.BusinessPassword;
  businessUser.ConfirmBusinessPassword = req.body.ConfirmBusinessPassword;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(businessUser, 200, req, res);
});




exports.deactivateMe = catchAsync(async (req, res, next) => {

  const { BusinessEmail, BusinessPassword } = req.body;

  // 1) Check if email, password, and confirmPassword exist
  if (!BusinessEmail || !BusinessPassword) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if business exists and password is correct
  const businessAuth = await BusinessAuth.findOne({ BusinessEmail }).select('+BusinessPassword');

  if (!businessAuth || !(await businessAuth.correctPassword(BusinessPassword, businessAuth.BusinessPassword))) {
    return next(new AppError('Incorrect business email or password', 401));
  }

  // businessAuth is the business user and business is all the businesses under the businessAuth
  await BusinessAuth.findByIdAndUpdate(businessAuth._id, { active: false, deletionDate: 30 }, { new: true });

  // // Deactivate associated businesses
  // await Business.updateMany({ _id: businessAuth.businesses },{ active: false, deletionDate: 30 });

  // Deactivate associated businesses
  await Business.updateMany({ _id: { $in: businessAuth.businesses } }, { $set: { active: false, deletionDate: 30 } });
  await Service.updateMany(Service._id, { $set: { active: false, deletionDate: 30 } }, { new: true });


  res.status(204).json({
    status: 'success',
    message: 'Business account deactivated successfully.',
    data: null
  });
});

const deleteInactiveBusinesses = async () => {
  try {
    const resultAuth = await BusinessAuth.deleteMany({
      active: false,
      deletionDate: { $eq: 0 }
    });

    const result = await Business.deleteMany({
      active: false,
      deletionDate: { $eq: 0 }
    });

    const service = await Service.deleteMany({
      active: false,
      deletionDate: { $eq: 0 }
    })

    console.log(`Deleted ${resultAuth.deletedCount} and ${result.deletedCount} and ${service.deletedCount} inactive businesses`);
  } catch (error) {
    console.error('Error deleting inactive businesses:', error);
  }
};

// Run once every day at midnight (00:00)
cron.schedule('0 0 * * *', async () => {
  try {
    // Update deletionDate for all users
    const resultAuth = await BusinessAuth.updateMany(
      { deletionDate: { $gt: 0 } }, // Filter users with deletionDate > 0
      { $inc: { deletionDate: -1 } } // Decrease deletionDate by 1
    );
    const result = await Business.updateMany(
      { deletionDate: { $gt: 0 } }, // Filter users with deletionDate > 0
      { $inc: { deletionDate: -1 } } // Decrease deletionDate by 1
    );

    const service = await Service.updateMany(
      { deletionDate: { $gt: 0 } }, // Filter users with deletionDate > 0
      { $inc: { deletionDate: -1 } } // Decrease deletionDate by 1
    );



    await deleteInactiveBusinesses()
    console.log(`Updated deletionDate for ${resultAuth.modifiedCount} and ${result.modifiedCount} and ${service.modifiedCount} businesses`);
  } catch (error) {
    console.error('Error updating deletionDate:', error);
  }
});

exports.reactivateMe = catchAsync(async (req, res, next) => {
  const { BusinessEmail, BusinessPassword } = req.body;

  // 1) Check if email, password exist
  if (!BusinessEmail || !BusinessPassword) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists and password is correct
  const businessAuth = await BusinessAuth.findOne({ BusinessEmail }).select('+BusinessPassword');

  if (!businessAuth || !(await businessAuth.correctPassword(BusinessPassword, businessAuth.BusinessPassword))) {
    return next(new AppError('Incorrect business email or password', 401));
  }


  // 3) Reactivate the user account
  await BusinessAuth.findByIdAndUpdate(businessAuth._id, { active: true, deletionDate: null });

  await Business.updateMany((BusinessAuth.businesses, { active: true, deletionDate: null }))

  await Service.updateMany(Service._id, { $set: { active: true, deletionDate: null } });



  res.status(200).json({
    status: 'success',
    message: 'Business account reactivated successfully.',
    data: businessAuth,
  });
});


exports.createBusinessUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /sign up instead"
  });
};

// Gets user data
exports.getMe = (req, res, next) => {
  req.params.id = req.businessUser.id
  next()
}



exports.getBusinessAuth = factory.getOne(BusinessAuth);
exports.getAllBusinessAuth = factory.getAll(BusinessAuth);
// Do NOT update password with this!!
exports.updateBusinessAuth = factory.updateOne(BusinessAuth);
// exports.deleteBusinessAuth = factory.deleteOne(BusinessAuth);