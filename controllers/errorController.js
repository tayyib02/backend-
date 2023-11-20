const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};
const handleDuplicatedFieldsDB = err => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicated field value: ${value}. Please use another value!`;
  return new AppError(message, 400)
};
const handleValidationErrorDb = err => {
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please login again', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401)

const sendErrorDev = (err, req, res) => {
  // API
  if(req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error:err,
  });

 } else {
  //  RENDERED WEBSITE
    console.error('💥 Error! 💥', err);
   res.status(err.status).render('error', {
     title: 'Something went wrong!',
     msg: err.message
   })
 }
};

const sendErrorProd = (err, req, res) => {
  //A) API
  if(req.originalUrl.startsWith('/api')) {
    // Operational, trusted error; send message to client
    if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } //everything that is not marked operational
    
    // 1) Log error
    console.error('💥 Error! 💥', err);

    // 2) Send generic message
      return res.status(500).json({
      //status code is always 500
      status: 'error', //status is always "error"
      message: 'Something went very wrong!',
    });
  } 
    // B) Rendered Website
    if (err.isOperational) {
      return res.status(err.statusCode).render('error', {
     title: 'Something went wrong!',
     msg: err.message
   });
  } //everything that is not marked operational
    
    // 1) Log error
    console.error('💥 Error! 💥', err);

    // 2) Send generic message
    return res.status(err.statusCode).render('error', {
     title: 'Something went wrong!',
     msg: 'Please try again later.'
   });
};


module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; //500 because of mongoose or something else. (unknown)
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } 
  else if (process.env.NODE_ENV === 'production') {
    
    let error = Object.create(err);
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if(error.code === 11000) error = handleDuplicatedFieldsDB(error);
    if(error.name === 'ValidationError') error = handleValidationErrorDb(error);
    if(error.name ==='JsonWebTokenError') error = handleJWTError();
    if(error.name ==='TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
    //sendErrorProd(error, res);
  }
};