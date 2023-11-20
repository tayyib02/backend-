const path = require("path");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const businessRouter = require("./routes/businessRoutes");
const serviceRouter = require("./routes/serviceRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const chatRouter = require("./routes/chatRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const cors = require("cors");
// const bookingRouter = require('./routes/bookingRoutes');

// Start express app
const app = express();

// app.set('view engine', 'pug');
// app.set('views', path.join(__dirname, 'views'));
// Serving static files
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "data:", "blob:", "https:", "http", "ws:"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "http:", "data:"],
        scriptSrc: [
          "'self'",
          "https:",
          "http:",
          "blob:",
          "https://*.mapbox.com",
          "https://js.stripe.com",
          "https://m.stripe.network",
          "https://*.cloudflare.com",
        ],
        frameSrc: ["'self'", "https://js.stripe.com"],
        objectSrc: ["'none'"],
        styleSrc: ["'self'", "https:", "http:", "'unsafe-inline'"],
        workerSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tiles.mapbox.com",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
          "https://m.stripe.network",
        ],
        childSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "data:", "blob:"],
        formAction: ["'self'"],
        connectSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.stripe.com",
          "https://*.mapbox.com",
          "https://*.cloudflare.com/",
          "https://bundle.js:*",
          "ws://127.0.0.1:*/",
        ],
      },
    },
  })
);

// global middlewares

// Development logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 100 requests ^ in an hour
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

app.use(morgan("dev"));

//  Body parser, reading data from the body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against noSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
// allow filters from
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies)
  next();
});

// routes

app.use("/api/v1/business", businessRouter);
app.use("/api/v1/service", serviceRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/payment", paymentRouter);
// app.use('/api/v1/bookings', bookingRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
