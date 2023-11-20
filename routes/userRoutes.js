const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController');

const router = express.Router();

router.post('/signup', authController.signup)
router.post('/login', authController.login)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

router.patch('/updateMyPassword', authController.protect, authController.updatePassword)
router.get('/me', authController.protect, userController.getMe, userController.getUser)
router.patch("/updateMe", authController.protect, userController.updateMe)
router.patch("/deactivateMe", authController.protect, userController.deactivateMe)
router.patch("/reactivateMe", authController.protect, userController.reactivateMe) 

router.use(authController.protect)

router
.route('/')
.get(userController.getAllUsers)
.post(userController.createUser);

router 
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  // .delete(userController.deleteUser);
  // user is deleted after 30 days using cron. route not needed
module.exports = router
